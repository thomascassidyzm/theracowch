/**
 * The wheel-build flow — PROTOTYPE, behind a flag.
 *
 * A person who has finished the ranked "What are you like, anyway?" gets a
 * thirteen-spoke wellness wheel built FOR them — and then owns it by choosing
 * and editing the words in it. Never a blank canvas: the assessment seeds it,
 * redemption latency orders it, and they choose one of three genuinely
 * different ways to hold each spoke and then make it theirs.
 *
 * Three rules this file is built on, in order:
 *   1. UNIVERSAL SPOKES, PERSONAL ORDERING. The thirteen are the same for
 *      everybody; what the assessment personalises is where you ENTER the ring.
 *      A bespoke thirteen fails the brother-in-law test.
 *   2. TIGHT RANKINGS LICENSE BOLD STATEMENTS; SPREAD RANKINGS LICENSE HONEST
 *      ONES. A warrant harvested from a contested selection and played back
 *      with false confidence is the tool putting words in someone's mouth.
 *   3. THE HARVEST IS THE POINT. Every chosen-and-edited statement is kept
 *      verbatim, keyed to its spoke, on this device only.
 *
 * NO MODEL CALL, anywhere — not at runtime, not at build time. The three
 * candidates are selected deterministically from the pre-authored bank. See
 * "THE GENERATION SEAM" below for where a single one-shot call would slot in
 * later, if Tom rules that way.
 *
 * A deliberate FORK in spirit from the questionnaire engines: it reads their
 * stored record and nothing else. It never imports them, never writes their
 * keys, and cannot change what they do.
 *
 * Plain browser JS, one <script> tag. No modules build in this repo.
 * Everything stays on this device: no endpoint, no account, no upload.
 */
