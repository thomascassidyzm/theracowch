// The one place every function gets its Upstash client from.
//
// Why this exists: Preview deploys (staging.cowch.app, branch previews) get the
// SAME Upstash store as production — the free tier allows one database per
// account and it is already in use, so a second store would cost money. Real-
// browser testing on staging must not write test NDA signatures, wheels, push
// subscriptions or rate-limit counters into live users' data. So outside
// production every key is namespaced under `<VERCEL_ENV>:` (in practice
// `preview:cowch:nda:…`), and production keeps its existing unprefixed keys.
//
// No VERCEL_ENV at all (node --test, a bare script) → no prefix, so the tests
// keep asserting the real key names.
//
// Fail closed: with a prefix active, any command not in KEY_COMMANDS throws
// rather than silently reaching an unprefixed key. Add a command here (only one
// whose FIRST argument is its only key) before using it in an endpoint.

import { Redis } from '@upstash/redis';

const KEY_COMMANDS = new Set(['get', 'set', 'del', 'incr', 'expire', 'sadd', 'srem', 'smembers']);

export function keyPrefix(env = process.env.VERCEL_ENV) {
    return env && env !== 'production' ? env + ':' : '';
}

export function withKeyPrefix(client, prefix) {
    if (!client || !prefix) return client;
    return new Proxy(client, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value !== 'function') return value;
            if (!KEY_COMMANDS.has(prop)) {
                throw new Error(`redis.${String(prop)} has no key-prefix rule; add it to lib/redis.js before using it outside production`);
            }
            return (key, ...rest) => value.call(target, prefix + key, ...rest);
        }
    });
}

export const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
export const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Vercel's Upstash integration sets either env pair depending on how the store
// was provisioned.
export function createRedis() {
    return withKeyPrefix(new Redis({ url: REDIS_URL, token: REDIS_TOKEN }), keyPrefix());
}

// For callers that must fail closed when no store is configured.
export function createRedisIfConfigured() {
    return REDIS_URL && REDIS_TOKEN ? createRedis() : null;
}
