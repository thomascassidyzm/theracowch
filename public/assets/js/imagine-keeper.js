/* ============================================================
   IMAGINE letter page — show ONE exercise, point to the rest.

   Loaded in the <head> of each /imagine/<letter>.html page, after
   exercise-catalog.js. The page's own exercise cards are hidden by CSS
   (html.ik-pending) until this runs; it then removes every card except
   the letter's keeper (window.CowchExercises.KEEPERS) and adds a clear
   "More exercises" link underneath, so nothing is lost — just moved.
   If the keeper has no card on the page, a plain one is built from the
   catalogue so a swap never needs page edits.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('ik-pending');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function cardURL(card) {
    if (card.tagName === 'A' && /\/exercises\//.test(card.getAttribute('href') || '')) return card.getAttribute('href');
    var oc = card.getAttribute('onclick') || '';
    var m = /location\.href\s*=\s*['"]([^'"]+)['"]/.exec(oc);
    if (m && /\/exercises\//.test(m[1])) return m[1];
    var b = card.querySelector('[onclick*="/exercises/"]');
    if (b) { m = /location\.href\s*=\s*['"]([^'"]+)['"]/.exec(b.getAttribute('onclick')); if (m) return m[1]; }
    return null;
  }
  function slugOf(u) { var m = /\/exercises\/([a-z0-9-]+)/i.exec(u || ''); return m ? m[1] : null; }

  function run() {
    var cat = window.CowchExercises;
    var m = /\/imagine\/([a-z]+)\.html/i.exec(location.pathname);
    var key = m && m[1].toLowerCase();
    var area = cat && key && cat.area(key);
    if (!area) return;
    var keep = cat.keeper(key);

    var cards = Array.prototype.slice.call(document.querySelectorAll('.exercise-card'))
      .filter(function (c) { return cardURL(c); });
    if (!cards.length) return;

    var kept = null;
    cards.forEach(function (c) {
      if (!kept && slugOf(cardURL(c)) === keep.slug) kept = c;
    });
    if (!kept) {
      kept = document.createElement('a');
      kept.href = cat.url(keep.slug);
      kept.className = 'exercise-card';
      kept.style.cssText = 'text-decoration:none;color:inherit;display:block;cursor:pointer;';
      kept.innerHTML = '<h3>' + esc(keep.title) + '</h3><p class="exercise-description">' + esc(keep.desc) +
        '</p><p style="margin-top:16px;font-weight:800;">Try Exercise →</p>';
      cards[0].parentNode.insertBefore(kept, cards[0]);
    }
    cards.forEach(function (c) { if (c !== kept) c.parentNode.removeChild(c); });

    // If they've just come back from an exercise that now lives in
    // "More exercises", name it so they know exactly where it went.
    var from = slugOf(document.referrer);
    var moved = null;
    cat.others(key).forEach(function (e) { if (e.slug === from) moved = e; });

    var more = document.createElement('a');
    more.href = cat.MORE_URL + '#' + key;
    more.className = 'ik-more';
    more.style.setProperty('--ik-accent', area.color);
    more.innerHTML =
      '<span class="ik-more-text"><strong>More exercises</strong><span>' +
        (moved ? 'Looking for ' + esc(moved.title) + '? It’s here, with the other ' + esc(area.name) + ' exercises.'
               : 'The other ' + esc(area.name) + ' exercises, and every other letter’s, live here.') +
      '</span></span><span class="ik-more-arrow" aria-hidden="true">→</span>';

    // Sit just below the card — outside any grid it lives in.
    var host = kept.parentNode;
    var anchor = /exercises/.test(host.className || '') ? host : kept;
    anchor.parentNode.insertBefore(more, anchor.nextSibling);
  }

  function go() {
    try { run(); } finally { root.classList.remove('ik-pending'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
