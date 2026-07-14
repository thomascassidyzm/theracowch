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

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

function clientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
    return req.socket && req.socket.remoteAddress || '';
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).end();
        return;
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { fullName, organisation, email, agreed, signatureDataUrl, ndaVersion, ref } = body;

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
        if (!signatureDataUrl || !String(signatureDataUrl).startsWith('data:image/')) {
            res.status(400).json({ error: 'Missing signature' });
            return;
        }

        const id = crypto.randomUUID();
        const record = {
            id,
            ref: ref ? String(ref).slice(0, 200) : null,
            ndaVersion: ndaVersion || 'unknown',
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
