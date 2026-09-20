// Proves the aggregate daily ceiling actually REFUSES past its limit, and keeps
// refusing. The existing global-daily-cap test only proves it fails closed when
// Redis is absent — the easy half. Cold-verify (Astra, 2026-09-20) pointed out
// that nothing exercised exhaustion, and a spend ceiling nobody has watched
// refuse is a ceiling nobody should trust.
import test from 'node:test';
import assert from 'node:assert/strict';

const { checkGlobalDailyLimit } = await import('../lib/request-gate.js');

function fakeRedis() {
    const store = new Map();
    return {
        expires: [],
        async incr(k) { const n = (store.get(k) || 0) + 1; store.set(k, n); return n; },
        async expire(k, s) { this.expires.push([k, s]); }
    };
}

test('allows up to the limit, then refuses with 429 and keeps refusing', async () => {
    const redis = fakeRedis();
    const LIMIT = 5;
    for (let i = 1; i <= LIMIT; i++) {
        const r = await checkGlobalDailyLimit('chat', LIMIT, redis);
        assert.equal(r.ok, true, `request ${i} of ${LIMIT} should be allowed`);
    }
    const over = await checkGlobalDailyLimit('chat', LIMIT, redis);
    assert.equal(over.ok, false);
    assert.equal(over.status, 429);
    assert.equal(over.reason, 'global-cap');

    // Still refused on the next attempt — the counter does not reset on refusal.
    const again = await checkGlobalDailyLimit('chat', LIMIT, redis);
    assert.equal(again.ok, false);
    assert.equal(again.status, 429);
});

test('the day key is given a TTL that outlives the UTC day, once', async () => {
    const redis = fakeRedis();
    await checkGlobalDailyLimit('compress', 3, redis);
    await checkGlobalDailyLimit('compress', 3, redis);
    assert.equal(redis.expires.length, 1, 'EXPIRE is set on first hit only');
    assert.ok(redis.expires[0][1] > 24 * 60 * 60);
});

test('each bucket has its own counter', async () => {
    const redis = fakeRedis();
    await checkGlobalDailyLimit('chat', 1, redis);
    const compressFirst = await checkGlobalDailyLimit('compress', 1, redis);
    assert.equal(compressFirst.ok, true, 'chat exhaustion must not refuse compression');
});
