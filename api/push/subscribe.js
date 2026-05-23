// Saves (or updates) a push subscription + the user's reminder preferences.
//
// Storage: Upstash Redis (provision via Vercel → Storage → Marketplace →
// Upstash Redis, or directly at upstash.com). The integration sets either
// the UPSTASH_REDIS_REST_URL/TOKEN pair (new installs) or KV_REST_API_URL/TOKEN
// (legacy KV stores that auto-migrated). We read whichever is present.
//
// Schema:
//   key:  cowch:sub:<sha256(endpoint).slice(0,32)>
//   val:  { subscription, prefs, updatedAt }
//   set:  cowch:subs — ids for the cron iterator

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
        const subscription = body.subscription;
        const prefs = body.prefs || {};

        if (!subscription || !subscription.endpoint) {
            res.status(400).json({ error: 'Missing subscription.endpoint' });
            return;
        }

        const id = endpointId(subscription.endpoint);
        const record = {
            subscription,
            prefs: {
                enabled: !!prefs.enabled,
                morning: prefs.morning || { on: false, time: '09:00' },
                evening: prefs.evening || { on: false, time: '20:00' },
                snoozeUntil: prefs.snoozeUntil || 0,
                tz: prefs.tz || 'UTC'
            },
            updatedAt: Date.now()
        };

        await redis.set('cowch:sub:' + id, record);
        await redis.sadd('cowch:subs', id);

        res.json({ ok: true, id });
    } catch (err) {
        console.error('subscribe error:', err);
        res.status(500).json({ error: 'subscribe failed', detail: String(err && err.message || err) });
    }
}
