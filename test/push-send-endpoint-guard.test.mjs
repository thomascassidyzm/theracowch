// Proves api/push/send.js refuses to hand an already-STORED hostile endpoint
// to webpush.sendNotification.
//
// Pre-fix this test FAILS (skipReason does not exist): the subscribe route
// validated the destination host, but the cron dispatcher read whatever was
// already in Redis and sent to it unchecked — so any row written before the
// subscribe-time allowlist landed was still a live blind-SSRF path. Cold-verify
// (Astra, 2026-09-20) flagged this and could not audit the stored rows, because
// live Redis credentials were unavailable. The send-time check is what makes
// the unaudited row population safe regardless of what is in it.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.KV_REST_API_URL = 'https://example.invalid';
process.env.KV_REST_API_TOKEN = 'dummy';

const { skipReason } = await import('../api/push/send.js');

const prefs = { enabled: true, morning: { on: true, time: '09:00' }, evening: { on: false }, tz: 'UTC' };
const rec = (endpoint) => ({ subscription: { endpoint, keys: { p256dh: 'x', auth: 'y' } }, prefs });

test('a stored endpoint on an attacker-chosen host is refused at send time', () => {
    assert.equal(skipReason(rec('https://attacker.example/collect')), 'endpoint-not-allowed');
});

test('a stored endpoint on a private address is refused at send time', () => {
    assert.equal(skipReason(rec('https://192.0.2.7/internal/probe')), 'endpoint-not-allowed');
});

test('a plain-http endpoint is refused at send time', () => {
    assert.equal(skipReason(rec('http://fcm.googleapis.com/fcm/send/abc')), 'endpoint-not-allowed');
});

test('real push-service endpoints are still delivered', () => {
    assert.equal(skipReason(rec('https://fcm.googleapis.com/fcm/send/abc')), null);
    assert.equal(skipReason(rec('https://updates.push.services.mozilla.com/wpush/v2/abc')), null);
    assert.equal(skipReason(rec('https://web.push.apple.com/abc')), null);
    assert.equal(skipReason(rec('https://dm3p.notify.windows.com/w/?token=abc')), null);
});

test('malformed, disabled and snoozed records are skipped with their own reasons', () => {
    assert.equal(skipReason(null), 'malformed');
    assert.equal(skipReason({ subscription: {}, prefs }), 'malformed');
    assert.equal(skipReason({ ...rec('https://web.push.apple.com/abc'), prefs: { ...prefs, enabled: false } }), 'disabled');
    assert.equal(skipReason({
        ...rec('https://web.push.apple.com/abc'),
        prefs: { ...prefs, snoozeUntil: Date.now() + 60000 }
    }), 'snoozed');
});
