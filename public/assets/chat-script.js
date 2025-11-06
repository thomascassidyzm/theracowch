// Theracowch Chat - AI Mandy Conversation Interface
// Inspired by Telegram/WhatsApp messaging patterns

// ================================
// Configuration
// ================================

const API_ENDPOINT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/chat'
    : '/api/chat';

const STORAGE_KEY = 'theracowch_chat_history';
const MAX_HISTORY_MESSAGES = 6; // Last 6 messages for context

// ================================
// DOM Elements
// ================================

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const quickPromptsContainer = document.getElementById('quick-prompts');
const menuButton = document.getElementById('menu-button');
const menuPanel = document.getElementById('menu-panel');
const closeMenuPanelButton = document.getElementById('close-menu-panel');

// Menu options
const clearChatButton = document.getElementById('clear-chat');
const privacyInfoButton = document.getElementById('privacy-info');

// Slide panels
const openImaginePanelButton = document.getElementById('open-imagine-panel');
const openExercisePanelButton = document.getElementById('open-exercise-panel');
const imaginePanel = document.getElementById('imagine-panel');
const exercisePanel = document.getElementById('exercise-panel');
const closeImaginePanelButton = document.getElementById('close-imagine-panel');
const closeExercisePanelButton = document.getElementById('close-exercise-panel');
const imagineContent = document.getElementById('imagine-content');
const exerciseContent = document.getElementById('exercise-content');

// Box breathing modal
const breathingModal = document.getElementById('breathing-modal');
const closeBreathingButton = document.getElementById('close-breathing');
const startBreathingButton = document.getElementById('start-breathing');
const talkAboutBreathingButton = document.getElementById('talk-about-breathing');
const breathingCircle = document.getElementById('breathing-circle');
const breathingInstruction = document.getElementById('breathing-instruction');

// On-Demand Prompts
const promptButton = document.getElementById('prompt-button');
const promptBanner = document.getElementById('prompt-banner');
const promptMessage = document.getElementById('prompt-message');
const promptAction = document.getElementById('prompt-action');
const promptNew = document.getElementById('prompt-new');
const promptDismiss = document.getElementById('prompt-dismiss');

// Confirmation Modal
const confirmModal = document.getElementById('confirm-modal');
const confirmModalMessage = document.getElementById('confirm-modal-message');
const confirmCancelButton = document.getElementById('confirm-cancel');
const confirmOkButton = document.getElementById('confirm-ok');

// ================================
// State Management
// ================================

let conversationHistory = [];
let isTyping = false;
let currentPrompt = null;

// ================================
// Initialize
// ================================

window.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    showWelcomeMessage();
    setupEventListeners();
    populateImaginePanel();
    populateExercisePanel();
    checkAndShowPrompt();
    focusInput();
});

// ================================
// Event Listeners
// ================================

function setupEventListeners() {
    // Send message
    sendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Quick prompts
    const quickPromptButtons = document.querySelectorAll('.quick-prompt-btn');
    quickPromptButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            chatInput.value = prompt;
            handleSendMessage();
        });
    });

    // Menu Panel
    menuButton.addEventListener('click', () => menuPanel.classList.add('active'));
    closeMenuPanelButton.addEventListener('click', () => menuPanel.classList.remove('active'));

    // Menu options
    clearChatButton.addEventListener('click', handleClearChat);
    privacyInfoButton.addEventListener('click', handlePrivacyInfo);

    // Slide panels
    openImaginePanelButton.addEventListener('click', () => {
        menuPanel.classList.remove('active');
        imaginePanel.classList.add('active');
    });

    openExercisePanelButton.addEventListener('click', () => {
        menuPanel.classList.remove('active');
        exercisePanel.classList.add('active');
    });

    closeImaginePanelButton.addEventListener('click', () => {
        imaginePanel.classList.remove('active');
    });

    closeExercisePanelButton.addEventListener('click', () => {
        exercisePanel.classList.remove('active');
    });

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

    // Close modals on backdrop click
    breathingModal.addEventListener('click', (e) => {
        if (e.target === breathingModal) {
            stopBreathing();
            breathingModal.classList.remove('active');
        }
    });

    // Escape key closes panels and modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (breathingModal.classList.contains('active')) {
                stopBreathing();
                breathingModal.classList.remove('active');
            } else if (imaginePanel.classList.contains('active')) {
                imaginePanel.classList.remove('active');
            } else if (exercisePanel.classList.contains('active')) {
                exercisePanel.classList.remove('active');
            } else if (menuPanel.classList.contains('active')) {
                menuPanel.classList.remove('active');
            }
        }
    });

    // On-Demand Prompts
    promptButton.addEventListener('click', handlePromptButtonClick);
    promptAction.addEventListener('click', handlePromptAction);
    promptNew.addEventListener('click', handlePromptNew);
    promptDismiss.addEventListener('click', hidePromptBanner);

    // Pull-to-refresh on chat messages
    setupPullToRefresh();
}

