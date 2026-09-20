// Proves the push-endpoint allowlist rejects non-push-service destinations,
// which is what makes api/push/subscribe.js's use of it a real SSRF fix
// (pre-fix: subscribe.js stored ANY subscription.endpoint with no validation
// at all, and api/push/send.js later POSTs the payload straight to it).
import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedPushEndpoint } from '../lib/push-endpoint-allowlist.js';

test('rejects an attacker-chosen HTTPS destination', () => {
    assert.equal(isAllowedPushEndpoint('https://attacker.example.com/collect'), false);
});

test('rejects a non-HTTPS destination', () => {
    assert.equal(isAllowedPushEndpoint('http://fcm.googleapis.com/fcm/send/abc'), false);
});

test('rejects an internal-network destination', () => {
    assert.equal(isAllowedPushEndpoint('https://169.254.169.254/latest/meta-data'), false);
});

test('rejects a malformed URL rather than throwing', () => {
    assert.equal(isAllowedPushEndpoint('not-a-url'), false);
});

test('accepts a real Chrome/FCM push endpoint', () => {
    assert.equal(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc123'), true);
});

test('accepts a real Firefox push endpoint', () => {
    assert.equal(isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc'), true);
});

test('accepts a real Safari push endpoint', () => {
    assert.equal(isAllowedPushEndpoint('https://web.push.apple.com/QAbc'), true);
});
