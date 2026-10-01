// Shape checks for a stored Web Push subscription and its reminder prefs.
// Shared by api/push/subscribe.js (reject junk before it is stored) and
// api/push/send.js (prune junk already stored) so the two cannot drift.
//
// Every real browser produces the same shape: an HTTPS endpoint on a push
// service, keys.p256dh = an uncompressed P-256 point (65 bytes, leading 0x04)
// and keys.auth = 16 random bytes, both base64url. Anything else cannot be
// encrypted to, so web-push throws on it every time — before this check such
// rows were retried every 15 minutes forever and slowed every real send.
import { isAllowedPushEndpoint } from './push-endpoint-allowlist.js';

export const MAX_SUBSCRIBE_BODY_BYTES = 4096;
const MAX_ENDPOINT_CHARS = 1024;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function b64urlBytes(value) {
    if (typeof value !== 'string' || value.length > 200 || !/^[A-Za-z0-9_-]+={0,2}$/.test(value)) return null;
    return Buffer.from(value.replace(/=+$/, ''), 'base64url');
}

// Returns null if the subscription is usable, else a reason string.
export function subscriptionProblem(sub) {
    if (!sub || typeof sub !== 'object' || Array.isArray(sub)) return 'missing subscription';
    const { endpoint, keys } = sub;
    if (typeof endpoint !== 'string' || !endpoint) return 'missing subscription.endpoint';
    if (endpoint.length > MAX_ENDPOINT_CHARS) return 'endpoint too long';
    if (!isAllowedPushEndpoint(endpoint)) return 'Unrecognised push endpoint';
    if (!keys || typeof keys !== 'object') return 'missing subscription keys';
    const p256dh = b64urlBytes(keys.p256dh);
    if (!p256dh || p256dh.length !== 65 || p256dh[0] !== 0x04) return 'invalid p256dh key';
    const auth = b64urlBytes(keys.auth);
    if (!auth || auth.length !== 16) return 'invalid auth key';
    return null;
}

// Only the fields web-push needs; nothing else a caller sends is stored.
export function cleanSubscription(sub) {
    return { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
}

function cleanSlot(slot, fallbackTime) {
    const on = !!(slot && slot.on);
    const time = slot && typeof slot.time === 'string' && HHMM.test(slot.time) ? slot.time : fallbackTime;
    return { on, time };
}

function validTz(tz) {
    if (typeof tz !== 'string' || !tz || tz.length > 64) return 'UTC';
    try { new Intl.DateTimeFormat('en-GB', { timeZone: tz }); return tz; } catch (_) { return 'UTC'; }
}

export function cleanPrefs(prefs) {
    const p = prefs && typeof prefs === 'object' ? prefs : {};
    const snooze = Number(p.snoozeUntil);
    return {
        enabled: !!p.enabled,
        morning: cleanSlot(p.morning, '09:00'),
        evening: cleanSlot(p.evening, '20:00'),
        snoozeUntil: Number.isFinite(snooze) && snooze > 0 ? snooze : 0,
        tz: validTz(p.tz)
    };
}
