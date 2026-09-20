// Cron-triggered dispatcher. Vercel hits this on the schedule defined in
// vercel.json. Each call scans all active subscriptions and sends a push
// to anyone whose configured reminder time matches the current minute in
// their saved timezone (within +/- the cron tolerance).
//
// We use a per-(user, slot, day) "sent" marker (26h TTL) to ensure at-
// most-one notification per slot per day, even if cron overlaps the
// window twice.
//
// Required env vars:
//   VAPID_PUBLIC_KEY   — sent to the client by /api/push/keys
//   VAPID_PRIVATE_KEY  — signs the push payload
//   VAPID_SUBJECT      — mailto: URL (push-services require this)
//   KV_REST_API_URL    + KV_REST_API_TOKEN   (legacy Vercel KV stores), or
//   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (new Upstash integration)
//   CRON_SECRET        — REQUIRED. Requests must include
//                        `Authorization: Bearer <CRON_SECRET>` (Vercel Cron
//                        sends this automatically once the env var exists).
//                        If it is unset the endpoint refuses every request:
//                        it must never be open to unauthenticated callers.

import { Redis } from '@upstash/redis';
import webpush from 'web-push';
import { isAllowedPushEndpoint } from '../../lib/push-endpoint-allowlist.js';

const redis = new Redis({
    url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
});

const NUDGES = {
    morning: [
        { title: "How's your inner weather today? ☁️", body: "A 30-second check-in is waiting on the Cowch." },
        { title: "Good morning 🌤️", body: "One small notice for yourself — what are you carrying today?" },
        { title: "Soft start ✨", body: "Tap in for a one-minute reset before the day picks up speed." }
    ],
    evening: [
        { title: "3-minute grounding waiting for you 🌿", body: "Wind down with 5-4-3-2-1 grounding or a body scan." },
        { title: "Pause for a moment 🌙", body: "What was kind to you today? Add one gratitude star." },
        { title: "End of day check-in 💝", body: "Inner weather, a tiny win, or just hello — no pressure." }
    ]
};

// Must match the cron interval in vercel.json. Pro tier */15 → 8 min window.
// Hobby tier 0 * * * * → bump to ~30 min in vercel.json + raise this.
const SLOT_TOLERANCE_MINUTES = 8;

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function timeInTz(date, tz, opts) {
    return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: tz, hour12: false }, opts)).format(date);
}

function dayKeyInTz(date, tz) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
}

function nowMinutesInTz(date, tz) {
    const hhmm = timeInTz(date, tz, { hour: '2-digit', minute: '2-digit' });
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

// Bounded HH:MM only — an unvalidated client-supplied `time` (e.g. the
// number 1, or "9") reached `time.split(':')` here and threw, which aborted
// the whole dispatch loop for every remaining subscription in Set iteration
// order. A malformed slot is now just skipped, not fatal.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function matchSlot(prefs, nowMins) {
    const candidates = [];
    if (prefs.morning && prefs.morning.on && prefs.morning.time) candidates.push(['morning', prefs.morning.time]);
    if (prefs.evening && prefs.evening.on && prefs.evening.time) candidates.push(['evening', prefs.evening.time]);
    for (const [slot, time] of candidates) {
        if (typeof time !== 'string' || !HHMM.test(time)) continue;
        const [h, m] = time.split(':').map(Number);
        const target = h * 60 + m;
        const diff = Math.abs(nowMins - target);
        const wrap = Math.min(diff, 1440 - diff);
        if (wrap <= SLOT_TOLERANCE_MINUTES) return slot;
    }
    return null;
}

function requireVapid() {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || 'mailto:contact@thoughtsonlifeandlove.com';
    if (!pub || !priv) return null;
    webpush.setVapidDetails(subj, pub, priv);
    return true;
}

// ONE decision, exported so it is testable without Redis, and so the
// subscribe-time and send-time checks can never drift apart: they call the same
// allowlist. Subscribe-time validation alone was not enough — the dispatcher
// reads rows that were written BEFORE that check existed, so a hostile
// destination stored earlier would still be posted to. Checked here, at the
// last moment before the send, the stored population is safe whatever is in it.
//
// Returns a reason string to skip, or null to deliver.
export function skipReason(rec) {
    if (!rec || !rec.subscription || !rec.prefs || !rec.subscription.endpoint) return 'malformed';
    // A MISSING endpoint is malformed, not blocked: counting it as blocked would
    // report an attack that is not there and hide a data problem that is.
    if (!isAllowedPushEndpoint(rec.subscription.endpoint)) return 'endpoint-not-allowed';
    if (!rec.prefs.enabled) return 'disabled';
    if (rec.prefs.snoozeUntil && Date.now() < rec.prefs.snoozeUntil) return 'snoozed';
    return null;
}

export default async function handler(req, res) {
    // Fail closed: a missing CRON_SECRET must never leave this endpoint open.
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        res.status(503).json({ error: 'Push cron not configured: CRON_SECRET missing.' });
        return;
    }
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${cronSecret}`) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }

    if (!requireVapid()) {
        res.status(503).json({ error: 'Push not configured: VAPID keys missing.' });
        return;
    }

    const now = new Date();
    let ids = [];
    try {
        ids = (await redis.smembers('cowch:subs')) || [];
    } catch (err) {
        console.error('Redis smembers failed:', err);
        res.status(500).json({ error: 'Redis unavailable', detail: String(err && err.message || err) });
        return;
    }

    let sent = 0, errors = 0, expired = 0, blocked = 0;

    for (const id of ids) {
        let rec;
        try { rec = await redis.get('cowch:sub:' + id); } catch (_) { continue; }
        const skip = skipReason(rec);
        if (skip) {
            // A disallowed destination is COUNTED, not deleted. Deleting an
            // attacker's row would be right; deleting a real subscriber's row
            // because a genuine push-service host is missing from the allowlist
            // would silently kill their reminders forever. Counting surfaces it
            // in the cron's own response so a human can look before anything is
            // destroyed.
            if (skip === 'endpoint-not-allowed') {
                blocked++;
                console.warn('push send blocked: endpoint not on the push-service allowlist for', id);
            }
            continue;
        }
        const { subscription, prefs } = rec;

        const tz = prefs.tz || 'UTC';
        let nowMins;
        try { nowMins = nowMinutesInTz(now, tz); } catch (_) { continue; }

        const slot = matchSlot(prefs, nowMins);
        if (!slot) continue;

        const day = dayKeyInTz(now, tz);
        const sentKey = `cowch:sent:${id}:${slot}:${day}`;
        try {
            if (await redis.get(sentKey)) continue; // already sent today
        } catch (_) { /* fall through */ }

        const nudge = pick(NUDGES[slot]);
        const payload = JSON.stringify({
            title: nudge.title,
            body: nudge.body,
            url: '/app.html'
        });

        try {
            await webpush.sendNotification(subscription, payload);
            await redis.set(sentKey, '1', { ex: 60 * 60 * 26 });
            sent++;
        } catch (err) {
            errors++;
            const code = err && err.statusCode;
            if (code === 404 || code === 410) {
                try {
                    await redis.del('cowch:sub:' + id);
                    await redis.srem('cowch:subs', id);
                    expired++;
                } catch (_) {}
            } else {
                console.error('push send failed for', id, code, err && err.message);
            }
        }
    }

    res.json({ scanned: ids.length, sent, errors, expired, blocked });
}
