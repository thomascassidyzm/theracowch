// Cron-triggered dispatcher. Vercel hits this on the schedule defined in
// vercel.json. Each call scans all active subscriptions and sends a push
// to anyone whose configured reminder time matches the current minute in
// their saved timezone (within +/- the cron tolerance).
//
// We use a per-(user, slot, day) "sent" marker in KV (26h TTL) to ensure
// at-most-one notification per slot per day, even if cron overlaps the
// window twice.
//
// Required env vars:
//   VAPID_PUBLIC_KEY   — sent to the client by /api/push/keys
//   VAPID_PRIVATE_KEY  — signs the push payload
//   VAPID_SUBJECT      — mailto: URL (push-services require this)
// Optional:
//   CRON_SECRET        — if set, requests must include
//                        `Authorization: Bearer <CRON_SECRET>` (Vercel Cron
//                        sends this automatically when configured)

import { kv } from '@vercel/kv';
import webpush from 'web-push';

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
    // en-CA gives YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
}

function nowMinutesInTz(date, tz) {
    const hhmm = timeInTz(date, tz, { hour: '2-digit', minute: '2-digit' });
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function matchSlot(prefs, nowMins) {
    const candidates = [];
    if (prefs.morning && prefs.morning.on && prefs.morning.time) candidates.push(['morning', prefs.morning.time]);
    if (prefs.evening && prefs.evening.on && prefs.evening.time) candidates.push(['evening', prefs.evening.time]);
    for (const [slot, time] of candidates) {
        const [h, m] = time.split(':').map(Number);
        const target = h * 60 + m;
        const diff = Math.abs(nowMins - target);
        // Also wrap around midnight (e.g. 23:55 vs 00:00)
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

export default async function handler(req, res) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const auth = req.headers.authorization || '';
        if (auth !== `Bearer ${cronSecret}`) {
            res.status(401).json({ error: 'unauthorized' });
            return;
        }
    }

    if (!requireVapid()) {
        res.status(503).json({ error: 'Push not configured: VAPID keys missing.' });
        return;
    }

    const now = new Date();
    let ids = [];
    try {
        ids = (await kv.smembers('cowch:subs')) || [];
    } catch (err) {
        console.error('KV smembers failed:', err);
        res.status(500).json({ error: 'KV unavailable', detail: String(err && err.message || err) });
        return;
    }

    let sent = 0, errors = 0, expired = 0;

    for (const id of ids) {
        let rec;
        try { rec = await kv.get('cowch:sub:' + id); } catch (_) { continue; }
        if (!rec || !rec.subscription || !rec.prefs) continue;
        const { subscription, prefs } = rec;

        if (!prefs.enabled) continue;
        if (prefs.snoozeUntil && Date.now() < prefs.snoozeUntil) continue;

        const tz = prefs.tz || 'UTC';
        let nowMins;
        try { nowMins = nowMinutesInTz(now, tz); } catch (_) { continue; }

        const slot = matchSlot(prefs, nowMins);
        if (!slot) continue;

        const day = dayKeyInTz(now, tz);
        const sentKey = `cowch:sent:${id}:${slot}:${day}`;
        try {
            if (await kv.get(sentKey)) continue; // already sent today
        } catch (_) { /* fall through */ }

        const nudge = pick(NUDGES[slot]);
        const payload = JSON.stringify({
            title: nudge.title,
            body: nudge.body,
            url: '/app.html'
        });

        try {
            await webpush.sendNotification(subscription, payload);
            await kv.set(sentKey, '1', { ex: 60 * 60 * 26 });
            sent++;
        } catch (err) {
            errors++;
            const code = err && err.statusCode;
            if (code === 404 || code === 410) {
                // Subscription gone — clean up
                try {
                    await kv.del('cowch:sub:' + id);
                    await kv.srem('cowch:subs', id);
                    expired++;
                } catch (_) {}
            } else {
                console.error('push send failed for', id, code, err && err.message);
            }
        }
    }

    res.json({ scanned: ids.length, sent, errors, expired });
}
