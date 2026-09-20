// Validates a required user-supplied text field before it is forwarded to a
// billed Anthropic call. Shared by api/chat.js (`message`) and
// api/compress-profile.js (`prompt`) so the two can't drift.
//
// Pure and side-effect free on purpose: it doesn't touch Redis or the
// network, which is what lets it be unit-tested directly instead of only
// through the full HTTP handler.
export function checkTextField(value, maxLen, label) {
    if (typeof value !== 'string') {
        return { status: 400, error: `${label} must be a string` };
    }
    if (value.length > maxLen) {
        return { status: 413, error: `${label} too long` };
    }
    return null;
}
