// Cowch On-Demand Prompts
// "Pull, Don't Push" - User-initiated contextual therapeutic prompts
// All analysis happens client-side for complete privacy

// ================================
// Storage Keys
// ================================

const PROMPT_STORAGE_KEY = 'theracowch_daily_prompt';
const PATTERNS_STORAGE_KEY = 'theracowch_detected_patterns';
const LAST_PROMPT_KEY = 'theracowch_last_prompt_time';

// ================================
// IMAGINE Framework Prompts
// ================================

const IMAGINE_PROMPTS = {
    introspection: [
        "What's one thing you're noticing about yourself today?",
        "I'm curious - what's your inner dialogue saying to you right now?",
        "If you could describe your current state in one word, what would it be?",
        "What's one need you have that isn't being met right now?",
        "When did you last check in with how you're really feeling?"
    ],
    mindfulness: [
        "What are three things you can notice right now with your senses?",
        "Where is tension living in your body at this moment?",
        "What would it be like to take three deep breaths before your next task?",
        "I'm curious - what thoughts are passing through your mind right now?",
        "Can you notice one thing in this moment that's going okay?"
    ],
    acceptance: [
        "What's one thing you're fighting against that you might be able to accept?",
        "What would it feel like to let go of needing to control this situation?",
        "I notice you use the word 'should' a lot. What if we replaced it with 'could'?",
        "What are you resisting right now? What makes that hard to accept?",
        "What if this difficult feeling is trying to tell you something important?"
    ],
    gratitude: [
        "What's one small thing that went better than expected today?",
        "Who in your life deserves acknowledgment that you haven't given?",
        "What's working in your life right now, even if it's small?",
        "I'm curious - what quality in yourself are you grateful for today?",
        "What's one thing your body has done for you today that you haven't thanked it for?"
    ],
    interactions: [
        "What's one relationship that could use your attention right now?",
        "How are you really showing up in your relationships lately?",
        "What boundary would feel good to set today?",
        "I'm curious - what do you need from others that you're not asking for?",
        "What would it look like to be more authentic in one interaction today?"
    ],
    nurturing: [
        "What's one playful or fun thing you could do for yourself today?",
        "When did you last do something just because it brought you joy?",
        "What would 'treating yourself with kindness' look like right now?",
        "I'm curious - how would you nurture a good friend going through what you are?",
        "What's one small act of self-care you've been putting off?"
    ],
    exploring: [
        "What pattern keeps showing up in your life lately?",
        "I'm noticing a theme in what you've shared. Want to explore that together?",
        "What might this situation be teaching you about yourself?",
        "How is this similar to other challenges you've faced?",
        "What would it be like to see this from a completely different perspective?"
    ]
};

// ================================
// Pattern-Specific Prompts
// ================================

const PATTERN_PROMPTS = {
    anxiety: [
        "I've noticed anxiety coming up for you. On a scale of 1-10, where is it right now?",
        "What would it be like to imagine your anxiety as a separate entity? What would it look like?",
        "You mentioned feeling anxious before. What helps you feel even 10% calmer?",
        "I'm curious - what's the catastrophic outcome your anxiety is trying to protect you from?",
        "Want to try box breathing together? (4 counts in, hold 4, out 4, hold 4)"
    ],
    depression: [
        "I hear that heaviness in what you're sharing. What's one tiny thing that felt okay today?",
        "Depression can make everything feel pointless. What used to matter to you?",
        "What would 'being gentle with yourself' look like right now?",
        "I'm curious - if this low mood could talk, what would it be saying?",
        "What's one small action that past-you would thank present-you for doing?"
    ],
    relationships: [
        "You've mentioned relationship challenges a few times. What's the pattern you're noticing?",
        "What do you really need from this relationship that you're not getting?",
        "I'm curious - how much of this is about them, and how much is about your own stuff?",
        "What boundary would help you feel more authentic in this relationship?",
        "If this relationship were a reflection of your relationship with yourself, what would it show?"
    ],
    trauma: [
        "It sounds like old wounds are being touched. What do you need right now to feel safe?",
        "I'm hearing echoes of past experiences. How is your body responding to this?",
        "What would it be like to speak to your younger self about this?",
        "You're showing real courage exploring this. What support do you need?",
        "How can you remind yourself that you're here now, not back there?"
    ],
    perfectionism: [
        "I've noticed perfectionism showing up in your words. What would 'good enough' look like today?",
        "What if you gave yourself permission to be messy, imperfect, and human?",
        "I'm curious - whose standards are you really trying to meet here?",
        "What would it feel like to lower your expectations by just 10%?",
        "What's the worst thing that would happen if you weren't perfect at this?"
    ],
    stress: [
        "You seem to be carrying a lot right now. What's one thing you could put down?",
        "What's in your control today, and what isn't?",
        "I'm curious - what does your stress feel like in your body?",
        "What would 'taking pressure off yourself' look like today?",
        "If you could delegate or say no to one thing, what would it be?"
    ]
};

