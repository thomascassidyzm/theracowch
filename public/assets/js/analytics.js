/**
 * Cowch telemetry — a thin, privacy-respecting wrapper over Vercel Web
 * Analytics (cookieless). It NEVER sends message or journal content, or any
 * free text the user typed — only event names plus a few coarse,
 * low-cardinality properties (a page slug, a channel tag, a return bucket).
 * `clean()` enforces that: only short scalar properties are ever forwarded.
 *
 * The Vercel `va` stub is set up inline in app.html *before* this runs and
 * queues events until /_vercel/insights/script.js loads, so calling
 * cowchTrack() immediately is safe.
 *
 * Public:        window.cowchTrack(name, props)
 * Auto-emitted:  returned, exercise_open, domain_open, pwa_installed
 * (chat_started, install_guide_opened, install_banner_shown, share are emitted
 *  from their own modules but flow through cowchTrack — so they get `source` too.)
 */
(function () {
  'use strict';

  var SOURCE_KEY = 'cowch-source';        // first-touch acquisition channel
  var LASTVISIT_KEY = 'cowch-last-visit'; // drives the "returned" signal

  // Defence-in-depth: only short scalars get forwarded. No objects, no long
  // strings, nothing that could carry something a user typed.
  function clean(props) {
    var out = {};
    if (!props) return out;
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
      else if (typeof v === 'string' && v) out[k] = v.slice(0, 48);
    });
    return out;
  }

  var cachedSource;
  function source() {
    if (cachedSource !== undefined) return cachedSource;
    try { cachedSource = localStorage.getItem(SOURCE_KEY) || ''; }
    catch (_) { cachedSource = ''; }
    return cachedSource;
  }

  function track(name, props) {
    try {
      if (typeof name !== 'string' || !window.va) return;
      var p = clean(props);
      var s = source();
      if (s) p.source = s;
      window.va('event', Object.assign({ name: name }, p));
    } catch (_) { /* analytics must never break the app */ }
  }
  window.cowchTrack = track;

  // First-touch acquisition source: utm_source or ref (e.g. ?ref=surrey-talk).
  // Kept first-touch so a later organic visit doesn't overwrite where they came
  // from. It's a channel label, never anything personal.
  try {
    var params = new URLSearchParams(window.location.search);
    var src = params.get('utm_source') || params.get('ref');
    if (src && !localStorage.getItem(SOURCE_KEY)) {
      localStorage.setItem(SOURCE_KEY, String(src).slice(0, 40));
      cachedSource = undefined; // force a re-read on the next track()
    }
  } catch (_) {}

  // Returning-visitor signal — a coarse bucket only; no timestamps ever leave
  // the device. First-ever visit emits nothing (the page view already counts).
  try {
    var now = Date.now();
    var last = parseInt(localStorage.getItem(LASTVISIT_KEY) || '0', 10);
    localStorage.setItem(LASTVISIT_KEY, String(now));
    if (last) {
      var hrs = (now - last) / 36e5;
      if (hrs >= 6) {
        track('returned', {
          since: hrs < 24 ? 'same_day'
               : hrs < 72 ? '1_3_days'
               : hrs < 168 ? '4_7_days'
               : hrs < 720 ? '1_4_weeks'
               : 'over_month'
        });
      }
    }
  } catch (_) {}

  // Engagement: opening an IMAGINE domain page or an exercise (anchor nav).
  // We track from the app side so the destination pages need no analytics.
  function slug(href) {
    var m = /\/(?:exercises|imagine)\/([a-z0-9-]+)\.html/i.exec(href || '');
    return m ? m[1] : 'unknown';
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('/exercises/') === 0) track('exercise_open', { id: slug(href) });
    else if (href.indexOf('/imagine/') === 0) track('domain_open', { id: slug(href) });
  }, true);

  // PWA install — the goal of the share loop.
  window.addEventListener('appinstalled', function () { track('pwa_installed'); });
})();
