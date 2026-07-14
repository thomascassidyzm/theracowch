// Retrieval endpoint for signed NDAs — the "central record" Mandy/Tom pull from.
//
// Guarded by a shared-secret token, NOT a login system (deliberately, per
// spec — no auth build-out for one internal use case).
//
// Provision: set NDA_EXPORT_TOKEN in Vercel env vars to any long random
// string. Fetch records with:
//   GET /api/nda-export?token=<NDA_EXPORT_TOKEN>
//   GET /api/nda-export?token=<NDA_EXPORT_TOKEN>&id=<uuid>   (single record)

import { Redis } from '@upstash/redis';

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).end();
        return;
    }

    const expected = process.env.NDA_EXPORT_TOKEN;
    if (!expected) {
        res.status(503).json({ error: 'Not configured: NDA_EXPORT_TOKEN missing.' });
        return;
    }
    if (req.query.token !== expected) {
        res.status(401).json({ error: 'Invalid or missing token' });
        return;
    }

    try {
        if (req.query.id) {
            const record = await redis.get('cowch:nda:' + req.query.id);
            if (!record) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            res.json(record);
            return;
        }

        const ids = await redis.smembers('cowch:nda:all');
        const records = ids.length
            ? await Promise.all(ids.map(id => redis.get('cowch:nda:' + id)))
            : [];

        records.sort((a, b) => (b && b.signedAt || '').localeCompare(a && a.signedAt || ''));

        res.json({ count: records.length, records });
    } catch (err) {
        console.error('nda-export error:', err);
        res.status(500).json({ error: 'nda-export failed', detail: String(err && err.message || err) });
    }
}