(function () {
  'use strict';

  var SPOKES_URL = '/questionnaires/data/wellness-13.json?v=1';
  var BANK_URL = '/questionnaires/data/wellness-13-statements.json?v=1';

  /* The finished ranked run. Read-only, always — a run someone completed is
     theirs, and this prototype has no business touching it. The in-progress
     key (…-progress) is deliberately NOT read: a run you are still inside and
     a run you have completed are different things. */
  var RANK_KEY = 'cowch-q-wayl-rank';
  /* Our own harvest. Namespaced, on-device, nothing uploaded. */
  var WHEEL_KEY = 'cowch-wheel-build';
  var WHEEL_V = 1;

  /* ================= SAMPLE PROFILES =================
     A prototype affordance, and the page says so on screen. Tom has to be able
     to tap this cold on a phone without answering thirty scenarios first, and
     the two contrasting shapes — tight and spread — are exactly what the
     confidence register turns on, so they need to be feelable side by side.
     Shaped like the real `bands` array the ranked engine writes. */
  var SAMPLES = [
    {
      id: 'tight',
      label: 'Answers that pointed one way',
      note: 'Rankings that leaned the same direction again and again — so the wheel is allowed to be bold.',
      bands: [
        { k: 'O', focus: 84, low: 62, high: 76 },
        { k: 'C', focus: 81, low: 18, high: 32 },
        { k: 'E', focus: 79, low: 24, high: 39 },
        { k: 'A', focus: 82, low: 68, high: 82 },
        { k: 'N', focus: 80, dial: 7.4 },
        { k: 'R', focus: 78, dial: 2.6 }
      ]
    },
    {
      id: 'spread',
      label: 'Answers that pulled both ways',
      note: 'Rankings that changed their mind from moment to moment — so the wheel stays gentle and says so.',
      bands: [
        { k: 'O', focus: 61, low: 52, high: 66 },
        { k: 'C', focus: 58, low: 43, high: 59 },
        { k: 'E', focus: 63, low: 46, high: 60 },
        { k: 'A', focus: 60, low: 45, high: 61 },
        { k: 'N', focus: 57, dial: 6.2 },
        { k: 'R', focus: 59, dial: 4.7 }
      ]
    },
    {
      id: 'mixed',
      label: 'Clear on some, torn on others',
      note: 'The commonest shape: settled about a few things, genuinely undecided about the rest.',
      bands: [
        { k: 'O', focus: 83, low: 71, high: 85 },
        { k: 'C', focus: 62, low: 45, high: 60 },
        { k: 'E', focus: 80, low: 20, high: 34 },
        { k: 'A', focus: 59, low: 46, high: 62 },
        { k: 'N', focus: 79, dial: 6.9 },
        { k: 'R', focus: 60, dial: 5.2 }
      ]
    }
  ];

  var AXIS_NAME = {
    O: 'openness', C: 'follow-through', E: 'where your energy comes from',
    A: 'accommodation', N: 'how loudly your alarm runs', R: 'risk appetite'
  };

  /* ================= STATE ================= */
  var SPOKES = [];
  var BANK = {};
  var profile = null;      /* {source, label, conviction:{k:0..1}, focus:{k:0..100}} */
  var plan = [];           /* ordered [{spoke, register, torn, why}] */
  var harvest = {};        /* spokeId -> {hold, text, register, at} */
  var idx = 0;
  var choice = null;       /* the stance index currently selected on screen */

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function show(id) {
    ['intro', 'build', 'wheel'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ================= READING THE ASSESSMENT =================
     Two numbers per axis, and only two.

     CONVICTION — how far from the middle their answers put them, as a
     fraction of the instrument's own reach. This is the tight-versus-spread
     signal: rankings that leaned the same way again and again push an axis
     away from the middle, rankings that changed their mind from moment to
     moment leave it sitting near it.

     FOCUS — the honest width the questionnaire already reports. Half-answered
     runs earn gentler statements too, and that is correct: thin evidence and
     contested evidence should both buy the same modesty. */
  function convictionFromBand(b) {
    var est;
    if (typeof b.dial === 'number') est = b.dial * 10;
    else if (typeof b.low === 'number' && typeof b.high === 'number') est = (b.low + b.high) / 2;
    else return 0;
    /* 44 is the engine's own half-reach — its estimate is clamped to 6..94. */
    return Math.max(0, Math.min(1, Math.abs(est - 50) / 44));
  }

  function profileFrom(bands, source, label) {
    var conviction = {}, focus = {};
    (bands || []).forEach(function (b) {
      if (!b || !b.k) return;
      conviction[b.k] = convictionFromBand(b);
      focus[b.k] = typeof b.focus === 'number' ? b.focus : 60;
    });
    return { source: source, label: label, conviction: conviction, focus: focus };
  }

  function storedRun() {
    var raw, d;
    try { raw = localStorage.getItem(RANK_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { d = JSON.parse(raw); } catch (e) { return null; }
    if (!d || !Array.isArray(d.bands) || !d.bands.length) return null;
    return d;
  }

  /* ================= BUILDING THE PLAN ================= */
  function spokeConviction(sp) {
    var ks = sp.axes || [], t = 0, n = 0;
    ks.forEach(function (k) {
      if (typeof profile.conviction[k] === 'number') { t += profile.conviction[k]; n++; }
    });
    return n ? t / n : 0;
  }
  function spokeFocus(sp) {
    var ks = sp.axes || [], t = 0, n = 0;
    ks.forEach(function (k) {
      if (typeof profile.focus[k] === 'number') { t += profile.focus[k]; n++; }
    });
    return n ? t / n : 60;
  }

  /* Bold has to be EARNED — twice over. The answers have to have leaned
     somewhere (conviction), and there has to have been enough of them for that
     lean to mean anything (focus). Everything else gets the honest register,
     which is the safe direction to be wrong in. */
  function registerFor(sp) {
    return (spokeConviction(sp) >= 0.28 && spokeFocus(sp) >= 55) ? 'bold' : 'honest';
  }
  function tornOn(sp) {
    return spokeConviction(sp) < 0.13;
  }

  function buildPlan() {
    var ordered = SPOKES.slice().sort(function (a, b) { return a.latency - b.latency; });
    var review = null, rest = [];
    ordered.forEach(function (s) { if (s.review) review = s; else rest.push(s); });

    /* WHERE THEY ENTER THE RING. Only among the forgiving end — the first six
       by redemption latency — because starting someone on sleep or on their
       closest relationships means their first go at owning a spoke is the one
       that takes longest to come round again. Among those, the one their
       answers were clearest about: a first spoke should be one they can hear
       themselves in straight away. */
    var pool = rest.slice(0, 6);
    var entry = pool[0], best = -1;
    pool.forEach(function (s) {
      var c = spokeConviction(s);
      if (c > best + 0.0001) { best = c; entry = s; }
    });

    var seq = [entry].concat(rest.filter(function (s) { return s !== entry; }));
    if (review) seq.push(review);

    plan = seq.map(function (s, i) {
      return {
        spoke: s,
        register: registerFor(s),
        torn: tornOn(s),
        why: whyLine(s, i === 0, entry)
      };
    });
  }

  /* Attention map, never verdict: this says where a spoke sits and why it sits
     there. It never says anything is wrong with anybody. */
  function whyLine(sp, isEntry, entry) {
    var names = (sp.axes || []).map(function (k) { return AXIS_NAME[k]; }).filter(Boolean);
    var axisPhrase = names.length > 1
      ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
      : (names[0] || 'the way you answered');
    if (isEntry) {
      return 'You start here. Of the quickest-to-come-round spokes, this is the one your answers were '
        + 'clearest about — they had most to say about ' + axisPhrase + ' — and the next chance to choose '
        + 'well on it is ' + sp.nextChance + '. Nothing about that is a verdict on how you’re doing.';
    }
    if (sp.review) {
      return 'Last, because it is the lap itself. Twelve spokes of choosing, and then a look back at '
        + 'what actually happened.';
    }
    return 'It sits here because the next chance to choose well on it is ' + sp.nextChance
      + '. The wheel runs from the quickest to come round again to the slowest — that ordering is about '
      + 'the domains, not about you.';
  }

  /* ================= THE GENERATION SEAM =================
     This is the ONE place a model would legitimately sit in the pipeline: one
     shot, at build time, to write three genuinely-distinct candidate holds for
     this spoke at this register, given this person's bands. Tom's ruling for
     now is no API drain until the shape is worked out, so this reads the
     pre-authored bank instead and costs nothing.

     If that ruling changes, ONLY this function changes: it would call once per
     spoke as the spoke is reached, cache the three into `harvest`-adjacent
     storage so a reload never re-spends, and fall back to this same bank on
     any error. Nothing downstream of here knows or cares where the three came
     from. */
  function candidatesFor(sp, register) {
    var rows = BANK[sp.id] || [];
    return rows.map(function (r) {
      return { hold: r.hold, text: r[register] || r.honest || r.bold };
    });
  }

  /* ================= THE HARVEST =================
     Their words, verbatim, keyed to the spoke. On this device, in this
     browser, and nowhere else — no endpoint exists to send it to. */
  function saveHarvest() {
    try {
      localStorage.setItem(WHEEL_KEY, JSON.stringify({
        v: WHEEL_V,
        updated: new Date().toISOString(),
        profileSource: profile ? profile.source : 'unknown',
        profileLabel: profile ? profile.label : '',
        order: plan.map(function (p) { return p.spoke.id; }),
        entries: harvest
      }));
    } catch (e) { /* private mode / full quota — the flow still works */ }
  }
  function loadHarvest() {
    var raw, d;
    try { raw = localStorage.getItem(WHEEL_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { d = JSON.parse(raw); } catch (e) { return null; }
    if (!d || d.v !== WHEEL_V || !d.entries) return null;
    return d;
  }

  /* ================= INTRO ================= */
  function renderIntro() {
    var run = storedRun();
    var box = $('introActions');
    var html = '';
    if (run) {
      html += '<p class="found"><b>Found a finished run on this device.</b> '
        + esc(run.meta || 'your ranked answers') + '</p>'
        + '<div class="btn-row"><button class="btn btn-primary" type="button" data-use="stored">'
        + 'Build my wheel from my answers</button></div>';
    } else {
      html += '<p class="found">No finished ranked run on this device yet. You can '
        + '<a href="/questionnaires/what-are-you-like-rank.html">answer the thirty moments</a> first '
        + '— or feel the flow now with one of the worked profiles below.</p>';
    }
    html += '<div class="sample-block"><p class="sample-lead"><b>Or use a worked profile.</b> '
      + 'These are made up, for feeling the shape of this before it is built properly. '
      + 'They are a prototype affordance, not anything about you.</p><div class="sample-btns">'
      + SAMPLES.map(function (s) {
        return '<button class="sample-btn" type="button" data-sample="' + s.id + '">'
          + '<span class="sample-name">' + esc(s.label) + '</span>'
          + '<span class="sample-note">' + esc(s.note) + '</span></button>';
      }).join('') + '</div></div>';

    var prior = loadHarvest();
    if (prior && Object.keys(prior.entries).length) {
      html += '<p class="resume-note">You have ' + Object.keys(prior.entries).length
        + ' spoke' + (Object.keys(prior.entries).length === 1 ? '' : 's')
        + ' already in your own words on this device. '
        + '<button class="linkish" type="button" data-resume="1">Pick it back up</button>.</p>';
    }
    box.innerHTML = html;
  }

  function start(source, label, bands) {
    profile = profileFrom(bands, source, label);
    buildPlan();
    var prior = loadHarvest();
    harvest = (prior && prior.entries) || {};
    idx = 0;
    /* land on the first spoke they haven't done */
    for (var i = 0; i < plan.length; i++) {
      if (!harvest[plan[i].spoke.id]) { idx = i; break; }
      if (i === plan.length - 1) idx = plan.length;
    }
    if (idx >= plan.length) { renderWheel(); return; }
    show('build');
    renderSpoke();
  }

  /* ================= ONE SPOKE AT A TIME ================= */
  function renderSpoke() {
    var p = plan[idx], sp = p.spoke;
    var existing = harvest[sp.id];
    var cands = candidatesFor(sp, p.register);
    choice = null;
    if (existing) {
      cands.forEach(function (c, i) { if (c.hold === existing.hold) choice = i; });
    }

    var dots = plan.map(function (q, i) {
      return '<span class="dot' + (harvest[q.spoke.id] ? ' done' : '') + (i === idx ? ' here' : '') + '"></span>';
    }).join('');

    var torn = p.torn
      ? '<div class="torn">Your answers looked genuinely torn on this one — they pulled both ways from '
        + 'moment to moment. So these three are gentler on purpose. Being undecided about something is a '
        + 'real answer, not a gap.</div>'
      : '';

    $('buildCard').innerHTML =
      '<div class="journey">' + dots + '<span class="journey-label">' + (idx + 1) + ' of ' + plan.length + '</span></div>'
      + '<div class="wbody" id="wbody">'
      + '<div class="spoke-name">' + esc(sp.name) + '</div>'
      + '<p class="spoke-what">' + esc(sp.what) + '</p>'
      + '<p class="why">' + p.why + '</p>'
      + torn
      + '<p class="choose-lead">Three ways a person could honestly hold this. None of them is the right '
      + 'one — pick whichever is nearest to true for you, and then change the words until it is yours.</p>'
      + '<div class="cands">' + cands.map(function (c, i) {
        return '<button class="cand' + (choice === i ? ' picked' : '') + '" type="button" data-cand="' + i + '">'
          + '<span class="cand-hold">' + esc(c.hold) + '</span>'
          + '<span class="cand-text">' + esc(c.text) + '</span></button>';
      }).join('') + '</div>'
      + '<div class="editor' + (choice === null ? ' hidden' : '') + '" id="editor">'
      + '<label class="edit-label" for="ownWords">Now make it yours. Change a word or rewrite the whole '
      + 'thing — what gets kept is exactly what you type.</label>'
      + '<textarea id="ownWords" rows="4"></textarea>'
      + '</div>'
      + '</div>'
      + '<div class="btn-row">'
      + '<button class="btn btn-primary" type="button" data-keep="1"' + (choice === null ? ' disabled' : '') + '>'
      + 'That’s mine — next</button>'
      + '</div>'
      + '<div class="nav-row">'
      + '<button class="nav-btn" type="button" data-back="1"' + (idx === 0 ? ' disabled' : '') + '>← Back</button>'
      + '<button class="nav-btn" type="button" data-skip="1">Leave this one blank →</button>'
      + '</div>';

    if (choice !== null) {
      $('ownWords').value = existing ? existing.text : cands[choice].text;
    }
  }

  function pick(i) {
    var p = plan[idx];
    var cands = candidatesFor(p.spoke, p.register);
    choice = i;
    Array.prototype.forEach.call(document.querySelectorAll('.cand'), function (b, j) {
      b.classList.toggle('picked', j === i);
    });
    var ed = $('editor');
    ed.classList.remove('hidden');
    var ta = $('ownWords');
    ta.value = cands[i].text;
    $('buildCard').querySelector('[data-keep]').disabled = false;
    /* Plain page scroll, deliberately: the answering view of the ranked
       questionnaire is PINNED because nothing there is typed, and a pinned
       page plus a phone keyboard is a trap — the field goes under the keyboard
       with no way to scroll it back. Here the page flows and the controls sit
       under the editor, so they are always reachable. */
    ed.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function keep() {
    if (choice === null) return;
    var p = plan[idx];
    var cands = candidatesFor(p.spoke, p.register);
    var text = ($('ownWords').value || '').trim();
    if (!text) text = cands[choice].text;
    harvest[p.spoke.id] = {
      hold: cands[choice].hold,
      text: text,
      register: p.register,
      torn: !!p.torn,
      at: new Date().toISOString()
    };
    saveHarvest();
    advance();
  }

  function advance() {
    if (idx >= plan.length - 1) { renderWheel(); return; }
    idx++;
    renderSpoke();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ================= THE FINISHED WHEEL ================= */
  function renderWheel() {
    show('wheel');
    var done = plan.filter(function (p) { return harvest[p.spoke.id]; }).length;
    $('wheelMeta').textContent = done + ' of ' + plan.length + ' spokes in your own words · '
      + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      + ' · kept on this device unless you share it';

    $('wheelList').innerHTML = plan.map(function (p, i) {
      var h = harvest[p.spoke.id];
      return '<div class="wrow' + (h ? '' : ' blank') + '">'
        + '<div class="wrow-top"><span class="wrow-n">' + (i + 1) + '</span>'
        + '<span class="wrow-name">' + esc(p.spoke.name) + '</span>'
        + '<button class="linkish wrow-edit" type="button" data-edit="' + i + '">'
        + (h ? 'change' : 'fill this in') + '</button></div>'
        + (h ? '<p class="wrow-words">“' + esc(h.text) + '”</p>'
             : '<p class="wrow-words empty">Left blank for now.</p>')
        + '</div>';
    }).join('');
  }

  function wheelAsText() {
    var lines = ['My wellness wheel — thirteen spokes, my own words',
      new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), ''];
    plan.forEach(function (p, i) {
      var h = harvest[p.spoke.id];
      lines.push((i + 1) + '. ' + p.spoke.name);
      lines.push('   ' + (h ? h.text : '(left blank for now)'));
      lines.push('');
    });
    lines.push('Built from a ranked "What are you like, anyway?" profile. A starting point, not a verdict.');
    lines.push('Nothing here left the device it was written on.');
    return lines.join('\n');
  }

  /* ================= WIRING ================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button, a') : null;
    if (!t) return;

    if (t.dataset.use === 'stored') {
      var run = storedRun();
      if (!run) { renderIntro(); return; }
      start('assessment', run.meta || 'your ranked answers', run.bands);
      return;
    }
    if (t.dataset.sample) {
      var s = SAMPLES.filter(function (x) { return x.id === t.dataset.sample; })[0];
      if (s) start('sample:' + s.id, s.label, s.bands);
      return;
    }
    if (t.dataset.resume) {
      var prior = loadHarvest();
      var src = prior && prior.profileSource || '';
      if (src.indexOf('sample:') === 0) {
        var sid = src.slice(7);
        var sam = SAMPLES.filter(function (x) { return x.id === sid; })[0];
        if (sam) { start(src, sam.label, sam.bands); return; }
      }
      var r = storedRun();
      if (r) start('assessment', r.meta || 'your ranked answers', r.bands);
      else start('sample:mixed', SAMPLES[2].label, SAMPLES[2].bands);
      return;
    }
    if (t.dataset.cand !== undefined) { pick(+t.dataset.cand); return; }
    if (t.dataset.keep) { keep(); return; }
    if (t.dataset.skip) { advance(); return; }
    if (t.dataset.back) { if (idx > 0) { idx--; renderSpoke(); window.scrollTo({ top: 0 }); } return; }
    if (t.dataset.edit !== undefined) {
      idx = +t.dataset.edit; show('build'); renderSpoke(); return;
    }
    if (t.dataset.copy) {
      var text = wheelAsText();
      var note = $('copyNote');
      var done = function () { note.textContent = 'Copied.'; setTimeout(function () { note.textContent = ''; }, 2500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { note.textContent = 'Copy failed — select and copy by hand.'; });
      } else { note.textContent = 'Copy failed — select and copy by hand.'; }
      return;
    }
    if (t.dataset.restart) {
      try { localStorage.removeItem(WHEEL_KEY); } catch (err) { /* nothing sensible left to do */ }
      harvest = {}; idx = 0; show('intro'); renderIntro();
      return;
    }
    if (t.dataset.top) { show('build'); idx = 0; renderSpoke(); return; }
  });

  /* ================= LOAD ================= */
  Promise.all([
    fetch(SPOKES_URL).then(function (r) { return r.json(); }),
    fetch(BANK_URL).then(function (r) { return r.json(); })
  ]).then(function (res) {
    SPOKES = res[0].spokes || [];
    BANK = res[1].spokes || {};
    renderIntro();
    $('introLoading').classList.add('hidden');
  }).catch(function () {
    $('introLoading').textContent = 'The wheel data didn’t load. A refresh usually sorts it.';
  });
})();