// ================================
// Exercise Suggestions
// ================================

const EXERCISE_DEFINITIONS = {
    'box-breathing': {
        name: 'Box Breathing',
        description: 'A calming breath practice: breathe in for 4, hold for 4, out for 4, hold for 4. Repeat 4 times.',
        suggested_for: ['anxiety', 'stress']
    },
    '5-4-3-2-1-grounding': {
        name: '5-4-3-2-1 Grounding',
        description: 'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
        suggested_for: ['anxiety', 'trauma']
    },
    'thought-defusion': {
        name: 'Thought Defusion',
        description: 'Notice your thought, then say "I\'m having the thought that..." to create distance.',
        suggested_for: ['anxiety', 'depression', 'perfectionism']
    },
    'self-compassion-break': {
        name: 'Self-Compassion Break',
        description: 'Say to yourself: 1) This is hard. 2) Everyone struggles sometimes. 3) May I be kind to myself.',
        suggested_for: ['depression', 'perfectionism', 'stress']
    },
    'values-check': {
        name: 'Values Check-In',
        description: 'Ask yourself: What matters most to me? Am I living in alignment with that today?',
        suggested_for: ['relationships', 'stress']
    }
};

// ================================
// Pattern Analysis
// ================================

function analyzeConversationPatterns(conversationHistory) {
    const patterns = {
        anxiety: 0,
        depression: 0,
        relationships: 0,
        trauma: 0,
        perfectionism: 0,
        stress: 0
    };

    const topics = {
        exercises: [],
        mentioned_recently: []
    };

    // Analyze recent messages (last 10)
    const recentMessages = conversationHistory.slice(-10);

    recentMessages.forEach(msg => {
        if (msg.role === 'user') {
            const text = msg.content.toLowerCase();

            // Pattern detection
            if (text.match(/\b(anxious|anxiety|worry|worried|nervous|panic|fear|scared)\b/)) {
                patterns.anxiety++;
            }
            if (text.match(/\b(sad|depressed|depression|down|hopeless|worthless|empty|numb)\b/)) {
                patterns.depression++;
            }
            if (text.match(/\b(relationship|partner|husband|wife|boyfriend|girlfriend|family|friend|conflict)\b/)) {
                patterns.relationships++;
            }
            if (text.match(/\b(childhood|trauma|abuse|past|triggered|flashback|ptsd)\b/)) {
                patterns.trauma++;
            }
            if (text.match(/\b(perfect|perfectionism|mistake|failure|should|must|not good enough)\b/)) {
                patterns.perfectionism++;
            }
            if (text.match(/\b(stress|stressed|overwhelmed|pressure|too much|burnout)\b/)) {
                patterns.stress++;
            }

            // Exercise mentions
            if (text.includes('breath')) topics.exercises.push('box-breathing');
            if (text.includes('grounding')) topics.exercises.push('5-4-3-2-1-grounding');
        }
    });

    // Find dominant pattern
    const dominantPattern = Object.keys(patterns).reduce((a, b) =>
        patterns[a] > patterns[b] ? a : b
    );

    // Get recent topics mentioned
    if (recentMessages.length > 0) {
        const lastUserMessage = recentMessages.filter(m => m.role === 'user').pop();
        if (lastUserMessage) {
            topics.mentioned_recently = extractTopics(lastUserMessage.content);
        }
    }

    return {
        patterns,
        dominantPattern,
        dominantCount: patterns[dominantPattern],
        topics,
        messageCount: conversationHistory.length,
        recentMessageCount: recentMessages.length
    };
}

function extractTopics(text) {
    const topics = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('work')) topics.push('work');
    if (lowerText.includes('presentation') || lowerText.includes('meeting')) topics.push('presentation');
    if (lowerText.includes('sleep')) topics.push('sleep');
    if (lowerText.includes('exercise') || lowerText.includes('workout')) topics.push('exercise');
    if (lowerText.includes('food') || lowerText.includes('eating')) topics.push('eating');

    return topics;
}

// ================================
// Time-Based Helpers
// ================================

function getTimeSinceLastMessage(conversationHistory) {
    if (conversationHistory.length === 0) return Infinity;

    const lastMessageTime = localStorage.getItem('theracowch_last_message_time');
    if (!lastMessageTime) return Infinity;

    const now = Date.now();
    const lastTime = parseInt(lastMessageTime);
    const diffMs = now - lastTime;

    return {
        ms: diffMs,
        hours: diffMs / (1000 * 60 * 60),
        days: diffMs / (1000 * 60 * 60 * 24)
    };
}

