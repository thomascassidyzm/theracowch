/**
 * The wheel-build flow — the completion stage of "What are you like, anyway?".
 *
 * A person who has finished WAYL comes straight here and gets a thirteen-spoke
 * wellness wheel built FOR them — and then owns it by choosing the statements
 * nearest to true for them, and editing the words in them, or writing their own
 * from scratch. Never a blank canvas: the assessment seeds it,
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
 *      verbatim, keyed to its spoke — on this device AND on the server, so it
 *      survives the device.
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
 * WHERE THE WORDS ARE KEPT (Tom's ruling, 2026-09-06). This stopped being a
 * device-only prototype the day it became the completion stage of WAYL. The
 * chosen-and-edited statements are still written to localStorage first — so the
 * flow never stalls on a network — and are then POSTed to /api/wheel, keyed by
 * a random id this device mints once. Verbatim at every hop: what the person
 * typed is what is stored, never trimmed, tidied, capitalised or wrapped in
 * encouragement. The daily line is meant to be their own words quoted back, and
 * a quotation that has been improved is not a quotation.
 *
 * Nothing about the assessment itself travels: the raw WAYL answers stay in
 * their own keys, on this device, exactly as they always did. What leaves is
 * only what the person deliberately wrote here.
 *
 * Plain browser JS, one <script> tag. No modules build in this repo.
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
  /* …and the single-choice variant's finished record, same shape of `bands`.
     Both are "What are you like, anyway?", so finishing either one earns the
     same next step; the ranked run is preferred when a person has done both,
     because it is the one with more evidence in it. */
  var SINGLE_KEY = 'cowch-q-wayl';
  /* Our own harvest — written here first, then sent to /api/wheel. */
  var WHEEL_KEY = 'cowch-wheel-build';
  var WHEEL_V = 1;
  /* The id under which this person's words are kept on the server. Minted once,
     on this device, and never derived from anything about them. */
  var ID_KEY = 'cowch-wheel-id';
  var API = '/api/wheel';
  /* The same ceiling api/wheel.js enforces, checked HERE first so a spoke that
     is too long is caught on the spoke it belongs to — a server refusal arrives
     after the page has already moved on, which leaves a person reading a
     complaint about a sentence they can no longer see. */
  var MAX_TEXT_CHARS = 2000;

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
  var choice = null;       /* the stance index currently selected on screen, or 'own' */
  var syncState = '';      /* '', 'saving', 'saved', 'failed' */
  var syncPending = false; /* a save that has not reached the server yet */
  var syncMsg = '';        /* the last thing we told them about keeping it */
  var needsPush = false;   /* this device holds words the server has not got */

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

  function runAt(key) {
    var raw, d;
    try { raw = localStorage.getItem(key); } catch (e) { return null; }
    if (!raw) return null;
    try { d = JSON.parse(raw); } catch (e) { return null; }
    if (!d || !Array.isArray(d.bands) || !d.bands.length) return null;
    return d;
  }

  /* Either finished variant will do — the ranked one first, because it is the
     one with more evidence behind it. Only `bands` is read: the per-moment
     answers and anything typed into the questionnaire itself are not touched
     here and never leave the device. */
  function storedRun() {
    return runAt(RANK_KEY) || runAt(SINGLE_KEY);
  }

  /* ================= KEEPING IT, FOR REAL =================
     localStorage is the draft; the server is the record. Written in that order
     on purpose: the flow must never sit waiting on a network, and a person who
     goes through a tunnel mid-wheel loses nothing.

     The id is minted here, once. It is not derived from anything about the
     person — no name, no email, no device fingerprint — and it is the only key
     to their record, which is what lets there be no account. */
  function deviceId() {
    var id;
    try { id = localStorage.getItem(ID_KEY); } catch (e) { return null; }
    if (id) return id;
    id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : uuidish();
    try { localStorage.setItem(ID_KEY, id); } catch (e) { return null; }
    return id;
  }

  /* Older Safari has crypto.getRandomValues but not randomUUID. Same shape,
     same randomness source; never Math.random, which would make ids guessable
     and the id is the whole of the security here. */
  function uuidish() {
    var b = new Uint8Array(16);
    window.crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    var h = [];
    for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
    return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' + h.slice(6, 8).join('')
      + '-' + h.slice(8, 10).join('') + '-' + h.slice(10, 16).join('');
  }

  function setSync(state, message) {
    syncState = state;
    syncMsg = message || '';
    applySync();
  }

  /* The same line, wherever it is on screen — the build card renders itself
     fresh on every spoke, so the status has to be re-applied rather than
     written once into an element that is about to be replaced. */
  function applySync() {
    Array.prototype.forEach.call(document.querySelectorAll('.sync-note'), function (el) {
      el.textContent = syncMsg;
      el.classList.toggle('warn', syncState === 'failed');
    });
  }

  /* One POST, the whole harvest, every time something changes. The record is
     small (thirteen sentences at most) and last-write-wins is exactly right for
     "these are my words as of now" — there is no merge to get wrong. */
  function pushToServer() {
    var id = deviceId();
    if (!id) { setSync('failed', 'This browser will not let us keep anything — your words are only in this window.'); return; }
    syncPending = true;
    setSync('saving', 'Keeping your words…');
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id,
        order: plan.map(function (p) { return p.spoke.id; }),
        entries: harvest,
        profile: { source: profile ? profile.source : 'unknown', label: profile ? profile.label : '' }
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (!res.ok) {
        /* Say what the server said, not a cheerful substitute — if a spoke is
           too long to store, the person needs to know that and to be the one
           who shortens it. Nothing of theirs has been altered either way. */
        syncPending = true;
        setSync('failed', (res.j && res.j.error) || 'Couldn’t keep that just now — it’s safe on this device and we’ll try again.');
        return;
      }
      syncPending = false;
      setSync('saved', 'Kept, word for word.');
    }).catch(function () {
      syncPending = true;
      setSync('failed', 'No connection just now — your words are safe on this device and we’ll try again.');
    });
  }

  /* Coming back on a device that has the id but has lost (or never had) the
     local copy — cleared storage, a reinstalled PWA — the record is fetched
     back. It is only ever used to FILL a gap, never to overwrite words that are
     already here. */
  function pullFromServer() {
    var id;
    try { id = localStorage.getItem(ID_KEY); } catch (e) { return Promise.resolve(null); }
    if (!id) return Promise.resolve(null);
    return fetch(API + '?id=' + encodeURIComponent(id))
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function deleteOnServer() {
    var id;
    try { id = localStorage.getItem(ID_KEY); } catch (e) { return; }
    if (!id) return;
    fetch(API + '?id=' + encodeURIComponent(id), { method: 'DELETE' }).catch(function () {});
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
     Their words, verbatim, keyed to the spoke — written to this device first,
     then to /api/wheel so they outlive the browser that typed them. */
  function saveHarvest() {
    saveLocal();
    pushToServer();
  }

  function saveLocal() {
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

  /* Words this device already has always win; the server copy only fills the
     gaps. That ordering matters on the one case that is easy to get wrong — a
     person who wrote three spokes on a plane and then opened the page again on
     landing must not have the older server record land on top of them. */
  function adoptRemote(remote) {
    var local = loadHarvest();
    if (!remote || !remote.entries || !Object.keys(remote.entries).length) {
      needsPush = !!(local && local.entries && Object.keys(local.entries).length);
      return;
    }
    var merged = (local && local.entries) || {};
    var added = 0;
    Object.keys(remote.entries).forEach(function (k) {
      if (!merged[k]) { merged[k] = remote.entries[k]; added++; }
    });
    /* The server is behind if this device holds a spoke it does not. */
    needsPush = Object.keys(merged).some(function (k) { return !remote.entries[k]; });
    if (!local || added) {
      try {
        localStorage.setItem(WHEEL_KEY, JSON.stringify({
          v: WHEEL_V,
          updated: new Date().toISOString(),
          profileSource: (local && local.profileSource) || (remote.profile && remote.profile.source) || 'unknown',
          profileLabel: (local && local.profileLabel) || (remote.profile && remote.profile.label) || '',
          order: (local && local.order) || remote.order || [],
          entries: merged
        }));
      } catch (e) { /* private mode — the fetched copy is still in this session */ }
    }
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
      html += '<p class="found">No finished “What are you like, anyway?” on this device yet. You can '
        + '<a href="/questionnaires/what-are-you-like-rank.html">answer the thirty moments</a> first '
        + '— the wheel is what comes next — or feel the flow now with one of the worked profiles below.</p>';
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
        + ' already in your own words. '
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
    if (needsPush && Object.keys(harvest).length) { needsPush = false; pushToServer(); }
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
      if (existing.own) choice = 'own';
      else cands.forEach(function (c, i) { if (c.hold === existing.hold) choice = i; });
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
      + 'one — pick whichever is nearest to true for you, and then change the words until it is yours. '
      + 'Or say it your own way from the start.</p>'
      + '<div class="cands">' + cands.map(function (c, i) {
        return '<button class="cand' + (choice === i ? ' picked' : '') + '" type="button" data-cand="' + i + '">'
          + '<span class="cand-hold">' + esc(c.hold) + '</span>'
          + '<span class="cand-text">' + esc(c.text) + '</span></button>';
      }).join('')
      /* The fourth door, and it is not a lesser one: a person whose way of
         holding this isn't among the three should not have to start from
         somebody else's sentence and delete it. Empty box, their words. */
      + '<button class="cand cand-own' + (choice === 'own' ? ' picked' : '') + '" type="button" data-cand="own">'
      + '<span class="cand-hold">In my own words</span>'
      + '<span class="cand-text">None of those three. I’ll say it my way.</span></button>'
      + '</div>'
      + '<div class="editor' + (choice === null ? ' hidden' : '') + '" id="editor">'
      + '<label class="edit-label" for="ownWords">Now make it yours. Change a word or rewrite the whole '
      + 'thing — what gets kept is exactly what you type.</label>'
      + '<textarea id="ownWords" rows="4" placeholder="Your words for this one."></textarea>'
      + '<p class="sync-note" id="syncNote"></p>'
      + '</div>'
      + '</div>'
      + '<div class="btn-row">'
      + '<button class="btn btn-primary" type="button" data-keep="1"' + (choice === null ? ' disabled' : '') + '>'
      + 'That’s mine — next</button>'
      + '</div>'
      + '<div class="nav-row">'
      + '<button class="nav-btn" type="button" data-back="1"' + (idx === 0 ? ' disabled' : '') + '>← Back</button>'
      + '<button class="nav-btn" type="button" data-skip="1">Leave this one blank →</button>'
      + '</div>'
      /* A FEW STATEMENTS IS A FINISHED WHEEL (Tom, 2026-09-06: "the user chooses
         a few statements that reflect them best"). So the way out is on every
         spoke, not only at the end of thirteen — nobody owes this page a full
         set before their words count. */
      + '<div class="nav-row">'
      + '<button class="nav-btn" type="button" data-done="1">That’s enough — show me my wheel</button>'
      + '</div>';

    if (choice !== null) {
      $('ownWords').value = existing ? existing.text : (choice === 'own' ? '' : cands[choice].text);
    }
    applySync();
  }

  function pick(i) {
    var p = plan[idx];
    var cands = candidatesFor(p.spoke, p.register);
    var existing = harvest[p.spoke.id];
    choice = i;
    Array.prototype.forEach.call(document.querySelectorAll('.cand'), function (b) {
      b.classList.toggle('picked', b.dataset.cand === String(i));
    });
    var ed = $('editor');
    ed.classList.remove('hidden');
    var ta = $('ownWords');
    /* Their own words win over a candidate every time: re-picking the stance
       they already chose must not wipe the sentence they wrote under it. */
    if (i === 'own') ta.value = (existing && existing.own) ? existing.text : '';
    else if (existing && !existing.own && cands[i] && cands[i].hold === existing.hold) ta.value = existing.text;
    else ta.value = cands[i].text;
    $('buildCard').querySelector('[data-keep]').disabled = false;
    if (i === 'own') { try { ta.focus(); } catch (e) { /* a focus that fails changes nothing */ } }
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
    var raw = $('ownWords').value || '';
    /* VERBATIM, and this is the line that means it: what is stored is what is
       in the box. No trim, no capitalising, no full stop added. The only thing
       .trim() is used for anywhere here is deciding whether a box is EMPTY. */
    var isEmpty = !raw.trim();
    if (raw.length > MAX_TEXT_CHARS) {
      setSync('failed', 'That one is longer than we can keep (' + MAX_TEXT_CHARS + ' characters). Nothing has been changed — shorten it yourself and it will save.');
      return;
    }
    if (choice === 'own') {
      /* Nothing chosen and nothing typed is not a spoke — say so rather than
         quietly putting one of our sentences in their mouth. */
      if (isEmpty) { setSync('failed', 'Type a line in your own words, or pick one of the three above.'); return; }
    }
    var text = isEmpty ? cands[choice].text : raw;
    harvest[p.spoke.id] = {
      hold: choice === 'own' ? '' : cands[choice].hold,
      own: choice === 'own',
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
    $('wheelMeta').textContent = done + ' spoke' + (done === 1 ? '' : 's') + ' in your own words · '
      + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      + ' · kept word for word';

    applySync();
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
    lines.push('Built from a "What are you like, anyway?" profile. A starting point, not a verdict.');
    lines.push('These are my words, kept exactly as I typed them.');
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
    if (t.dataset.cand !== undefined) { pick(t.dataset.cand === 'own' ? 'own' : +t.dataset.cand); return; }
    if (t.dataset.done) { renderWheel(); return; }
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
      /* Clear means clear: the copy on this device AND the record on the
         server. The id goes too, so what comes next is a new record rather than
         a resurrection of the old one. */
      deleteOnServer();
      try { localStorage.removeItem(WHEEL_KEY); localStorage.removeItem(ID_KEY); } catch (err) { /* nothing sensible left to do */ }
      harvest = {}; idx = 0; show('intro'); renderIntro();
      return;
    }
    if (t.dataset.top) { show('build'); idx = 0; renderSpoke(); return; }
  });

  /* ================= LOAD =================
     Arriving with ?from=wayl means the person has just this second finished the
     assessment and tapped through — so there is nothing to introduce and no
     menu to offer. They land in the build itself, on their own spoke one. Any
     other arrival still gets the intro. */
  function arrivedFromWayl() {
    return /[?&]from=(wayl|rank|single)/.test(window.location.search);
  }

  Promise.all([
    fetch(SPOKES_URL).then(function (r) { return r.json(); }),
    fetch(BANK_URL).then(function (r) { return r.json(); }),
    pullFromServer()
  ]).then(function (res) {
    SPOKES = res[0].spokes || [];
    BANK = res[1].spokes || {};
    adoptRemote(res[2]);
    $('introLoading').classList.add('hidden');
    var run = storedRun();
    if (run && arrivedFromWayl()) {
      start('assessment', run.meta || 'your answers', run.bands);
      return;
    }
    renderIntro();
  }).catch(function () {
    $('introLoading').textContent = 'The wheel data didn’t load. A refresh usually sorts it.';
  });
})();
