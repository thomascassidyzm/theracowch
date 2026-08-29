// Receives a "What are you like, anyway?" result that a person has explicitly
// chosen to share with Mandy Kloppers.
//
// This is the ONLY route by which anything from a questionnaire ever leaves a
// device, and it exists so that Mandy — who is the data controller named in the
// Privacy Policy, not a third party — can see how the people she pointed at
// Cowch are getting on, without having to ask them one by one.
//
// Three rules the shape of this file exists to enforce:
//
//   1. Nothing arrives here that a person did not tap a button to send. There is
//      no beacon, no default-on, no background sync. `consented: true` is
//      required in the body and the request is refused without it, the same way
//      api/nda-sign.js refuses a missing `agreed`.
//   2. Nothing a person TYPED is ever stored. The record is assembled field by
//      named field below — never by spreading the posted body — so the raw
//      per-moment answers, the free-text "honest exit" notes and the wellness
//      wheel harvest cannot reach the store even if a client posts them.
//   3. The clock is ours. `receivedAt` is stamped server-side, so ordering on
//      the report page can't be steered by a device with a wrong date.
//
// Storage — the api/nda-sign.js pattern, on the same provisioned Upstash store:
//   key:  cowch:qshare:<uuid>   (TTL, see RETENTION_SECONDS)
//   set:  cowch:qshare:all      ids for api/questionnaire-report.js to iterate
//
// Retention: 12 months, deliberately, rather than silently inheriting the NDA
// endpoint's "no expiry, keep forever". Twelve months is long enough that Mandy
// can look back over a year of her own referrals and short enough that this
// never quietly becomes a permanent database of people's personality results.
// If Tom wants a different window it is the one constant below.

import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { gate, clientIp, LIMITS } from '../lib/request-gate.js';

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

const RETENTION_SECONDS = 365 * 24 * 60 * 60;   // 12 months
const MAX_BANDS = 8;                            // the questionnaire has six

function str(v, max) {
    if (v === null || v === undefined) return '';
    return String(v).slice(0, max);
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

// Rebuilds one scored axis from named fields only. An axis is either a
// population band (low/high out of 100) or an absolute dial on its own 0-10
// scale — the engines already keep those apart, and so must anything downstream,
// because Sensitivity and Risk appetite have no comparison population and must
// never be reported as a percentile. See docs/wording-audit-what-are-you-like.md.
function cleanBand(b) {
    if (!b || typeof b !== 'object') return null;
    const scale = b.scale === 'absolute' ? 'absolute' : 'population';
    const out = {
        k: str(b.k, 4),
        name: str(b.name, 60),
        scale,
        focus: num(b.focus),
        sentence: str(b.sentence, 400)
    };
    if (!out.k) return null;
    if (scale === 'absolute') {
        out.dial = num(b.dial);
        out.spread = num(b.spread);
        out.position = str(b.position, 60);
    } else {
        out.low = num(b.low);
        out.high = num(b.high);
    }
    return out;
}

export default async function handler(req, res) {
    // Origin lock + per-IP rate limit, exactly as api/chat.js does it. Note the
    // gate refuses a request with no Origin header at all: that is deliberate
    // there and correct here too, since the only caller is a browser POST.
    if (!(await gate(req, res, LIMITS.qshare))) return;

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});

        if (body.consented !== true) {
            res.status(400).json({ error: 'Not shared: consent flag missing.' });
            return;
        }
        // A nameless card helps Mandy with nothing — she needs to know who a
        // result belongs to. What they type is entirely their choice.
        const displayName = str(body.displayName, 80).trim();
        if (!displayName) {
            res.status(400).json({ error: 'Missing the name to show.' });
            return;
        }
        if (!Array.isArray(body.bands) || !body.bands.length) {
            res.status(400).json({ error: 'Missing results.' });
            return;
        }

        const bands = body.bands.slice(0, MAX_BANDS).map(cleanBand).filter(Boolean);
        if (!bands.length) {
            res.status(400).json({ error: 'Results were not in a shape we recognise.' });
            return;
        }

        const id = crypto.randomUUID();
        // Field by named field. Anything else the client posted — `answers`,
        // `abstentions`, a wheel harvest — simply has nowhere to go.
        const record = {
            id,
            displayName,
            email: str(body.email, 320).trim(),
            source: str(body.source, 40),
            variant: body.variant === 'rank' ? 'rank' : 'single',
            completed: str(body.completed, 40),
            scenariosSeen: num(body.scenariosSeen),
            meta: str(body.meta, 300),
            bands,
            consented: true,
            receivedAt: new Date().toISOString(),
            ip: clientIp(req)
        };

        await redis.set('cowch:qshare:' + id, record, { ex: RETENTION_SECONDS });
        await redis.sadd('cowch:qshare:all', id);

        res.json({ ok: true, id, receivedAt: record.receivedAt });
    } catch (err) {
        console.error('questionnaire-share error:', err);
        res.status(500).json({ error: 'Share failed', detail: String(err && err.message || err) });
    }
}
