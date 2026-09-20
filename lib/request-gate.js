// Shared spend gate for the two account-less endpoints that front Tom's billed
// Anthropic key (api/chat.js, api/compress-profile.js).
//
// It lives in lib/ (not api/utils/) on purpose: every file under api/ becomes a
// routable serverless function on Vercel, and a helper module has no business
// having a URL. lib/prompt-base.js already proves this import path deploys.
//
// Three layers, in this order:
//   1. Origin lock  — keeps the browser estate in, keeps drive-by scripts out.
//   2. Per-IP rate limit — the ceiling on how MANY requests abuse can make.
//   3. Body-size cap — the ceiling on how BIG any one of them can be.
//
// Be honest about layer 1: Origin is enforced by *browsers*. Anyone with curl
// can send `Origin: https://theracowch.com` and walk straight past it. Layers 2
// and 3 are what bound the bill, and they only bound it together: the rate
// limit counts requests, so without a size cap one request inside the limit
// could carry a megabyte of `profile` / `history` / `questionnaire` straight
// through to a billed Anthropic call.

import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------- origin lock

const ALLOWED_ORIGINS = new Set([
    'https://theracowch.com',
    'https://www.theracowch.com',
    'https://cowch.app',
    'https://www.cowch.app'
]);

// Preview deploys get a generated hostname we can't enumerate, but a bare
// `.vercel.app` suffix trusts every site anyone has ever deployed to Vercel.
// So this pins BOTH ends: our project name at the front, our team slug
// (`zenjin` — read off the real preview URLs Vercel reports to GitHub) at the
// back. Covers `theracowch-<hash>-zenjin.vercel.app`,
// `theracowch-git-<branch>-zenjin.vercel.app` and `theracowch-zenjin.vercel.app`.
// Deliberately NOT the bare `theracowch.vercel.app`: with no slug in it there's
// nothing tying that name to our team.
const PREVIEW_ORIGIN = /^https:\/\/theracowch(-[a-z0-9-]+)?-zenjin\.vercel\.app$/;

export function isAllowedOrigin(origin) {
    // No Origin header → NOT allowed. The old code allowed it, on the belief
    // that same-origin and installed-PWA requests send no Origin. That premise
    // is wrong: per the Fetch spec a browser sets Origin on every non-GET/HEAD
    // request, same-origin POSTs included. Both these endpoints are POST-only,
    // so the only callers with no Origin at all are non-browser ones — i.e.
    // exactly the free-Claude-proxy traffic we're trying to stop.
    if (!origin) return false;
    if (ALLOWED_ORIGINS.has(origin)) return true;
    return PREVIEW_ORIGIN.test(origin);
}

// Sets CORS headers and reports whether the caller is allowed. When it isn't,
// NO Access-Control-Allow-Origin header is set at all — never echo an origin
// we've just rejected, and never hand it a default one either.
export function applyCors(req, res) {
    const origin = req.headers.origin;
    const ok = isAllowedOrigin(origin);
    if (ok) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return ok;
}

// ---------------------------------------------------------------- rate limit

// Same client construction as api/nda-sign.js — Vercel's Upstash integration
// sets either env pair depending on how the store was provisioned.
const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

export function clientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Fixed-window counter: INCR the window's key, EXPIRE it on first hit.
// Cheap (one or two round trips), no sorted sets, and good enough — the point
// is a hard ceiling on spend, not smooth traffic shaping.
//
// FAILS CLOSED. If Redis is unreachable or unconfigured we return 503 rather
// than waving the request through: this is a money path with no account behind
// it, and "the limiter is down" is precisely when an abuser would be hammering
// it. The cost of being wrong the other way is a chat that says "try again";
// the cost of failing open is an unbounded bill.
export async function checkRateLimit(req, { bucket, limit, windowSeconds }) {
    const ip = clientIp(req);
    const window = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `cowch:rl:${bucket}:${window}:${ip}`;

    if (!redis) {
        console.error(`[rate-limit] Redis not configured (KV_REST_API_URL / UPSTASH_REDIS_REST_URL missing) — failing closed on ${bucket}`);
        return { ok: false, status: 503, retryAfter: 60, reason: 'limiter-unavailable' };
    }

    try {
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, windowSeconds);
        if (count > limit) {
            const retryAfter = windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
            return { ok: false, status: 429, retryAfter, reason: 'rate-limited' };
        }
        return { ok: true };
    } catch (e) {
        console.error(`[rate-limit] Redis error on ${bucket} — failing closed:`, e && e.message);
        return { ok: false, status: 503, retryAfter: 60, reason: 'limiter-unavailable' };
    }
}

// ------------------------------------------------------- global spend ceiling

