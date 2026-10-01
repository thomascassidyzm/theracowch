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

// Prior turns sent alongside `message` (recentMessages / history). The client
// only ever sends the last three {role:'user'|'assistant', content:string}
// turns; anything else is not our app talking. Roles are whitelisted so the
// endpoint cannot be driven with system turns or content-block arrays.
export const MAX_TURNS = 6;
export const MAX_TURN_CHARS = 4000;

export function checkChatTurns(value) {
    if (value === null || value === undefined) return { turns: [] };
    if (!Array.isArray(value)) return { status: 400, error: 'History must be a list' };
    if (value.length > MAX_TURNS) return { status: 400, error: 'History too long' };
    const turns = [];
    for (const msg of value) {
        if (!msg || typeof msg !== 'object') return { status: 400, error: 'Invalid history entry' };
        if (msg.role !== 'user' && msg.role !== 'assistant') return { status: 400, error: 'Invalid history role' };
        if (typeof msg.content !== 'string') return { status: 400, error: 'History content must be a string' };
        if (msg.content.length > MAX_TURN_CHARS) return { status: 413, error: 'History entry too long' };
        if (msg.content.trim()) turns.push({ role: msg.role, content: msg.content });
    }
    return { turns };
}

// One line of plain text for the system block: newlines collapsed (so a field
// cannot forge the "--- END CLIENT CONTEXT ---" marker or start a new section)
// and length capped.
function oneLine(value, maxLen) {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    return String(value).replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/-{3,}/g, '-').trim().slice(0, maxLen);
}

// The compressed profile the client builds (therapy-profile.js buildAPIContext).
// Every field is coerced to its expected shape; unknown keys are dropped.
export function cleanProfile(profile) {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return null;
    const out = {};
    const n = Number(profile.sessionCount);
    if (Number.isFinite(n) && n > 0) out.sessionCount = Math.min(Math.floor(n), 100000);
    for (const key of ['patterns', 'activeThemes', 'insights', 'strengths', 'respondsTo', 'lastSession']) {
        const v = oneLine(profile[key], 500);
        if (v) out[key] = v;
    }
    if (profile.imagine && typeof profile.imagine === 'object' && !Array.isArray(profile.imagine)) {
        const imagine = {};
        for (const k of ['I', 'M', 'A', 'G', 'I2', 'N', 'E']) {
            const c = Number(profile.imagine[k]);
            if (Number.isFinite(c) && c > 0) imagine[k] = Math.min(Math.floor(c), 100000);
        }
        if (Object.keys(imagine).length) out.imagine = imagine;
    }
    return Object.keys(out).length ? out : null;
}

// Short machine labels (currentPattern, sessionPhase): letters, digits, - and _.
export function cleanLabel(value) {
    return typeof value === 'string' && /^[a-z0-9_-]{1,40}$/i.test(value) ? value : null;
}
