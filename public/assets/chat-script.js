// Cowch Chat - AI Mandy Conversation Interface
// Inspired by Telegram/WhatsApp messaging patterns

// ================================
// Configuration
// ================================

const API_ENDPOINT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/chat'
    : '/api/chat';

const STORAGE_KEY = 'theracowch_chat_history';
const MAX_HISTORY_MESSAGES = 6; // Last 6 messages for context

// IMAGINE engagement tracking - just noticing, not scoring
const IMAGINE_STORAGE_KEY = 'cowch_imagine_engagement';

// Get engagement data from localStorage
function getImagineEngagement() {
    try {
        const data = localStorage.getItem(IMAGINE_STORAGE_KEY);
        return data ? JSON.parse(data) : {
            I: [],    // timestamps of "I, Me, Myself" exercises
            M: [],    // timestamps of "Mindfulness" exercises
            A: [],    // timestamps of "Acceptance" exercises
            G: [],    // timestamps of "Gratitude" exercises
            I2: [],   // timestamps of "Interactions" exercises
            N: [],    // timestamps of "Nurture/Play" exercises
            E: []     // timestamps of "Explore" exercises
        };
    } catch (e) {
        return { I: [], M: [], A: [], G: [], I2: [], N: [], E: [] };
    }
}

// Save engagement data
function saveImagineEngagement(data) {
    try {
        localStorage.setItem(IMAGINE_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save IMAGINE engagement');
    }
}

// Record that user engaged with an exercise in a domain
function recordImagineEngagementByLetter(letter) {
    const data = getImagineEngagement();
    const now = Date.now();

    // Add timestamp to the domain
    if (data[letter]) {
        data[letter].push(now);

        // Keep only last 30 days of data (clean up old timestamps)
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        data[letter] = data[letter].filter(ts => ts > thirtyDaysAgo);
    }

    saveImagineEngagement(data);
    updateImagineTracker();
}

// Map exercise to its IMAGINE letter
function getExerciseLetter(exerciseName) {
    // Find which category this exercise belongs to
    for (const category of IMAGINE_EXERCISES) {
        for (const exercise of category.exercises) {
            if (exercise.name === exerciseName || exercise.title === exerciseName) {
                // Handle the two "I" categories
                if (category.title === 'Interactions') {
                    return 'I2';
                }
                return category.letter;
            }
        }
    }
    return null;
}

// Update the visual tracker in the menu panel
function updateImagineTracker() {
    const data = getImagineEngagement();
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

    // For each letter, count engagements in the last 7 days
    const letters = ['I', 'M', 'A', 'G', 'I2', 'N', 'E'];

    letters.forEach(letter => {
        const letterElement = document.querySelector(`.imagine-tracker-letter[data-letter="${letter}"]`);
        if (!letterElement) return;

        const timestamps = data[letter] || [];
        const recentCount = timestamps.filter(ts => ts > sevenDaysAgo).length;

        // Cap at 5 for display (5 dots max)
        const dotCount = Math.min(recentCount, 5);

        // Update dots
        const dots = letterElement.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('filled', i < dotCount);
        });

        // Add active class if engaged today
        const today = new Date().setHours(0, 0, 0, 0);
        const engagedToday = timestamps.some(ts => ts >= today);
        letterElement.classList.toggle('active', engagedToday);
    });
}

// Get color for IMAGINE letter
function getColorForLetter(letter) {
    const colors = {
        'I': '#E88A6A',
        'M': '#7EA88B',
        'A': '#B8860B',
        'G': '#DDA0DD',
        'I2': '#6B8E9F',
        'N': '#F4A460',
        'E': '#8FBC8F'
    };
    return colors[letter] || '#E88A6A';
}

// Setup click handlers for tracker letters
function setupTrackerLetterClicks() {
    document.querySelectorAll('.imagine-tracker-letter').forEach(letterEl => {
        letterEl.addEventListener('click', () => {
            const letter = letterEl.dataset.letter;
            hapticFeedback('light');

            // Close menu panel
            if (menuPanel) menuPanel.classList.remove('active');

            // Open exercise panel
            if (exercisePanel) exercisePanel.classList.add('active');

            // Scroll to the matching category
            setTimeout(() => {
                const categoryHeader = document.querySelector(`.imagine-letter[style*="${getColorForLetter(letter)}"]`);
                if (categoryHeader) {
                    categoryHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300);
        });
    });
}

// ================================
// DOM Elements (initialized in initChatDOM)
// ================================

let chatMessages, chatInput, sendButton, quickPromptsContainer;
let menuButton, menuPanel, closeMenuPanelButton;
let clearChatButton, privacyInfoButton;
let openImaginePanelButton, openExercisePanelButton;
let imaginePanel, exercisePanel;
let closeImaginePanelButton, closeExercisePanelButton;
let imagineContent, exerciseContent;
let breathingModal, closeBreathingButton, startBreathingButton;
let talkAboutBreathingButton, breathingCircle, breathingInstruction;
let groundingModal, closeGroundingButton, startGroundingButton;
let talkAboutGroundingButton, groundingContainer, groundingInstruction;
let pmrModal, closePmrButton, startPmrButton;
let talkAboutPmrButton, bodyDiagram, pmrInstruction;
let weatherModal, socialModal, ladderModal;
let bodyresetModal, tinywinsModal, nutritionModal, controlModal, playbreakModal, safetyModal;
let promptButton, promptBanner, promptMessage;
let promptAction, promptNew, promptDismiss;
let confirmModal, confirmModalMessage, confirmCancelButton, confirmOkButton;

function initChatDOM() {
    chatMessages = document.getElementById('chat-messages');
    chatInput = document.getElementById('chat-input');
    // Support both standalone (send-button) and app (chat-send-btn) IDs
    sendButton = document.getElementById('send-button') || document.getElementById('chat-send-btn');
    quickPromptsContainer = document.getElementById('quick-prompts');
    menuButton = document.getElementById('menu-button');
    menuPanel = document.getElementById('menu-panel');
    closeMenuPanelButton = document.getElementById('close-menu-panel');

    clearChatButton = document.getElementById('clear-chat');
    privacyInfoButton = document.getElementById('privacy-info');

    openImaginePanelButton = document.getElementById('open-imagine-panel');
    openExercisePanelButton = document.getElementById('open-exercise-panel');
    imaginePanel = document.getElementById('imagine-panel');
    exercisePanel = document.getElementById('exercise-panel');
    closeImaginePanelButton = document.getElementById('close-imagine-panel');
    closeExercisePanelButton = document.getElementById('close-exercise-panel');
    imagineContent = document.getElementById('imagine-content');
    exerciseContent = document.getElementById('exercise-content');

    breathingModal = document.getElementById('breathing-modal');
    closeBreathingButton = document.getElementById('close-breathing');
    startBreathingButton = document.getElementById('start-breathing');
    talkAboutBreathingButton = document.getElementById('talk-about-breathing');
    breathingCircle = document.getElementById('breathing-circle');
    breathingInstruction = document.getElementById('breathing-instruction');

    groundingModal = document.getElementById('grounding-modal');
    closeGroundingButton = document.getElementById('close-grounding');
    startGroundingButton = document.getElementById('start-grounding');
    talkAboutGroundingButton = document.getElementById('talk-about-grounding');
    groundingContainer = document.getElementById('grounding-container');
    groundingInstruction = document.getElementById('grounding-instruction');

    pmrModal = document.getElementById('pmr-modal');
    closePmrButton = document.getElementById('close-pmr');
    startPmrButton = document.getElementById('start-pmr');
    talkAboutPmrButton = document.getElementById('talk-about-pmr');
    bodyDiagram = document.getElementById('body-diagram');
    pmrInstruction = document.getElementById('pmr-instruction');

    weatherModal = document.getElementById('weather-modal');
    socialModal = document.getElementById('social-modal');
    ladderModal = document.getElementById('ladder-modal');
    bodyresetModal = document.getElementById('bodyreset-modal');
    tinywinsModal = document.getElementById('tinywins-modal');
    nutritionModal = document.getElementById('nutrition-modal');
    controlModal = document.getElementById('control-modal');
    playbreakModal = document.getElementById('playbreak-modal');
    safetyModal = document.getElementById('safety-modal');

    promptButton = document.getElementById('prompt-button');
    promptBanner = document.getElementById('prompt-banner');
    promptMessage = document.getElementById('prompt-message');
    promptAction = document.getElementById('prompt-action');
    promptNew = document.getElementById('prompt-new');
    promptDismiss = document.getElementById('prompt-dismiss');

    confirmModal = document.getElementById('confirm-modal');
    confirmModalMessage = document.getElementById('confirm-modal-message');
    confirmCancelButton = document.getElementById('confirm-cancel');
    confirmOkButton = document.getElementById('confirm-ok');
}

// ================================
// State Management
// ================================

let conversationHistory = [];
let isTyping = false;
let currentPrompt = null;

// ================================
// Haptic Feedback
// ================================

// Haptic feedback utility for native feel
function hapticFeedback(type = 'light') {
  if (!navigator.vibrate) return;

  switch(type) {
    case 'light':
      navigator.vibrate(10);
      break;
    case 'medium':
      navigator.vibrate(20);
      break;
    case 'heavy':
      navigator.vibrate(30);
      break;
    case 'success':
      navigator.vibrate([10, 50, 20]);
      break;
    case 'error':
      navigator.vibrate([30, 50, 30, 50, 30]);
      break;
  }
}

// ================================
// Initialize
// ================================

// Main initialization function - called by DOMContentLoaded or externally by app.js
function initChat() {
    initChatDOM();
    migrateStorageKey();
    initExerciseListeners();
    loadChatHistory();
    showWelcomeMessage();
    setupEventListeners();
    populateImaginePanel();
    populateExercisePanel();

    // Add swipe-to-dismiss to modals
    if (breathingModal) {
        addSwipeToDismiss(breathingModal, () => {
            stopBreathing();
            breathingModal.classList.remove('active');
        });
    }
    if (groundingModal) {
        addSwipeToDismiss(groundingModal, () => {
            stopGrounding();
            groundingModal.classList.remove('active');
        });
    }
    if (pmrModal) {
        addSwipeToDismiss(pmrModal, () => {
            stopPMR();
            pmrModal.classList.remove('active');
        });
    }
    if (ladderModal) {
        addSwipeToDismiss(ladderModal.querySelector('.exercise-modal-content'), closeLadderModal);
    }
    if (bodyresetModal) {
        addSwipeToDismiss(bodyresetModal.querySelector('.exercise-modal-content'), closeBodyresetModal);
    }
    if (tinywinsModal) {
        addSwipeToDismiss(tinywinsModal.querySelector('.exercise-modal-content'), closeTinywinsModal);
    }
    if (nutritionModal) {
        addSwipeToDismiss(nutritionModal.querySelector('.exercise-modal-content'), closeNutritionModal);
    }
    if (controlModal) {
        addSwipeToDismiss(controlModal.querySelector('.exercise-modal-content'), closeControlModal);
    }
    if (playbreakModal) {
        addSwipeToDismiss(playbreakModal.querySelector('.exercise-modal-content'), closePlaybreakModal);
    }
    if (safetyModal) {
        addSwipeToDismiss(safetyModal.querySelector('.exercise-modal-content'), closeSafetyModal);
    }

    updateImagineTracker();
    setupTrackerLetterClicks();
    setupIOSKeyboard();
    focusInput();
}

// Migrate old storage key to new one (WI-5)
function migrateStorageKey() {
    const OLD_KEY = 'cowch-chat-history';
    try {
        const oldData = localStorage.getItem(OLD_KEY);
        const newData = localStorage.getItem(STORAGE_KEY);
        if (oldData && !newData) {
            localStorage.setItem(STORAGE_KEY, oldData);
            localStorage.removeItem(OLD_KEY);
        } else if (oldData && newData) {
            // Both exist — keep the newer one, remove old
            localStorage.removeItem(OLD_KEY);
        }
    } catch (e) {
        console.warn('Storage migration failed:', e);
    }
}

// Expose for app.js
window.initChat = initChat;
window.handleClearChat = function() { handleClearChat(); };
window.handlePrivacyInfo = function() { handlePrivacyInfo(); };
window.openInteractiveExercise = function(type) { openInteractiveExercise(type); };
window.triggerChatPrompt = function(prompt) { triggerChatPrompt(prompt); };

// Standalone mode: auto-init on DOMContentLoaded
// In app.html, app.js calls initChat() from its own init — detect by checking
// if app.js's tab system exists (data-tab buttons).
window.addEventListener('DOMContentLoaded', () => {
    const isAppMode = document.querySelector('.tab-btn[data-tab]');
    if (!isAppMode) {
        initChat();
        chatHandleHashNavigation();
    }
});

// Handle hash-based navigation (standalone mode only)
function chatHandleHashNavigation() {
    const hash = window.location.hash.slice(1); // Remove the '#'

    if (hash === 'privacy') {
        // Show privacy info automatically
        handlePrivacyInfo();
        // Clear hash to avoid re-triggering
        history.replaceState(null, null, ' ');
    } else if (hash === 'exercises') {
        // Open exercise panel automatically
        exercisePanel.classList.add('active');
        // Clear hash to avoid re-triggering
        history.replaceState(null, null, ' ');
    } else if (hash.startsWith('exercise-')) {
        // Open specific interactive exercise
        const exerciseType = hash.replace('exercise-', '');
        setTimeout(() => {
            openInteractiveExercise(exerciseType);
        }, 300);
        history.replaceState(null, null, ' ');
    }
}

// Open a specific interactive exercise by type
function openInteractiveExercise(type) {
    switch(type) {
        case 'breathing':
            if (breathingModal) breathingModal.classList.add('active');
            break;
        case 'grounding':
            if (groundingModal) groundingModal.classList.add('active');
            break;
        case 'pmr':
            if (pmrModal) pmrModal.classList.add('active');
            break;
        case 'ladder':
            if (ladderModal) ladderModal.classList.add('active');
            break;
        case 'social':
            if (socialModal) socialModal.classList.add('active');
            break;
        case 'weather':
            if (weatherModal) weatherModal.classList.add('active');
            break;
    }
}

// ================================
// Event Listeners
// ================================

function setupEventListeners() {
    // Send message — only via the send button (Enter adds new line on mobile)
    sendButton.addEventListener('click', handleSendMessage);

    // Auto-grow textarea as user types
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    // Quick prompts
    const quickPromptButtons = document.querySelectorAll('.quick-prompt-btn');
    quickPromptButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            hapticFeedback('light');
            const prompt = btn.dataset.prompt;
            chatInput.value = prompt;
            handleSendMessage();
        });
    });

    // Menu Panel (optional - may not exist in simplified nav)
    if (menuButton && menuPanel) {
        menuButton.addEventListener('click', () => {
            hapticFeedback('light');
            menuPanel.classList.add('active');
        });
    }
    if (closeMenuPanelButton && menuPanel) {
        closeMenuPanelButton.addEventListener('click', () => {
            hapticFeedback('light');
            menuPanel.classList.remove('active');
        });
    }

    // Menu options (optional)
    if (clearChatButton) clearChatButton.addEventListener('click', handleClearChat);
    if (privacyInfoButton) privacyInfoButton.addEventListener('click', handlePrivacyInfo);

    // New Chat button in chat header
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            hapticFeedback('medium');
            conversationHistory = [];
            chatMessages.innerHTML = '';
            showWelcomeMessage();
            saveChatHistory();
            // Show quick prompts again
            if (quickPromptsContainer) quickPromptsContainer.style.display = '';
            focusInput();
        });
    }

    // Slide panels
    if (openImaginePanelButton) {
        openImaginePanelButton.addEventListener('click', () => {
            if (menuPanel) menuPanel.classList.remove('active');
            imaginePanel.classList.add('active');
        });
    }

    if (openExercisePanelButton) {
        openExercisePanelButton.addEventListener('click', () => {
            hapticFeedback('light');
            if (menuPanel) menuPanel.classList.remove('active');
            // Open the exercise slide panel (populated by populateExercisePanel)
            if (exercisePanel) {
                exercisePanel.classList.add('active');
            }
        });
    }

    if (closeImaginePanelButton) {
        closeImaginePanelButton.addEventListener('click', () => {
            imaginePanel.classList.remove('active');
        });
    }

    if (closeExercisePanelButton) {
        closeExercisePanelButton.addEventListener('click', () => {
            exercisePanel.classList.remove('active');
        });
    }

    // Box breathing modal
    closeBreathingButton.addEventListener('click', () => {
        stopBreathing();
        breathingModal.classList.remove('active');
    });

    startBreathingButton.addEventListener('click', startBreathingExercise);

    talkAboutBreathingButton.addEventListener('click', () => {
        breathingModal.classList.remove('active');
        exercisePanel.classList.remove('active');
        triggerChatPrompt("Can you guide me through box breathing and explain how it helps with anxiety?");
    });

    // Grounding exercise
    closeGroundingButton.addEventListener('click', () => {
        stopGrounding();
        groundingModal.classList.remove('active');
    });

    startGroundingButton.addEventListener('click', startGroundingExercise);

    talkAboutGroundingButton.addEventListener('click', () => {
        groundingModal.classList.remove('active');
        exercisePanel.classList.remove('active');
        triggerChatPrompt("Guide me through the 5-4-3-2-1 grounding technique");
    });

    // PMR exercise
    closePmrButton.addEventListener('click', () => {
        stopPMR();
        pmrModal.classList.remove('active');
    });

    startPmrButton.addEventListener('click', startPMRExercise);

    talkAboutPmrButton.addEventListener('click', () => {
        pmrModal.classList.remove('active');
        exercisePanel.classList.remove('active');
        triggerChatPrompt("Guide me through progressive muscle relaxation");
    });

    // Close modals on backdrop click
    if (breathingModal) {
        breathingModal.addEventListener('click', (e) => {
            if (e.target === breathingModal) {
                stopBreathing();
                breathingModal.classList.remove('active');
            }
        });
    }

    if (groundingModal) {
        groundingModal.addEventListener('click', (e) => {
            if (e.target === groundingModal) {
                stopGrounding();
                groundingModal.classList.remove('active');
            }
        });
    }

    if (pmrModal) {
        pmrModal.addEventListener('click', (e) => {
            if (e.target === pmrModal) {
                stopPMR();
                pmrModal.classList.remove('active');
            }
        });
    }

    // Escape key closes panels and modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (breathingModal && breathingModal.classList.contains('active')) {
                stopBreathing();
                breathingModal.classList.remove('active');
            } else if (groundingModal && groundingModal.classList.contains('active')) {
                stopGrounding();
                groundingModal.classList.remove('active');
            } else if (pmrModal && pmrModal.classList.contains('active')) {
                stopPMR();
                pmrModal.classList.remove('active');
            } else if (weatherModal && weatherModal.classList.contains('active')) {
                closeWeatherModal();
            } else if (socialModal && socialModal.classList.contains('active')) {
                closeSocialModal();
            } else if (ladderModal && ladderModal.classList.contains('active')) {
                closeLadderModal();
            } else if (bodyresetModal && bodyresetModal.classList.contains('active')) {
                closeBodyresetModal();
            } else if (tinywinsModal && tinywinsModal.classList.contains('active')) {
                closeTinywinsModal();
            } else if (nutritionModal && nutritionModal.classList.contains('active')) {
                closeNutritionModal();
            } else if (controlModal && controlModal.classList.contains('active')) {
                closeControlModal();
            } else if (playbreakModal && playbreakModal.classList.contains('active')) {
                closePlaybreakModal();
            } else if (safetyModal && safetyModal.classList.contains('active')) {
                closeSafetyModal();
            } else if (imaginePanel && imaginePanel.classList.contains('active')) {
                imaginePanel.classList.remove('active');
            } else if (exercisePanel && exercisePanel.classList.contains('active')) {
                exercisePanel.classList.remove('active');
            } else if (menuPanel && menuPanel.classList.contains('active')) {
                menuPanel.classList.remove('active');
            }
        }
    });

    // On-Demand Prompts
    if (promptButton) promptButton.addEventListener('click', handlePromptButtonClick);
    if (promptAction) promptAction.addEventListener('click', handlePromptAction);
    if (promptNew) promptNew.addEventListener('click', handlePromptNew);
    if (promptDismiss) promptDismiss.addEventListener('click', hidePromptBanner);

    // Pull-to-refresh on chat messages
    setupPullToRefresh();
}

