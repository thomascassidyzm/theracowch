// Proves the guard api/chat.js and api/compress-profile.js both use rejects
// a non-string field. Pre-fix, api/chat.js only checked length when
// `typeof message === 'string'`, so a non-string value (e.g. an
// Anthropic-compatible content-block array) skipped validation entirely and
// would have been forwarded straight into the billed Anthropic call.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTextField } from '../lib/text-field-guard.js';

test('a non-string value is rejected with 400', () => {
    const err = checkTextField([{ type: 'text', text: 'hi' }], 4000, 'Message');
    assert.ok(err);
    assert.equal(err.status, 400);
    assert.match(err.error, /Message must be a string/);
});

test('an over-length string is rejected with 413', () => {
    const err = checkTextField('x'.repeat(5000), 4000, 'Message');
    assert.ok(err);
    assert.equal(err.status, 413);
});

test('a valid string passes', () => {
    assert.equal(checkTextField('hello', 4000, 'Message'), null);
});
