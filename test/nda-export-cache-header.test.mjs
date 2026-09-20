// Proves api/nda-export.js sets Cache-Control: no-store on every response,
// including the 405 method-not-allowed path (which runs before the token
// check, so no Redis/env var is needed). Pre-fix this endpoint set no
// Cache-Control header at all, so the project-wide `public, max-age=0,
// must-revalidate` default from vercel.json applied to a response carrying
// personal data.
import test from 'node:test';
import assert from 'node:assert/strict';

const { default: handler } = await import('../api/nda-export.js');

function fakeRes() {
    const r = { code: null, body: null, headers: {} };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    r.end = () => r;
    return r;
}

test('Cache-Control: no-store is set even on a rejected (non-GET) request', async () => {
    const res = fakeRes();
    await handler({ method: 'POST', headers: {}, query: {} }, res);
    assert.equal(res.code, 405);
    assert.match(res.headers['Cache-Control'], /no-store/);
});