// ================================
// Message Handling
// ================================

async function handleSendMessage() {
    const message = chatInput.value.trim();

    if (!message || isTyping) return;

    // Haptic feedback for send action
    hapticFeedback('light');

    // Hide quick prompts once chat is active
    const quickPrompts = document.getElementById('quick-prompts');
    if (quickPrompts) {
        quickPrompts.style.display = 'none';
    }

    // Add user message to chat
    addMessage(message, 'user');
    conversationHistory.push({ role: 'user', content: message });

    // Track in therapy profile (for compression)
    if (window.TherapyProfile) {
        window.TherapyProfile.addToHistory({ role: 'user', content: message });
    }

    // Clear input
    chatInput.value = '';
    focusInput();

    // Save history
    saveChatHistory();

    // Update last message time (for prompt generation)
    if (window.MandyPrompts) {
        window.MandyPrompts.updateLastMessageTime();
    }

    // Hide prompt banner if visible
    hidePromptBanner();

    // Show typing indicator
    showTypingIndicator();

    try {
        // Build API context from therapy profile (compressed) or fall back to raw history
        let apiBody = { message };

        if (window.TherapyProfile) {
            const context = window.TherapyProfile.buildAPIContext();
            apiBody.profile = context.profile;
            apiBody.recentMessages = context.recentMessages;
        } else {
            // Fallback to raw history
            apiBody.history = conversationHistory.slice(-3);
        }

        // Call API
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiBody)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

        // Generate quick replies based on pattern and response
        const quickReplies = generateQuickReplies(data.pattern, data.response);

        // Add Mandy's response with typing effect
        await addMessageWithTypingEffect(data.response, 'mandy', quickReplies);
        conversationHistory.push({ role: 'assistant', content: data.response });

        // Track assistant response in therapy profile
        if (window.TherapyProfile) {
            window.TherapyProfile.addToHistory({ role: 'assistant', content: data.response });

            // Check if we need to compress the profile
            if (window.TherapyProfile.needsCompression()) {
                const history = window.TherapyProfile.getFullHistory();
                const profile = window.TherapyProfile.getProfile();
                const recentMessages = history.slice(-profile.messagesSinceCompression);
                // Compress in background (don't block UI)
                window.TherapyProfile.compressProfile(recentMessages).catch(e => {
                    console.warn('Profile compression deferred:', e);
                });
            }
        }

        // Save history
        saveChatHistory();

    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();

        // Show error message
        addMessage(
            "I'm having trouble connecting right now. Please try again in a moment, or contact Mandy directly at thoughtsonlifeandlove.com.",
            'mandy'
        );
    }
}

function generateQuickReplies(pattern, response) {
    // Don't show quick replies too frequently
    const messageCount = conversationHistory.length;
    if (messageCount > 0 && messageCount % 3 !== 0) {
        return null;
    }

    const lowerResponse = response.toLowerCase();
    const replies = [];

    // Pattern-specific quick replies with exercise suggestions
    if (pattern === 'anxiety' || lowerResponse.match(/\b(anxious|anxiety|worried|panic|stress|overwhelmed)\b/)) {
        replies.push(
            { text: '🌬️ Try Box Breathing', action: 'exercise', exercise: 'breathing' },
            { text: '🧘 5-4-3-2-1 Grounding', action: 'exercise', exercise: 'grounding' },
            { text: 'Tell me more', prompt: 'Can you tell me more about managing anxiety?' }
        );
    } else if (pattern === 'stress' || lowerResponse.match(/\b(tense|tension|muscle|tight|relaxation)\b/)) {
        replies.push(
            { text: '💆 Muscle Relaxation', action: 'exercise', exercise: 'pmr' },
            { text: '🌬️ Try Box Breathing', action: 'exercise', exercise: 'breathing' },
            { text: 'Tell me more', prompt: 'Can you tell me more?' }
        );
    } else if (pattern === 'depression') {
        replies.push(
            { text: 'What can I do?', prompt: 'What practical steps can I take?' },
            { text: '💪 See all exercises', action: 'exercises' },
            { text: 'Tell me more', prompt: 'Can you tell me more about this?' }
        );
    } else if (pattern === 'relationships') {
        replies.push(
            { text: 'Communication tips', prompt: 'How can I communicate better?' },
            { text: 'Setting boundaries', prompt: 'How do I set healthy boundaries?' },
            { text: 'Tell me more', prompt: 'Can you tell me more?' }
        );
    } else if (lowerResponse.includes('imagine') || lowerResponse.includes('framework')) {
        replies.push(
            { text: 'How does it work?', prompt: 'How does the IMAGINE framework work?' },
            { text: '🧭 Explore IMAGINE', action: 'imagine' },
            { text: 'Show me more', prompt: 'Can you tell me more about applying this?' }
        );
    } else if (lowerResponse.match(/\b(body reset|mini.?movement|body scan|intentional movement)\b/)) {
        replies.push(
            { text: '🏃 Try 5-Min Body Reset', action: 'open-exercise-url', url: '/exercises/body-scan.html' },
            { text: '💪 See all exercises', action: 'exercises' },
            { text: 'Tell me more', prompt: 'Can you tell me more?' }
        );
    } else if (lowerResponse.match(/\b(exercise|breathing|grounding|relaxation|practice)\b/)) {
        replies.push(
            { text: '💪 See all exercises', action: 'exercises' },
            { text: 'Tell me more', prompt: 'Can you tell me more?' },
            { text: 'How do I apply this?', prompt: 'How can I apply this in my life?' }
        );
    } else {
        // General follow-ups
        replies.push(
            { text: 'Tell me more', prompt: 'Can you tell me more about this?' },
            { text: 'How do I apply this?', prompt: 'How can I apply this in my life?' },
            { text: 'What else?', prompt: 'What else should I know?' }
        );
    }

    return replies.slice(0, 3); // Max 3 quick replies
}

