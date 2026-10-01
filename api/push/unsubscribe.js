// Removes a subscription. Called by the client when the user turns
// reminders off entirely, or when the browser invalidates a subscription.

import { createRedis } from '../../lib/redis.js';
import crypto from 'crypto';
import { checkRateLimit } from '../../lib/request-gate.js';

const redis = createRedis();

function endpointId(endpoint) {
    return crypto.createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).end();
        return;
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (_) {
        res.status(400).json({ error: 'Invalid JSON' });
        return;
    }

    try {
        const endpoint = body.endpoint;
        if (typeof endpoint !== 'string' || !endpoint || endpoint.length > 1024) {
            res.status(400).json({ error: 'Missing endpoint' });
            return;
        }
        const rl = await checkRateLimit(req, { bucket: 'push-unsubscribe', limit: 20, windowSeconds: 600 });
        if (!rl.ok) {
            res.setHeader('Retry-After', String(rl.retryAfter));
            res.status(rl.status).json({ error: rl.status === 429 ? 'Too many requests — give it a minute.' : 'Service temporarily unavailable' });
            return;
        }
        const id = endpointId(endpoint);
        await redis.del('cowch:sub:' + id);
        await redis.srem('cowch:subs', id);
        res.json({ ok: true });
    } catch (err) {
        console.error('unsubscribe error:', err);
        res.status(500).json({ error: 'unsubscribe failed' });
    }
}
