// The wheel harvest — a person's own words, kept.
//
// This is the completion stage of "What are you like, anyway?": after the
// assessment, a person picks the statements nearest to true for them and
// rewrites them into their own words (public/questionnaires/build-your-wheel.html
// + public/assets/js/wellness-wheel.js). This endpoint is where those words are
// KEPT — server-side, so they survive a cleared browser, a reinstalled PWA, or
// a new phone, and so anything that later gives a person their own words back
// has something to read.
//
// Tom's ruling (2026-09-06), and the whole reason this file exists:
//   "kept VERBATIM and persisted server-side — never only in localStorage,
//    never rewritten, tidied, capitalised or wrapped in encouragement."
//
// So: what arrives in `text` is what is stored in `text`. Byte for byte. There
// is no trim, no capitalise, no sentence-casing, no truncation — an oversized
// payload is REJECTED with an error the page can show, because silently cutting
// somebody's sentence in half is a rewrite wearing a size limit as a disguise.
// No model call touches this path, here or anywhere upstream of it.
//
// Identity, with no account: the page mints a random UUID once
// (localStorage 'cowch-wheel-id') and sends it. It is a bearer capability — the
// only way to read or delete a record is to hold its unguessable id — which is
// the honest trade for having no signup. Nothing here asks for or stores a name,
// an email, or an IP.
//
// Storage: Upstash Redis, the repo's only datastore.
//   key: cowch:wheel:<uuid>   val: { id, v, order, entries, profile, updatedAt }
//   set: cowch:wheels         ids, for reading the cohort back later
//   TTL: 400 days, refreshed on every save (same 12-month-ish posture as the
//        other stored records here) — a wheel nobody has touched for over a
//        year should not sit on a server forever.
//
//   POST   /api/wheel              { id, order, entries, profile }
//   GET    /api/wheel?id=<uuid>    the record, for restoring on this device
//   DELETE /api/wheel?id=<uuid>    "clear it and start over", server side too

import { Redis } from '@upstash/redis';
import { isAllowedOrigin, checkRateLimit, tooBig } from '../lib/request-gate.js';

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const TTL_SECONDS = 400 * 24 * 60 * 60;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_ENTRIES = 20;          // thirteen spokes, with room to grow
const MAX_TEXT_CHARS = 2000;     // a paragraph, not an essay — rejected, never trimmed
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(v, max) {
    return typeof v === 'string' && v.length <= max ? v : null;
}

// The record we agree to store. Field by field, deliberately — an allow-list, so
// a page bug or a hostile client cannot park arbitrary JSON on this key. `text`
// passes through untouched; everything around it is metadata about it.
function cleanEntries(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'entries must be an object' };
    const ids = Object.keys(raw);
    if (ids.length > MAX_ENTRIES) return { error: 'too many spokes' };
    const out = {};
    for (const id of ids) {
        if (!str(id, 64)) return { error: 'bad spoke id' };
        const e = raw[id];
        if (!e || typeof e !== 'object') return { error: 'bad entry' };
        if (typeof e.text !== 'string') return { error: 'bad entry text' };
        if (e.text.length > MAX_TEXT_CHARS) {
            return { error: 'One of your spokes is longer than we can store (' + MAX_TEXT_CHARS + ' characters). Nothing was changed — shorten it yourself and it will save.' };
        }
        out[id] = {
            text: e.text,                                   // VERBATIM. Do not touch this line.
            hold: str(e.hold, 200) || '',
            register: e.register === 'bold' ? 'bold' : 'honest',
            own: !!e.own,                                   // wrote it from scratch, chose no statement
            torn: !!e.torn,
            at: str(e.at, 40) || ''
        };
    }
    return { entries: out };
}

export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    res.setHeader('Vary', 'Origin');
    // Someone's own words, keyed by a bearer id: never cached by anything in
    // between, never indexed.
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');

    if (req.method === 'OPTIONS') { res.status(204).end(); return; }

    if (!redis) {
        res.status(503).json({ error: 'Storage not configured' });
        return;
    }

    // A write from a browser must come from our own pages. Reads and deletes
    // need the id, which is the capability, and are deliberately not
    // origin-locked: an installed PWA restoring itself is the case that matters
    // more than a lock browsers alone enforce.
    if (req.method === 'POST' && !isAllowedOrigin(origin)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    const rl = await checkRateLimit(req, {
        bucket: req.method === 'POST' ? 'wheel-save' : 'wheel-read',
        limit: req.method === 'POST' ? 120 : 240,
        windowSeconds: 600
    });
    if (!rl.ok) {
        res.setHeader('Retry-After', String(rl.retryAfter));
        res.status(rl.status).json({ error: rl.status === 429 ? 'Too many requests — give it a minute.' : 'Service temporarily unavailable' });
        return;
    }

    try {
        if (req.method === 'GET' || req.method === 'DELETE') {
            const id = String(req.query.id || '');
            if (!UUID.test(id)) { res.status(400).json({ error: 'Bad id' }); return; }
            const key = 'cowch:wheel:' + id;

            if (req.method === 'DELETE') {
                await redis.del(key);
                await redis.srem('cowch:wheels', id).catch(() => {});
                res.json({ ok: true, deleted: true });
                return;
            }

            const record = await redis.get(key);
            if (!record) { res.status(404).json({ error: 'Not found' }); return; }
            res.json(record);
            return;
        }

        if (req.method !== 'POST') {
            res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }

        const declared = Number(req.headers['content-length']);
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
            res.status(413).json({ error: 'Request too large' });
            return;
        }

        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        if (tooBig(body, MAX_BODY_BYTES)) { res.status(413).json({ error: 'Request too large' }); return; }

        const id = String(body.id || '');
        if (!UUID.test(id)) { res.status(400).json({ error: 'Bad id' }); return; }

        const cleaned = cleanEntries(body.entries);
        if (cleaned.error) { res.status(400).json({ error: cleaned.error }); return; }

        const order = Array.isArray(body.order)
            ? body.order.filter(s => str(s, 64)).slice(0, MAX_ENTRIES)
            : [];

        const record = {
            id,
            v: 1,
            order,
            entries: cleaned.entries,
            profile: {
                source: str(body.profile && body.profile.source, 64) || 'unknown',
                label:  str(body.profile && body.profile.label, 200) || ''
            },
            updatedAt: new Date().toISOString()
        };

        await redis.set('cowch:wheel:' + id, record, { ex: TTL_SECONDS });
        await redis.sadd('cowch:wheels', id).catch(() => {});

        res.json({ ok: true, id, saved: Object.keys(record.entries).length, updatedAt: record.updatedAt });
    } catch (err) {
        console.error('wheel error:', err);
        res.status(500).json({ error: 'wheel failed', detail: String(err && err.message || err) });
    }
}
