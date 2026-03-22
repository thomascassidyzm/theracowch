/**
 * APML Forward Compilation: Data Models
 * Generated from: blue-reverse.apml
 *
 * This file implements the data models defined in the APML specification.
 */

// ==========================================
// Storage Keys (from APML model definitions)
// ==========================================

const STORAGE_KEYS = {
  conversationHistory: 'theracowch_chat_history',
  therapyProfile: 'cowch_therapy_profile',
  notices: 'cowch_notices',
  choices: 'cowch_choices',
  values: 'cowch_values',
  valuesAlignment: 'cowch_values_alignment',
  imagineEngagement: 'cowch_imagine_engagement'
};

// ==========================================
// Model: Message
// ==========================================

function createMessage(role, content) {
  if (!['user', 'assistant'].includes(role)) {
    throw new Error(`Invalid role: ${role}. Must be 'user' or 'assistant'.`);
  }
  if (!content || typeof content !== 'string') {
    throw new Error('Content is required and must be a string.');
  }

  return {
    role,
    content,
    timestamp: new Date().toISOString()
  };
}

// ==========================================
// Model: ConversationHistory
// ==========================================

const ConversationHistory = {
  MAX_SIZE: 100,

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.conversationHistory);
      const messages = stored ? JSON.parse(stored) : [];
      // Trim to max (lifecycle: on-load)
      return messages.slice(-this.MAX_SIZE);
    } catch (e) {
      console.error('Error loading conversation history:', e);
      return [];
    }
  },

  save(messages) {
    try {
      localStorage.setItem(STORAGE_KEYS.conversationHistory, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving conversation history:', e);
    }
  },

  push(history, message) {
    const newHistory = [...history, message];
    this.save(newHistory);
    return newHistory;
  },

  clear() {
    localStorage.removeItem(STORAGE_KEYS.conversationHistory);
  }
};

// ==========================================
// Model: TherapyProfile
// ==========================================

function getEmptyTherapyProfile() {
  return {
    version: 1,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    sessionCount: 0,
    messageCount: 0,

    patterns: [],
    patternStrength: {},

    imagine: {
      I: 0,
      M: 0,
      A: 0,
      G: 0,
      I2: 0,
      N: 0,
      E: 0
    },

    insights: [],
    activeThemes: [],
    strengths: [],

    preferences: {
      respondsTo: [],
      avoids: []
    },

    lastSession: {
      date: null,
      summary: null,
      mood: null
    },

    lastCompression: null,
    messagesSinceCompression: 0
  };
}

const TherapyProfile = {
  COMPRESS_AFTER: 8,

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.therapyProfile);
      return stored ? JSON.parse(stored) : getEmptyTherapyProfile();
    } catch (e) {
      console.warn('Could not read therapy profile:', e);
      return getEmptyTherapyProfile();
    }
  },

  save(profile) {
    try {
      profile.updated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.therapyProfile, JSON.stringify(profile));
      return true;
    } catch (e) {
      console.error('Could not save therapy profile:', e);
      return false;
    }
  },

  needsCompression(profile) {
    return profile.messagesSinceCompression >= this.COMPRESS_AFTER;
  },

  buildAPIContext(profile, history) {
    const recentMessages = history.slice(-3);

    return {
      profile: {
        sessionCount: profile.sessionCount,
        patterns: profile.patterns.join(', '),
        activeThemes: profile.activeThemes.join(', '),
        insights: profile.insights.slice(0, 3).join('; '),
        strengths: profile.strengths.join(', '),
        respondsTo: profile.preferences.respondsTo.join(', '),
        lastSession: profile.lastSession.summary,
        imagine: profile.imagine
      },
      recentMessages
    };
  },

  mergeCompressionResult(profile, updates) {
    // Merge patterns (unique, max 10)
    if (updates.patterns) {
      profile.patterns = [...new Set([...profile.patterns, ...updates.patterns])].slice(-10);
    }

    // Merge pattern strength
    if (updates.patternStrength) {
      profile.patternStrength = { ...profile.patternStrength, ...updates.patternStrength };
    }

    // Prepend insights (FIFO rotation, max 10)
    if (updates.insights) {
      profile.insights = [...updates.insights, ...profile.insights].slice(0, 10);
    }

    // Replace active themes
    if (updates.activeThemes) {
      profile.activeThemes = updates.activeThemes;
    }

    // Merge strengths (unique, max 5)
    if (updates.strengths) {
      profile.strengths = [...new Set([...profile.strengths, ...updates.strengths])].slice(-5);
    }

    // Update preferences
    if (updates.respondsTo) {
      profile.preferences.respondsTo = updates.respondsTo;
    }

    // Update last session
    if (updates.lastSessionSummary || updates.mood) {
      profile.lastSession = {
        date: new Date().toISOString(),
        summary: updates.lastSessionSummary || null,
        mood: updates.mood || null
      };
    }

    // Reset compression counters
    profile.lastCompression = new Date().toISOString();
    profile.messagesSinceCompression = 0;
    profile.sessionCount++;

    return profile;
  },

  clear() {
    localStorage.removeItem(STORAGE_KEYS.therapyProfile);
  }
};

