// Proves the /api/push/send cron guard fails CLOSED when CRON_SECRET is unset.
// Pre-fix (`if (cronSecret) { ... }`) this test fails: with no secret the guard
// is skipped entirely and the request falls through to the VAPID check.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.KV_REST_API_URL = 'https://example.invalid';
process.env.KV_REST_API_TOKEN = 'dummy';
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;

const { default: handler } = await import('../api/push/send.js');

function fakeRes() {
    const r = { code: null, body: null };
    r.status = (c) => { r.code = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    return r;
}

test('unauthenticated request is refused when CRON_SECRET is unset', async () => {
    delete process.env.CRON_SECRET;
    const res = fakeRes();
    await handler({ headers: {} }, res);
    assert.equal(res.code, 503);
    assert.match(res.body.error, /CRON_SECRET missing/);
});

test('wrong bearer is rejected when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 'correct-horse';
    const res = fakeRes();
    await handler({ headers: { authorization: 'Bearer wrong' } }, res);
    assert.equal(res.code, 401);
    assert.equal(res.body.error, 'unauthorized');
});
