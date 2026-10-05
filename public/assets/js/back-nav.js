/* ============================================================
   Back buttons — one shared behaviour for the IMAGINE flow.

   Every "← Back" / "Back to IMAGINE" link on /imagine/*.html and
   /exercises/*.html keeps a plain href as its fallback (the letter page, or
   the IMAGINE tab). On top of that:

   - If the user got here from another page of the app (the IMAGINE tab, a
     letter page, "More exercises", the Your Space history), Back returns to
     exactly that page with history.back(), so they land where they came from
     and the browser restores their place.
   - If there is no usable history (installed app opened straight on this
     page, a bookmark, a link from outside), Back follows the href.
   - If history.back() turns out to do nothing, we follow the href anyway, so
     the button can never be a dead press.

   Exercise pages that have no Back link of their own get one added here.
   ============================================================ */
(function () {
  'use strict';
  var FROM_OK = /^\/(app\.html|imagine\/[a-z]+\.html)$/;

  function cameFromApp() {
    try {
      var r = new URL(document.referrer);
      return r.origin === location.origin && r.pathname !== location.pathname &&
             FROM_OK.test(r.pathname) && history.length > 1;
    } catch (_) { return false; }
  }

  function wire(a) {
    if (a.getAttribute('data-back-wired')) return;
    a.setAttribute('data-back-wired', '1');
    a.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (!cameFromApp()) return;               // no history: the href does the job
      e.preventDefault();
      var left = false, href = a.href;
      window.addEventListener('pagehide', function () { left = true; }, { once: true });
      history.back();
      setTimeout(function () { if (!left) location.href = href; }, 700);
    });
  }

  function hubFor() {
    var m = location.pathname.match(/^\/exercises\/([a-z0-9-]+)\.html$/), C = window.CowchExercises;
    if (!m || !C) return '/app.html#imagine';
    for (var i = 0; i < C.AREAS.length; i++)
      for (var j = 0; j < C.AREAS[i].exercises.length; j++)
        if (C.AREAS[i].exercises[j].slug === m[1]) return '/imagine/' + C.AREAS[i].key + '.html';
    return '/app.html#imagine';
  }

  function init() {
    var links = document.querySelectorAll('a.back, a.back-btn, a.back-button');
    for (var i = 0; i < links.length; i++) wire(links[i]);
    if (!links.length && /^\/exercises\//.test(location.pathname)) {
      var a = document.createElement('a');
      a.className = 'back-btn';
      a.href = hubFor();
      a.textContent = '← Back';
      a.style.cssText = 'position:fixed;top:max(12px,env(safe-area-inset-top));left:12px;z-index:9999;' +
        'padding:10px 16px;border-radius:12px;background:rgba(0,0,0,.55);color:#fff;font:700 15px/1.2 system-ui,sans-serif;' +
        'text-decoration:none;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
      document.body.appendChild(a);
      wire(a);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
