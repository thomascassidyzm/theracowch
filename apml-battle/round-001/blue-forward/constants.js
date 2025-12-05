/**
 * APML Forward Compilation: Constants
 * Generated from: blue-reverse.apml
 *
 * This file implements the static data constants defined in the APML specification.
 */

// ==========================================
// Constant: IMAGINE_DOMAINS
// ==========================================

const IMAGINE_DOMAINS = [
  {
    key: 'self',
    letter: 'I',
    title: 'I, Me, Myself',
    subtitle: 'Self-care, boundaries & compassion',
    color: '#E88A6A',
    page: '/imagine/self.html'
  },
  {
    key: 'mind',
    letter: 'M',
    title: 'Mindfulness',
    subtitle: 'Present moment awareness',
    color: '#7EA88B',
    page: '/imagine/mindfulness.html'
  },
  {
    key: 'accept',
    letter: 'A',
    title: 'Acceptance',
    subtitle: 'Making peace with what is',
    color: '#B8860B',
    page: '/imagine/acceptance.html'
  },
  {
    key: 'thanks',
    letter: 'G',
    title: 'Gratitude',
    subtitle: 'Noticing the good',
    color: '#DDA0DD',
    page: '/imagine/gratitude.html'
  },
  {
    key: 'connect',
    letter: 'I',
    title: 'Interactions',
    subtitle: 'Connection with others',
    color: '#6B8E9F',
    page: '/imagine/interactions.html'
  },
  {
    key: 'play',
    letter: 'N',
    title: 'Nurture Fun & Play',
    subtitle: 'Joy and lightness',
    color: '#F4A460',
    page: '/imagine/nurturing.html'
  },
  {
    key: 'explore',
    letter: 'E',
    title: 'Explore',
    subtitle: 'Growth and discovery',
    color: '#8FBC8F',
    page: '/imagine/exploring.html'
  }
];

// ==========================================
// Constant: MANDY_QUOTES
// ==========================================

const MANDY_QUOTES = [
  "Sometimes the bravest thing we can do is simply show up for ourselves. You're here, and that matters.",
  "You don't have to have it all figured out. Taking one small step is enough.",
  "Your feelings are valid, even the messy ones. They're part of being human.",
  "Rest isn't a reward for productivity. It's a basic need, and you deserve it.",
  "You've survived 100% of your hardest days so far. That's remarkable.",
  "Progress isn't always visible. Sometimes growth happens in the quiet moments.",
  "It's okay to not be okay. What matters is that you're reaching out.",
  "Every small act of self-care is a vote for the life you want to live.",
  "You are not your thoughts. You're the awareness behind them.",
  "Healing isn't linear. Some days will be harder than others, and that's okay."
];

// ==========================================
// Constant: NOTICE_PROMPTS
// ==========================================

const NOTICE_PROMPTS = [
  "What mattered to me today?",
  "What surprised me today?",
  "Where did I feel most like myself?",
  "What did I notice today?",
  "What did I give myself today?",
  "What small moment brought me joy?",
  "What am I grateful for right now?"
];

// ==========================================
// Constant: PATTERN_KEYWORDS
// ==========================================

const PATTERN_KEYWORDS = {
  anxiety: 'anxious|anxiety|worry|worried|nervous|panic|fear|scared',
  depression: 'sad|depressed|depression|down|hopeless|worthless|empty|numb',
  relationships: 'relationship|partner|husband|wife|boyfriend|girlfriend|family|friend',
  trauma: 'childhood|trauma|abuse|past|triggered|flashback',
  perfectionism: 'perfect|perfectionism|mistake|failure|should|must|not good enough',
  stress: 'stress|stressed|overwhelmed|pressure|too much|burnout'
};

// ==========================================
// Constant: VALUES_PRESETS
// ==========================================

const VALUES_PRESETS = [
  'Family',
  'Health',
  'Growth',
  'Connection',
  'Creativity',
  'Adventure',
  'Peace',
  'Purpose',
  'Integrity',
  'Fun',
  'Learning',
  'Kindness'
];

// ==========================================
// Constant: NOTICE_COLORS (warm palette)
// ==========================================

const NOTICE_COLORS = [
  '#D4896A', // coral
  '#E88A6A', // terracotta
  '#7EA88B', // sage
  '#B8860B', // gold
  '#DDA0DD', // lavender
  '#6B8E9F', // blue
  '#F4A460', // sandy
  '#8FBC8F', // green
  '#D2691E', // sienna
  '#CD853F', // peru
  '#B0A499', // warm gray
  '#4A4039'  // dark brown
];

// ==========================================
// Helper: Get quote by day
// ==========================================

function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  return MANDY_QUOTES[dayOfYear % MANDY_QUOTES.length];
}

function getRandomQuote() {
  return MANDY_QUOTES[Math.floor(Math.random() * MANDY_QUOTES.length)];
}

function getDailyNoticePrompt() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  return NOTICE_PROMPTS[dayOfYear % NOTICE_PROMPTS.length];
}

// ==========================================
// Exports
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IMAGINE_DOMAINS,
    MANDY_QUOTES,
    NOTICE_PROMPTS,
    PATTERN_KEYWORDS,
    VALUES_PRESETS,
    NOTICE_COLORS,
    getDailyQuote,
    getRandomQuote,
    getDailyNoticePrompt
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.APMLConstants = {
    IMAGINE_DOMAINS,
    MANDY_QUOTES,
    NOTICE_PROMPTS,
    PATTERN_KEYWORDS,
    VALUES_PRESETS,
    NOTICE_COLORS,
    getDailyQuote,
    getRandomQuote,
    getDailyNoticePrompt
  };
}
