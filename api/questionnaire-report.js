// What Mandy opens. One page, on a phone, of the questionnaire results people
// have chosen to send her.
//
// This is api/nda-export.js's shape — a shared secret in the query string, no
// login system, fail-closed when unconfigured — with the one difference that is
// the whole point of it: it returns an HTML page, not JSON. The NDA export
// hands a clinician a wall of braces. This hands her cards she can read at a
// glance while standing up.
//
// Provision: set QSHARE_EXPORT_TOKEN in the Vercel env to a long random string.
// It is deliberately NOT the NDA token — different data, different audience,
// separately revocable.
//   GET /api/questionnaire-report?token=<QSHARE_EXPORT_TOKEN>
//   GET /api/questionnaire-report?token=<...>&format=json     (raw, for Tom)
//
// Until the env var is set this answers 503. That is correct behaviour, not a
// bug: no token, no door.

import { Redis } from '@upstash/redis';

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

function esc(s) {
    return String(s === null || s === undefined ? '' : s)
        .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function whenText(iso) {
    if (!iso) return 'date unknown';
    const d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// One axis. The population/absolute split is load-bearing and comes straight
// from the band's own `scale`: Sensitivity and Risk appetite have no comparison
// population, so they must never be drawn or described as a percentile.
// See docs/wording-audit-what-are-you-like.md.
function bandHtml(b) {
    const focus = Number.isFinite(Number(b.focus)) ? Math.round(Number(b.focus)) + '% in focus' : '';
    let scaleLine, left = 0, width = 0;

    if (b.scale === 'absolute') {
        const dial = Number(b.dial);
        const spread = Number(b.spread);
        if (Number.isFinite(dial)) {
            const lo = Math.max(0, dial - (Number.isFinite(spread) ? spread : 0));
            const hi = Math.min(10, dial + (Number.isFinite(spread) ? spread : 0));
            left = lo * 10;
            width = Math.max(2, (hi - lo) * 10);
        }
        scaleLine = Number.isFinite(dial)
            ? esc(dial.toFixed(1)) + ' on its own 0&ndash;10 scale' +
              (Number.isFinite(spread) ? ', give or take ' + esc(spread.toFixed(1)) : '') +
              (b.position ? ' &mdash; ' + esc(b.position) : '')
            : esc(b.position || '');
    } else {
        const lo = Number(b.low), hi = Number(b.high);
        if (Number.isFinite(lo) && Number.isFinite(hi)) {
            left = Math.max(0, lo);
            width = Math.max(2, hi - lo);
        }
        scaleLine = (Number.isFinite(lo) && Number.isFinite(hi))
            ? 'roughly ' + esc(String(lo)) + '&ndash;' + esc(String(hi)) + ' of 100'
            : '';
    }

    return `
      <div class="axis${b.scale === 'absolute' ? ' is-abs' : ''}">
        <div class="axis-head">
          <span class="axis-name">${esc(b.name || b.k || '')}</span>
          <span class="axis-focus">${esc(focus)}</span>
        </div>
        <div class="bar"><span style="left:${left}%;width:${width}%"></span></div>
        <div class="axis-scale">${scaleLine}${b.scale === 'absolute' ? ' <em>(own scale, not a percentile)</em>' : ''}</div>
        <p class="axis-sentence">${esc(b.sentence || '')}</p>
      </div>`;
}

function recordHtml(r) {
    const bands = Array.isArray(r.bands) ? r.bands : [];
    return `
    <article class="card">
      <header class="card-head">
        <h2>${esc(r.displayName || 'No name given')}</h2>
        <p class="meta">${esc(whenText(r.receivedAt))}
          &middot; ${r.variant === 'rank' ? 'ranked' : 'single-choice'}
          ${Number.isFinite(Number(r.scenariosSeen)) ? '&middot; ' + esc(String(r.scenariosSeen)) + ' moments answered' : ''}
          ${r.source ? '&middot; came via <b>' + esc(r.source) + '</b>' : '&middot; no source label'}
        </p>
        ${r.email ? `<p class="meta"><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></p>` : ''}
      </header>
      ${bands.map(bandHtml).join('')}
    </article>`;
}

function pageHtml(records) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Cowch — shared questionnaire results</title>
<style>
  :root { --ink:#2D2D2D; --cream:#FDF5E8; --coral:#E35B32; --muted:#7A6556; --body:#5C4432; }
  * { box-sizing: border-box; }
  body { margin:0; padding:16px 14px 48px; background:var(--cream); color:var(--ink);
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
         line-height:1.5; -webkit-text-size-adjust:100%; }
  .wrap { max-width:640px; margin:0 auto; }
  h1 { font-size:1.35rem; font-weight:900; margin:0 0 4px; }
  .lede { color:var(--body); font-size:.94rem; margin:0 0 14px; }
  .honesty { background:#FFF6F0; border-left:5px solid #C9A857; padding:12px 14px;
             font-size:.88rem; color:var(--body); margin:0 0 22px; }
  .card { background:#fff; border:3px solid var(--ink); border-radius:14px;
          padding:16px; margin-bottom:18px; box-shadow:5px 5px 0 rgba(60,46,40,.16); }
  .card-head { border-bottom:2px solid #EFE3D4; padding-bottom:10px; margin-bottom:14px; }
  .card-head h2 { font-size:1.1rem; font-weight:900; margin:0; }
  .meta { font-size:.82rem; color:var(--muted); margin:3px 0 0; }
  .meta a { color:var(--coral); }
  .axis { margin-bottom:16px; }
  .axis-head { display:flex; justify-content:space-between; align-items:baseline; gap:8px; }
  .axis-name { font-weight:800; font-size:.98rem; }
  .axis-focus { font-size:.78rem; color:var(--muted); white-space:nowrap; }
  .bar { position:relative; height:10px; border-radius:6px; background:#F0E6D8;
         margin:6px 0 5px; overflow:hidden; }
  .bar span { position:absolute; top:0; bottom:0; border-radius:6px; background:var(--coral); }
  .is-abs .bar span { background:#7BA8A0; }
  .axis-scale { font-size:.8rem; color:var(--muted); }
  .axis-scale em { font-style:normal; opacity:.85; }
  .axis-sentence { font-size:.92rem; color:var(--body); margin:5px 0 0; }
  .empty { background:#fff; border:3px dashed #D8C7B2; border-radius:14px; padding:22px;
           text-align:center; color:var(--muted); }
  footer { color:var(--muted); font-size:.78rem; text-align:center; margin-top:26px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Shared results</h1>
  <p class="lede">${records.length === 1 ? 'One person has' : records.length + ' people have'} chosen to send you their &ldquo;What are you like, anyway?&rdquo; results. Newest first.</p>
  <div class="honesty">
    This is a self-reported wellbeing questionnaire, not a clinical instrument &mdash; an
    indication, never a measurement or a diagnosis. Four of the axes are relative to a
    general population; sensitivity and risk appetite have no comparison population, so
    they come back as a reading on their own scale rather than a percentile. Nothing anyone
    typed is here: raw answers, notes and wheel entries stay on their own device.
  </div>
  ${records.length ? records.map(recordHtml).join('') : '<div class="empty">Nothing shared yet.</div>'}
  <footer>Cowch &middot; wellbeing support, not a replacement for therapy</footer>
</div>
</body>
</html>`;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).end();
        return;
    }

    const expected = process.env.QSHARE_EXPORT_TOKEN;
    if (!expected) {
        res.status(503).json({ error: 'Not configured: QSHARE_EXPORT_TOKEN missing.' });
        return;
    }
    if (req.query.token !== expected) {
        res.status(401).json({ error: 'Invalid or missing token' });
        return;
    }

    try {
        const ids = await redis.smembers('cowch:qshare:all');
        const fetched = ids.length
            ? await Promise.all(ids.map(id => redis.get('cowch:qshare:' + id)))
            : [];

        // Records carry a 12-month TTL; the index set does not expire with them.
        // So a null here is an expired record, and the tidy-up is to drop the id
        // rather than leave the set growing forever.
        const stale = ids.filter((id, i) => !fetched[i]);
        if (stale.length) redis.srem('cowch:qshare:all', ...stale).catch(() => {});

        const records = fetched.filter(Boolean);
        records.sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')));

        // No caching anywhere: this URL carries a secret and personal data.
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');

        if (req.query.format === 'json') {
            res.json({ count: records.length, records });
            return;
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(pageHtml(records));
    } catch (err) {
        console.error('questionnaire-report error:', err);
        res.status(500).json({ error: 'questionnaire-report failed', detail: String(err && err.message || err) });
    }
}
