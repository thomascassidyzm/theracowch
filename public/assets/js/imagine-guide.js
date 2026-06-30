/* ============================================================
   IMAGINE guide — a little cow face + thought bubble that leads you
   through an area's exercises one at a time, Finch-style, instead of
   handing you the whole grid to pick from.

   Self-contained, on-device, no framework. Drops onto any IMAGINE
   area page (self / mindfulness / acceptance / …): it reads the
   .exercise-card elements already on the page, hides them, and lets
   the cow suggest one exercise at a time with a warm guiding line.

   It stays non-clinical and pressure-free: the cow only *suggests*.
   There's always a quiet "I'll choose myself" toggle that brings the
   full grid back, and the preference is remembered. If the user has
   already met their calf companion (cowch_calf), the guide speaks as
   that calf, by name — one continuous companion across the app.
   ============================================================ */
(function () {
  'use strict';

  if (window.__cowchImagineGuide) return;
  window.__cowchImagineGuide = true;

  var DONE_KEY = 'cowch_imagine_guide';     // { done: { url: 'YYYY-MM-DD' } }
  var PREF_KEY = 'cowch_imagine_guide_pref'; // 'guided' | 'browse'

  // Domain colours, mirroring variables.css. Keyed by the area filename so
  // the guide matches the page even when variables.css isn't loaded there.
  var DOMAIN_ACCENT = {
    'self':         '#E87EA8',
    'mindfulness':  '#5BB4E0',
    'acceptance':   '#9C7CD4',
    'gratitude':    '#34B7AE',
    'interactions': '#FFD21E',
    'nurturing':    '#F2802E',
    'exploring':    '#F25C6A'
  };

  // ---------- small utils ----------
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }
  function loadJSON(key, fallback) {
    try { var s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch (_) {}
    return fallback;
  }
  function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {} }
  function getPref() { try { return localStorage.getItem(PREF_KEY) || 'guided'; } catch (_) { return 'guided'; } }
  function setPref(v) { try { localStorage.setItem(PREF_KEY, v); } catch (_) {} }
  function track(n, p) { try { if (window.cowchTrack) window.cowchTrack(n, p); } catch (_) {} }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // Readable text colour on the accent (the yellow connect-domain needs dark ink).
  function onAccent(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return '#ffffff';
    var n = parseInt(m[1], 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    // relative luminance
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62 ? '#2D2D2D' : '#ffffff';
  }

  // ---------- which area are we on ----------
  function areaKey() {
    var m = /\/imagine\/([a-z]+)\.html/i.exec(location.pathname);
    return m ? m[1].toLowerCase() : null;
  }

  // ---------- read the calf companion (for continuity) ----------
  function companion() {
    var c = loadJSON('cowch_calf', null);
    if (c && c.born) return { name: (c.calfName || '').trim(), you: (c.userName || '').trim() };
    return { name: '', you: '' };
  }

  // ---------- parse the exercise cards on the page ----------
  function cardURL(card) {
    // 1) the card itself is a link
    if (card.tagName === 'A' && card.getAttribute('href')) {
      var h = card.getAttribute('href');
      if (/\/exercises\//.test(h)) return h;
    }
    // 2) a descendant link into /exercises/
    var a = card.querySelector('a[href*="/exercises/"]');
    if (a) return a.getAttribute('href');
    // 3) an onclick="window.location.href='…'" on the card or a descendant
    var hosts = [card].concat(Array.prototype.slice.call(card.querySelectorAll('[onclick]')));
    for (var i = 0; i < hosts.length; i++) {
      var oc = hosts[i].getAttribute && hosts[i].getAttribute('onclick');
      if (oc) {
        var mm = /location\.href\s*=\s*['"]([^'"]+)['"]/.exec(oc);
        if (mm && /\/exercises\//.test(mm[1])) return mm[1];
      }
    }
    return null;
  }
  function textOf(card, selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = card.querySelector(selectors[i]);
      if (el && el.textContent.trim()) return el.textContent.trim().replace(/\s+/g, ' ');
    }
    return '';
  }
  function collectCards() {
    var nodes = Array.prototype.slice.call(document.querySelectorAll('.exercise-card'));
    var out = [];
    nodes.forEach(function (card) {
      var url = cardURL(card);
      if (!url) return;
      var title = textOf(card, ['.exercise-title', 'h2', 'h3', 'h4']);
      var desc = textOf(card, ['.exercise-description', 'p']);
      if (!title) return;
      out.push({ el: card, url: url, title: title, desc: desc });
    });
    return out;
  }

  // ---------- done tracking ----------
  function doneMap() { var d = loadJSON(DONE_KEY, null) || {}; if (!d.done) d.done = {}; return d; }
  function markDone(url) {
    var d = doneMap();
    d.done[url] = todayKey();
    saveJSON(DONE_KEY, d);
  }
  function isDoneToday(url) { return doneMap().done[url] === todayKey(); }

  // ---------- the little cow face ----------
  // Head-only chibi cow matching the mascot: cream head, coral patch + ears,
  // pink blush, gentle smile. .ig-lid rects let it blink (CSS-driven).
  function cowFace() {
    return '' +
      '<svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        '<ellipse cx="100" cy="158" rx="40" ry="7" fill="rgba(60,46,40,0.10)"/>' +
        // horns
        '<ellipse cx="74" cy="42" rx="7" ry="11" fill="#F0E7D6" transform="rotate(-14 74 42)"/>' +
        '<ellipse cx="126" cy="42" rx="7" ry="11" fill="#F0E7D6" transform="rotate(14 126 42)"/>' +
        // ears
        '<ellipse cx="48" cy="74" rx="20" ry="12" fill="#F0916F" transform="rotate(-26 48 74)"/>' +
        '<ellipse cx="152" cy="74" rx="20" ry="12" fill="#F0916F" transform="rotate(26 152 74)"/>' +
        '<ellipse cx="50" cy="74" rx="10" ry="6" fill="#FFB7D0" transform="rotate(-26 50 74)"/>' +
        '<ellipse cx="150" cy="74" rx="10" ry="6" fill="#FFB7D0" transform="rotate(26 150 74)"/>' +
        // head
        '<circle cx="100" cy="92" r="50" fill="#F7F1E7"/>' +
        '<path d="M 64 66 Q 78 52 96 62 Q 84 72 64 76 Z" fill="#F0916F"/>' +  // coral patch
        '<path d="M 94 46 Q 100 36 106 46" stroke="#F0E7D6" stroke-width="5" fill="none" stroke-linecap="round"/>' +  // tuft
        // snout
        '<ellipse cx="100" cy="114" rx="26" ry="17" fill="#FBE6DC"/>' +
        '<ellipse cx="92" cy="112" rx="3" ry="2.4" fill="#3C2E28"/>' +
        '<ellipse cx="108" cy="112" rx="3" ry="2.4" fill="#3C2E28"/>' +
        // blush
        '<circle cx="64" cy="104" r="9" fill="#FFB7D0" opacity=".7"/>' +
        '<circle cx="136" cy="104" r="9" fill="#FFB7D0" opacity=".7"/>' +
        // eyes (open) + lids for blinking
        '<circle cx="82" cy="94" r="5" fill="#3C2E28"/><circle cx="118" cy="94" r="5" fill="#3C2E28"/>' +
        '<circle cx="84" cy="92" r="1.6" fill="#fff"/><circle cx="120" cy="92" r="1.6" fill="#fff"/>' +
        '<rect class="ig-lid" x="74" y="86" width="16" height="11" rx="5" fill="#F7F1E7" opacity="0"/>' +
        '<rect class="ig-lid" x="110" y="86" width="16" height="11" rx="5" fill="#F7F1E7" opacity="0"/>' +
        // smile
        '<path d="M 90 110 Q 100 120 110 110" stroke="#3C2E28" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
      '</svg>';
  }

  // ---------- copy ----------
  var INTROS_FIRST = [
    'How about we start here?',
    'Let’s ease in with this one.',
    'Here’s a gentle place to begin.',
    'Want to try this one together?',
    'This one might feel good right now.'
  ];
  var INTROS_NEXT = [
    'No rush — how about this instead?',
    'Okay, what about this one?',
    'Sure, let’s look at another.',
    'Here’s a different one to sit with.'
  ];
  var INTROS_DONE = [
    'You’ve made the rounds here today. 🌿 Want to revisit one?',
    'Lovely — you’ve been through these today. Fancy another pass?'
  ];

  function pick(arr, n) { return arr[((n % arr.length) + arr.length) % arr.length]; }

  // ---------- build + render ----------
  var cards, ordered, idx, leadIdx, accent, comp;

  function orderCards() {
    // gentlest-first is the page author's order; just float not-done-today up.
    var notDone = [], done = [];
    cards.forEach(function (c) { (isDoneToday(c.url) ? done : notDone).push(c); });
    ordered = notDone.concat(done);
    if (!ordered.length) ordered = cards.slice();
    idx = 0;
  }

  function stepsDots() {
    var total = cards.length;
    var doneCount = cards.filter(function (c) { return isDoneToday(c.url); }).length;
    var s = '';
    for (var i = 0; i < total; i++) s += '<span class="' + (i < doneCount ? 'done' : '') + '"></span>';
    return '<div class="ig-steps" aria-hidden="true">' + s + '</div>';
  }

  function speakerPrefix() {
    // If the user has a named calf, the calf does the suggesting (by name).
    if (comp.name) return comp.name + ': ';
    return '';
  }

  function renderGuide(guide) {
    var allDone = ordered.length && ordered.every(function (c) { return isDoneToday(c.url); });
    var lead, pickCard;
    if (allDone) {
      lead = pick(INTROS_DONE, leadIdx);
      pickCard = ordered[((idx % ordered.length) + ordered.length) % ordered.length];
    } else {
      lead = (leadIdx === 0 ? pick(INTROS_FIRST, 0) : pick(INTROS_NEXT, leadIdx - 1));
      pickCard = ordered[((idx % ordered.length) + ordered.length) % ordered.length];
    }
    var leadText = speakerPrefix() + lead;

    guide.innerHTML =
      '<div class="ig-cow">' + cowFace() + '</div>' +
      '<div class="ig-bubble">' +
        '<div class="ig-swap" id="ig-swap">' +
          '<p class="ig-lead">' + esc(leadText) + '</p>' +
          '<h2 class="ig-pick-title">' + esc(pickCard.title) + '</h2>' +
          (pickCard.desc ? '<p class="ig-pick-desc">' + esc(pickCard.desc) + '</p>' : '') +
          '<div class="ig-actions">' +
            '<button type="button" class="ig-btn ig-btn-go" id="ig-go">Let’s do this →</button>' +
            (ordered.length > 1 ? '<button type="button" class="ig-btn ig-btn-soft" id="ig-next">Show me another</button>' : '') +
          '</div>' +
          stepsDots() +
          '<button type="button" class="ig-toggle" id="ig-browse">I’d rather choose myself</button>' +
        '</div>' +
      '</div>';

    var go = guide.querySelector('#ig-go');
    if (go) go.addEventListener('click', function () {
      markDone(pickCard.url);
      track('imagine_guide_go', { area: areaKey() });
      window.location.href = pickCard.url;
    });
    var next = guide.querySelector('#ig-next');
    if (next) next.addEventListener('click', function () {
      idx++; leadIdx++;
      track('imagine_guide_next', { area: areaKey() });
      renderGuide(guide);
    });
    var browse = guide.querySelector('#ig-browse');
    if (browse) browse.addEventListener('click', function () {
      setPref('browse');
      track('imagine_guide_browse', { area: areaKey() });
      showGrid(guide);
    });
  }

  function showGrid(guide) {
    cards.forEach(function (c) { c.el.classList.remove('ig-card-hidden'); });
    guide.innerHTML =
      '<div class="ig-cow">' + cowFace() + '</div>' +
      '<div class="ig-bubble">' +
        '<p class="ig-lead" style="margin:0">' +
          esc((comp.name ? comp.name + ' is' : 'I’m') + ' right here if you’d like a nudge.') +
        '</p>' +
        '<button type="button" class="ig-toggle" id="ig-guide-me" style="margin-top:8px">' +
          'Guide me instead' +
        '</button>' +
      '</div>';
    var g = guide.querySelector('#ig-guide-me');
    if (g) g.addEventListener('click', function () {
      setPref('guided');
      cards.forEach(function (c) { c.el.classList.add('ig-card-hidden'); });
      orderCards(); leadIdx = 0;
      renderGuide(guide);
    });
  }

  function init() {
    if (!areaKey()) return;
    cards = collectCards();
    if (cards.length < 2) return; // nothing meaningful to guide through

    comp = companion();
    accent = DOMAIN_ACCENT[areaKey()] || '#C97B63';

    var guide = document.createElement('section');
    guide.className = 'ig-guide';
    guide.setAttribute('aria-label', 'Your guide through these exercises');
    guide.style.setProperty('--ig-accent', accent);
    guide.style.setProperty('--ig-on-accent', onAccent(accent));

    // Insert just before the first card so it sits at the top of the list.
    var first = cards[0].el;
    first.parentNode.insertBefore(guide, first);

    if (getPref() === 'browse') {
      showGrid(guide);
    } else {
      cards.forEach(function (c) { c.el.classList.add('ig-card-hidden'); });
      orderCards();
      leadIdx = 0;
      renderGuide(guide);
    }
    track('imagine_guide_shown', { area: areaKey(), pref: getPref() });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
