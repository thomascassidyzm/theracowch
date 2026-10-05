/* ============================================================
   Exercise history — "Your recent exercises".

   Recording: any page under /exercises/<slug>.html logs one visit
   (slug + time) to localStorage on this device. Nothing leaves the device.
   Entries older than 90 days are pruned on every write.

   Viewing: in app.html, the "Your recent exercises" block in Your Space
   opens a panel listing the last 7 days (or 30 on "Show older"), newest
   first, grouped by day. Each row is a plain link back into the exercise.

   Why not activity-log.js? That store dedupes per day and keys by a
   hand-typed name that doesn't match the page, and the weekly report reads
   it; this one needs every visit and the slug. Different job, own key.
   ============================================================ */
(function () {
  'use strict';
  var KEY = 'cowch-exercise-history-v1';
  var KEEP_DAYS = 90, MAX = 1000, RELOAD_GUARD_MS = 5 * 60 * 1000;
  var DAY = 86400000;

  function load() {
    try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (_) { return []; }
  }

  function record(slug) {
    try {
      var now = Date.now(), cutoff = now - KEEP_DAYS * DAY;
      var arr = load().filter(function (e) { return e && e.t > cutoff; });
      var last = arr[arr.length - 1];
      // A reload or quick back-and-forth is the same visit, not a second use.
      if (!(last && last.s === slug && now - last.t < RELOAD_GUARD_MS)) arr.push({ s: slug, t: now });
      if (arr.length > MAX) arr = arr.slice(-MAX);
      localStorage.setItem(KEY, JSON.stringify(arr));
    } catch (_) { /* non-essential */ }
  }

  // ---- recording (exercise pages) ----
  var m = location.pathname.match(/^\/exercises\/([a-z0-9-]+)\.html$/);
  if (m) record(m[1]);

  // ---- viewing (app.html) ----
  function lookup(slug) {
    var C = window.CowchExercises;
    if (!C) return null;
    for (var i = 0; i < C.AREAS.length; i++) {
      var ex = C.AREAS[i].exercises;
      for (var j = 0; j < ex.length; j++)
        if (ex[j].slug === slug) return { title: ex[j].title, letter: C.AREAS[i].letter, color: C.AREAS[i].color, url: C.url(slug) };
    }
    return null;
  }
  function startOfDay(ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function dayLabel(ts) {
    var diff = Math.round((startOfDay(Date.now()) - startOfDay(ts)) / DAY);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return new Date(ts).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // [{label, items:[{info, count}]}] newest day first, within a day newest-used first.
  function groups(days) {
    var since = startOfDay(Date.now()) - (days - 1) * DAY, out = [], byDay = {};
    load().filter(function (e) { return e && e.t >= since && lookup(e.s); })
      .sort(function (a, b) { return b.t - a.t; })
      .forEach(function (e) {
        var k = startOfDay(e.t), g = byDay[k];
        if (!g) { g = byDay[k] = { label: dayLabel(e.t), map: {}, items: [] }; out.push(g); }
        if (g.map[e.s]) g.map[e.s].count++;
        else { g.map[e.s] = { info: lookup(e.s), count: 1 }; g.items.push(g.map[e.s]); }
      });
    return out;
  }

  var days = 7;
  function render() {
    var list = document.getElementById('exhist-list'), more = document.getElementById('exhist-older');
    if (!list) return;
    var g = groups(days), html = '';
    if (!g.length) {
      html = '<p class="exhist-empty">Nothing here yet, and that’s completely fine. ' +
        'When you try an exercise, it will wait here so you can find your way back to it.</p>';
    }
    g.forEach(function (day) {
      html += '<h3 class="exhist-day">' + esc(day.label) + '</h3>';
      day.items.forEach(function (it) {
        html += '<a class="exhist-row" href="' + it.info.url + '">' +
          '<span class="exhist-letter" style="background:' + it.info.color + '">' + esc(it.info.letter) + '</span>' +
          '<span class="exhist-title">' + esc(it.info.title) + '</span>' +
          (it.count > 1 ? '<span class="exhist-count">×' + it.count + '</span>' : '') +
          '<span class="exhist-chev" aria-hidden="true">›</span></a>';
      });
    });
    list.innerHTML = html;
    if (more) more.hidden = days >= 30;
  }

  function wire() {
    var block = document.getElementById('exhist-block'), panel = document.getElementById('exhist-panel');
    if (!block || !panel) return;
    block.addEventListener('click', function () { days = 7; render(); panel.classList.add('active'); });
    var back = document.getElementById('exhist-panel-back');
    if (back) back.addEventListener('click', function () { panel.classList.remove('active'); });
    var more = document.getElementById('exhist-older');
    if (more) more.addEventListener('click', function () { days = 30; render(); });
    // Returning from an exercise (back button / bfcache) shows fresh data.
    window.addEventListener('pageshow', function () { if (panel.classList.contains('active')) render(); });
  }
  if (document.getElementById('exhist-block')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  }
})();
