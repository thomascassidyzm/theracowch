// Removes a subscription. Called by the client when the user turns
// reminders off entirely, or when the browser invalidates a subscription.

import { kv } from '@vercel/kv';
import crypto from 'crypto';

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
        await kv.del('cowch:sub:' + id);
        await kv.srem('cowch:subs', id);
        res.json({ ok: true });
    } catch (err) {
        console.error('unsubscribe error:', err);
        res.status(500).json({ error: 'unsubscribe failed', detail: String(err && err.message || err) });
    }
}
