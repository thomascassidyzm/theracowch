// Removes a subscription. Called by the client when the user turns
// reminders off entirely, or when the browser invalidates a subscription.

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

function endpointId(endpoint) {
    return crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).end();
        return;
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const endpoint = body.endpoint;
        if (!endpoint) {
            res.status(400).json({ error: 'Missing endpoint' });
            return;
        }
        const id = endpointId(endpoint);
        await redis.del('cowch:sub:' + id);
        await redis.srem('cowch:subs', id);
        res.json({ ok: true });
    } catch (err) {
        console.error('unsubscribe error:', err);
        res.status(500).json({ error: 'unsubscribe failed', detail: String(err && err.message || err) });
    }
}