function addMessage(content, sender, quickReplies = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    // Convert markdown-style formatting
    const formattedContent = formatMessage(content);
    messageDiv.innerHTML = formattedContent;

    // Add exercise action card if Mandy mentions an exercise
    if (sender === 'mandy') {
        const exerciseCard = buildExerciseCard(content);
        if (exerciseCard) messageDiv.appendChild(exerciseCard);
    }

    // Add quick reply buttons if provided (only for Mandy's messages)
    if (quickReplies && sender === 'mandy') {
        const quickRepliesDiv = document.createElement('div');
        quickRepliesDiv.className = 'quick-replies';

        quickReplies.forEach(reply => {
            const button = document.createElement('button');
            button.className = 'quick-reply-btn';
            button.textContent = reply.text;
            button.addEventListener('click', () => {
                if (reply.action === 'exercise') {
                    // Open specific exercise
                    if (reply.exercise === 'breathing') {
                        breathingModal.classList.add('active');
                    } else if (reply.exercise === 'grounding') {
                        groundingModal.classList.add('active');
                    } else if (reply.exercise === 'pmr') {
                        pmrModal.classList.add('active');
                    }
                } else if (reply.action === 'open-exercise-url') {
                    // Open exercise page directly
                    window.location.href = reply.url;
                } else if (reply.action === 'exercises') {
                    // Open exercise library panel
                    exercisePanel.classList.add('active');
                } else if (reply.action === 'imagine') {
                    // Open IMAGINE panel
                    imaginePanel.classList.add('active');
                } else if (reply.prompt) {
                    // Standard chat prompt
                    triggerChatPrompt(reply.prompt);
                }
            });
            quickRepliesDiv.appendChild(button);
        });

        messageDiv.appendChild(quickRepliesDiv);
    }

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Add Mandy's response message instantly
async function addMessageWithTypingEffect(content, sender, quickReplies = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    // Render formatted content all at once
    const textContainer = document.createElement('div');
    textContainer.innerHTML = formatMessage(content);
    messageDiv.appendChild(textContainer);

    // Add exercise action card if Mandy mentions an exercise
    if (sender === 'mandy') {
        const exerciseCard = buildExerciseCard(content);
        if (exerciseCard) messageDiv.appendChild(exerciseCard);
    }

    chatMessages.appendChild(messageDiv);

    // Add quick reply buttons
    if (quickReplies && sender === 'mandy') {
        const quickRepliesDiv = document.createElement('div');
        quickRepliesDiv.className = 'quick-replies';

        quickReplies.forEach(reply => {
            const button = document.createElement('button');
            button.className = 'quick-reply-btn';
            button.textContent = reply.text;
            button.addEventListener('click', () => {
                if (reply.action === 'exercise') {
                    if (reply.exercise === 'breathing') {
                        breathingModal.classList.add('active');
                    } else if (reply.exercise === 'grounding') {
                        groundingModal.classList.add('active');
                    } else if (reply.exercise === 'pmr') {
                        pmrModal.classList.add('active');
                    }
                } else if (reply.action === 'open-exercise-url') {
                    window.location.href = reply.url;
                } else if (reply.action === 'exercises') {
                    exercisePanel.classList.add('active');
                } else if (reply.action === 'imagine') {
                    imaginePanel.classList.add('active');
                } else if (reply.prompt) {
                    triggerChatPrompt(reply.prompt);
                }
            });
            quickRepliesDiv.appendChild(button);
        });

        messageDiv.appendChild(quickRepliesDiv);
    }

    scrollToBottom();
    focusInput();
}

function formatMessage(content) {
    // Enhanced markdown-like formatting
    let formatted = content;

    // Process line by line to handle lists and headers
    const lines = formatted.split('\n');
    const processedLines = [];
    let inList = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Horizontal rules (---, ___, ***)
        if (line.match(/^([-_*]){3,}$/)) {
            line = '<hr>';
        }
        // Headers (##, ###, etc.)
        else if (line.match(/^#{1,3}\s+/)) {
            const level = line.match(/^#{1,3}/)[0].length;
            const text = line.replace(/^#{1,3}\s+/, '');
            line = `<h${level + 2}>${text}</h${level + 2}>`; // h3, h4, h5 (since h1, h2 are for page structure)
        }
        // Unordered lists (- or *)
        else if (line.match(/^[-*]\s+/)) {
            const text = line.replace(/^[-*]\s+/, '');
            if (!inList) {
                line = '<ul><li>' + text + '</li>';
                inList = true;
            } else {
                line = '<li>' + text + '</li>';
            }
        }
        // Close list if we were in one
        else if (inList && line.trim() !== '') {
            processedLines.push('</ul>');
            inList = false;
        }

        processedLines.push(line);
    }

    // Close list if still open
    if (inList) {
        processedLines.push('</ul>');
    }

    formatted = processedLines.join('\n');

    // Bold **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic *text* or _text_ (but not in URLs or markdown already processed)
    formatted = formatted.replace(/(?<![*_])\*(?!\*)([^*]+)\*(?![*_])/g, '<em>$1</em>');
    formatted = formatted.replace(/(?<![*_])_(?!_)([^_]+)_(?![*_])/g, '<em>$1</em>');

    // Auto-link exercise names to their exercise pages
    const exerciseLinks = [];
    for (const category of IMAGINE_EXERCISES) {
        for (const exercise of category.exercises) {
            if (exercise.url) {
                exerciseLinks.push({ title: exercise.title, url: exercise.url });
            }
        }
    }
    // Sort by title length descending so longer matches take priority
    exerciseLinks.sort((a, b) => b.title.length - a.title.length);
    for (const ex of exerciseLinks) {
        const escaped = ex.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?!<[^>]*)\\b(${escaped})\\b(?![^<]*>)`, 'gi');
        formatted = formatted.replace(regex, `<a href="${ex.url}" class="exercise-chat-link" target="_self">$1</a>`);
    }

    // Paragraphs (double newline)
    formatted = formatted.split('\n\n').map(p => {
        // Don't wrap if already wrapped in block elements
        if (p.match(/^<(h[3-5]|ul|li|hr)/)) {
            return p;
        }
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return formatted;
}

// Build an exercise action card if the message references a known exercise
function buildExerciseCard(content) {
    const lower = content.toLowerCase();
    const matched = [];

    // Check each exercise that has a URL
    for (const category of IMAGINE_EXERCISES) {
        for (const exercise of category.exercises) {
            if (!exercise.url) continue;
            // Match on title or key phrases
            const titleWords = exercise.title.toLowerCase();
            const nameWords = exercise.name.toLowerCase();
            if (lower.includes(titleWords) || lower.includes(nameWords)) {
                matched.push({ title: exercise.title, description: exercise.description, url: exercise.url, duration: exercise.duration, color: category.color });
            }
        }
    }

    // Also match common phrases for body reset specifically
    if (matched.length === 0 && lower.match(/\b(body reset|body scan|mini.?movement|tense.*release|muscle relaxation.*body)\b/)) {
        const bodyExercise = findExerciseByName('Daily Mini-Movement');
        if (bodyExercise && bodyExercise.url) {
            const category = IMAGINE_EXERCISES.find(c => c.exercises.includes(bodyExercise));
            matched.push({ title: bodyExercise.title, description: bodyExercise.description, url: bodyExercise.url, duration: bodyExercise.duration, color: category ? category.color : '#E88A6A' });
        }
    }

    if (matched.length === 0) return null;

    // Only show the first matched exercise card
    const ex = matched[0];
    const card = document.createElement('div');
    card.className = 'exercise-action-card';
    card.innerHTML = `
        <div class="exercise-action-card-header">
            <span class="exercise-action-card-icon">🧘</span>
            <div>
                <div class="exercise-action-card-title">${ex.title}</div>
                <div class="exercise-action-card-desc">${ex.description}</div>
            </div>
        </div>
        <a href="${ex.url}" class="exercise-action-card-btn">
            Start Exercise${ex.duration ? ` (${ex.duration})` : ''} →
        </a>
    `;
    card.style.setProperty('--card-accent', ex.color);
    return card;
}

function showTypingIndicator() {
    isTyping = true;
    sendButton.disabled = true;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message mandy typing';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    isTyping = false;
    sendButton.disabled = false;

    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function focusInput() {
    // Delay focus slightly to avoid iOS keyboard issues
    setTimeout(() => {
        chatInput.focus();
    }, 100);
}

// ================================
// Welcome Message
// ================================

function showWelcomeMessage() {
    if (conversationHistory.length === 0) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        welcomeDiv.innerHTML = `
            <h2>🐮 Welcome to Cowch</h2>
            <p>I'm Mandy, your AI CBT wellness companion.</p>
            <p>I use the <strong>IMAGINE framework</strong> to help with anxiety, stress, relationships, and personal growth.</p>
            <p>What's on your mind today?</p>
        `;
        chatMessages.appendChild(welcomeDiv);
    }
}

// ================================
// Menu Actions
// ================================

function handleClearChat() {
    hapticFeedback('medium');
    showConfirm('Are you sure you want to clear this conversation? This cannot be undone.', () => {
        hapticFeedback('medium');
        conversationHistory = [];
        chatMessages.innerHTML = '';
        showWelcomeMessage();
        saveChatHistory();
        if (menuPanel) menuPanel.classList.remove('active');
        focusInput();
    });
}

function handlePrivacyInfo() {
    if (menuPanel) menuPanel.classList.remove('active');

    const privacyInfo = `**Privacy & Safety:**

✓ Your conversations are stored locally on your device only
✓ I'm an AI assistant, not a replacement for professional therapy
✓ For crisis support, please contact emergency services or a crisis hotline
✓ Visit Mandy's website at thoughtsonlifeandlove.com for professional therapy services

Mandy Kloppers is a qualified CBT Therapist: BA(UNISA); PG Dip Psych(Open); PG Dip CBT(NewBucks); BABCP(Accred)

This AI tool is for wellness support and self-reflection, but not medical advice.`;

    addMessage(privacyInfo, 'mandy');
}

// ================================
// Custom Confirmation Dialog
// ================================

function showConfirm(message, onConfirm) {
    confirmModalMessage.textContent = message;
    confirmModal.classList.add('active');

    // Handle OK click
    const handleOk = () => {
        confirmModal.classList.remove('active');
        confirmOkButton.removeEventListener('click', handleOk);
        confirmCancelButton.removeEventListener('click', handleCancel);
        if (onConfirm) onConfirm();
    };

    // Handle Cancel click
    const handleCancel = () => {
        confirmModal.classList.remove('active');
        confirmOkButton.removeEventListener('click', handleOk);
        confirmCancelButton.removeEventListener('click', handleCancel);
    };

    // Add event listeners
    confirmOkButton.addEventListener('click', handleOk);
    confirmCancelButton.addEventListener('click', handleCancel);

    // Close on backdrop click
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            handleCancel();
        }
    });

    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            handleCancel();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// ================================
// Local Storage
// ================================

function saveChatHistory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            conversationHistory = JSON.parse(saved);

            // Restore messages to UI
            conversationHistory.forEach(msg => {
                const sender = msg.role === 'user' ? 'user' : 'mandy';
                addMessage(msg.content, sender);
            });

            // Hide quick prompts if there's existing history
            if (conversationHistory.length > 0) {
                const quickPrompts = document.getElementById('quick-prompts');
                if (quickPrompts) {
                    quickPrompts.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        conversationHistory = [];
    }
}

// ================================
// On-Demand Prompts
// ================================

function checkAndShowPrompt() {
    // Only show auto-prompt if MandyPrompts is available
    if (!window.MandyPrompts) return;

    // Check if we should show a prompt
    if (window.MandyPrompts.shouldShowPromptOnOpen(conversationHistory)) {
        // Get daily cached prompt
        const prompt = window.MandyPrompts.getDailyPrompt(conversationHistory);
        if (prompt) {
            showPromptBanner(prompt);
        }
    }
}

function handlePromptButtonClick() {
    // Get fresh on-demand prompt
    if (!window.MandyPrompts) return;

    const prompt = window.MandyPrompts.getOnDemandPrompt(conversationHistory);
    if (prompt) {
        showPromptBanner(prompt);
        // Add a little animation to the button
        promptButton.style.transform = 'scale(0.95)';
        setTimeout(() => {
            promptButton.style.transform = 'scale(1)';
        }, 100);
    }
}

function handlePromptNew() {
    // Get another fresh prompt
    if (!window.MandyPrompts) return;

    const prompt = window.MandyPrompts.getOnDemandPrompt(conversationHistory);
    if (prompt) {
        showPromptBanner(prompt);
    }
}

function handlePromptAction() {
    // Use the prompt as a conversation starter
    if (currentPrompt) {
        chatInput.value = currentPrompt.content;
        hidePromptBanner();
        handleSendMessage();
    }
}

function showPromptBanner(prompt) {
    if (!prompt) return;

    currentPrompt = prompt;
    promptMessage.textContent = prompt.content;

    // Update action button text based on prompt type
    if (prompt.action) {
        promptAction.textContent = prompt.action;
    } else {
        promptAction.textContent = "Let's explore this";
    }

    // Show banner with animation
    promptBanner.classList.remove('hidden');
    setTimeout(() => {
        promptBanner.classList.add('visible');
    }, 10);
}

function hidePromptBanner() {
    promptBanner.classList.remove('visible');
    setTimeout(() => {
        promptBanner.classList.add('hidden');
        currentPrompt = null;
    }, 300);
}

// Pull-to-refresh functionality
function setupPullToRefresh() {
    let startY = 0;
    let pullDistance = 0;
    let isPulling = false;

    chatMessages.addEventListener('touchstart', (e) => {
        // Only activate if scrolled to top
        if (chatMessages.scrollTop === 0) {
            startY = e.touches[0].pageY;
            isPulling = true;
        }
    }, { passive: true });

    chatMessages.addEventListener('touchmove', (e) => {
        if (!isPulling || !startY) return;

        pullDistance = e.touches[0].pageY - startY;

        // Only allow pull down
        if (pullDistance > 0 && chatMessages.scrollTop === 0) {
            // Add visual feedback (optional - could add a pull indicator)
            if (pullDistance > 80) {
                // Could show "Release to get a thought from Mandy..."
            }
        }
    }, { passive: true });

    chatMessages.addEventListener('touchend', () => {
        if (isPulling && pullDistance > 80) {
            // Trigger prompt generation
            handlePromptButtonClick();
        }

        // Reset
        startY = 0;
        pullDistance = 0;
        isPulling = false;
    });
}

// ================================
// Utility Functions
// ================================

// Prevent iOS zoom on input focus
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    }
}

// Handle iOS keyboard appearance (deferred until chatInput is ready)
function setupIOSKeyboard() {
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && chatInput) {
        chatInput.addEventListener('focus', () => {
            document.body.classList.add('keyboard-open');
        });
        chatInput.addEventListener('blur', () => {
            document.body.classList.remove('keyboard-open');
        });
    }
}

// ================================
// IMAGINE Framework Panel
// ================================

const IMAGINE_DOMAIN_LIST = [
    {
        letter: 'I',
        title: 'Me, Myself & I',
        subtitle: 'Self-care & wellness',
        icon: '🧘',
        prompt: 'Tell me about Me, Myself & I (Introspection)'
    },
    {
        letter: 'M',
        title: 'Mindfulness',
        subtitle: 'Present moment awareness',
        icon: '🪷',
        prompt: 'Tell me about Mindfulness'
    },
    {
        letter: 'A',
        title: 'Acceptance',
        subtitle: 'Letting go & self-compassion',
        icon: '🤲',
        prompt: 'Tell me about Acceptance'
    },
    {
        letter: 'G',
        title: 'Gratitude',
        subtitle: 'Appreciation & perspective',
        icon: '🌟',
        prompt: 'Tell me about Gratitude'
    },
    {
        letter: 'I',
        title: 'Interactions',
        subtitle: 'Relationships & connection',
        icon: '💬',
        prompt: 'Tell me about Interactions'
    },
    {
        letter: 'N',
        title: 'Nurturing',
        subtitle: 'Fun, playfulness & joy',
        icon: '🎨',
        prompt: 'Tell me about Nurturing'
    },
    {
        letter: 'E',
        title: 'Exploring',
        subtitle: 'Understanding patterns',
        icon: '🔍',
        prompt: 'Tell me about Exploring'
    }
];

function populateImaginePanel() {
    const domainCards = IMAGINE_DOMAIN_LIST.map(domain => `
        <div class="resource-card resource-card-minimal">
            <div class="resource-card-header">
                <div class="resource-card-icon">${domain.icon}</div>
                <div class="resource-card-title">
                    <h3>${domain.letter} - ${domain.title}</h3>
                    <p class="subtitle">${domain.subtitle}</p>
                </div>
            </div>
            <div class="resource-card-actions">
                <button class="btn-primary chat-trigger" data-prompt="${domain.prompt}">
                    Chat with Mandy →
                </button>
            </div>
        </div>
    `).join('');

    const footer = `
        <div class="imagine-footer">
            <p>Want to learn more about the IMAGINE Framework?</p>
            <div class="imagine-footer-buttons">
                <button class="btn-secondary chat-trigger" data-prompt="What is the IMAGINE framework?">
                    What is it?
                </button>
                <button class="btn-secondary chat-trigger" data-prompt="Why is the IMAGINE framework useful?">
                    Why is it useful?
                </button>
                <button class="btn-secondary chat-trigger" data-prompt="How does the IMAGINE framework work?">
                    How does it work?
                </button>
            </div>
        </div>
    `;

    imagineContent.innerHTML = domainCards + footer;

    // Add event listeners to chat triggers
    document.querySelectorAll('#imagine-content .chat-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            imaginePanel.classList.remove('active');
            triggerChatPrompt(prompt);
        });
    });
}

// ================================
// Exercise Library Panel
// ================================

const IMAGINE_EXERCISES = [
    {
        letter: 'I',
        title: 'I, Me, Myself',
        subtitle: 'Self-care, boundaries & compassion',
        color: '#E88A6A', // Terracotta
        exercises: [
            {
                name: 'Daily Mini-Movement',
                title: '5-Minute Body Reset',
                description: 'Boost energy through small intentional movement',
                hasInteractive: true,
                duration: '5 min',
                url: '/exercises/body-scan.html',
                prompt: 'Can you guide me through a 5-minute body reset? I want to do some intentional movement to boost my energy.'
            },
            {
                name: 'Work/Leisure Balance Audit',
                title: 'Where Did My Day Go?',
                description: 'Understand your balance between doing and resting',
                hasInteractive: false,
                prompt: 'Can you help me do a work/leisure balance audit? I want to understand how I split my time between responsibilities and rest today.'
            },
            {
                name: 'Boundary Practice',
                title: 'The 1% Boundary',
                description: 'Build confidence in saying "no" or setting limits',
                hasInteractive: false,
                prompt: 'Can you guide me through the 1% Boundary exercise? I want to practice setting small, healthy boundaries.'
            },
            {
                name: 'Self-Compassion Buddy',
                title: 'Talk to Yourself Like a Friend',
                description: 'Reduce harsh self-talk and build resilience',
                hasInteractive: false,
                url: '/exercises/self-compassion.html',
                prompt: 'Can you help me practice self-compassion? I noticed some harsh self-talk and want to respond to myself like I would a friend.'
            },
            {
                name: 'Mood & Nutrition Check',
                title: 'What Fuels Me?',
                description: 'Create awareness of your food/mood connection',
                hasInteractive: true,
                duration: '2 min',
                prompt: 'Can you help me explore the connection between what I eat and how I feel? I want to notice patterns.'
            },
            {
                name: 'Leisure Yes List',
                title: 'Something Just for Me',
                description: 'Strengthen self-care through intentional enjoyment',
                hasInteractive: false,
                prompt: 'Can you help me create a "yes list" of things I enjoy but haven\'t done recently? I want to schedule something just for me.'
            },
            {
                name: 'Self-Compassion Action Plan',
                title: 'My Compassion Toolkit',
                description: 'Build a personal plan for when you\'re struggling',
                hasInteractive: false,
                prompt: 'Can you help me create a self-compassion action plan? I want to identify my triggers, warning signs, and helpful responses.'
            }
        ]
    },
    {
        letter: 'M',
        title: 'Mindfulness',
        subtitle: 'Present moment awareness',
        color: '#7EA88B', // Sage green
        exercises: [
            {
                name: 'Box Breathing',
                title: 'Box Breathing',
                description: '4-4-4-4 breathing to calm your nervous system',
                hasInteractive: true,
                duration: '4 min',
                url: '/exercises/box-breathing.html',
                prompt: 'Can you guide me through box breathing?'
            },
            {
                name: '5-4-3-2-1 Grounding',
                title: '5-4-3-2-1 Grounding',
                description: 'Use your senses to anchor in the present',
                hasInteractive: true,
                duration: '3 min',
                url: '/exercises/grounding-54321.html',
                prompt: 'Can you guide me through the 5-4-3-2-1 grounding technique?'
            },
            {
                name: 'Mind Unclutter',
                title: 'Give Your Brain a Breather',
                description: 'A 2-minute mindfulness reset',
                hasInteractive: false,
                duration: '2 min',
                prompt: 'Can you guide me through a 2-minute mind unclutter exercise? I need to step out of constant thinking and just notice.'
            }
        ]
    },
    {
        letter: 'A',
        title: 'Acceptance',
        subtitle: 'Making peace with what is',
        color: '#B8860B', // Golden
        exercises: [
            {
                name: 'Resistance Scan',
                title: 'What Am I Pushing Away?',
                description: 'Notice thoughts or feelings you might be avoiding',
                hasInteractive: false,
                url: '/exercises/thought-stream.html',
                prompt: 'Can you guide me through a resistance scan? I want to gently notice what I might be avoiding or pushing away.'
            },
            {
                name: 'Wave Exercise',
                title: 'Let the Feeling Rise & Fall',
                description: 'Learn that emotions come in waves, not permanent states',
                hasInteractive: false,
                url: '/exercises/wave.html',
                prompt: 'Can you guide me through the wave exercise? I have a strong feeling and want to practice letting it rise and fall naturally.'
            },
            {
                name: 'Circle of Control',
                title: 'Sort It Out',
                description: 'Distinguish between what you can and cannot control',
                hasInteractive: true,
                prompt: 'Can you help me do the circle of control exercise? I want to sort out what I can control versus what I need to accept.'
            }
        ]
    },
    {
        letter: 'G',
        title: 'Gratitude',
        subtitle: 'Noticing the good',
        color: '#DDA0DD', // Soft purple
        exercises: [
            {
                name: 'Tiny Wins',
                title: 'Notice the Small Stuff',
                description: 'Tune into subtle positives you might have missed',
                hasInteractive: true,
                duration: '2 min',
                url: '/exercises/gratitude.html',
                prompt: 'Can you help me with the tiny wins gratitude check? I want to notice three small things that made today even slightly better.'
            },
            {
                name: 'Gratitude Lens',
                title: 'A Different Angle',
                description: 'Reframe a challenge through appreciation',
                hasInteractive: false,
                url: '/exercises/gratitude-journal.html',
                prompt: 'Can you guide me through the gratitude lens exercise? I have a challenge I\'d like to look at from a different angle.'
            }
        ]
    },
    {
        letter: 'I',
        title: 'Interactions',
        subtitle: 'Connection with others',
        color: '#6B8E9F', // Soft blue
        exercises: [
            {
                name: 'Social Pulse Check',
                title: 'How Connected Was Today?',
                description: 'Build awareness of your daily interaction levels',
                hasInteractive: true,
                duration: '2 min',
                url: '/exercises/connection-web.html',
                prompt: 'Can you help me do a social pulse check? I want to reflect on my connections today.'
            },
            {
                name: 'Connection Tracker',
                title: 'Who Did I See This Week?',
                description: 'Spot patterns in how often you connect',
                hasInteractive: false,
                prompt: 'Can you help me with the connection tracker? I want to reflect on who I\'ve connected with this week and notice patterns.'
            },
            {
                name: 'One-Step Outward',
                title: 'A Small Step Away From Isolation',
                description: 'Break isolation with one tiny, achievable action',
                hasInteractive: false,
                url: '/exercises/kindness.html',
                prompt: 'Can you guide me through the one-step outward challenge? I want to take a small step toward connection today.'
            },
            {
                name: 'Social Routine Anchors',
                title: 'Build Your Weekly Connection Anchor',
                description: 'Create gentle, predictable connection habits',
                hasInteractive: false,
                prompt: 'Can you help me build a social routine anchor? I want to create a simple, repeatable way to stay connected.'
            }
        ]
    },
    {
        letter: 'N',
        title: 'Nurture Fun & Play',
        subtitle: 'Joy and lightness',
        color: '#F4A460', // Sandy orange
        exercises: [
            {
                name: 'Play Break',
                title: 'Scheduled Silly Time',
                description: 'Interrupt seriousness with 10 minutes of play',
                hasInteractive: true,
                duration: '10 min',
                url: '/exercises/fun-prompts.html',
                prompt: 'Can you help me take a 10-minute play break? I need to reconnect with my playful side.'
            },
            {
                name: 'Childhood Micro-Joy',
                title: 'Replaying Joy',
                description: 'Unlock playfulness through nostalgia',
                hasInteractive: false,
                url: '/exercises/joy.html',
                prompt: 'Can you guide me through the childhood micro-joy exercise? I want to rediscover something I loved as a child.'
            },
            {
                name: 'Laugh Starter',
                title: 'The Mini Laugh Experiment',
                description: 'Trigger laughter on purpose to shift your state',
                hasInteractive: false,
                duration: '3 min',
                prompt: 'Can you guide me through the 3-minute laugh starter? I want to try triggering laughter even if I don\'t feel like it.'
            },
            {
                name: 'Humour Hunt',
                title: 'Find Today\'s Funny',
                description: 'Train your brain to notice amusing moments',
                hasInteractive: false,
                prompt: 'Can you help me with the humour hunt? I want to look for something funny, silly, or unexpected today.'
            }
        ]
    },
    {
        letter: 'E',
        title: 'Explore',
        subtitle: 'Growth and discovery',
        color: '#8FBC8F', // Dark sea green
        exercises: [
            {
                name: 'Safety Behaviours',
                title: 'What\'s Protecting You… and What\'s Limiting You?',
                description: 'Spot behaviours designed to prevent discomfort — but which may also block growth, opportunities, and confidence',
                hasInteractive: true,
                url: '/exercises/values-compass.html',
                prompt: 'Can you help me spot my safety behaviours? I want to notice what I do to avoid discomfort and what it might be costing me.'
            },
            {
                name: '10% Stretch',
                title: 'Grow Without Overwhelm',
                description: 'Try something 10% more challenging',
                hasInteractive: false,
                prompt: 'Can you guide me through the 10% stretch exercise? I want to gently push my comfort zone without overwhelming myself.'
            },
            {
                name: 'Curious Detective',
                title: 'Investigate Instead of Assuming',
                description: 'Replace anxious predictions with curiosity',
                hasInteractive: false,
                prompt: 'Can you help me be a curious detective? I have a situation where I\'m assuming the worst and want to gather real evidence instead.'
            },
            {
                name: 'Micro-Adventures',
                title: 'Small Steps Into the Unknown',
                description: 'Gentle novelty-seeking and confidence building',
                hasInteractive: false,
                url: '/exercises/wonder.html',
                prompt: 'Can you suggest a micro-adventure for me? I want to try something small and new in the next 24 hours.'
            },
            {
                name: 'Uncertainty Ladder',
                title: 'Climb, Don\'t Leap',
                description: 'Build tolerance for uncertainty in gradual steps',
                hasInteractive: true,
                url: '/exercises/comfort-ladder.html',
                prompt: 'Can you help me with the uncertainty ladder? I want to practice tolerating uncertainty in small, manageable steps.'
            },
            {
                name: 'Inner Weather Report',
                title: 'Explore Your Inner Landscape',
                description: 'Check in with your internal state without judgment',
                hasInteractive: true,
                duration: '3 min',
                url: '/exercises/inner-weather.html',
                prompt: 'Can you guide me through an inner weather report? I want to explore what\'s happening inside me right now.'
            }
        ]
    }
];

// Keep backward compatibility - flatten for existing code that expects EXERCISES
const EXERCISES = IMAGINE_EXERCISES.map(category => ({
    category: `${category.letter} - ${category.title}`,
    exercises: category.exercises
}));

function populateExercisePanel() {
    exerciseContent.innerHTML = IMAGINE_EXERCISES.map(category => `
        <div class="imagine-category" style="--category-color: ${category.color}">
            <div class="imagine-category-header">
                <span class="imagine-letter" style="background: ${category.color}">${category.letter}</span>
                <div class="imagine-category-info">
                    <h3>${category.title}</h3>
                    <p class="imagine-subtitle">${category.subtitle}</p>
                </div>
            </div>
            ${category.exercises.map(exercise => `
                <div class="resource-card imagine-card">
                    <div class="resource-card-title">
                        <h3>${exercise.url ? `<a href="${exercise.url}" class="exercise-title-link">${exercise.title}</a>` : exercise.title}</h3>
                        ${exercise.duration ? `<span class="exercise-duration">${exercise.duration}</span>` : ''}
                    </div>
                    <p class="resource-card-description">${exercise.description}</p>
                    <div class="resource-card-actions">
                        ${exercise.url ? `
                            <a href="${exercise.url}" class="btn-primary exercise-link">
                                Try Exercise →
                            </a>
                        ` : ''}
                        ${exercise.hasInteractive ? `
                            <button class="btn-${exercise.url ? 'secondary' : 'primary'} start-exercise" data-exercise="${exercise.name}">
                                Start Exercise
                            </button>
                        ` : ''}
                        <button class="btn-${exercise.hasInteractive || exercise.url ? 'secondary' : 'primary'} chat-trigger"
                                data-prompt="${exercise.prompt}">
                            ${exercise.hasInteractive || exercise.url ? 'Ask Mandy →' : 'Explore with Mandy →'}
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');

    // Add event listeners to chat triggers
    document.querySelectorAll('#exercise-content .chat-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            exercisePanel.classList.remove('active');
            triggerChatPrompt(prompt);
        });
    });

    // Add event listeners to start exercise buttons
    document.querySelectorAll('#exercise-content .start-exercise').forEach(btn => {
        btn.addEventListener('click', () => {
            const exerciseName = btn.dataset.exercise;

            // Record engagement when starting an interactive exercise
            const letter = getExerciseLetter(exerciseName);
            if (letter) {
                recordImagineEngagementByLetter(letter);
            }

            // Close exercise panel first
            exercisePanel.classList.remove('active');

            // Open the appropriate modal
            switch(exerciseName) {
                // Existing exercises
                case 'Box Breathing':
                    if (breathingModal) breathingModal.classList.add('active');
                    break;
                case '5-4-3-2-1 Grounding':
                    if (groundingModal) groundingModal.classList.add('active');
                    break;
                case 'Progressive Muscle Relaxation':
                    if (pmrModal) pmrModal.classList.add('active');
                    break;

                // New IMAGINE exercises
                case 'Inner Weather Report':
                    if (typeof openWeatherModal === 'function') {
                        openWeatherModal();
                    } else if (weatherModal) {
                        weatherModal.classList.add('active');
                    }
                    break;
                case 'Social Pulse Check':
                    if (typeof openSocialModal === 'function') {
                        openSocialModal();
                    } else if (socialModal) {
                        socialModal.classList.add('active');
                    }
                    break;
                case 'Uncertainty Ladder':
                    if (typeof openLadderModal === 'function') {
                        openLadderModal();
                    } else if (ladderModal) {
                        ladderModal.classList.add('active');
                    }
                    break;

                case 'Daily Mini-Movement':
                    if (typeof openBodyresetModal === 'function') {
                        openBodyresetModal();
                    } else if (bodyresetModal) {
                        bodyresetModal.classList.add('active');
                    }
                    break;
                case 'Tiny Wins':
                    if (typeof openTinywinsModal === 'function') {
                        openTinywinsModal();
                    } else if (tinywinsModal) {
                        tinywinsModal.classList.add('active');
                    }
                    break;
                case 'Mood & Nutrition Check':
                    if (typeof openNutritionModal === 'function') {
                        openNutritionModal();
                    } else if (nutritionModal) {
                        nutritionModal.classList.add('active');
                    }
                    break;
                case 'Circle of Control':
                    if (typeof openControlModal === 'function') {
                        openControlModal();
                    } else if (controlModal) {
                        controlModal.classList.add('active');
                    }
                    break;
                case 'Play Break':
                    if (typeof openPlaybreakModal === 'function') {
                        openPlaybreakModal();
                    } else if (playbreakModal) {
                        playbreakModal.classList.add('active');
                    }
                    break;
                case 'Safety Behaviours':
                    if (typeof openSafetyModal === 'function') {
                        openSafetyModal();
                    } else if (safetyModal) {
                        safetyModal.classList.add('active');
                    }
                    break;

                default:
                    // For any other interactive exercise, try to find and trigger its prompt
                    const fallbackExercise = findExerciseByName(exerciseName);
                    if (fallbackExercise && fallbackExercise.prompt) {
                        triggerChatPrompt(fallbackExercise.prompt);
                    }
                    console.log('No modal found for exercise:', exerciseName);
            }

            hapticFeedback('light');
        });
    });
}

// ================================
// Chat Trigger Function
// ================================

function triggerChatPrompt(promptText, exerciseName = null) {
    // Record engagement when user explores an exercise with Mandy
    if (exerciseName) {
        const letter = getExerciseLetter(exerciseName);
        if (letter) {
            recordImagineEngagementByLetter(letter);
        }
    } else {
        // Try to infer exercise from prompt text
        for (const category of IMAGINE_EXERCISES) {
            for (const exercise of category.exercises) {
                if (exercise.prompt === promptText) {
                    const letter = category.title === 'Interactions' ? 'I2' : category.letter;
                    recordImagineEngagementByLetter(letter);
                    break;
                }
            }
        }
    }

    // Fill chat input with the prompt
    chatInput.value = promptText;

    // Focus the input
    focusInput();

    // Auto-send the message
    handleSendMessage();
}

// ================================
// Exercise Helper Functions
// ================================

function findExerciseByName(name) {
    for (const category of IMAGINE_EXERCISES) {
        for (const exercise of category.exercises) {
            if (exercise.name === name || exercise.title === name) {
                return exercise;
            }
        }
    }
    return null;
}

// ================================
// Box Breathing Exercise
// ================================

let breathingInterval = null;
let breathingPhase = 0; // 0: inhale, 1: hold, 2: exhale, 3: hold

const BREATHING_PHASES = [
    { instruction: 'Breathe in...', duration: 4, class: 'inhale' },
    { instruction: 'Hold...', duration: 4, class: 'inhale' },
    { instruction: 'Breathe out...', duration: 4, class: 'exhale' },
    { instruction: 'Hold...', duration: 4, class: 'exhale' }
];

function startBreathingExercise() {
    hapticFeedback('success');
    startBreathingButton.textContent = 'Pause';
    startBreathingButton.removeEventListener('click', startBreathingExercise);
    startBreathingButton.addEventListener('click', pauseBreathing);

    breathingPhase = 0;
    runBreathingPhase();
}

function runBreathingPhase() {
    const phase = BREATHING_PHASES[breathingPhase];

    // Update instruction
    breathingInstruction.textContent = phase.instruction;

    // Update circle animation
    breathingCircle.className = 'breathing-circle';
    setTimeout(() => {
        breathingCircle.classList.add(phase.class);
    }, 50);

    // Count down
    let countdown = phase.duration;
    breathingInstruction.textContent = `${phase.instruction} ${countdown}`;

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            breathingInstruction.textContent = `${phase.instruction} ${countdown}`;
        }
    }, 1000);

    // Move to next phase after duration
    breathingInterval = setTimeout(() => {
        clearInterval(countdownInterval);
        breathingPhase = (breathingPhase + 1) % 4;
        runBreathingPhase();
    }, phase.duration * 1000);
}

function pauseBreathing() {
    clearTimeout(breathingInterval);
    breathingInterval = null;
    breathingInstruction.textContent = 'Paused. Take your time.';
    startBreathingButton.textContent = 'Resume';
    startBreathingButton.removeEventListener('click', pauseBreathing);
    startBreathingButton.addEventListener('click', resumeBreathing);
}

function resumeBreathing() {
    startBreathingButton.textContent = 'Pause';
    startBreathingButton.removeEventListener('click', resumeBreathing);
    startBreathingButton.addEventListener('click', pauseBreathing);
    runBreathingPhase();
}

function stopBreathing() {
    clearTimeout(breathingInterval);
    breathingInterval = null;
    breathingPhase = 0;
    breathingInstruction.textContent = 'Ready to begin?';
    breathingCircle.className = 'breathing-circle';
    startBreathingButton.textContent = 'Start';
    startBreathingButton.removeEventListener('click', pauseBreathing);
    startBreathingButton.removeEventListener('click', resumeBreathing);
    startBreathingButton.addEventListener('click', startBreathingExercise);
}

// ================================
// 5-4-3-2-1 Grounding Exercise
// ================================

let groundingPhase = 0;
let groundingChecks = 0;

const GROUNDING_PHASES = [
    { icon: '👁️', number: 5, label: 'things you can see', instruction: 'Name 5 things you can see around you' },
    { icon: '✋', number: 4, label: 'things you can touch', instruction: 'Name 4 things you can touch or feel' },
    { icon: '👂', number: 3, label: 'things you can hear', instruction: 'Name 3 things you can hear right now' },
    { icon: '👃', number: 2, label: 'things you can smell', instruction: 'Name 2 things you can smell' },
    { icon: '👅', number: 1, label: 'thing you can taste', instruction: 'Name 1 thing you can taste' }
];

function startGroundingExercise() {
    hapticFeedback('success');
    groundingPhase = 0;
    groundingChecks = 0;
    showGroundingPhase();

    startGroundingButton.textContent = 'Next';
    startGroundingButton.removeEventListener('click', startGroundingExercise);
    startGroundingButton.addEventListener('click', advanceGrounding);
}

function showGroundingPhase() {
    const phase = GROUNDING_PHASES[groundingPhase];

    groundingInstruction.textContent = phase.instruction;

    // Build checklist
    let checklistHTML = '';
    for (let i = 0; i < phase.number; i++) {
        checklistHTML += `<div class="grounding-check ${i < groundingChecks ? 'completed' : ''}" data-index="${i}"></div>`;
    }

    groundingContainer.innerHTML = `
        <div class="grounding-sense active" data-sense="${groundingPhase}">
            <div class="grounding-icon">${phase.icon}</div>
            <div class="grounding-number">${phase.number}</div>
            <div class="grounding-label">${phase.label}</div>
            <div class="grounding-checklist">${checklistHTML}</div>
        </div>
    `;

    // Add click handler to advance checks
    const senseArea = groundingContainer.querySelector('.grounding-sense');
    senseArea.style.cursor = 'pointer';

    const advanceCheck = () => {
        const checks = groundingContainer.querySelectorAll('.grounding-check');
        if (groundingChecks < phase.number) {
            checks[groundingChecks].classList.add('completed');
            groundingChecks++;
            if (groundingChecks >= phase.number) {
                startGroundingButton.textContent = groundingPhase < 4 ? 'Next Sense →' : 'Complete';
            }
        }
    };

    // Remove old listener if exists and add new one
    senseArea.onclick = advanceCheck;
}

function advanceGrounding() {
    const phase = GROUNDING_PHASES[groundingPhase];

    if (groundingChecks < phase.number) {
        // Not done with this phase yet
        return;
    }

    groundingPhase++;
    groundingChecks = 0;

    if (groundingPhase >= GROUNDING_PHASES.length) {
        // Complete!
        groundingInstruction.textContent = 'Well done! Notice how you feel now';
        groundingContainer.innerHTML = `
            <div class="grounding-sense active">
                <div class="grounding-icon">✨</div>
                <div class="grounding-number" style="font-size: 1.5rem;">Grounded</div>
            </div>
        `;
        startGroundingButton.textContent = 'Done';
        startGroundingButton.removeEventListener('click', advanceGrounding);
        startGroundingButton.addEventListener('click', () => {
            groundingModal.classList.remove('active');
            stopGrounding();
        });
    } else {
        showGroundingPhase();
    }
}

function stopGrounding() {
    groundingPhase = 0;
    groundingChecks = 0;
    groundingInstruction.textContent = 'Name 5 things you can see around you';
    groundingContainer.innerHTML = `
        <div class="grounding-sense active" data-sense="see">
            <div class="grounding-icon">👁️</div>
            <div class="grounding-number">5</div>
            <div class="grounding-label">things you can see</div>
            <div class="grounding-checklist"></div>
        </div>
    `;
    startGroundingButton.textContent = 'Start';
    startGroundingButton.removeEventListener('click', advanceGrounding);
    startGroundingButton.addEventListener('click', startGroundingExercise);
}

// ================================
// Progressive Muscle Relaxation
// ================================

let pmrPhase = 0;
let pmrInterval = null;

const PMR_SEQUENCE = [
    { part: 'head', label: 'Face & Jaw', tenseInstruction: 'Scrunch your face tight', relaxInstruction: 'Release and notice the relaxation' },
    { part: 'neck', label: 'Neck', tenseInstruction: 'Tense your neck muscles', relaxInstruction: 'Let all the tension go' },
    { part: 'shoulders', label: 'Shoulders', tenseInstruction: 'Raise your shoulders to your ears', relaxInstruction: 'Drop your shoulders down' },
    { part: 'arms', label: 'Arms', tenseInstruction: 'Make tight fists and flex your arms', relaxInstruction: 'Release and let your arms hang loose' },
    { part: 'chest', label: 'Chest', tenseInstruction: 'Take a deep breath and hold', relaxInstruction: 'Breathe out slowly' },
    { part: 'stomach', label: 'Stomach', tenseInstruction: 'Tighten your stomach muscles', relaxInstruction: 'Let your belly soften' },
    { part: 'hips', label: 'Hips', tenseInstruction: 'Squeeze your glutes', relaxInstruction: 'Release completely' },
    { part: 'legs', label: 'Legs', tenseInstruction: 'Straighten and tense your legs', relaxInstruction: 'Let them relax' },
    { part: 'feet', label: 'Feet', tenseInstruction: 'Curl your toes tight', relaxInstruction: 'Wiggle them free' }
];

function startPMRExercise() {
    hapticFeedback('success');
    pmrPhase = 0;
    startPmrButton.textContent = 'Next';
    startPmrButton.removeEventListener('click', startPMRExercise);
    startPmrButton.addEventListener('click', advancePMR);
    runPMRPhase();
}

function runPMRPhase() {
    if (pmrPhase >= PMR_SEQUENCE.length) {
        // Complete
        pmrInstruction.textContent = 'Complete! Notice the relaxation in your body';
        const allParts = bodyDiagram.querySelectorAll('.body-part');
        allParts.forEach(part => {
            part.classList.remove('tense');
            part.classList.add('relaxed');
        });
        startPmrButton.textContent = 'Done';
        startPmrButton.removeEventListener('click', advancePMR);
        startPmrButton.addEventListener('click', () => {
            pmrModal.classList.remove('active');
            stopPMR();
        });
        return;
    }

    const sequence = PMR_SEQUENCE[pmrPhase];
    const bodyParts = bodyDiagram.querySelectorAll(`[data-part="${sequence.part}"]`);

    // Tense phase
    pmrInstruction.textContent = `${sequence.label}: ${sequence.tenseInstruction}`;
    bodyParts.forEach(part => {
        part.classList.remove('relaxed');
        part.classList.add('tense');
    });

    // After 5 seconds, relax
    pmrInterval = setTimeout(() => {
        pmrInstruction.textContent = `${sequence.label}: ${sequence.relaxInstruction}`;
        bodyParts.forEach(part => {
            part.classList.remove('tense');
            part.classList.add('relaxed');
        });
    }, 5000);
}

function advancePMR() {
    clearTimeout(pmrInterval);
    pmrPhase++;
    runPMRPhase();
}

function stopPMR() {
    clearTimeout(pmrInterval);
    pmrPhase = 0;
    pmrInstruction.textContent = 'Ready to release tension from your body?';
    const allParts = bodyDiagram.querySelectorAll('.body-part');
    allParts.forEach(part => {
        part.classList.remove('tense', 'relaxed');
    });
    startPmrButton.textContent = 'Start';
    startPmrButton.removeEventListener('click', advancePMR);
    startPmrButton.addEventListener('click', startPMRExercise);
}

// ============================================
// Social Pulse Check Exercise
// ============================================

let closeSocialButton, socialNextButton, socialBackButton;
let talkAboutSocialButton, socialSummary;
let inpersonSlider, digitalSlider, qualitySlider;

let socialPhase = 1;
let socialData = {
    inperson: 0,
    digital: 0,
    quality: 0
};

function openSocialModal() {
    socialModal.classList.add('active');
    hapticFeedback('light');
    resetSocial();
}

function closeSocialModal() {
    socialModal.classList.remove('active');
    resetSocial();
}

function resetSocial() {
    socialPhase = 1;
    socialData = { inperson: 0, digital: 0, quality: 0 };

    if (inpersonSlider) inpersonSlider.value = 0;
    if (digitalSlider) digitalSlider.value = 0;
    if (qualitySlider) qualitySlider.value = 0;

    updateSliderDisplays();
    showSocialPhase();

    socialNextButton.style.display = '';
    socialBackButton.style.display = 'none';
    talkAboutSocialButton.style.display = 'none';
}

function updateSliderDisplays() {
    document.getElementById('inperson-value').textContent = socialData.inperson;
    document.getElementById('digital-value').textContent = socialData.digital;
    document.getElementById('quality-value').textContent = socialData.quality;
}

function showSocialPhase() {
    document.querySelectorAll('.social-section').forEach(section => {
        section.classList.remove('active');
        if (parseInt(section.dataset.section) === socialPhase) {
            section.classList.add('active');
        }
    });

    document.querySelectorAll('.social-progress .social-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < socialPhase);
        dot.classList.toggle('current', i === socialPhase - 1);
    });

    socialBackButton.style.display = socialPhase > 1 ? '' : 'none';

    if (socialPhase === 4) {
        socialNextButton.style.display = 'none';
        talkAboutSocialButton.style.display = '';
        generateSocialSummary();
    } else {
        socialNextButton.style.display = '';
        talkAboutSocialButton.style.display = 'none';
    }
}

function generateSocialSummary() {
    const total = socialData.inperson + socialData.digital + socialData.quality;

    let pulseDescription;
    if (total <= 3) {
        pulseDescription = "a quieter day for connection";
    } else if (total <= 8) {
        pulseDescription = "some moments of connection";
    } else if (total <= 12) {
        pulseDescription = "a good amount of connection";
    } else {
        pulseDescription = "a socially rich day";
    }

    const qualityDescriptions = ['not much', 'a little', 'somewhat', 'fairly', 'quite', 'very'];

    socialSummary.innerHTML = `
        <div class="pulse-total">
            <span class="pulse-number">${total}</span>
            <span class="pulse-label">/ 15</span>
        </div>
        <p>Today was <strong>${pulseDescription}</strong>.</p>
        <p>You felt <strong>${qualityDescriptions[socialData.quality]} seen/supported</strong>.</p>
        <p class="pulse-note">This is just a snapshot—not a score to improve.</p>
    `;
}

// Social event listeners are set up in initExerciseListeners()

// ================================
// Swipe-to-Dismiss for Modals
// ================================

// Swipe down to dismiss modal
function addSwipeToDismiss(modalElement, closeCallback) {
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  modalElement.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  modalElement.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    if (deltaY > 0) {
      modalElement.style.transform = `translateY(${deltaY}px)`;
      modalElement.style.opacity = Math.max(0.5, 1 - deltaY / 300);
    }
  }, { passive: true });

  modalElement.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;

    const deltaY = currentY - startY;
    if (deltaY > 100) {
      hapticFeedback('light');
      closeCallback();
    }

    modalElement.style.transform = '';
    modalElement.style.opacity = '';
  }, { passive: true });
}

// ================================
// PWA Install Prompt
// ================================

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  // Check if already installed or dismissed
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (localStorage.getItem('installBannerDismissed')) return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      bottom: 100px;
      left: 1rem;
      right: 1rem;
      background: rgba(45, 40, 35, 0.95);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    ">
      <span style="font-size: 2rem;">🐄</span>
      <div style="flex: 1;">
        <div style="color: #F5F0EA; font-weight: 600; margin-bottom: 0.25rem;">Install Cowch</div>
        <div style="color: rgba(245,240,234,0.6); font-size: 0.875rem;">Add to home screen for the best experience</div>
      </div>
      <button id="install-btn" style="
        background: #E88A6A;
        color: #1C1714;
        border: none;
        padding: 0.625rem 1rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        touch-action: manipulation;
      ">Install</button>
      <button id="dismiss-install" style="
        background: transparent;
        border: none;
        color: rgba(245,240,234,0.5);
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.5rem;
      ">×</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('install-btn').addEventListener('click', async () => {
    hapticFeedback('medium');
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        hapticFeedback('success');
      }
      deferredPrompt = null;
    }
    banner.remove();
  });

  document.getElementById('dismiss-install').addEventListener('click', () => {
    hapticFeedback('light');
    localStorage.setItem('installBannerDismissed', 'true');
    banner.remove();
  });
}

// Debug info
console.log('Cowch Chat initialized');
console.log('API Endpoint:', API_ENDPOINT);
console.log('Conversation history:', conversationHistory.length, 'messages');// ============================================
// Uncertainty Ladder Exercise
// ============================================

let closeLadderButton, ladderVisual, ladderSelection, ladderComplete;
let selectedChallenge, ladderCompleteText, ladderConfirmButton, talkAboutLadderButton;

let selectedRung = null;

function openLadderModal() {
    ladderModal.classList.add('active');
    hapticFeedback('light');
    resetLadder();
}

function closeLadderModal() {
    ladderModal.classList.remove('active');
    resetLadder();
}

function resetLadder() {
    selectedRung = null;

    document.querySelectorAll('.ladder-rung').forEach(rung => {
        rung.classList.remove('selected');
    });

    ladderVisual.style.display = '';
    ladderSelection.style.display = 'none';
    ladderComplete.style.display = 'none';
    ladderConfirmButton.style.display = 'none';
    talkAboutLadderButton.style.display = '';
}

function selectRung(rung) {
    // Clear previous selection
    document.querySelectorAll('.ladder-rung').forEach(r => {
        r.classList.remove('selected');
    });

    // Select this rung
    rung.classList.add('selected');
    selectedRung = {
        level: rung.dataset.level,
        challenge: rung.dataset.challenge
    };

    // Show selection details
    selectedChallenge.innerHTML = `
        <span class="selected-level">Level ${selectedRung.level}</span>
        <span class="selected-text">${selectedRung.challenge}</span>
    `;

    ladderSelection.style.display = 'block';
    ladderConfirmButton.style.display = '';

    hapticFeedback('light');

    // Scroll to show selection
    ladderSelection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function confirmLadderChoice() {
    if (!selectedRung) return;

    hapticFeedback('success');

    // Hide ladder, show completion
    ladderVisual.style.display = 'none';
    ladderSelection.style.display = 'none';
    ladderComplete.style.display = 'block';
    ladderConfirmButton.style.display = 'none';

    ladderCompleteText.textContent = selectedRung.challenge;
}

// Ladder event listeners are set up in initExerciseListeners()

// ============================================
// Inner Weather Report Exercise
// ============================================

let closeWeatherButton, weatherSections, weatherNextButton;
let weatherBackButton, talkAboutWeatherButton, weatherSummary;

let weatherPhase = 1;
let weatherData = {
    emotion: null,
    body: [],
    thought: null,
    need: null
};

function openWeatherModal() {
    weatherModal.classList.add('active');
    hapticFeedback('light');
    resetWeather();
}

function closeWeatherModal() {
    weatherModal.classList.remove('active');
    resetWeather();
}

function resetWeather() {
    weatherPhase = 1;
    weatherData = { emotion: null, body: [], thought: null, need: null };
    showWeatherPhase();

    // Clear all selections
    document.querySelectorAll('.weather-option.selected').forEach(opt => {
        opt.classList.remove('selected');
    });

    weatherNextButton.disabled = true;
    weatherNextButton.style.display = '';
    weatherBackButton.style.display = 'none';
    talkAboutWeatherButton.style.display = 'none';
}

function showWeatherPhase() {
    // Update sections visibility
    document.querySelectorAll('.weather-section').forEach(section => {
        section.classList.remove('active');
        if (parseInt(section.dataset.section) === weatherPhase) {
            section.classList.add('active');
        }
    });

    // Update progress dots
    document.querySelectorAll('.weather-progress .weather-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < weatherPhase);
        dot.classList.toggle('current', i === weatherPhase - 1);
    });

    // Update buttons
    weatherBackButton.style.display = weatherPhase > 1 ? '' : 'none';

    if (weatherPhase === 5) {
        // Final phase - show summary
        weatherNextButton.style.display = 'none';
        talkAboutWeatherButton.style.display = '';
        generateWeatherSummary();
    } else {
        weatherNextButton.style.display = '';
        weatherNextButton.textContent = 'Next →';
        talkAboutWeatherButton.style.display = 'none';
        updateNextButtonState();
    }
}

function updateNextButtonState() {
    let canProceed = false;

    switch(weatherPhase) {
        case 1: canProceed = weatherData.emotion !== null; break;
        case 2: canProceed = weatherData.body.length > 0; break;
        case 3: canProceed = weatherData.thought !== null; break;
        case 4: canProceed = weatherData.need !== null; break;
    }

    weatherNextButton.disabled = !canProceed;
}

function generateWeatherSummary() {
    const emotionLabels = {
        'calm': '😌 calm', 'stressed': '😰 stressed', 'content': '😊 content',
        'anxious': '😟 anxious', 'sad': '😢 sad', 'irritable': '😤 irritable',
        'hopeful': '🌱 hopeful', 'overwhelmed': '😵 overwhelmed'
    };

    const needLabels = {
        'rest': 'rest', 'connection': 'connection', 'movement': 'movement',
        'reassurance': 'reassurance', 'space': 'space', 'creativity': 'creativity',
        'nourishment': 'nourishment', 'quiet': 'quiet'
    };

    weatherSummary.innerHTML = `
        Right now, you're feeling <strong>${emotionLabels[weatherData.emotion] || weatherData.emotion}</strong>.
        <br><br>
        You noticed <strong>${weatherData.body.length}</strong> thing${weatherData.body.length !== 1 ? 's' : ''} in your body.
        <br><br>
        What you might need most: <strong>${needLabels[weatherData.need] || weatherData.need}</strong>.
    `;
}

// Weather event listeners are set up in initExerciseListeners()

// ================================
// Deferred Exercise Listener Setup
// ================================
// All exercise modal DOM refs and event listeners that were previously
// top-level are now initialized here, called from initChat().

function initExerciseListeners() {
    // Social Pulse Check DOM
    closeSocialButton = document.getElementById('close-social');
    socialNextButton = document.getElementById('social-next');
    socialBackButton = document.getElementById('social-back');
    talkAboutSocialButton = document.getElementById('talk-about-social');
    socialSummary = document.getElementById('social-summary');
    inpersonSlider = document.getElementById('inperson-slider');
    digitalSlider = document.getElementById('digital-slider');
    qualitySlider = document.getElementById('quality-slider');

    if (closeSocialButton) closeSocialButton.addEventListener('click', closeSocialModal);
    if (socialNextButton) socialNextButton.addEventListener('click', () => {
        if (socialPhase < 4) { hapticFeedback('light'); socialPhase++; showSocialPhase(); }
    });
    if (socialBackButton) socialBackButton.addEventListener('click', () => {
        if (socialPhase > 1) { hapticFeedback('light'); socialPhase--; showSocialPhase(); }
    });
    if (talkAboutSocialButton) talkAboutSocialButton.addEventListener('click', () => {
        closeSocialModal();
        const total = socialData.inperson + socialData.digital + socialData.quality;
        triggerChatPrompt(`I just did a social pulse check. My total was ${total}/15 - in-person: ${socialData.inperson}, digital: ${socialData.digital}, quality: ${socialData.quality}. Can you help me reflect on my connection patterns?`);
    });
    if (inpersonSlider) inpersonSlider.addEventListener('input', (e) => {
        socialData.inperson = parseInt(e.target.value);
        document.getElementById('inperson-value').textContent = socialData.inperson;
        hapticFeedback('light');
    });
    if (digitalSlider) digitalSlider.addEventListener('input', (e) => {
        socialData.digital = parseInt(e.target.value);
        document.getElementById('digital-value').textContent = socialData.digital;
        hapticFeedback('light');
    });
    if (qualitySlider) qualitySlider.addEventListener('input', (e) => {
        socialData.quality = parseInt(e.target.value);
        document.getElementById('quality-value').textContent = socialData.quality;
        hapticFeedback('light');
    });
    if (socialModal) {
        socialModal.addEventListener('click', (e) => { if (e.target === socialModal) closeSocialModal(); });
        addSwipeToDismiss(socialModal.querySelector('.exercise-modal-content'), closeSocialModal);
    }

    // Uncertainty Ladder DOM
    closeLadderButton = document.getElementById('close-ladder');
    ladderVisual = document.getElementById('ladder-visual');
    ladderSelection = document.getElementById('ladder-selection');
    ladderComplete = document.getElementById('ladder-complete');
    selectedChallenge = document.getElementById('selected-challenge');
    ladderCompleteText = document.getElementById('ladder-complete-text');
    ladderConfirmButton = document.getElementById('ladder-confirm');
    talkAboutLadderButton = document.getElementById('talk-about-ladder');

    if (closeLadderButton) closeLadderButton.addEventListener('click', closeLadderModal);
    document.querySelectorAll('.ladder-rung').forEach(rung => {
        rung.addEventListener('click', () => selectRung(rung));
    });
    if (ladderConfirmButton) ladderConfirmButton.addEventListener('click', confirmLadderChoice);
    if (talkAboutLadderButton) talkAboutLadderButton.addEventListener('click', () => {
        closeLadderModal();
        let prompt;
        if (selectedRung) {
            prompt = `I'm working on the uncertainty ladder. I chose level ${selectedRung.level}: "${selectedRung.challenge}". Can you help me think through this and support me in trying it?`;
        } else {
            prompt = `Can you help me with the uncertainty ladder? I want to build my tolerance for uncertainty but I'm not sure which step to start with.`;
        }
        triggerChatPrompt(prompt);
    });
    if (ladderModal) {
        ladderModal.addEventListener('click', (e) => { if (e.target === ladderModal) closeLadderModal(); });
    }

    // Inner Weather Report DOM
    closeWeatherButton = document.getElementById('close-weather');
    weatherSections = document.getElementById('weather-sections');
    weatherNextButton = document.getElementById('weather-next');
    weatherBackButton = document.getElementById('weather-back');
    talkAboutWeatherButton = document.getElementById('talk-about-weather');
    weatherSummary = document.getElementById('weather-summary');

    if (closeWeatherButton) closeWeatherButton.addEventListener('click', closeWeatherModal);
    if (weatherNextButton) weatherNextButton.addEventListener('click', () => {
        if (weatherPhase < 5) { hapticFeedback('light'); weatherPhase++; showWeatherPhase(); }
    });
    if (weatherBackButton) weatherBackButton.addEventListener('click', () => {
        if (weatherPhase > 1) { hapticFeedback('light'); weatherPhase--; showWeatherPhase(); }
    });
    if (talkAboutWeatherButton) talkAboutWeatherButton.addEventListener('click', () => {
        closeWeatherModal();
        const parts = ['I just did an inner weather check.'];
        if (weatherData.emotion) parts.push(`I'm feeling ${weatherData.emotion}.`);
        if (weatherData.body && weatherData.body.length > 0) parts.push(`I noticed ${weatherData.body.join(', ')} in my body.`);
        if (weatherData.thought) parts.push(`A thought that keeps coming up: "${weatherData.thought}".`);
        if (weatherData.need) parts.push(`I think I need ${weatherData.need}.`);
        parts.push('Can you help me process this?');
        triggerChatPrompt(parts.join(' '));
    });

    // Weather option selection handlers
    document.querySelectorAll('#emotion-options .weather-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#emotion-options .weather-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            weatherData.emotion = btn.dataset.value;
            hapticFeedback('light');
            updateNextButtonState();
        });
    });
    document.querySelectorAll('#body-options .weather-option').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('selected');
            if (btn.classList.contains('selected')) { weatherData.body.push(btn.dataset.value); }
            else { weatherData.body = weatherData.body.filter(v => v !== btn.dataset.value); }
            hapticFeedback('light');
            updateNextButtonState();
        });
    });
    document.querySelectorAll('#thought-options .weather-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#thought-options .weather-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            weatherData.thought = btn.dataset.value;
            hapticFeedback('light');
            updateNextButtonState();
        });
    });
    document.querySelectorAll('#need-options .weather-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#need-options .weather-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            weatherData.need = btn.dataset.value;
            hapticFeedback('light');
            updateNextButtonState();
        });
    });

    if (weatherModal) {
        addSwipeToDismiss(weatherModal.querySelector('.exercise-modal-content'), closeWeatherModal);
        weatherModal.addEventListener('click', (e) => { if (e.target === weatherModal) closeWeatherModal(); });
    }

    // Initialize new exercise modals
    initBodyresetExercise();
    initTinywinsExercise();
    initNutritionExercise();
    initControlExercise();
    initPlaybreakExercise();
    initSafetyExercise();
}

