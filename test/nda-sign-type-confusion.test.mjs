// Proves api/nda-sign.js rejects a non-string signatureDataUrl.
//
// Pre-fix this test FAILS. The validation measured `String(signatureDataUrl)`
// but the ORIGINAL value was what got stored, so an ARRAY whose first element
// carries the `data:image/` prefix coerces to a short string ("data:image/...,
// [object Object]") that passes both the prefix check and the size cap, while
// the value actually written to Redis is arbitrarily large. A cold-verify pass
// (Astra, 2026-09-20) demonstrated 300,043 bytes accepted this way.
//
// Same class of hole on ndaVersion, which was unsized and untyped.
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

const base = { fullName: 'Jane Doe', email: 'jane@example.com', agreed: true };
const req = (body) => ({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.7' }, body });

test('an array masquerading as a signature data URL is rejected', async () => {
    const res = fakeRes();
    // Coerces to "data:image/png;base64,AAA,[object Object]" — short, and it
    // starts with the required prefix. The second element carries the payload.
    const smuggled = ['data:image/png;base64,AAA', { blob: 'B'.repeat(300 * 1024) }];
    await handler(req({ ...base, signatureDataUrl: smuggled }), res);
    assert.equal(res.code, 400, 'a non-string signature must be refused outright');
    assert.match(res.body.error, /signature/i);
});

test('an object with a toString is rejected too', async () => {
    const res = fakeRes();
    const smuggled = { toString: () => 'data:image/png;base64,AAA', payload: 'C'.repeat(1024) };
    await handler(req({ ...base, signatureDataUrl: smuggled }), res);
    assert.equal(res.code, 400);
});

test('a non-string ndaVersion is refused rather than coerced and stored', async () => {
    const res = fakeRes();
    await handler(req({
        ...base,
        signatureDataUrl: 'data:image/png;base64,AAA',
        ndaVersion: { nested: 'D'.repeat(200 * 1024) }
    }), res);
    assert.equal(res.code, 400);
});
