// Regression gaps from worker #408 / verification #417. Run with npm test.
// Optional SECURITY_MUTATION selects an in-memory negative control; no product
// file is edited. Node's loader hook substitutes Redis, not the real gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const state = { counters: new Map(), writes: [], calls: [] };
globalThis[Symbol.for('security-test-redis')] = state;
process.env.KV_REST_API_URL = 'https://example.invalid';
process.env.KV_REST_API_TOKEN = 'test-only';
process.env.ANTHROPIC_API_KEY = 'test-only';

const mutation = process.env.SECURITY_MUTATION;
const mutations = {
    rate: ['lib/request-gate.js', 'if (count > limit)', 'if (false)'],
    'nda-wiring': ['api/nda-sign.js', 'if (!rl.ok)', 'if (false)'],
    'push-wiring': ['api/push/subscribe.js', 'if (!rl.ok)', 'if (false)'],
    daily: ['lib/request-gate.js', 'if (count > dailyLimit)', 'if (false)'],
    'daily-wiring': ['lib/request-gate.js', 'if (dailyLimit)', 'if (false)'],
    'chat-input': ['api/chat.js', 'if (messageError)', 'if (false)'],
    'compress-input': ['api/compress-profile.js', 'if (promptError)', 'if (false)'],
    blog: ['api/blog-quotes.js', 'try {', "try { await fetch('https://www.thoughtsonlifeandlove.com/sitemap.xml');"]
};
if (mutation) assert.ok(mutations[mutation], `Unknown mutation: ${mutation}`);
let mutationApplied = false;
registerHooks({
    resolve(specifier, context, next) {
        if (specifier === '@upstash/redis') {
            return { url: 'test-double:redis', shortCircuit: true };
        }
        return next(specifier, context);
    },
    load(url, context, next) {
        if (url === 'test-double:redis') return {
            format: 'module', shortCircuit: true,
            source: `export class Redis {
                constructor() { this.state = globalThis[Symbol.for('security-test-redis')]; }
                async incr(key) {
                    const count = (this.state.counters.get(key) || 0) + 1;
                    this.state.counters.set(key, count);
                    return count;
                }
                async expire() { return 1; }
                async set(...args) { this.state.writes.push(['set', ...args]); return 'OK'; }
                async sadd(...args) { this.state.writes.push(['sadd', ...args]); return 1; }
            }`
        };
        const loaded = next(url, context);
        if (mutation && url.endsWith('/' + mutations[mutation][0])) {
            const [, before, after] = mutations[mutation];
            const source = String(loaded.source);
            assert.ok(source.includes(before), `Mutation target missing: ${before}`);
            mutationApplied = true;
            return { ...loaded, source: source.replace(before, after) };
        }
        return loaded;
    }
});

const { default: nda } = await import('../api/nda-sign.js');
const { default: push } = await import('../api/push/subscribe.js');
const { default: chat } = await import('../api/chat.js');
const { default: compress } = await import('../api/compress-profile.js');
const { default: blog } = await import('../api/blog-quotes.js');
const { LIMITS } = await import('../lib/request-gate.js');
if (mutation) assert.ok(mutationApplied, 'Negative control must actually alter loaded code');

function response() {
    return {
        code: 200, headers: {}, body: null,
        status(code) { this.code = code; return this; },
        json(body) { this.body = body; return this; },
        setHeader(key, value) { this.headers[key] = value; },
        end() { return this; }
    };
}
function request(body, ip = '203.0.113.7') {
    return { method: 'POST', body, headers: {
        origin: 'https://theracowch.com', 'x-forwarded-for': ip
    } };
}
function setup(t) {
    state.counters.clear(); state.writes.length = 0; state.calls.length = 0;
    // Fixed midday UTC: a test cannot straddle a rate window or daily reset.
    t.mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 8, 20, 12) });
    t.mock.method(globalThis, 'fetch', async (...args) => {
        state.calls.push(args);
        return { ok: true, json: async () => ({ content: [{ text: 'A calm reply.' }] }) };
    });
}

for (const [name, handler, limit, body] of [
    ['NDA', nda, 10, { fullName: 'Test Person', email: 'test@example.com', agreed: true,
        signatureDataUrl: 'data:image/png;base64,AA==' }],
    ['push', push, 20, { subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/test' } }]
]) {
    test(`${name}: limit requests are stored; next request is 429 without a write`, async t => {
        setup(t);
        for (let i = 0; i < limit; i++) {
            const res = response();
            await handler(request(body), res);
            assert.equal(res.code, 200);
            assert.equal(res.body.ok, true);
        }
        assert.equal(state.writes.length, limit * 2);
        const res = response();
        await handler(request(body), res);
        assert.equal(res.code, 429);
        assert.ok(Number(res.headers['Retry-After']) > 0);
        assert.equal(state.writes.length, limit * 2, 'rejected request must not store anything');
        const other = response();
        await handler(request(body, '203.0.113.8'), other);
        assert.equal(other.code, 200, 'independent IP still has capacity');
        assert.equal(state.calls.length, 0);
    });
}

for (const [name, handler, field, max, limits] of [
    ['chat', chat, 'message', 4000, LIMITS.chat],
    ['compress', compress, 'prompt', 8000, LIMITS.compress]
]) {
    test(`${name}: last daily slot succeeds; another IP is denied before fetch`, async t => {
        setup(t);
        const key = `cowch:rl:global:${limits.bucket}:2026-09-20`;
        state.counters.set(key, limits.dailyLimit - 1);
        const last = response();
        await handler(request({ [field]: 'hello' }), last);
        assert.equal(last.code, 200);
        assert.equal(state.calls.length, 1, 'last slot must reach AI');
        const denied = response();
        await handler(request({ [field]: 'hello' }, '203.0.113.8'), denied);
        assert.equal(denied.code, 429);
        assert.match(denied.body.error, /Daily capacity/);
        assert.equal(denied.headers['Retry-After'], '3600');
        assert.equal(state.calls.length, 1, 'exhausted daily capacity must not call AI');
    });
    for (const [label, value, status] of [
        ['content-block array', [{ type: 'text', text: 'hello' }], 400],
        ['oversized string', 'x'.repeat(max + 1), 413]
    ]) {
        test(`${name}: handler rejects ${label} before fetch`, async t => {
            setup(t);
            const res = response();
            await handler(request({ [field]: value }), res);
            assert.equal(res.code, status);
            assert.equal(state.calls.length, 0, 'invalid input must never reach AI');
        });
    }
}

test('blog quotes return curated content without an outbound request', async t => {
    setup(t);
    const res = response();
    await blog({ method: 'GET', headers: {} }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.source, 'curated');
    assert.ok(res.body.quotes.length > 0);
    assert.equal(state.calls.length, 0, 'curated quotes must not fetch the discarded sitemap');
});