// ============================================
// 5-Minute Body Reset Exercise
// ============================================

let bodyresetPhase = 1;
let bodyresetTimerInterval = null;

function openBodyresetModal() {
    bodyresetModal.classList.add('active');
    hapticFeedback('light');
    resetBodyreset();
}

function closeBodyresetModal() {
    bodyresetModal.classList.remove('active');
    if (bodyresetTimerInterval) clearInterval(bodyresetTimerInterval);
    resetBodyreset();
}

function resetBodyreset() {
    bodyresetPhase = 1;
    if (bodyresetTimerInterval) { clearInterval(bodyresetTimerInterval); bodyresetTimerInterval = null; }
    showBodyresetPhase();
}

function showBodyresetPhase() {
    document.querySelectorAll('.bodyreset-section').forEach(section => {
        section.classList.remove('active');
        if (parseInt(section.dataset.section) === bodyresetPhase) section.classList.add('active');
    });
    document.querySelectorAll('.bodyreset-progress .bodyreset-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < bodyresetPhase);
        dot.classList.toggle('current', i === bodyresetPhase - 1);
    });

    const backBtn = document.getElementById('bodyreset-back');
    const nextBtn = document.getElementById('bodyreset-next');
    const talkBtn = document.getElementById('talk-about-bodyreset');

    if (backBtn) backBtn.style.display = bodyresetPhase > 1 ? '' : 'none';
    if (nextBtn) {
        nextBtn.style.display = bodyresetPhase < 5 ? '' : 'none';
        nextBtn.textContent = 'Next →';
    }
    if (talkBtn) talkBtn.style.display = bodyresetPhase === 5 ? '' : 'none';
}