function updateLastMessageTime() {
    localStorage.setItem('theracowch_last_message_time', Date.now().toString());
}

// ================================
// Prompt Generation
// ================================

function generateContextualPrompt(conversationHistory) {
    const analysis = analyzeConversationPatterns(conversationHistory);
    const timeSince = getTimeSinceLastMessage(conversationHistory);

    // No conversation yet - show welcome
    if (conversationHistory.length === 0) {
        return {
            type: 'welcome',
            content: "What's one thing on your mind today?",
            action: 'Start chatting'
        };
    }

    // Just chatted (< 1 hour) - don't show prompt
    if (timeSince.hours < 1) {
        return null;
    }

    // Priority 1: Follow-up on dominant pattern (if exists and < 3 days)
    if (analysis.dominantCount >= 2 && timeSince.days < 3) {
        const patternPrompts = PATTERN_PROMPTS[analysis.dominantPattern];
        if (patternPrompts) {
            const prompt = patternPrompts[Math.floor(Math.random() * patternPrompts.length)];
            return {
                type: 'pattern-follow-up',
                pattern: analysis.dominantPattern,
                content: prompt,
                action: 'Explore this'
            };
        }
    }

    // Priority 2: Suggest relevant exercise (if pattern detected)
    if (analysis.dominantCount >= 1) {
        const relevantExercises = Object.entries(EXERCISE_DEFINITIONS)
            .filter(([_, ex]) => ex.suggested_for.includes(analysis.dominantPattern));

        if (relevantExercises.length > 0 && Math.random() > 0.5) {
            const [key, exercise] = relevantExercises[Math.floor(Math.random() * relevantExercises.length)];
            return {
                type: 'exercise-suggestion',
                exerciseKey: key,
                content: `Want to try ${exercise.name}? ${exercise.description}`,
                action: 'Let\'s try it'
            };
        }
    }

    // Priority 3: IMAGINE framework rotation (based on day of week)
    const imagineCategory = getIMAGINECategoryForToday();
    const imaginePrompts = IMAGINE_PROMPTS[imagineCategory];
    const imaginePrompt = imaginePrompts[Math.floor(Math.random() * imaginePrompts.length)];

    return {
        type: 'imagine-framework',
        category: imagineCategory,
        content: imaginePrompt,
        action: 'Reflect on this'
    };
}

function getIMAGINECategoryForToday() {
    const categories = ['introspection', 'mindfulness', 'acceptance', 'gratitude', 'interactions', 'nurturing', 'exploring'];
    const dayOfWeek = new Date().getDay();
    return categories[dayOfWeek % categories.length];
}

// ================================
// Daily Prompt (Cached)
// ================================

function getDailyPrompt(conversationHistory) {
    const today = new Date().toDateString();
    const cached = localStorage.getItem(PROMPT_STORAGE_KEY);

    if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.date === today) {
            return parsed.prompt;
        }
    }

    // Generate new prompt
    const prompt = generateContextualPrompt(conversationHistory);

    if (prompt) {
        localStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify({
            date: today,
            prompt: prompt,
            generated: new Date().toISOString()
        }));
    }

    return prompt;
}

// ================================
// On-Demand Prompt (Fresh)
// ================================

function getOnDemandPrompt(conversationHistory) {
    // Always generate fresh prompt
    const prompt = generateContextualPrompt(conversationHistory);

    // Store last prompt time
    localStorage.setItem(LAST_PROMPT_KEY, Date.now().toString());

    return prompt;
}

// ================================
// Check if Should Show Prompt
// ================================

function shouldShowPromptOnOpen(conversationHistory) {
    // Never show on first visit (no conversation history)
    if (conversationHistory.length === 0) {
        return false;
    }

    const timeSince = getTimeSinceLastMessage(conversationHistory);

    // Don't show if just chatted (< 1 hour)
    if (timeSince.hours < 1) {
        return false;
    }

    // Show if it's been > 1 hour
    return true;
}

// ================================
// Public API
// ================================

window.MandyPrompts = {
    // Get daily cached prompt
    getDailyPrompt,

    // Get fresh on-demand prompt
    getOnDemandPrompt,

    // Check if should auto-show prompt
    shouldShowPromptOnOpen,

    // Update last message timestamp
    updateLastMessageTime,

    // Get conversation analysis
    analyzePatterns: analyzeConversationPatterns,

    // Get all IMAGINE prompts for reference
    getIMAGINEPrompts: () => IMAGINE_PROMPTS,

    // Get all exercises
    getExercises: () => EXERCISE_DEFINITIONS
};

console.log('Mandy On-Demand Prompts initialized');
