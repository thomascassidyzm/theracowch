// Proves api/push/subscribe.js rejects a subscription whose endpoint is not
// a recognised push-service host, instead of storing it (which pre-fix would
// have made api/push/send.js POST an attacker-controlled destination later).
// No real Redis call happens on this path, so no network is needed.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.KV_REST_API_URL = 'https://example.invalid';
process.env.KV_REST_API_TOKEN = 'dummy';

const { default: handler } = await import('../api/push/subscribe.js');

function fakeRes() {
    const r = { code: null, body: null, headers: {} };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    return r;
}

function fakeReq(body) {
    return {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.7' },
        body
    };
}

test('an attacker-chosen push endpoint is rejected, not stored', async () => {
    const res = fakeRes();
    await handler(fakeReq({
        subscription: { endpoint: 'https://attacker.example.com/collect' }
    }), res);
    assert.equal(res.code, 400);
    assert.match(res.body.error, /Unrecognised push endpoint/);
});