function initBodyresetExercise() {
    const closeBtn = document.getElementById('close-bodyreset');
    const nextBtn = document.getElementById('bodyreset-next');
    const backBtn = document.getElementById('bodyreset-back');
    const talkBtn = document.getElementById('talk-about-bodyreset');

    if (closeBtn) closeBtn.addEventListener('click', closeBodyresetModal);
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (bodyresetPhase < 5) { hapticFeedback('light'); bodyresetPhase++; showBodyresetPhase(); }
    });
    if (backBtn) backBtn.addEventListener('click', () => {
        if (bodyresetPhase > 1) { hapticFeedback('light'); bodyresetPhase--; showBodyresetPhase(); }
    });
    if (talkBtn) talkBtn.addEventListener('click', () => {
        closeBodyresetModal();
        triggerChatPrompt('I just did the 5-minute body reset. Can you help me reflect on how my body feels now?');
    });
    if (bodyresetModal) {
        bodyresetModal.addEventListener('click', (e) => { if (e.target === bodyresetModal) closeBodyresetModal(); });
    }
}

// ============================================
// Tiny Wins (Gratitude) Exercise
// ============================================

let tinywinsPhase = 1;
let tinywinsData = { win1: '', win2: '', win3: '' };

function openTinywinsModal() {
    tinywinsModal.classList.add('active');
    hapticFeedback('light');
    resetTinywins();
}

