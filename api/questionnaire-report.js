// The stored shares, as JSON shaped for a conversational agent.
//
// Mandy is the AI companion inside cowch.app, not a human reading a page. So
// this returns context she could speak from — stable keys, plain-language
// labels, no presentation markup, no percentile language — rather than the HTML
// cards an earlier pass of this work built for a clinician on a phone. That
// decision was reversed by Tom: "the JSON, sent to Mandy is better."
//
// Read the honest note in the README-ish comment below before wiring anything
// to this: for a person using the app, this endpoint is NOT how their results
// reach Mandy. Their result is already on their own device, and the app hands it
// to her directly at conversation time (public/assets/js/therapy-profile.js →
// api/chat.js). Sending it to a server so the same device can fetch it back
// would be a round trip that buys nothing and weakens the privacy posture.
//
// What this endpoint is for is the other direction: the results people have
// explicitly chosen to send in, read back by the humans who build Cowch — and,
// if it is ever wanted, by a companion talking about the cohort rather than
// about the person in front of her.
//
// Guarded by a shared secret, same shape as api/nda-export.js: fail closed when
// unconfigured, 401 on a wrong token, no default-open path. Deliberately its own
// env var, not the NDA one — different data, separately revocable.
//   GET /api/questionnaire-report?token=<QSHARE_EXPORT_TOKEN>
//   GET /api/questionnaire-report?token=<...>&id=<uuid>   (one record)
//   GET /api/questionnaire-report?token=<...>&raw=1       (stored records, unshaped)

import { Redis } from '@upstash/redis';
import { buildQuestionnaireContext, QUESTIONNAIRE_CAVEAT } from '../lib/questionnaire-context.js';

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

// One stored share, as agent context. The scored bands go through the same
// shared builder api/chat.js uses, so a trait can never be described one way
// here and another way in conversation.
function shaped(r) {
    const context = buildQuestionnaireContext(r);
    return {
        id: r.id || '',
        name: r.displayName || '',
        email: r.email || '',
        cameVia: r.source || '',
        sharedAt: r.receivedAt || '',
        questionnaire: context
    };
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).end();
        return;
    }

    const expected = process.env.QSHARE_EXPORT_TOKEN;
    if (!expected) {
        res.status(503).json({ error: 'Not configured: QSHARE_EXPORT_TOKEN missing.' });
        return;
    }
    if (req.query.token !== expected) {
        res.status(401).json({ error: 'Invalid or missing token' });
        return;
    }

    try {
        // This URL carries a secret and personal data — never cached anywhere.
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');

        if (req.query.id) {
            const record = await redis.get('cowch:qshare:' + req.query.id);
            if (!record) {
                res.status(404).json({ error: 'Not found' });
                return;
            }
            res.json(req.query.raw ? record : shaped(record));
            return;
        }

        const ids = await redis.smembers('cowch:qshare:all');
        const fetched = ids.length
            ? await Promise.all(ids.map(id => redis.get('cowch:qshare:' + id)))
            : [];

        // Records carry a 12-month TTL; the index set does not expire with them,
        // so a null here is an expired record and the tidy-up is to drop the id
        // rather than let the set grow forever.
        const stale = ids.filter((id, i) => !fetched[i]);
        if (stale.length) redis.srem('cowch:qshare:all', ...stale).catch(() => {});

        const records = fetched.filter(Boolean);
        records.sort((a, b) => String(b.receivedAt || '').localeCompare(String(a.receivedAt || '')));

        if (req.query.raw) {
            res.json({ count: records.length, records });
            return;
        }

        res.json({
            count: records.length,
            caveat: QUESTIONNAIRE_CAVEAT,
            shares: records.map(shaped)
        });
    } catch (err) {
        console.error('questionnaire-report error:', err);
        res.status(500).json({ error: 'questionnaire-report failed', detail: String(err && err.message || err) });
    }
}
