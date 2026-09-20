// Proves the new aggregate daily ceiling exists and fails closed, which is
// what api/chat.js and api/compress-profile.js now sit behind on top of the
// existing per-IP limit. Pre-fix there was no such function at all — the
// only ceiling was per-IP, so many distinct IPs (or one IP with different
// windows over a day) had no aggregate bound on spend.
import test from 'node:test';
import assert from 'node:assert/strict';

// Deliberately NOT setting KV_REST_API_URL / UPSTASH_REDIS_REST_URL: this
// process has neither in its environment (see checkTextField-style tests),
// so request-gate.js's module-level `redis` client is null and the function
// must fail closed rather than silently allowing.
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;

const { checkGlobalDailyLimit, LIMITS } = await import('../lib/request-gate.js');

test('fails closed (503) when Redis is not configured', async () => {
    const result = await checkGlobalDailyLimit('chat', 3000);
    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
});

test('LIMITS carries a dailyLimit for both billed buckets', () => {
    assert.equal(typeof LIMITS.chat.dailyLimit, 'number');
    assert.equal(typeof LIMITS.compress.dailyLimit, 'number');
    assert.ok(LIMITS.chat.dailyLimit > LIMITS.chat.limit);
    assert.ok(LIMITS.compress.dailyLimit > LIMITS.compress.limit);
});