function closeTinywinsModal() {
    tinywinsModal.classList.remove('active');
    resetTinywins();
}

function resetTinywins() {
    tinywinsPhase = 1;
    tinywinsData = { win1: '', win2: '', win3: '' };
    const inputs = [document.getElementById('tinywins-input-1'), document.getElementById('tinywins-input-2'), document.getElementById('tinywins-input-3')];
    inputs.forEach(input => { if (input) input.value = ''; });
    showTinywinsPhase();
}

function showTinywinsPhase() {
    document.querySelectorAll('.tinywins-section').forEach(section => {
        section.classList.remove('active');
        if (parseInt(section.dataset.section) === tinywinsPhase) section.classList.add('active');
    });
    document.querySelectorAll('.tinywins-progress .tinywins-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < tinywinsPhase);
        dot.classList.toggle('current', i === tinywinsPhase - 1);
    });

    const backBtn = document.getElementById('tinywins-back');
    const nextBtn = document.getElementById('tinywins-next');
    const talkBtn = document.getElementById('talk-about-tinywins');

    if (backBtn) backBtn.style.display = tinywinsPhase > 1 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = tinywinsPhase < 4 ? '' : 'none';
    if (talkBtn) talkBtn.style.display = tinywinsPhase === 4 ? '' : 'none';

    if (tinywinsPhase === 4) {
        const summary = document.getElementById('tinywins-summary');
        if (summary) {
            const wins = [tinywinsData.win1, tinywinsData.win2, tinywinsData.win3].filter(w => w.trim());
            summary.innerHTML = wins.map((w, i) => `<div class="tinywins-star">⭐ ${w}</div>`).join('');
        }
    }
}

