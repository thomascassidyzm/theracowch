/**
 * Cowch analytics — a thin, privacy-respecting wrapper over Vercel Web
 * Analytics (cookieless, no personal data, no cross-site tracking).
 *
 * The Vercel script (/_vercel/insights/script.js) is loaded from app.html and
 * exposes window.va. This file:
 *   - exposes window.cowchTrack(name, data) — a safe no-op if analytics is
 *     unavailable (e.g. Web Analytics not yet enabled on the Vercel project),
 *   - records the standout product moments (PWA install) automatically.
 *
 * NOTE: page views are tracked automatically by the Vercel script. Custom
 * events (below) require Web Analytics to be enabled for the project in the
 * Vercel dashboard, and may require a paid plan depending on Vercel's terms —
 * everything here degrades to a no-op if not.
 */
(function () {
  'use strict';

  function track(name, data) {
    try {
      if (window.va) window.va('event', Object.assign({ name: name }, data || {}));
    } catch (_) { /* analytics must never break the app */ }
  }

  window.cowchTrack = track;

  // The recipient-installs-the-app moment — the goal of the share loop.
  window.addEventListener('appinstalled', function () {
    track('pwa_installed');
  });
})();
