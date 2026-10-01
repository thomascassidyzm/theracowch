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

import { createRedis } from '../../lib/redis.js';
import crypto from 'crypto';
import { checkRateLimit } from '../../lib/request-gate.js';
import { tooBig } from '../../lib/request-gate.js';
import { subscriptionProblem, cleanSubscription, cleanPrefs, MAX_SUBSCRIBE_BODY_BYTES } from '../../lib/push-subscription.js';

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

    // A real subscribe body is well under 1 KB; refuse anything big before
    // parsing it, and whatever was parsed after.
    const declared = Number(req.headers && req.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_SUBSCRIBE_BODY_BYTES) {
        res.status(413).json({ error: 'Request too large' });
        return;
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (_) {
        res.status(400).json({ error: 'Invalid JSON' });
        return;
    }
    if (tooBig(body, MAX_SUBSCRIBE_BODY_BYTES)) {
        res.status(413).json({ error: 'Request too large' });
        return;
    }

    try {
        const subscription = body.subscription;

        // Endpoint on a real push service (a stored attacker URL would be a
        // blind SSRF at send time) AND keys web-push can actually encrypt to
        // (junk keys throw on every cron run, forever). Checked before Redis.
        const problem = subscriptionProblem(subscription);
        if (problem) {
            res.status(400).json({ error: problem });
            return;
        }

        // Anonymous, unauthenticated writes — cap how many one caller can create.
        // Generous: a real user subscribes/updates prefs a handful of times, ever.
        // The daily cap stops one address filling cowch:subs a window at a time.
        for (const limits of [
            { bucket: 'push-subscribe', limit: 20, windowSeconds: 600 },
            { bucket: 'push-subscribe-ipday', limit: 50, windowSeconds: 86400 }
        ]) {
            const rl = await checkRateLimit(req, limits);
            if (!rl.ok) {
                res.setHeader('Retry-After', String(rl.retryAfter));
                res.status(rl.status).json(
                    rl.status === 429
                        ? { error: 'Too many requests — give it a minute.' }
                        : { error: 'Service temporarily unavailable' }
                );
                return;
            }
        }

        const id = endpointId(subscription.endpoint);
        const record = {
            subscription: cleanSubscription(subscription),
            prefs: cleanPrefs(body.prefs),
            updatedAt: Date.now()
        };

        await redis.set('cowch:sub:' + id, record);
        await redis.sadd('cowch:subs', id);

        res.json({ ok: true, id });
    } catch (err) {
        console.error('subscribe error:', err);
        res.status(500).json({ error: 'subscribe failed' });
    }
}
