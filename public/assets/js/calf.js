/* ============================================================
   Cowch Calf — your on-device companion.

   A warm, interactive layer: a calf is "delivered" to you, you name them
   and yourself, answer a few gentle (skippable, on-device) questions, then
   raise them over time. Caring for the calf is framed as a metaphor for
   caring for yourself — it is NOT therapy, NOT a clinician, and NOT a
   confidant to talk to instead of real people. The chat with Mandy stays
   the conversational surface; the calf is a gentle motivation/care loop.

   Everything lives in localStorage (privacy is the architecture). It hooks
   into the existing IMAGINE framework: the focus you pick reorders your
   daily IMAGINE (cowch-imagine-order, read by app.js) and seeds
   TherapyProfile.activeThemes. Growth reflects real engagement
   (TherapyProfile.imagine totals + days you showed up to care).
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'cowch_calf';
  var SKIP_KEY = 'cowch_calf_skipped';
  var ORDER_KEY = 'cowch-imagine-order';

  // IMAGINE domains — index MUST match IMAGINE_DAILY in /assets/js/app.js.
  var DOMAINS = [
    { i: 0, key: 'self',         label: 'Knowing myself',   emoji: '🪞', color: '--color-self',    href: '/imagine/self.html' },
    { i: 1, key: 'mindfulness',  label: 'Mindfulness',      emoji: '🌬️', color: '--color-mind',    href: '/imagine/mindfulness.html' },
    { i: 2, key: 'acceptance',   label: 'Acceptance',       emoji: '🍃', color: '--color-accept',  href: '/imagine/acceptance.html' },
    { i: 3, key: 'gratitude',    label: 'Gratitude',        emoji: '✨', color: '--color-thanks',  href: '/imagine/gratitude.html' },
    { i: 4, key: 'interactions', label: 'Connection',       emoji: '🤝', color: '--color-connect', href: '/imagine/interactions.html' },
    { i: 5, key: 'nurturing',    label: 'Nurturing & play', emoji: '🎈', color: '--color-play',    href: '/imagine/nurturing.html' },
    { i: 6, key: 'exploring',    label: 'Exploring',        emoji: '🧭', color: '--color-explore', href: '/imagine/exploring.html' }
  ];

  // A few gentle intake questions. Optional, skippable, on-device only.
  // Each (except age) nudges an IMAGINE domain so the calf's care can lean
  // toward what's heaviest right now.
  var QUESTIONS = [
    { id: 'ageBand', q: 'First — roughly how old are you?',
      note: 'Cowch is for 18+. This just helps tune the tone.',
      opts: ['18–24', '25–34', '35–44', '45+'] },
    { id: 'control', q: "When something's out of your hands, how often do you push against it?",
      note: 'There are no wrong answers.', nudge: 2,
      opts: ['Often', 'Sometimes', 'Rarely'] },
    { id: 'sleep', q: 'How have your nights been lately?', nudge: 1,
      opts: ['Restless', 'Up and down', 'Pretty restful'] },
    { id: 'connection', q: 'How do your connections with people feel right now?', nudge: 4,
      opts: ['Draining', 'A bit of both', 'Nourishing'] },
    { id: 'routine', q: "And your daily routine — how's it sitting with you?", nudge: 0,
      opts: ['Stuck', "It's okay", 'Pretty good'] }
  ];

  // ---------- storage ----------
  function load() { try { var s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (_) {} return null; }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (_) {} }
  function isBorn() { var c = load(); return !!(c && c.born); }
  function emptyCalf() {
    return { v: 1, born: new Date().toISOString(), userName: '', calfName: '',
             intake: {}, focus: [], careDays: [] };
  }
  function track(n, p) { try { if (window.cowchTrack) window.cowchTrack(n, p); } catch (_) {} }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }

  // ---------- growth ----------
  function imagineTotal() {
    try {
      var p = window.TherapyProfile && window.TherapyProfile.getProfile();
      if (!p || !p.imagine) return 0;
      return Object.keys(p.imagine).reduce(function (a, k) { return a + (+p.imagine[k] || 0); }, 0);
    } catch (_) { return 0; }
  }
  function growthPoints(c) {
    c = c || load() || {};
    var days = (c.careDays && c.careDays.length) || 0;
    return days * 2 + imagineTotal();
  }
  // Gentle, pressure-free stages. No breakable streaks — "days together".
  var STAGES = [
    { min: 0,  title: 'Newborn',            expr: 'sleepy',  next: 4 },
    { min: 4,  title: 'Finding their feet',  expr: 'content', next: 12 },
    { min: 12, title: 'Bright & playful',    expr: 'happy',   next: 28 },
    { min: 28, title: 'Thriving together',   expr: 'beam',    next: null }
  ];
  function stageFor(pts) {
    var s = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) if (pts >= STAGES[i].min) s = STAGES[i];
    return s;
  }

  // ---------- calf artwork ----------
  // Chibi calf matching the mascot: cream body, coral patch + ears, pink
  // blush. `expr` swaps the eyes/mouth so the calf reads sleepy → beaming.
  function calfSvg(expr) {
    var eyes, mouth = '<path d="M 92 118 Q 100 126 108 118" stroke="#3C2E28" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
    if (expr === 'sleepy') {
      eyes = '<path d="M 74 104 Q 82 110 90 104" stroke="#3C2E28" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
             '<path d="M 110 104 Q 118 110 126 104" stroke="#3C2E28" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
      mouth = '<path d="M 94 120 Q 100 124 106 120" stroke="#3C2E28" stroke-width="3" fill="none" stroke-linecap="round"/>';
    } else if (expr === 'content') {
      eyes = '<circle cx="82" cy="104" r="4.6" fill="#3C2E28"/><circle cx="118" cy="104" r="4.6" fill="#3C2E28"/>' +
             '<circle cx="83.6" cy="102.4" r="1.4" fill="#fff"/><circle cx="119.6" cy="102.4" r="1.4" fill="#fff"/>';
    } else if (expr === 'beam') {
      eyes = '<path d="M 74 106 Q 82 96 90 106" stroke="#3C2E28" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
             '<path d="M 110 106 Q 118 96 126 106" stroke="#3C2E28" stroke-width="3.6" fill="none" stroke-linecap="round"/>';
      mouth = '<path d="M 90 118 Q 100 132 110 118" stroke="#3C2E28" stroke-width="3.4" fill="none" stroke-linecap="round"/>';
    } else { /* happy (default) */
      eyes = '<circle cx="82" cy="104" r="5" fill="#3C2E28"/><circle cx="118" cy="104" r="5" fill="#3C2E28"/>' +
             '<circle cx="84" cy="102" r="1.6" fill="#fff"/><circle cx="120" cy="102" r="1.6" fill="#fff"/>';
      mouth = '<path d="M 91 119 Q 100 128 109 119" stroke="#3C2E28" stroke-width="3.2" fill="none" stroke-linecap="round"/>';
    }
    return '' +
      '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<ellipse cx="100" cy="178" rx="46" ry="9" fill="rgba(60,46,40,0.10)"/>' +
        // little body
        '<ellipse cx="100" cy="150" rx="40" ry="30" fill="#F7F1E7"/>' +
        '<ellipse cx="122" cy="150" rx="14" ry="11" fill="#F0916F" opacity=".9"/>' +
        // legs
        '<rect x="80" y="166" width="11" height="20" rx="5" fill="#EFE7DA"/>' +
        '<rect x="109" y="166" width="11" height="20" rx="5" fill="#EFE7DA"/>' +
        // horns
        '<ellipse cx="80" cy="58" rx="7" ry="11" fill="#F0E7D6" transform="rotate(-12 80 58)"/>' +
        '<ellipse cx="120" cy="58" rx="7" ry="11" fill="#F0E7D6" transform="rotate(12 120 58)"/>' +
        // ears
        '<ellipse cx="58" cy="86" rx="20" ry="12" fill="#F0916F" transform="rotate(-26 58 86)"/>' +
        '<ellipse cx="142" cy="86" rx="20" ry="12" fill="#F0916F" transform="rotate(26 142 86)"/>' +
        '<ellipse cx="60" cy="86" rx="10" ry="6" fill="#FFB7D0" transform="rotate(-26 60 86)"/>' +
        '<ellipse cx="140" cy="86" rx="10" ry="6" fill="#FFB7D0" transform="rotate(26 140 86)"/>' +
        // head
        '<circle cx="100" cy="100" r="50" fill="#F7F1E7"/>' +
        '<path d="M 64 74 Q 78 60 96 70 Q 84 80 64 84 Z" fill="#F0916F"/>' +  // coral patch
        // hair tuft
        '<path d="M 94 54 Q 100 44 106 54" stroke="#F0E7D6" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        // snout
        '<ellipse cx="100" cy="122" rx="26" ry="17" fill="#FBE6DC"/>' +
        '<ellipse cx="92" cy="120" rx="3" ry="2.4" fill="#3C2E28"/>' +
        '<ellipse cx="108" cy="120" rx="3" ry="2.4" fill="#3C2E28"/>' +
        // blush
        '<circle cx="66" cy="114" r="9" fill="#FFB7D0" opacity=".75"/>' +
        '<circle cx="134" cy="114" r="9" fill="#FFB7D0" opacity=".75"/>' +
        eyes + mouth +
      '</svg>';
  }

  // A friendly stork carrying a knotted bundle (with a peeking calf).
  function storkSvg() {
    return '' +
      '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        // wing in motion
        '<path d="M 96 70 Q 60 50 40 70 Q 70 78 96 84 Z" fill="#FFFFFF" stroke="#E4E0D8" stroke-width="2"/>' +
        // body
        '<ellipse cx="110" cy="86" rx="34" ry="22" fill="#FFFFFF" stroke="#E4E0D8" stroke-width="2"/>' +
        // neck + head
        '<path d="M 132 78 Q 150 60 150 44" stroke="#FFFFFF" stroke-width="11" fill="none" stroke-linecap="round"/>' +
        '<path d="M 132 78 Q 150 60 150 44" stroke="#E4E0D8" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>' +
        '<circle cx="150" cy="42" r="9" fill="#FFFFFF" stroke="#E4E0D8" stroke-width="2"/>' +
        '<circle cx="152" cy="40" r="1.8" fill="#3C2E28"/>' +
        // beak
        '<path d="M 158 42 L 178 46 L 158 49 Z" fill="#F2A33C"/>' +
        // legs trailing
        '<path d="M 116 106 L 124 134" stroke="#F2A33C" stroke-width="3.5" stroke-linecap="round"/>' +
        '<path d="M 104 106 L 108 136" stroke="#F2A33C" stroke-width="3.5" stroke-linecap="round"/>' +
        // sling rope to bundle
        '<path d="M 96 96 Q 86 116 92 128" stroke="#C9BCA9" stroke-width="2.5" fill="none"/>' +
        '<path d="M 120 100 Q 124 120 118 132" stroke="#C9BCA9" stroke-width="2.5" fill="none"/>' +
        // bundle
        '<path d="M 84 126 Q 105 116 126 126 Q 132 150 105 156 Q 78 150 84 126 Z" fill="#CFE6F4" stroke="#B6D5E8" stroke-width="2"/>' +
        '<path d="M 100 116 L 110 116 L 105 108 Z" fill="#CFE6F4" stroke="#B6D5E8" stroke-width="2"/>' +  // knot
        // peeking calf face
        '<circle cx="105" cy="138" r="13" fill="#F7F1E7"/>' +
        '<ellipse cx="92" cy="132" rx="6" ry="4" fill="#F0916F" transform="rotate(-26 92 132)"/>' +
        '<ellipse cx="118" cy="132" rx="6" ry="4" fill="#F0916F" transform="rotate(26 118 132)"/>' +
        '<path d="M 100 137 Q 102 134 104 137" stroke="#3C2E28" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        '<path d="M 106 137 Q 108 134 110 137" stroke="#3C2E28" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
        '<circle cx="98" cy="143" r="1.2" fill="#FFB7D0"/>' +
        '<circle cx="112" cy="143" r="1.2" fill="#FFB7D0"/>' +
      '</svg>';
  }

  // ============================================================
  // WELCOME / BIRTH FLOW
  // ============================================================
  var root, draft, qIndex;

  function openWelcome() {
    root = document.getElementById('calf-welcome');
    if (!root) return;
    draft = emptyCalf();
    qIndex = 0;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    track('calf_welcome_open');
    sceneArrival();
  }

  function closeWelcome() {
    if (!root) return;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = '';
    document.body.style.overflow = '';
  }

  function render(html) { if (root) root.innerHTML = '<div class="calf-scene">' + html + '</div>'; }
  function $(sel) { return root ? root.querySelector(sel) : null; }
  function on(sel, ev, fn) { var el = $(sel); if (el) el.addEventListener(ev, fn); }

  // Scene 1 — the stork arrives
  function sceneArrival() {
    render(
      '<div class="calf-sky">' +
        '<div class="calf-cloud c1">☁️</div><div class="calf-cloud c2">☁️</div>' +
        '<div class="calf-stork gentle-float">' + storkSvg() + '</div>' +
      '</div>' +
      '<h2>Something special is on its way…</h2>' +
      '<p>A little one is being brought to you. Ready to meet them?</p>' +
      '<div class="calf-actions">' +
        '<button class="calf-btn calf-btn-primary" id="calf-go-bundle">Here they come 🐮</button>' +
        '<button class="calf-btn calf-btn-ghost" id="calf-skip">Maybe later</button>' +
      '</div>'
    );
    on('#calf-go-bundle', 'click', sceneReveal);
    on('#calf-skip', 'click', skipWelcome);
  }

  // Scene 2 — open the blanket / reveal the calf
  function sceneReveal() {
    render(
      '<div class="calf-stage-art pop-in" id="calf-reveal" style="position:relative">' + calfSvg('sleepy') +
        '<span class="calf-sparkle s1">✨</span><span class="calf-sparkle s2">🌿</span>' +
        '<span class="calf-sparkle s3">💛</span><span class="calf-sparkle s4">✨</span>' +
      '</div>' +
      '<h2>A little calf has arrived.</h2>' +
      '<p>They\'re yours to care for. As you look after them, you\'re quietly practising looking after you.</p>' +
      '<div class="calf-actions">' +
        '<button class="calf-btn calf-btn-primary" id="calf-to-name">Say hello</button>' +
      '</div>'
    );
    // fire the sparkles
    var sp = root.querySelectorAll('.calf-sparkle');
    var pos = [['-50px', '-50px'], ['55px', '-40px'], ['-40px', '40px'], ['45px', '50px']];
    sp.forEach(function (el, i) {
      el.style.setProperty('--dx', pos[i][0]); el.style.setProperty('--dy', pos[i][1]);
      setTimeout(function () { el.classList.add('go'); }, 250 + i * 90);
    });
    on('#calf-to-name', 'click', sceneNameCalf);
  }

  // Scene 3 — name the calf
  function sceneNameCalf() {
    render(
      '<div class="calf-stage-art gentle-float">' + calfSvg('content') + '</div>' +
      '<h2>What shall we call them?</h2>' +
      '<p>Pick a name that makes you smile.</p>' +
      '<input class="calf-input" id="calf-name-input" type="text" maxlength="24" autocomplete="off" ' +
        'placeholder="e.g. Buttercup, Mochi, Clover" inputmode="text">' +
      '<div class="calf-actions">' +
        '<button class="calf-btn calf-btn-primary" id="calf-name-next" disabled>That\'s the one</button>' +
      '</div>'
    );
    var input = $('#calf-name-input'); var next = $('#calf-name-next');
    input.addEventListener('input', function () { next.disabled = !input.value.trim(); });
    input.focus();
    next.addEventListener('click', function () {
      draft.calfName = input.value.trim().slice(0, 24);
      sceneYourName();
    });
  }

  // Scene 4 — your name
  function sceneYourName() {
    render(
      '<div class="calf-stage-art gentle-float">' + calfSvg('happy') + '</div>' +
      '<h2>And what should ' + esc(draft.calfName) + ' call you?</h2>' +
      '<p>Just a first name or nickname is perfect.</p>' +
      '<input class="calf-input" id="calf-you-input" type="text" maxlength="24" autocomplete="given-name" ' +
        'placeholder="Your name">' +
      '<div class="calf-actions">' +
        '<button class="calf-btn calf-btn-primary" id="calf-you-next">Nice to meet you</button>' +
        '<button class="calf-btn calf-btn-ghost" id="calf-you-skip">Skip</button>' +
      '</div>'
    );
    var input = $('#calf-you-input'); input.focus();
    $('#calf-you-next').addEventListener('click', function () {
      draft.userName = input.value.trim().slice(0, 24);
      startQuestions();
    });
    $('#calf-you-skip').addEventListener('click', startQuestions);
  }

  // Scene 5 — gentle questions (one at a time)
  function startQuestions() { qIndex = 0; sceneQuestion(); }

  function sceneQuestion() {
    if (qIndex >= QUESTIONS.length) return sceneFocus();
    var item = QUESTIONS[qIndex];
    var chips = item.opts.map(function (o) {
      return '<button class="calf-chip" data-val="' + esc(o) + '">' + esc(o) + '</button>';
    }).join('');
    render(
      '<p class="calf-fineprint">A few gentle questions · these stay on your device</p>' +
      '<h2>' + esc(item.q) + '</h2>' +
      (item.note ? '<p>' + esc(item.note) + '</p>' : '') +
      '<div class="calf-choices">' + chips + '</div>' +
      '<div class="calf-actions"><button class="calf-btn calf-btn-ghost" id="calf-q-skip">Skip this</button></div>' +
      progressDots(QUESTIONS.length + 1, qIndex)
    );
    root.querySelectorAll('.calf-chip').forEach(function (btn) {
      btn.addEventListener('click', function () {
        draft.intake[item.id] = btn.dataset.val;
        // weight the nudged domain so it leans forward in focus later
        if (typeof item.nudge === 'number') {
          draft._nudges = draft._nudges || {};
          draft._nudges[item.nudge] = (draft._nudges[item.nudge] || 0) + 1;
        }
        btn.classList.add('selected');
        qIndex++;
        setTimeout(sceneQuestion, 180);
      });
    });
    $('#calf-q-skip').addEventListener('click', function () { qIndex++; sceneQuestion(); });
  }

  // Scene 6 — pick focus areas (multi-select, reorders IMAGINE)
  function sceneFocus() {
    var items = DOMAINS.map(function (d) {
      return '<button class="calf-focus-item" data-i="' + d.i + '" style="--c:var(' + d.color + ')">' +
        '<span class="ico">' + d.emoji + '</span><span>' + esc(d.label) + '</span></button>';
    }).join('');
    render(
      '<div class="calf-stage-art gentle-float" style="width:120px;height:120px">' + calfSvg('happy') + '</div>' +
      '<h2>What would you like to grow together?</h2>' +
      '<p>Pick a few. We\'ll bring these to the top of your daily IMAGINE.</p>' +
      '<div class="calf-focus-grid">' + items + '</div>' +
      '<div class="calf-actions"><button class="calf-btn calf-btn-primary" id="calf-focus-next">Let\'s begin</button></div>' +
      progressDots(QUESTIONS.length + 1, QUESTIONS.length)
    );
    var sel = [];
    root.querySelectorAll('.calf-focus-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = +btn.dataset.i;
        var at = sel.indexOf(i);
        if (at >= 0) { sel.splice(at, 1); btn.classList.remove('selected'); }
        else { sel.push(i); btn.classList.add('selected'); }
      });
    });
    $('#calf-focus-next').addEventListener('click', function () { draft.focus = sel.slice(); finish(); });
  }

  function progressDots(total, on) {
    var s = '';
    for (var i = 0; i < total; i++) s += '<span class="' + (i <= on ? 'on' : '') + '"></span>';
    return '<div class="calf-progress">' + s + '</div>';
  }

  // Scene 7 — done: persist, seed IMAGINE order + profile, celebrate
  function finish() {
    delete draft._nudges_applied;
    // Build the IMAGINE order: chosen focus first (nudged ones bubble up
    // within that), then everything else in canonical order.
    var nudges = draft._nudges || {};
    var chosen = (draft.focus || []).slice().sort(function (a, b) {
      return (nudges[b] || 0) - (nudges[a] || 0);
    });
    var order = chosen.slice();
    for (var i = 0; i < DOMAINS.length; i++) if (order.indexOf(i) === -1) order.push(i);
    try { localStorage.setItem(ORDER_KEY, JSON.stringify(order)); } catch (_) {}

    // Seed TherapyProfile active themes (so chat continuity reflects it).
    try {
      if (window.TherapyProfile) {
        var p = window.TherapyProfile.getProfile();
        var themes = (draft.focus || []).map(function (i) { return DOMAINS[i].label; });
        if (themes.length) p.activeThemes = themes;
        window.TherapyProfile.saveProfile(p);
      }
    } catch (_) {}

    delete draft._nudges;
    save(draft);
    try { localStorage.removeItem(SKIP_KEY); } catch (_) {}
    track('calf_born', { focus: (draft.focus || []).length });

    var name = draft.calfName || 'Your calf';
    var you = draft.userName ? (', ' + esc(draft.userName)) : '';
    render(
      '<div class="calf-stage-art pop-in">' + calfSvg('beam') + '</div>' +
      '<h2>' + esc(name) + ' is so glad to meet you' + you + '.</h2>' +
      '<p>You\'ll find ' + esc(name) + ' grazing in your Progress Pasture, over in Your Space. Spend a moment together whenever you like — there\'s no streak to keep up.</p>' +
      '<div class="calf-actions">' +
        '<button class="calf-btn calf-btn-primary" id="calf-done">Visit the pasture</button>' +
      '</div>'
    );
    $('#calf-done').addEventListener('click', function () {
      closeWelcome();
      renderHome();
      // The calf now lives in the pasture — take them to Your Space and open it.
      try {
        var t = document.querySelector('.tab-btn[data-tab="you"]'); if (t) t.click();
        var block = document.getElementById('pasture-block'); if (block) block.click();
      } catch (_) {}
    });
  }

  function skipWelcome() {
    try { localStorage.setItem(SKIP_KEY, todayKey()); } catch (_) {}
    track('calf_welcome_skip');
    closeWelcome();
    renderHome();
  }

  // ============================================================
  // PASTURE CARD  (the calf's home base — lives in the Progress
  // Pasture panel, under Your Space; #calf-home is its mount point)
  // ============================================================
  var moodCared = [
    'is snuggled up, happy you came by.',
    'gives you a little nuzzle. 💛',
    'feels calmer with you here.'
  ];
  var moodUncared = [
    'is looking your way. Spend a moment together?',
    'would love a little of your time today.',
    'perks up the moment they see you.'
  ];

  function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }

  function renderHome() {
    var slot = document.getElementById('calf-home');
    if (!slot) return;
    var c = load();

    if (!c || !c.born) {
      // invitation card
      slot.innerHTML =
        '<div class="calf-card calf-invite" id="calf-invite" role="button" tabindex="0" aria-label="Meet your calf">' +
          '<div class="calf-invite-row">' +
            '<div class="calf-stage" aria-hidden="true">' + calfSvg('sleepy') + '</div>' +
            '<div class="calf-invite-text">' +
              '<strong>Meet your calf</strong>' +
              '<span>A little one is on the way — welcome them, and raise them alongside you.</span>' +
            '</div>' +
            '<span class="calf-invite-arrow" aria-hidden="true">→</span>' +
          '</div>' +
        '</div>';
      var inv = document.getElementById('calf-invite');
      inv.addEventListener('click', openWelcome);
      inv.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openWelcome(); }
      });
      return;
    }

    var pts = growthPoints(c);
    var stage = stageFor(pts);
    var caredToday = (c.careDays || []).indexOf(todayKey()) !== -1;
    var daysTogether = (c.careDays || []).length;
    var seed = new Date().getDate();
    var mood = caredToday ? pick(moodCared, seed) : pick(moodUncared, seed);

    // growth bar toward the next stage
    var pct = 100, label = '✦ ' + stage.title;
    if (stage.next != null) {
      var span = stage.next - stage.min;
      pct = Math.max(6, Math.min(100, Math.round(((pts - stage.min) / span) * 100)));
      label = stage.title;
    }

    slot.innerHTML =
      '<div class="calf-card calf-card-merged" id="calf-card">' +
        '<div class="calf-meta">' +
          '<h2 class="calf-name">' + esc(c.calfName || 'Your calf') + '</h2>' +
          '<p class="calf-mood">' + esc(c.calfName || 'Your calf') + ' ' + esc(mood) + '</p>' +
          '<p class="calf-grazing">That’s them grazing in your pasture below. 🌿</p>' +
          '<div class="calf-growth">' +
            '<div class="calf-growth-bar"><div class="calf-growth-fill" id="calf-fill"></div></div>' +
            '<span class="calf-growth-label">' + esc(label) + '</span>' +
          '</div>' +
        '</div>' +
        '<button class="calf-cta" id="calf-care-toggle">🤍 Spend a moment with ' + esc(c.calfName || 'them') + '</button>' +
        '<div class="calf-care" id="calf-care" hidden>' +
          '<p class="calf-care-intro">Caring for ' + esc(c.calfName || 'them') + ' is a way of caring for you.</p>' +
          careBtn('🍼', 'Feed', 'Notice something good', '/exercises/gratitude.html') +
          careBtn('🤍', 'Cuddle', 'A moment of self-kindness', '/exercises/self-compassion.html') +
          careBtn('🎈', 'Play', 'A little joy & fun', '/exercises/joy.html') +
          careBtn('🌬️', 'Settle', 'Breathe & steady', '/exercises/box-breathing.html') +
        '</div>' +
        (daysTogether ? '<p class="calf-care-intro" style="margin-top:.7rem">' + daysTogether + ' day' + (daysTogether === 1 ? '' : 's') + ' together so far. 🌱</p>' : '') +
      '</div>';

    // animate the growth bar
    requestAnimationFrame(function () { var f = document.getElementById('calf-fill'); if (f) f.style.width = pct + '%'; });

    // care menu toggle
    var toggle = document.getElementById('calf-care-toggle');
    var menu = document.getElementById('calf-care');
    toggle.addEventListener('click', function () { menu.hidden = !menu.hidden; });
    menu.querySelectorAll('.calf-care-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        recordCare();
        var href = b.dataset.href;
        if (href) window.location.href = href;
      });
    });
  }

  function careBtn(ico, title, sub, href) {
    return '<button class="calf-care-btn" data-href="' + href + '">' +
      '<span class="ico">' + ico + '</span>' +
      '<strong>' + title + '</strong><span>' + sub + '</span></button>';
  }

  // Record a care touch for today (de-duplicated per calendar day). Drives
  // "days together" and growth. Deliberately no breakable-streak pressure.
  function recordCare() {
    var c = load(); if (!c) return;
    c.careDays = c.careDays || [];
    var k = todayKey();
    if (c.careDays.indexOf(k) === -1) {
      c.careDays.push(k);
      if (c.careDays.length > 400) c.careDays = c.careDays.slice(-400);
      save(c);
      track('calf_care');
    }
  }

  // ============================================================
  // BOOT
  // ============================================================
  function boot() {
    renderHome();
    // First-ever load with no calf and not yet skipped → invite them in.
    var skipped = false;
    try { skipped = !!localStorage.getItem(SKIP_KEY); } catch (_) {}
    if (!isBorn() && !skipped && document.getElementById('calf-welcome')) {
      // small delay so the app paints first
      setTimeout(openWelcome, 700);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // public surface (handy for the YOU tab / settings, and re-renders)
  window.CowchCalf = {
    open: openWelcome,
    isBorn: isBorn,
    renderHome: renderHome,
    care: recordCare,
    reset: function () { try { localStorage.removeItem(KEY); localStorage.removeItem(SKIP_KEY); } catch (_) {} renderHome(); }
  };
})();
