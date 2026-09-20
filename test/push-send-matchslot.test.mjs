// Proves matchSlot() no longer throws on a malformed reminder time.
// Pre-fix, `time.split(':')` ran on whatever the client sent — a
// subscription posted with `morning: { on: true, time: 1 }` crashed the
// dispatcher (`1.split is not a function`), which aborted the whole scan and
// silently dropped every remaining subscriber for that cron run.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.KV_REST_API_URL = 'https://example.invalid';
process.env.KV_REST_API_TOKEN = 'dummy';

const { matchSlot } = await import('../api/push/send.js');

test('a non-string reminder time does not throw and does not match', () => {
    assert.doesNotThrow(() => {
        const slot = matchSlot({ morning: { on: true, time: 1 } }, 9 * 60);
        assert.equal(slot, null);
    });
});

test('an out-of-range reminder time does not throw and does not match', () => {
    assert.doesNotThrow(() => {
        const slot = matchSlot({ evening: { on: true, time: '99:99' } }, 20 * 60);
        assert.equal(slot, null);
    });
});

test('a well-formed time still matches within tolerance', () => {
    const slot = matchSlot({ morning: { on: true, time: '09:00' } }, 9 * 60 + 2);
    assert.equal(slot, 'morning');
});