// The per-IP limit above bounds one caller; it does not bound the total bill
// across every IP. A daily counter, shared by every caller of a bucket,
// closes that gap cheaply — same Redis, same fail-closed posture, one INCR
// per request. It resets on UTC day boundaries (a fixed window is good enough
// here too: the point is a hard ceiling, not smooth shaping).
export async function checkGlobalDailyLimit(bucket, dailyLimit) {
    const day = new Date().toISOString().slice(0, 10); // UTC calendar day
    const key = `cowch:rl:global:${bucket}:${day}`;

    if (!redis) {
        console.error(`[rate-limit] Redis not configured — failing closed on global cap for ${bucket}`);
        return { ok: false, status: 503, retryAfter: 60, reason: 'limiter-unavailable' };
    }

    try {
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, 60 * 60 * 26); // outlives the UTC day
        if (count > dailyLimit) {
            return { ok: false, status: 429, retryAfter: 3600, reason: 'global-cap' };
        }
        return { ok: true };
    } catch (e) {
        console.error(`[rate-limit] Redis error on global cap for ${bucket} — failing closed:`, e && e.message);
        return { ok: false, status: 503, retryAfter: 60, reason: 'limiter-unavailable' };
    }
}

// ---------------------------------------------------------------- the gate

// One call does the lot: CORS headers, OPTIONS preflight, method check, origin
// lock, rate limit. Returns true if the handler should carry on; if it returns
// false the response has already been sent and the handler must return.
//
// Everything here happens BEFORE any Anthropic call. That's the whole point.
export async function gate(req, res, { bucket, limit, windowSeconds, maxBodyBytes, dailyLimit }) {
    const originOk = applyCors(req, res);

    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return false;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return false;
    }
    if (!originOk) {
        res.status(403).json({ error: 'Forbidden' });
        return false;
    }

    const rl = await checkRateLimit(req, { bucket, limit, windowSeconds });
    if (!rl.ok) {
        res.setHeader('Retry-After', String(rl.retryAfter));
        res.status(rl.status).json(
            rl.status === 429
                ? { error: 'Too many requests — give it a minute.' }
                : { error: 'Service temporarily unavailable' }
        );
        return false;
    }

    if (dailyLimit) {
        const gl = await checkGlobalDailyLimit(bucket, dailyLimit);
        if (!gl.ok) {
            res.setHeader('Retry-After', String(gl.retryAfter));
            res.status(gl.status).json(
                gl.status === 429
                    ? { error: 'Daily capacity reached — please try again tomorrow.' }
                    : { error: 'Service temporarily unavailable' }
            );
            return false;
        }
    }

    // Body-size cap, last because an oversized request should still cost the
    // sender a unit of their rate limit rather than being free to repeat.
    //
    // Content-Length is what the platform has already read off the wire, so
    // this rejects before anything is parsed or forwarded. A spoofed/absent
    // header just falls through to the handler's own serialised-size check.
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBodyBytes) {
        res.status(413).json({ error: 'Request too large' });
        return false;
    }

    return true;
}

// Serialised size of a parsed body (or any field of it), for the belt-and-braces
// check a handler runs once it can see what it actually received.
export function tooBig(value, maxBytes) {
    try {
        return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8') > maxBytes;
    } catch (e) {
        return true; // circular / unserialisable — not something we should forward
    }
}

// Window and limits live here so both endpoints read from one place.
//
// Tuning note — these are deliberately looser than a per-person read would
// suggest, because the key is per-IP and the beachhead is UK university
// students: a whole campus can sit behind one NAT address. Chat fires once per
// user message; compression fires once per 8 messages (COMPRESS_AFTER_MESSAGES
// in public/assets/js/therapy-profile.js), so the compress limit only needs to
// be ~1/8th of chat's and 20 is already generous.
//
// If campus NAT ever does trip this, the fix is a per-install client token in
// the key, NOT a looser IP limit.
//
// maxBodyBytes: a real chat body — the message, a compressed profile, three
// recent messages and the six questionnaire bands — measures around 3-4 KB.
// 64 KB is ~16x that, so no honest client will ever meet it, while a single
// request can no longer carry an arbitrary payload through on one unit of the
// rate limit. Compression posts one prompt string capped at 8,000 chars, so it
// gets 32 KB.
// dailyLimit: an aggregate ceiling across every IP, on top of the per-IP one.
// Assumption behind these numbers ("normal day"): this is an early-stage
// wellbeing app, not yet at mass-market volume; a generous but real ceiling
// is one that a genuine spike in usage (a press mention, a class being
// pointed at it) could plausibly approach but a normal day comes nowhere
// near. 3,000 chat calls/day is 500x a single busy person's chat volume;
// 1,000 compress calls/day tracks the ~1/8th ratio noted above. If real
// traffic ever gets near either number, that is itself the signal to revisit
// them — a 429 here degrades to "try again tomorrow", it never charges
// anyone, so erring generous costs nothing but an unbounded bill.
export const LIMITS = {
    chat:    { bucket: 'chat',     limit: 60, windowSeconds: 600, maxBodyBytes: 64 * 1024, dailyLimit: 3000 },
    compress:{ bucket: 'compress', limit: 20, windowSeconds: 600, maxBodyBytes: 32 * 1024, dailyLimit: 1000 }
};
