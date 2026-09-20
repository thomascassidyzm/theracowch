// Proves api/nda-sign.js rejects an oversized signature payload rather than
// writing it to Redis (pre-fix: signatureDataUrl had no size limit at all,
// only a `data:image/` prefix check). No real Redis call happens on this
// path — the cap is checked before the rate-limit / write, so no network is
// needed.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.KV_REST_API_URL = 'https://example.invalid';
process.env.KV_REST_API_TOKEN = 'dummy';

const { default: handler } = await import('../api/nda-sign.js');

function fakeRes() {
    const r = { code: null, body: null, headers: {} };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    r.end = () => r;
    return r;
}

function fakeReq(body) {
    return {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.7' },
        body
    };
}

test('an oversized signature data URL is rejected, not stored', async () => {
    const res = fakeRes();
    const hugeSignature = 'data:image/png;base64,' + 'A'.repeat(300 * 1024);
    await handler(fakeReq({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        agreed: true,
        signatureDataUrl: hugeSignature
    }), res);
    assert.equal(res.code, 413);
    assert.match(res.body.error, /Signature too large/);
});
