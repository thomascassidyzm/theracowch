// Staging/preview share production's Upstash store (free tier: one DB per
// account). lib/redis.js namespaces every key outside production so real-browser
// testing on staging.cowch.app can never write into live users' data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyPrefix, withKeyPrefix } from '../lib/redis.js';

function recorder() {
    const calls = [];
    const c = {};
    for (const m of ['get', 'set', 'del', 'incr', 'expire', 'sadd', 'srem', 'smembers', 'keys']) {
        c[m] = (...args) => { calls.push([m, ...args]); return 'ok'; };
    }
    return { client: c, calls };
}

test('production keeps the live, unprefixed keys', () => {
    assert.equal(keyPrefix('production'), '');
    const { client, calls } = recorder();
    withKeyPrefix(client, keyPrefix('production')).set('cowch:nda:1', { a: 1 });
    assert.deepEqual(calls, [['set', 'cowch:nda:1', { a: 1 }]]);
});

test('preview (staging) writes land under preview:, never on a live key', () => {
    const { client, calls } = recorder();
    const p = withKeyPrefix(client, keyPrefix('preview'));
    p.set('cowch:nda:1', 'x');
    p.sadd('cowch:nda:all', '1');
    p.srem('cowch:subs', 'a', 'b');
    p.incr('cowch:rl:chat:1.2.3.4');
    p.expire('cowch:rl:chat:1.2.3.4', 60);
    p.del('cowch:wheel:9');
    p.get('cowch:qshare:2');
    p.smembers('cowch:subs');
    for (const [, key] of calls) assert.ok(key.startsWith('preview:cowch:'), key);
    assert.deepEqual(calls[2], ['srem', 'preview:cowch:subs', 'a', 'b'], 'members are not prefixed');
});

test('an unlisted command fails closed outside production', () => {
    const p = withKeyPrefix(recorder().client, 'preview:');
    assert.throws(() => p.keys('cowch:*'), /no key-prefix rule/);
});