function initTinywinsExercise() {
    const closeBtn = document.getElementById('close-tinywins');
    const nextBtn = document.getElementById('tinywins-next');
    const backBtn = document.getElementById('tinywins-back');
    const talkBtn = document.getElementById('talk-about-tinywins');

    if (closeBtn) closeBtn.addEventListener('click', closeTinywinsModal);
    if (nextBtn) nextBtn.addEventListener('click', () => {
        // Save current input before advancing
        const currentInput = document.getElementById(`tinywins-input-${tinywinsPhase}`);
        if (currentInput) tinywinsData[`win${tinywinsPhase}`] = currentInput.value;
        if (tinywinsPhase < 4) { hapticFeedback('light'); tinywinsPhase++; showTinywinsPhase(); }
    });
    if (backBtn) backBtn.addEventListener('click', () => {
        if (tinywinsPhase > 1) { hapticFeedback('light'); tinywinsPhase--; showTinywinsPhase(); }
    });
    if (talkBtn) talkBtn.addEventListener('click', () => {
        closeTinywinsModal();
        const wins = [tinywinsData.win1, tinywinsData.win2, tinywinsData.win3].filter(w => w.trim());
        triggerChatPrompt(`I just did the tiny wins exercise. My small wins today: ${wins.join(', ')}. Can you help me appreciate these?`);
    });
    if (tinywinsModal) {
        tinywinsModal.addEventListener('click', (e) => { if (e.target === tinywinsModal) closeTinywinsModal(); });
    }
}

// ============================================
// Mood & Nutrition Check Exercise
// ============================================

let nutritionPhase = 1;
let nutritionData = { hydration: '', meals: '', energy: '' };

function openNutritionModal() {
    nutritionModal.classList.add('active');
    hapticFeedback('light');
    resetNutrition();
}

function closeNutritionModal() {
    nutritionModal.classList.remove('active');
    resetNutrition();
}

function resetNutrition() {
    nutritionPhase = 1;
    nutritionData = { hydration: '', meals: '', energy: '' };
    document.querySelectorAll('.nutrition-option').forEach(btn => btn.classList.remove('selected'));
    showNutritionPhase();
}

function showNutritionPhase() {
    document.querySelectorAll('.nutrition-section').forEach(section => {
        section.classList.remove('active');
        if (parseInt(section.dataset.section) === nutritionPhase) section.classList.add('active');
    });
    document.querySelectorAll('.nutrition-progress .nutrition-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < nutritionPhase);
        dot.classList.toggle('current', i === nutritionPhase - 1);
    });

    const backBtn = document.getElementById('nutrition-back');
    const nextBtn = document.getElementById('nutrition-next');
    const talkBtn = document.getElementById('talk-about-nutrition');

    if (backBtn) backBtn.style.display = nutritionPhase > 1 ? '' : 'none';
    if (nextBtn) {
        nextBtn.style.display = nutritionPhase < 4 ? '' : 'none';
        // Enable next if current phase has a selection
        const keys = ['', 'hydration', 'meals', 'energy'];
        nextBtn.disabled = nutritionPhase < 4 && !nutritionData[keys[nutritionPhase]];
    }
    if (talkBtn) talkBtn.style.display = nutritionPhase === 4 ? '' : 'none';

    if (nutritionPhase === 4) {
        const summary = document.getElementById('nutrition-summary');
        if (summary) {
            const labels = { hydration: '💧 Hydration', meals: '🍽️ Meals', energy: '⚡ Energy' };
            summary.innerHTML = Object.entries(nutritionData)
                .filter(([, v]) => v)
                .map(([k, v]) => `<div class="nutrition-result">${labels[k]}: ${v}</div>`)
                .join('');
        }
    }
}

function initNutritionExercise() {
    const closeBtn = document.getElementById('close-nutrition');
    const nextBtn = document.getElementById('nutrition-next');
    const backBtn = document.getElementById('nutrition-back');
    const talkBtn = document.getElementById('talk-about-nutrition');

    if (closeBtn) closeBtn.addEventListener('click', closeNutritionModal);
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (nutritionPhase < 4) { hapticFeedback('light'); nutritionPhase++; showNutritionPhase(); }
    });
    if (backBtn) backBtn.addEventListener('click', () => {
        if (nutritionPhase > 1) { hapticFeedback('light'); nutritionPhase--; showNutritionPhase(); }
    });
    if (talkBtn) talkBtn.addEventListener('click', () => {
        closeNutritionModal();
        const parts = ['I just checked in on my nutrition and energy.'];
        if (nutritionData.hydration) parts.push(`Hydration: ${nutritionData.hydration}.`);
        if (nutritionData.meals) parts.push(`Meals: ${nutritionData.meals}.`);
        if (nutritionData.energy) parts.push(`Energy: ${nutritionData.energy}.`);
        parts.push('Can you help me think about what my body might need?');
        triggerChatPrompt(parts.join(' '));
    });

    // Option selection handlers
    const optionGroups = [
        { id: 'hydration-options', key: 'hydration' },
        { id: 'meals-options', key: 'meals' },
        { id: 'energy-options', key: 'energy' }
    ];
    optionGroups.forEach(group => {
        document.querySelectorAll(`#${group.id} .nutrition-option`).forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll(`#${group.id} .nutrition-option`).forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                nutritionData[group.key] = btn.dataset.value;
                hapticFeedback('light');
                const nextBtn = document.getElementById('nutrition-next');
                if (nextBtn) nextBtn.disabled = false;
            });
        });
    });

    if (nutritionModal) {
        nutritionModal.addEventListener('click', (e) => { if (e.target === nutritionModal) closeNutritionModal(); });
    }
}

// ============================================
// Circle of Control Exercise
// ============================================

let controlPhase = 1;
let controlData = { worry: '', controllable: '', action: '' };

function openControlModal() {
    controlModal.classList.add('active');
    hapticFeedback('light');
    resetControl();
}

function closeControlModal() {
    controlModal.classList.remove('active');
    resetControl();
}

function resetControl() {
    controlPhase = 1;
    controlData = { worry: '', controllable: '', action: '' };
    const worryInput = document.getElementById('control-worry-input');
    const actionInput = document.getElementById('control-action-input');
    if (worryInput) worryInput.value = '';
    if (actionInput) actionInput.value = '';
    document.querySelectorAll('.control-option').forEach(btn => btn.classList.remove('selected'));
    showControlPhase();
}

function showControlPhase() {
    document.querySelectorAll('.control-section').forEach(section => {
        section.classList.remove('active');
        if (parseInt(section.dataset.section) === controlPhase) section.classList.add('active');
    });
    document.querySelectorAll('.control-progress .control-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < controlPhase);
        dot.classList.toggle('current', i === controlPhase - 1);
    });

    const backBtn = document.getElementById('control-back');
    const nextBtn = document.getElementById('control-next');
    const talkBtn = document.getElementById('talk-about-control');

    if (backBtn) backBtn.style.display = controlPhase > 1 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = controlPhase < 4 ? '' : 'none';
    if (talkBtn) talkBtn.style.display = controlPhase === 4 ? '' : 'none';

    // Update phase 3 based on controllability answer
    if (controlPhase === 3) {
        const actionTitle = document.getElementById('control-action-title');
        const actionPrompt = document.getElementById('control-action-prompt');
        if (controlData.controllable === 'no') {
            if (actionTitle) actionTitle.textContent = 'Letting Go';
            if (actionPrompt) actionPrompt.textContent = 'What could help you accept what you can\'t control here?';
        } else {
            if (actionTitle) actionTitle.textContent = 'One Small Step';
            if (actionPrompt) actionPrompt.textContent = 'What\'s one tiny thing you could do about this?';
        }
    }

    if (controlPhase === 4) {
        const summary = document.getElementById('control-summary');
        if (summary) {
            const controlLabel = { yes: '✅ Within your control', partly: '🤏 Partly in your control', no: '❌ Outside your control' };
            summary.innerHTML = `
                <div class="control-result"><strong>Concern:</strong> ${controlData.worry}</div>
                <div class="control-result">${controlLabel[controlData.controllable] || ''}</div>
                <div class="control-result"><strong>Your step:</strong> ${controlData.action}</div>
            `;
        }
    }
}

