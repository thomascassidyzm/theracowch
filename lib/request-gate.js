// Shared spend gate for the two account-less endpoints that front Tom's billed
// Anthropic key (api/chat.js, api/compress-profile.js).
//
// It lives in lib/ (not api/utils/) on purpose: every file under api/ becomes a
// routable serverless function on Vercel, and a helper module has no business
// having a URL. lib/prompt-base.js already proves this import path deploys.
//
// Two layers, in this order:
//   1. Origin lock  — keeps the browser estate in, keeps drive-by scripts out.
//   2. Per-IP rate limit — the actual ceiling on what abuse can cost.
//
// Be honest about layer 1: Origin is enforced by *browsers*. Anyone with curl
// can send `Origin: https://theracowch.com` and walk straight past it. Layer 2
// and the per-request input-size caps are what bound the bill.

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

// ---------------------------------------------------------------- the gate

// One call does the lot: CORS headers, OPTIONS preflight, method check, origin
// lock, rate limit. Returns true if the handler should carry on; if it returns
// false the response has already been sent and the handler must return.
//
// Everything here happens BEFORE any Anthropic call. That's the whole point.
export async function gate(req, res, { bucket, limit, windowSeconds }) {
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

    return true;
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
export const LIMITS = {
    chat:    { bucket: 'chat',    limit: 60, windowSeconds: 600 },
    compress:{ bucket: 'compress', limit: 20, windowSeconds: 600 },
    // Sharing a questionnaire result with Mandy. Not a money path — nothing
    // behind it calls a billed API — so the limit is only there to stop an
    // open POST endpoint being used to fill the store with junk. Sharing is a
    // once-per-person act, so 10 per 10 minutes per IP is already generous
    // even with a whole campus behind one NAT address.
    qshare:  { bucket: 'qshare',  limit: 10, windowSeconds: 600 }
};
