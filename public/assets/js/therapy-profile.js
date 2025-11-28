// Cowch Therapy Profile - Compressed Context System
// Stores therapeutic insights locally, sends compressed context to API
// All data stays on-device for privacy

const PROFILE_KEY = 'cowch_therapy_profile';
const HISTORY_KEY = 'cowch_full_history';
const COMPRESS_AFTER_MESSAGES = 8; // Compress after this many new messages

// ============================================
// Profile Schema
// ============================================

function getEmptyProfile() {
  return {
    version: 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    sessionCount: 0,
    messageCount: 0,

    // Pattern recognition (updated by compression)
    patterns: [],           // e.g., ["perfectionism", "social-anxiety", "self-criticism"]
    patternStrength: {},    // e.g., { "perfectionism": 3, "anxiety": 2 }

    // IMAGINE domain engagement
    imagine: {
      I: 0,   // Introspection / Self
      M: 0,   // Mindfulness
      A: 0,   // Acceptance
      G: 0,   // Gratitude
      I2: 0,  // Interactions
      N: 0,   // Nurturing / Play
      E: 0    // Exploring
    },

    // Therapeutic insights (max 10, rotated)
    insights: [],

    // Current active work
    activeThemes: [],       // What they're currently working on

    // Strengths Mandy has noticed
    strengths: [],

    // Preferred approaches that work for this person
    preferences: {
      respondsTo: [],       // e.g., ["reframing", "validation", "gentle-challenge"]
      avoids: []            // e.g., ["direct-advice", "homework"]
    },

    // Last session summary (for continuity)
    lastSession: {
      date: null,
      summary: null,
      mood: null
    },

    // Compression metadata
    lastCompression: null,
    messagesSinceCompression: 0
  };
}

// ============================================
// Profile Storage
// ============================================

function getProfile() {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Could not read therapy profile:', e);
  }
  return getEmptyProfile();
}

function saveProfile(profile) {
  try {
    profile.updated = new Date().toISOString();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  } catch (e) {
    console.error('Could not save therapy profile:', e);
    return false;
  }
}

// ============================================
// Full History (for UI scrollback only)
// ============================================

function getFullHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function saveFullHistory(history) {
  try {
    // Keep last 100 messages for scrollback
    const trimmed = history.slice(-100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Could not save history:', e);
  }
}

function addToHistory(message) {
  const history = getFullHistory();
  history.push({
    ...message,
    timestamp: new Date().toISOString()
  });
  saveFullHistory(history);

  // Track messages since compression
  const profile = getProfile();
  profile.messagesSinceCompression++;
  profile.messageCount++;
  saveProfile(profile);

  return history;
}

// ============================================
// Profile Compression
// ============================================

function needsCompression() {
  const profile = getProfile();
  return profile.messagesSinceCompression >= COMPRESS_AFTER_MESSAGES;
}

function buildCompressionPrompt(recentMessages, currentProfile) {
  return `You are updating a therapy profile for a wellness app user. Analyze these recent messages and update the profile.

CURRENT PROFILE:
${JSON.stringify(currentProfile, null, 2)}

RECENT MESSAGES (since last compression):
${recentMessages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Return ONLY valid JSON with these fields (keep values concise):
{
  "patterns": ["list", "of", "patterns"],
  "patternStrength": {"pattern": strength_1_to_5},
  "insights": ["max 5 key insights about this person"],
  "activeThemes": ["what they're currently working on"],
  "strengths": ["strengths you've noticed"],
  "respondsTo": ["therapeutic approaches that work"],
  "lastSessionSummary": "One sentence about this session",
  "mood": "their current emotional state"
}

Focus on therapeutic relevance. Be concise. Max 200 words total.`;
}

async function compressProfile(recentMessages) {
  const profile = getProfile();

  try {
    const response = await fetch('/api/compress-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: buildCompressionPrompt(recentMessages, profile)
      })
    });

    if (!response.ok) {
      throw new Error('Compression failed');
    }

    const data = await response.json();
    const updates = JSON.parse(data.compressed);

    // Merge updates into profile
    if (updates.patterns) {
      profile.patterns = [...new Set([...profile.patterns, ...updates.patterns])].slice(-10);
    }
    if (updates.patternStrength) {
      profile.patternStrength = { ...profile.patternStrength, ...updates.patternStrength };
    }
    if (updates.insights) {
      profile.insights = [...updates.insights, ...profile.insights].slice(0, 10);
    }
    if (updates.activeThemes) {
      profile.activeThemes = updates.activeThemes;
    }
    if (updates.strengths) {
      profile.strengths = [...new Set([...profile.strengths, ...updates.strengths])].slice(-5);
    }
    if (updates.respondsTo) {
      profile.preferences.respondsTo = updates.respondsTo;
    }
    if (updates.lastSessionSummary || updates.mood) {
      profile.lastSession = {
        date: new Date().toISOString(),
        summary: updates.lastSessionSummary || null,
        mood: updates.mood || null
      };
    }

    // Reset compression counter
    profile.lastCompression = new Date().toISOString();
    profile.messagesSinceCompression = 0;
    profile.sessionCount++;

    saveProfile(profile);
    console.log('Profile compressed successfully');
    return profile;

  } catch (e) {
    console.warn('Profile compression failed:', e);
    // Don't block the app, just skip compression
    return profile;
  }
}

// ============================================
// Build Context for API
// ============================================

function buildAPIContext() {
  const profile = getProfile();
  const history = getFullHistory();

  // Get last 2-3 messages for immediate context
  const recentMessages = history.slice(-3);

  // Build compressed profile string (~200 tokens)
  const profileContext = {
    sessionCount: profile.sessionCount,
    patterns: profile.patterns.join(', '),
    activeThemes: profile.activeThemes.join(', '),
    insights: profile.insights.slice(0, 3).join('; '),
    strengths: profile.strengths.join(', '),
    respondsTo: profile.preferences.respondsTo.join(', '),
    lastSession: profile.lastSession.summary,
    imagine: profile.imagine
  };

  return {
    profile: profileContext,
    recentMessages: recentMessages
  };
}

// ============================================
// IMAGINE Tracking
// ============================================

function recordImagineEngagement(domain) {
  const profile = getProfile();
  const domainMap = {
    'self': 'I',
    'mindfulness': 'M',
    'acceptance': 'A',
    'gratitude': 'G',
    'interactions': 'I2',
    'nurturing': 'N',
    'exploring': 'E'
  };

  const key = domainMap[domain.toLowerCase()] || domain;
  if (profile.imagine[key] !== undefined) {
    profile.imagine[key]++;
    saveProfile(profile);
  }
}

// ============================================
// Clear Data (user request)
// ============================================

function clearAllData() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(HISTORY_KEY);
  console.log('All therapy data cleared');
}

// ============================================
// Export for use in chat
// ============================================

window.TherapyProfile = {
  getProfile,
  saveProfile,
  getFullHistory,
  addToHistory,
  needsCompression,
  compressProfile,
  buildAPIContext,
  recordImagineEngagement,
  clearAllData,
  getEmptyProfile
};