function initControlExercise() {
    const closeBtn = document.getElementById('close-control');
    const nextBtn = document.getElementById('control-next');
    const backBtn = document.getElementById('control-back');
    const talkBtn = document.getElementById('talk-about-control');

    if (closeBtn) closeBtn.addEventListener('click', closeControlModal);
    if (nextBtn) nextBtn.addEventListener('click', () => {
        // Save data before advancing
        if (controlPhase === 1) {
            const worryInput = document.getElementById('control-worry-input');
            if (worryInput) controlData.worry = worryInput.value;
        }
        if (controlPhase === 3) {
            const actionInput = document.getElementById('control-action-input');
            if (actionInput) controlData.action = actionInput.value;
        }
        if (controlPhase < 4) { hapticFeedback('light'); controlPhase++; showControlPhase(); }
    });
    if (backBtn) backBtn.addEventListener('click', () => {
        if (controlPhase > 1) { hapticFeedback('light'); controlPhase--; showControlPhase(); }
    });
    if (talkBtn) talkBtn.addEventListener('click', () => {
        closeControlModal();
        triggerChatPrompt(`I just did the circle of control exercise. I'm worried about: "${controlData.worry}". I think it's ${controlData.controllable === 'yes' ? 'something I can control' : controlData.controllable === 'partly' ? 'partly in my control' : 'outside my control'}. My small step: "${controlData.action}". Can you help me think about this?`);
    });

    // Control option selection
    document.querySelectorAll('#control-options .control-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#control-options .control-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            controlData.controllable = btn.dataset.value;
            hapticFeedback('light');
        });
    });

    if (controlModal) {
        controlModal.addEventListener('click', (e) => { if (e.target === controlModal) closeControlModal(); });
    }
}

// ============================================
// Play Break Exercise
// ============================================

let playbreakPhase = 1;
let playbreakData = { activity: '', feeling: '' };
let playbreakTimerInterval = null;
let playbreakTimeLeft = 120;

const playbreakActivities = {
    dance: { icon: '💃', title: 'Dance Break!', instruction: 'Put on your favourite song and move! No rules, no judgement. Just let your body do its thing for 2 minutes.' },
    doodle: { icon: '✏️', title: 'Doodle Time!', instruction: 'Grab a pen and scribble anything. Shapes, faces, spirals — whatever comes out. No masterpiece needed.' },
    sing: { icon: '🎤', title: 'Sing It Out!', instruction: 'Pick any song — hum it, whisper it, belt it out. Bonus points for making up lyrics.' },
    stretch: { icon: '🤸', title: 'Silly Stretch!', instruction: 'Make the biggest stretch you can. Reach high, wiggle low, twist around. Be as dramatic as possible.' },
    faces: { icon: '🤪', title: 'Funny Faces!', instruction: 'Make 5 of the silliest faces you can. Scrunch, stretch, puff out your cheeks. If you laugh, even better.' },
    surprise: { icon: '🎁', title: 'Surprise Challenge!', instruction: 'Close your eyes, spin around once, then point at something. Now make up a 10-second song about that thing.' }
};

function openPlaybreakModal() {
    playbreakModal.classList.add('active');
    hapticFeedback('light');
    resetPlaybreak();
}

function closePlaybreakModal() {
    playbreakModal.classList.remove('active');
    if (playbreakTimerInterval) clearInterval(playbreakTimerInterval);
    resetPlaybreak();
}

function resetPlaybreak() {
    playbreakPhase = 1;
    playbreakData = { activity: '', feeling: '' };
    playbreakTimeLeft = 120;
    if (playbreakTimerInterval) { clearInterval(playbreakTimerInterval); playbreakTimerInterval = null; }
    document.querySelectorAll('.playbreak-option').forEach(btn => btn.classList.remove('selected'));
    const timerDisplay = document.getElementById('playbreak-timer');
    if (timerDisplay) timerDisplay.textContent = '2:00';
    const startTimerBtn = document.getElementById('playbreak-start-timer');
    if (startTimerBtn) startTimerBtn.style.display = 'none';
    showPlaybreakPhase();
}

function showPlaybreakPhase() {
    document.querySelectorAll('.playbreak-section').forEach(section => {
        section.classList.remove('active');
        if (parseInt(section.dataset.section) === playbreakPhase) section.classList.add('active');
    });
    document.querySelectorAll('.playbreak-progress .playbreak-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < playbreakPhase);
        dot.classList.toggle('current', i === playbreakPhase - 1);
    });

    const backBtn = document.getElementById('playbreak-back');
    const nextBtn = document.getElementById('playbreak-next');
    const talkBtn = document.getElementById('talk-about-playbreak');

    if (backBtn) backBtn.style.display = playbreakPhase > 1 ? '' : 'none';
    if (nextBtn) {
        nextBtn.style.display = playbreakPhase < 4 ? '' : 'none';
        nextBtn.disabled = (playbreakPhase === 1 && !playbreakData.activity) || (playbreakPhase === 3 && !playbreakData.feeling);
    }
    if (talkBtn) talkBtn.style.display = playbreakPhase === 4 ? '' : 'none';

    // Set up phase 2 content
    if (playbreakPhase === 2 && playbreakData.activity) {
        const activity = playbreakActivities[playbreakData.activity];
        const goIcon = document.getElementById('playbreak-go-icon');
        const goTitle = document.getElementById('playbreak-go-title');
        const goInstruction = document.getElementById('playbreak-go-instruction');
        const startTimerBtn = document.getElementById('playbreak-start-timer');
        if (goIcon) goIcon.textContent = activity.icon;
        if (goTitle) goTitle.textContent = activity.title;
        if (goInstruction) goInstruction.textContent = activity.instruction;
        if (startTimerBtn) startTimerBtn.style.display = '';
    }

    if (playbreakPhase === 4) {
        const summary = document.getElementById('playbreak-summary');
        const activity = playbreakActivities[playbreakData.activity];
        if (summary && activity) {
            summary.innerHTML = `<div class="playbreak-result">${activity.icon} You chose: ${activity.title}</div>
                <div class="playbreak-result">You felt: ${playbreakData.feeling}</div>`;
        }
    }
}

function startPlaybreakTimer() {
    const timerDisplay = document.getElementById('playbreak-timer');
    const startTimerBtn = document.getElementById('playbreak-start-timer');
    const nextBtn = document.getElementById('playbreak-next');
    if (startTimerBtn) startTimerBtn.style.display = 'none';
    if (nextBtn) nextBtn.disabled = true;

    playbreakTimerInterval = setInterval(() => {
        playbreakTimeLeft--;
        const mins = Math.floor(playbreakTimeLeft / 60);
        const secs = playbreakTimeLeft % 60;
        if (timerDisplay) timerDisplay.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

        if (playbreakTimeLeft <= 0) {
            clearInterval(playbreakTimerInterval);
            playbreakTimerInterval = null;
            if (timerDisplay) timerDisplay.textContent = 'Done! 🎉';
            if (nextBtn) nextBtn.disabled = false;
            hapticFeedback('medium');
        }
    }, 1000);
}

function initPlaybreakExercise() {
    const closeBtn = document.getElementById('close-playbreak');
    const nextBtn = document.getElementById('playbreak-next');
    const backBtn = document.getElementById('playbreak-back');
    const talkBtn = document.getElementById('talk-about-playbreak');
    const startTimerBtn = document.getElementById('playbreak-start-timer');

    if (closeBtn) closeBtn.addEventListener('click', closePlaybreakModal);
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (playbreakPhase < 4) { hapticFeedback('light'); playbreakPhase++; showPlaybreakPhase(); }
    });
    if (backBtn) backBtn.addEventListener('click', () => {
        if (playbreakPhase > 1) {
            if (playbreakTimerInterval) { clearInterval(playbreakTimerInterval); playbreakTimerInterval = null; }
            hapticFeedback('light'); playbreakPhase--; showPlaybreakPhase();
        }
    });
    if (startTimerBtn) startTimerBtn.addEventListener('click', startPlaybreakTimer);
    if (talkBtn) talkBtn.addEventListener('click', () => {
        closePlaybreakModal();
        triggerChatPrompt(`I just did a play break! I chose ${playbreakData.activity} and felt ${playbreakData.feeling} afterwards. Can you help me notice what play does for me?`);
    });

    // Activity selection
    document.querySelectorAll('#playbreak-options .playbreak-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#playbreak-options .playbreak-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            playbreakData.activity = btn.dataset.value;
            hapticFeedback('light');
            const nextBtn = document.getElementById('playbreak-next');
            if (nextBtn) nextBtn.disabled = false;
        });
    });

    // Feeling selection
    document.querySelectorAll('#playbreak-feeling-options .playbreak-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#playbreak-feeling-options .playbreak-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            playbreakData.feeling = btn.dataset.value;
            hapticFeedback('light');
            const nextBtn = document.getElementById('playbreak-next');
            if (nextBtn) nextBtn.disabled = false;
        });
    });

    if (playbreakModal) {
        playbreakModal.addEventListener('click', (e) => { if (e.target === playbreakModal) closePlaybreakModal(); });
    }
}

// ============================================
// Spot Your Safety Behaviours Exercise
// ============================================

let safetyPhase = 1;
let safetyData = {
    behaviours: ['', '', ''],
    protections: ['', '', ''],
    losses: ['', '', ''],
    alternatives: ['', '', '']
};

function openSafetyModal() {
    safetyModal.classList.add('active');
    hapticFeedback('light');
    resetSafety();
}

function closeSafetyModal() {
    safetyModal.classList.remove('active');
    resetSafety();
}

function resetSafety() {
    safetyPhase = 1;
    safetyData = {
        behaviours: ['', '', ''],
        protections: ['', '', ''],
        losses: ['', '', ''],
        alternatives: ['', '', '']
    };
    // Clear all inputs
    for (let i = 1; i <= 3; i++) {
        const fields = ['behaviour', 'protect', 'losing', 'alternative'];
        fields.forEach(field => {
            const el = document.getElementById(`safety-${field}-${i}`);
            if (el) el.value = '';
        });
    }
    showSafetyPhase();
}

function saveSafetyPhaseData() {
    // Phase 2: behaviour 1, Phase 3: reflect 1, Phase 4: behaviour 2, etc.
    if (safetyPhase === 2) {
        const el = document.getElementById('safety-behaviour-1');
        if (el) safetyData.behaviours[0] = el.value;
    } else if (safetyPhase === 3) {
        const p = document.getElementById('safety-protect-1');
        const l = document.getElementById('safety-losing-1');
        const a = document.getElementById('safety-alternative-1');
        if (p) safetyData.protections[0] = p.value;
        if (l) safetyData.losses[0] = l.value;
        if (a) safetyData.alternatives[0] = a.value;
    } else if (safetyPhase === 4) {
        const el = document.getElementById('safety-behaviour-2');
        if (el) safetyData.behaviours[1] = el.value;
    } else if (safetyPhase === 5) {
        const p = document.getElementById('safety-protect-2');
        const l = document.getElementById('safety-losing-2');
        const a = document.getElementById('safety-alternative-2');
        if (p) safetyData.protections[1] = p.value;
        if (l) safetyData.losses[1] = l.value;
        if (a) safetyData.alternatives[1] = a.value;
    } else if (safetyPhase === 6) {
        const el = document.getElementById('safety-behaviour-3');
        if (el) safetyData.behaviours[2] = el.value;
    } else if (safetyPhase === 7) {
        const p = document.getElementById('safety-protect-3');
        const l = document.getElementById('safety-losing-3');
        const a = document.getElementById('safety-alternative-3');
        if (p) safetyData.protections[2] = p.value;
        if (l) safetyData.losses[2] = l.value;
        if (a) safetyData.alternatives[2] = a.value;
    }
}

function showSafetyPhase() {
    document.querySelectorAll('.safety-section').forEach(section => {
        section.classList.remove('active');
        if (parseInt(section.dataset.section) === safetyPhase) section.classList.add('active');
    });
    document.querySelectorAll('.safety-progress .safety-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < safetyPhase);
        dot.classList.toggle('current', i === safetyPhase - 1);
    });

    const backBtn = document.getElementById('safety-back');
    const nextBtn = document.getElementById('safety-next');
    const talkBtn = document.getElementById('talk-about-safety');

    if (backBtn) backBtn.style.display = safetyPhase > 1 ? '' : 'none';
    if (nextBtn) nextBtn.style.display = safetyPhase < 8 ? '' : 'none';
    if (talkBtn) talkBtn.style.display = safetyPhase === 8 ? '' : 'none';

    // Build summary on final phase
    if (safetyPhase === 8) {
        const summary = document.getElementById('safety-summary');
        if (summary) {
            let html = '';
            for (let i = 0; i < 3; i++) {
                if (safetyData.behaviours[i].trim()) {
                    html += `<div class="safety-result-card">
                        <div class="safety-result-header">🛡️ ${safetyData.behaviours[i]}</div>
                        ${safetyData.protections[i] ? `<div class="safety-result-detail"><strong>Protecting from:</strong> ${safetyData.protections[i]}</div>` : ''}
                        ${safetyData.losses[i] ? `<div class="safety-result-detail"><strong>Losing:</strong> ${safetyData.losses[i]}</div>` : ''}
                        ${safetyData.alternatives[i] ? `<div class="safety-result-detail"><strong>Tiny alternative:</strong> ${safetyData.alternatives[i]}</div>` : ''}
                    </div>`;
                }
            }
            summary.innerHTML = html;
        }
    }
}

function initSafetyExercise() {
    const closeBtn = document.getElementById('close-safety');
    const nextBtn = document.getElementById('safety-next');
    const backBtn = document.getElementById('safety-back');
    const talkBtn = document.getElementById('talk-about-safety');

    if (closeBtn) closeBtn.addEventListener('click', closeSafetyModal);
    if (nextBtn) nextBtn.addEventListener('click', () => {
        saveSafetyPhaseData();
        if (safetyPhase < 8) { hapticFeedback('light'); safetyPhase++; showSafetyPhase(); }
    });
    if (backBtn) backBtn.addEventListener('click', () => {
        saveSafetyPhaseData();
        if (safetyPhase > 1) { hapticFeedback('light'); safetyPhase--; showSafetyPhase(); }
    });
    if (talkBtn) talkBtn.addEventListener('click', () => {
        closeSafetyModal();
        const parts = ['I just spotted my safety behaviours.'];
        for (let i = 0; i < 3; i++) {
            if (safetyData.behaviours[i].trim()) {
                parts.push(`Behaviour ${i + 1}: "${safetyData.behaviours[i]}".`);
                if (safetyData.protections[i]) parts.push(`I'm protecting myself from: ${safetyData.protections[i]}.`);
                if (safetyData.alternatives[i]) parts.push(`My tiny alternative: ${safetyData.alternatives[i]}.`);
            }
        }
        parts.push('Can you help me think about these patterns and how to gently experiment with change?');
        triggerChatPrompt(parts.join(' '));
    });
    if (safetyModal) {
        safetyModal.addEventListener('click', (e) => { if (e.target === safetyModal) closeSafetyModal(); });
    }
}
