// Turns a completed "What are you like, anyway?" result into context a
// conversational agent can speak from.
//
// The consumer is Mandy — the in-app AI companion — not a human reading a page.
// So this produces plain-language labels she can say out loud, never numbers she
// would have to narrate. "leans higher than most people" is speakable;
// "58 to 79 of 100" is a clinician's notation being read aloud by a companion,
// which is both clunky and the wrong register for a non-clinical product.
//
// It lives in lib/ so that BOTH consumers share one definition of what a band
// means: api/chat.js (the on-device path, where the app hands the result over at
// conversation time) and api/questionnaire-report.js (the stored-share path).
// One place, so the two can never drift into describing the same person
// differently.
//
// THE RULE THAT MATTERS MOST HERE. Four axes — openness, conscientiousness,
// extraversion, agreeableness — have a real comparison population, so a
// comparative label is honest. Sensitivity and risk appetite do not: they are
// Cowch's own axes with no population behind them, and are stored as absolute
// dials. Comparing them to "most people" would be inventing a crowd. Each band
// carries its own `scale`, and that is what decides the label shape here.
// Background: docs/wording-audit-what-are-you-like.md.
//
// Privacy: this only ever reads the six scored bands. The raw per-moment
// answers, the free-text notes from the honest exit and the wellness wheel
// harvest are never passed in and have no representation in the output.

// How sure the questionnaire is about one axis, as a word rather than a percent.
function confidenceWord(focus) {
    const n = Number(focus);
    if (!Number.isFinite(n)) return 'unclear';
    if (n < 40) return 'low';
    if (n < 70) return 'moderate';
    return 'good';
}

// A comparative label — only ever used for the four axes that have a real
// population behind them.
function populationLean(low, high) {
    const lo = Number(low), hi = Number(high);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 'unclear';
    const mid = (lo + hi) / 2;
    if (mid <= 25) return 'markedly lower than most people';
    if (mid <= 42) return 'somewhat lower than most people';
    if (mid < 58) return 'much like most people';
    if (mid < 75) return 'somewhat higher than most people';
    return 'markedly higher than most people';
}

// A self-referential label — no crowd, because for these two axes there isn't
// one. Deliberately says "this scale", never "most people".
function absoluteLean(dial, position) {
    const d = Number(dial);
    if (!Number.isFinite(d)) {
        return position ? String(position) : 'unclear';
    }
    if (d <= 3.5) return 'toward the low end of this scale';
    if (d < 6.5) return 'around the middle of this scale';
    return 'toward the high end of this scale';
}

function traitFrom(b) {
    if (!b || typeof b !== 'object') return null;
    const key = b.k ? String(b.k) : '';
    if (!key) return null;
    const isAbsolute = b.scale === 'absolute';
    return {
        key,
        trait: b.name ? String(b.name) : key,
        // 'population' = compared with other people; 'self' = only against this
        // axis's own scale. An agent must never compare a 'self' trait to others.
        comparison: isAbsolute ? 'self' : 'population',
        lean: isAbsolute ? absoluteLean(b.dial, b.position) : populationLean(b.low, b.high),
        confidence: confidenceWord(b.focus),
        note: b.sentence ? String(b.sentence) : ''
    };
}

// The one caveat any consumer of this data must carry with it.
export const QUESTIONNAIRE_CAVEAT =
    'Self-reported wellbeing questionnaire, not a clinical instrument and not a ' +
    'diagnosis. An indication of how someone answered on one day, never a verdict ' +
    'about who they are. Sensitivity and risk appetite have no comparison ' +
    'population, so they are never a percentile.';

// `result` is the blob the questionnaire engines save on completion.
// Returns null when there is nothing usable, so callers can simply skip.
export function buildQuestionnaireContext(result) {
    if (!result || typeof result !== 'object') return null;
    const bands = Array.isArray(result.bands) ? result.bands : [];
    const traits = bands.map(traitFrom).filter(Boolean);
    if (!traits.length) return null;

    const known = traits.filter(t => t.confidence !== 'unclear');
    const lowest = known.reduce((acc, t) => {
        const rank = { low: 0, moderate: 1, good: 2 };
        return acc === null || rank[t.confidence] < rank[acc] ? t.confidence : acc;
    }, null);

    return {
        instrument: 'what-are-you-like',
        variant: result.variant === 'rank' ? 'rank' : 'single',
        completed: result.completed ? String(result.completed) : '',
        scenariosSeen: Number.isFinite(Number(result.scenariosSeen)) ? Number(result.scenariosSeen) : null,
        overallConfidence: lowest || 'unclear',
        traits,
        caveat: QUESTIONNAIRE_CAVEAT
    };
}

export default buildQuestionnaireContext;