// ================================
// Message Handling
// ================================

async function handleSendMessage() {
    const message = chatInput.value.trim();

    if (!message || isTyping) return;

    // Add user message to chat
    addMessage(message, 'user');
    conversationHistory.push({ role: 'user', content: message });

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
        // Call API
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                history: conversationHistory.slice(-MAX_HISTORY_MESSAGES)
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

        // Generate quick replies based on pattern and response
        const quickReplies = generateQuickReplies(data.pattern, data.response);

        // Add Mandy's response with quick replies
        addMessage(data.response, 'mandy', quickReplies);
        conversationHistory.push({ role: 'assistant', content: data.response });

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

    // Pattern-specific quick replies
    if (pattern === 'anxiety') {
        replies.push(
            { text: 'Tell me more', prompt: 'Can you tell me more about managing anxiety?' },
            { text: 'Try an exercise', prompt: 'Can you guide me through a calming exercise?' },
            { text: 'Why do I feel this way?', prompt: 'Why do I feel anxious?' }
        );
    } else if (pattern === 'depression') {
        replies.push(
            { text: 'What can I do?', prompt: 'What practical steps can I take?' },
            { text: 'Tell me more', prompt: 'Can you tell me more about this?' },
            { text: 'Why do I feel this way?', prompt: 'Why do I feel like this?' }
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
            { text: 'Why these 7?', prompt: 'Why these 7 categories?' },
            { text: 'Show me more', prompt: 'Can you tell me more about applying this?' }
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

    // Add quick reply buttons if provided (only for Mandy's messages)
    if (quickReplies && sender === 'mandy') {
        const quickRepliesDiv = document.createElement('div');
        quickRepliesDiv.className = 'quick-replies';

        quickReplies.forEach(reply => {
            const button = document.createElement('button');
            button.className = 'quick-reply-btn';
            button.textContent = reply.text;
            button.addEventListener('click', () => {
                triggerChatPrompt(reply.prompt);
            });
            quickRepliesDiv.appendChild(button);
        });

        messageDiv.appendChild(quickRepliesDiv);
    }

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
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
            <p>I'm Mandy, your AI CBT therapist.</p>
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
    showConfirm('Are you sure you want to clear this conversation? This cannot be undone.', () => {
        conversationHistory = [];
        chatMessages.innerHTML = '';
        showWelcomeMessage();
        saveChatHistory();
        menuPanel.classList.remove('active');
        focusInput();
    });
}

function handlePrivacyInfo() {
    menuPanel.classList.remove('active');

    const privacyInfo = `**Privacy & Safety:**

✓ Your conversations are stored locally on your device only
✓ I'm an AI assistant, not a replacement for professional therapy
✓ For crisis support, please contact emergency services or a crisis hotline
✓ Visit Mandy's website at thoughtsonlifeandlove.com for professional therapy services

This is a supportive tool for self-reflection and learning, but not medical advice.`;

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
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
}

// Handle iOS keyboard appearance
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    chatInput.addEventListener('focus', () => {
        document.body.classList.add('keyboard-open');
    });

    chatInput.addEventListener('blur', () => {
        document.body.classList.remove('keyboard-open');
    });
}

// ================================
// IMAGINE Framework Panel
// ================================

const IMAGINE_DOMAINS = [
    {
        letter: 'I',
        title: 'Me, Myself & I',
        subtitle: 'Self-care & wellness',
        icon: '🧘',
        prompt: 'Tell me about "Me, Myself & I"'
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
    const domainCards = IMAGINE_DOMAINS.map(domain => `
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

const EXERCISES = [
    {
        category: '🌬️ Grounding & Calming',
        exercises: [
            {
                name: 'Box Breathing',
                description: '4-4-4-4 breathing technique to calm your nervous system',
                hasInteractive: true,
                prompt: 'Can you guide me through box breathing?'
            },
            {
                name: '5-4-3-2-1 Grounding',
                description: 'Use your 5 senses to anchor yourself in the present moment',
                hasInteractive: false,
                prompt: 'Guide me through the 5-4-3-2-1 grounding technique'
            },
            {
                name: 'Body Scan',
                description: 'Notice tension and sensations throughout your body',
                hasInteractive: false,
                prompt: 'Help me do a body scan meditation'
            }
        ]
    },
    {
        category: '🧠 Cognitive Work',
        exercises: [
            {
                name: 'H-E-A-L Method',
                description: 'Reframe negative thoughts using evidence and compassion',
                hasInteractive: false,
                prompt: 'Teach me the H-E-A-L method for reframing negative thoughts'
            },
            {
                name: 'Thought Unhooking',
                description: 'Distance yourself from unhelpful thoughts (Passengers on the bus)',
                hasInteractive: false,
                prompt: 'Help me unhook from negative thoughts using the "passengers on the bus" metaphor'
            },
            {
                name: 'Evidence For/Against',
                description: 'Examine the facts supporting or contradicting your thoughts',
                hasInteractive: false,
                prompt: 'Guide me through examining the evidence for and against my thoughts'
            }
        ]
    },
    {
        category: '💖 Self-Compassion',
        exercises: [
            {
                name: 'Self-Compassion Break',
                description: 'Three steps to respond to yourself with kindness',
                hasInteractive: false,
                prompt: 'Walk me through a self-compassion break'
            },
            {
                name: 'Compassionate Letter',
                description: 'Write to yourself as you would a dear friend',
                hasInteractive: false,
                prompt: 'Help me write a compassionate letter to myself'
            }
        ]
    },
    {
        category: '🎯 Values & Purpose',
        exercises: [
            {
                name: 'Values Compass',
                description: 'Identify what truly matters to you in life',
                hasInteractive: false,
                prompt: 'Help me identify my core values using the values compass'
            },
            {
                name: 'Valued Living Assessment',
                description: 'Check if your actions align with your values',
                hasInteractive: false,
                prompt: 'Guide me through assessing whether I\'m living according to my values'
            }
        ]
    },
    {
        category: '🪷 Acceptance',
        exercises: [
            {
                name: 'Radical Acceptance',
                description: 'Practice accepting reality as it is, not as you wish it to be',
                hasInteractive: false,
                prompt: 'Teach me about radical acceptance and how to practice it'
            },
            {
                name: 'Leaves on a Stream',
                description: 'Watch your thoughts float by without getting caught in them',
                hasInteractive: false,
                prompt: 'Guide me through the "leaves on a stream" mindfulness exercise'
            }
        ]
    }
];

function populateExercisePanel() {
    exerciseContent.innerHTML = EXERCISES.map(category => `
        <h3 class="category-header">${category.category}</h3>
        ${category.exercises.map(exercise => `
            <div class="resource-card">
                <div class="resource-card-title">
                    <h3>${exercise.name}</h3>
                </div>
                <p class="resource-card-description">${exercise.description}</p>
                <div class="resource-card-actions">
                    ${exercise.hasInteractive ? `
                        <button class="btn-primary start-exercise" data-exercise="${exercise.name}">
                            Start Exercise
                        </button>
                    ` : ''}
                    <button class="${exercise.hasInteractive ? 'btn-secondary' : 'btn-primary'} chat-trigger" data-prompt="${exercise.prompt}">
                        ${exercise.hasInteractive ? 'Ask Mandy →' : 'Chat with Mandy →'}
                    </button>
                </div>
            </div>
        `).join('')}
    `).join('');

    // Add event listeners
    document.querySelectorAll('#exercise-content .chat-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            exercisePanel.classList.remove('active');
            triggerChatPrompt(prompt);
        });
    });

    document.querySelectorAll('#exercise-content .start-exercise').forEach(btn => {
        btn.addEventListener('click', () => {
            const exerciseName = btn.dataset.exercise;
            if (exerciseName === 'Box Breathing') {
                breathingModal.classList.add('active');
            }
        });
    });
}

// ================================
// Chat Trigger Function
// ================================

function triggerChatPrompt(promptText) {
    // Fill chat input with the prompt
    chatInput.value = promptText;

    // Focus the input
    focusInput();

    // Auto-send the message
    handleSendMessage();
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

// Debug info
console.log('Theracowch Chat initialized');
console.log('API Endpoint:', API_ENDPOINT);
console.log('Conversation history:', conversationHistory.length, 'messages');