// ==========================================
// Model: NoticeEntry
// ==========================================

function getTodayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

const NoticeEntry = {
  loadAll() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.notices);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  },

  loadToday() {
    const all = this.loadAll();
    return all[getTodayKey()] || null;
  },

  save(entry) {
    const all = this.loadAll();
    all[getTodayKey()] = {
      color: entry.color,
      energy: entry.energy,
      text: entry.text,
      prompt: entry.prompt
    };
    localStorage.setItem(STORAGE_KEYS.notices, JSON.stringify(all));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEYS.notices);
  }
};

// ==========================================
// Model: Choice
// ==========================================

const ChoiceModel = {
  loadAll() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.choices);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  save(choices) {
    localStorage.setItem(STORAGE_KEYS.choices, JSON.stringify(choices));
  },

  add(text) {
    const choices = this.loadAll();
    choices.push({
      text,
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    });
    this.save(choices);
    return choices;
  },

  clear() {
    localStorage.removeItem(STORAGE_KEYS.choices);
  }
};

// ==========================================
// Model: ValuesConfig & ValuesAlignment
// ==========================================

const ValuesConfig = {
  MIN_VALUES: 3,
  MAX_VALUES: 6,

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.values);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  save(values) {
    if (values.length < this.MIN_VALUES || values.length > this.MAX_VALUES) {
      throw new Error(`Values must be between ${this.MIN_VALUES} and ${this.MAX_VALUES}`);
    }
    localStorage.setItem(STORAGE_KEYS.values, JSON.stringify(values));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEYS.values);
  }
};

const ValuesAlignment = {
  loadAll() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.valuesAlignment);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  },

  loadToday() {
    const all = this.loadAll();
    return all[getTodayKey()] || {};
  },

  saveToday(scores) {
    const all = this.loadAll();
    all[getTodayKey()] = scores;
    localStorage.setItem(STORAGE_KEYS.valuesAlignment, JSON.stringify(all));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEYS.valuesAlignment);
  }
};

// ==========================================
// Model: ImagineEngagement
// ==========================================

const ImagineEngagement = {
  RETENTION_DAYS: 30,

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.imagineEngagement);
      return stored ? JSON.parse(stored) : { I: [], M: [], A: [], G: [], I2: [], N: [], E: [] };
    } catch (e) {
      return { I: [], M: [], A: [], G: [], I2: [], N: [], E: [] };
    }
  },

  save(data) {
    localStorage.setItem(STORAGE_KEYS.imagineEngagement, JSON.stringify(data));
  },

  record(domain) {
    const data = this.load();
    const now = Date.now();
    const retentionCutoff = now - (this.RETENTION_DAYS * 24 * 60 * 60 * 1000);

    if (data[domain] !== undefined) {
      // Add new timestamp
      data[domain].push(now);

      // Clean up old timestamps (retention policy)
      data[domain] = data[domain].filter(ts => ts > retentionCutoff);

      this.save(data);
    }

    return data;
  },

  getRecentCount(domain, days = 7) {
    const data = this.load();
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return (data[domain] || []).filter(ts => ts > cutoff).length;
  },

  clear() {
    localStorage.removeItem(STORAGE_KEYS.imagineEngagement);
  }
};

// ==========================================
// Exports
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEYS,
    createMessage,
    ConversationHistory,
    TherapyProfile,
    getEmptyTherapyProfile,
    NoticeEntry,
    ChoiceModel,
    ValuesConfig,
    ValuesAlignment,
    ImagineEngagement,
    getTodayKey
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.APMLModels = {
    STORAGE_KEYS,
    createMessage,
    ConversationHistory,
    TherapyProfile,
    getEmptyTherapyProfile,
    NoticeEntry,
    ChoiceModel,
    ValuesConfig,
    ValuesAlignment,
    ImagineEngagement,
    getTodayKey
  };
}
