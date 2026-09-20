// Records a signed NDA.
//
// Storage: Upstash Redis — same store already provisioned for push
// subscriptions (api/push/subscribe.js). Reads whichever env pair Vercel's
// integration set: UPSTASH_REDIS_REST_URL/TOKEN (new installs) or
// KV_REST_API_URL/TOKEN (legacy KV stores that auto-migrated).
//
// Schema:
//   key:  cowch:nda:<uuid>
//   val:  { ref, ndaVersion, fullName, organisation, email, signatureDataUrl,
//           agreedAt, signedAt (server), userAgent, ip }
//   set:  cowch:nda:all — ids for the export endpoint to iterate

import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { checkRateLimit } from '../lib/request-gate.js';

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

function clientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return req.socket && req.socket.remoteAddress || '';
}

// A real signature PNG data URL is a few KB; this is ~8x that, so no honest
// client ever meets it, while one anonymous write can no longer carry an
// arbitrary blob into Redis / the export payload.
const MAX_SIGNATURE_BYTES = 200 * 1024;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).end();
        return;
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { fullName, organisation, email, agreed, signatureDataUrl, ndaVersion, ref } = body;

        // Same class of hole as signatureDataUrl: every optional field below is
        // stored via String(x).slice(), which bounds the STORED copy — but only
        // because slice() is applied to the coercion. ndaVersion is the one that
        // reaches the response as well, so refuse a non-string outright rather
        // than describing an object back to the caller.
        if (ndaVersion !== undefined && ndaVersion !== null && typeof ndaVersion !== 'string') {
            res.status(400).json({ error: 'Invalid ndaVersion' });
            return;
        }

        if (!fullName || !String(fullName).trim()) {
            res.status(400).json({ error: 'Missing full name' });
            return;
        }
        if (!email || !String(email).trim()) {
            res.status(400).json({ error: 'Missing email' });
            return;
        }
        if (!agreed) {
            res.status(400).json({ error: 'Agreement checkbox not confirmed' });
            return;
        }
        // TYPE BEFORE SHAPE. The checks below used to coerce with String(),
        // but the ORIGINAL value is what gets stored — so an array whose first
        // element carries the prefix coerces to a short, valid-looking string
        // while the stored value is arbitrarily large. Cold-verify (2026-09-20)
        // got 300,043 bytes through that way. A signature is a string or it is
        // nothing; refuse anything else before it can be measured.
        if (typeof signatureDataUrl !== 'string') {
            res.status(400).json({ error: 'Missing signature' });
            return;
        }
        if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
            res.status(400).json({ error: 'Missing signature' });
            return;
        }
        if (Buffer.byteLength(signatureDataUrl, 'utf8') > MAX_SIGNATURE_BYTES) {
            res.status(413).json({ error: 'Signature too large' });
            return;
        }

        // Anonymous, unauthenticated writes — cap how many one caller can create.
        const rl = await checkRateLimit(req, { bucket: 'nda-sign', limit: 10, windowSeconds: 600 });
        if (!rl.ok) {
            res.setHeader('Retry-After', String(rl.retryAfter));
            res.status(rl.status).json(
                rl.status === 429
                    ? { error: 'Too many requests — give it a minute.' }
                    : { error: 'Service temporarily unavailable' }
            );
            return;
        }

        const id = crypto.randomUUID();
        const record = {
            id,
            ref: ref ? String(ref).slice(0, 200) : null,
            ndaVersion: ndaVersion ? String(ndaVersion).slice(0, 100) : 'unknown',
            fullName: String(fullName).slice(0, 200),
            organisation: organisation ? String(organisation).slice(0, 200) : '',
            email: String(email).slice(0, 320),
            agreed: true,
            signatureDataUrl,
            signedAt: new Date().toISOString(),
            userAgent: req.headers['user-agent'] || '',
            ip: clientIp(req)
        };

        await redis.set('cowch:nda:' + id, record);
        await redis.sadd('cowch:nda:all', id);

        res.json({
            ok: true,
            id,
            ref: record.ref,
            ndaVersion: record.ndaVersion,
            signedAt: record.signedAt
        });
    } catch (err) {
        console.error('nda-sign error:', err);
        res.status(500).json({ error: 'nda-sign failed', detail: String(err && err.message || err) });
    }
}
