/* ============================================================
   IMAGINE engagement recorder — for the standalone exercise pages.

   The Progress Pasture cow already *renders* a pose per IMAGINE area
   (mindfulness → the cross-legged lotus cow, gratitude → the thank-you
   cow, and so on — see app.js buildCow3D / COW3D). What was missing was
   the signal: doing an exercise on one of the /exercises/*.html pages
   never told the pasture anything, so the cow never reflected it.

   This tiny, self-contained script closes that loop. When a user opens
   an exercise it logs a timestamp against that exercise's IMAGINE area,
   using the same on-device store the in-app chat flow writes to
   (`cowch_imagine_engagement`). Next time the app is opened, the cow
   settles into that area's pose — the pasture "changes when an exercise
   is done", for every one of the seven areas.

   Opening an exercise counts as doing it — this matches how the rest of
   the app already records engagement (the chat "start exercise" buttons
   and the IMAGINE guide's "Let's do this →" both log on open, not on a
   completion screen the varied exercise pages don't share).

   On-device only. No framework. Drop it onto any /exercises/*.html page.
   ============================================================ */
(function () {
  'use strict';

  if (window.__cowchImagineRecorded) return;   // guard against a double include

  var KEY = 'cowch_imagine_engagement';         // shared with chat-script.js / app.js

  // The seven IMAGINE areas → the letter the pasture reads (Interactions = I2).
  var AREA_TO_LETTER = {
    self: 'I', mindfulness: 'M', acceptance: 'A', gratitude: 'G',
    interactions: 'I2', nurturing: 'N', exploring: 'E'
  };

  // Fallback for the handful of exercise pages that don't carry a visible
  // back-link to their IMAGINE area (so we still know which area they belong to).
  var FILE_TO_LETTER = {
    'gratitude-journal': 'G',
    'heal-framework':    'A',
    'thought-stream':    'M',
    'values-compass':    'E',
    'wave':              'A',
    'wonder':            'E'
  };

  function currentSlug() {
    var m = /\/exercises\/([a-z0-9-]+)\.html/i.exec(location.pathname);
    return m ? m[1].toLowerCase() : null;
  }

  // Which IMAGINE area is this exercise? Prefer the page's own back-link to
  // /imagine/<area>.html (authoritative), then fall back to the filename map.
  function areaLetter() {
    var links = document.querySelectorAll('a[href*="/imagine/"]');
    for (var i = 0; i < links.length; i++) {
      var mm = /\/imagine\/([a-z]+)\.html/i.exec(links[i].getAttribute('href') || '');
      if (mm && AREA_TO_LETTER[mm[1].toLowerCase()]) return AREA_TO_LETTER[mm[1].toLowerCase()];
    }
    var slug = currentSlug();
    if (slug && FILE_TO_LETTER[slug]) return FILE_TO_LETTER[slug];
    return null;
  }

  function loadEngagement() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && typeof d === 'object') return d;
    } catch (_) {}
    return { I: [], M: [], A: [], G: [], I2: [], N: [], E: [] };
  }

  function record(letter) {
    var d = loadEngagement();
    if (!Array.isArray(d[letter])) d[letter] = [];
    var now = Date.now();
    d[letter].push(now);
    // Keep only the last 30 days (mirrors chat-script.js' pruning).
    var cutoff = now - 30 * 24 * 60 * 60 * 1000;
    d[letter] = d[letter].filter(function (t) { return typeof t === 'number' && t > cutoff; });
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (_) {}
  }

  function run() {
    var letter = areaLetter();
    if (!letter) return;
    record(letter);
    try {
      if (window.cowchTrack) window.cowchTrack('exercise_engaged', { area: letter, exercise: currentSlug() });
    } catch (_) {}
  }

  window.__cowchImagineRecorded = true;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
