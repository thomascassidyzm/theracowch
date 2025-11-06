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

// ================================
// DOM Elements
// ================================

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const quickPromptsContainer = document.getElementById('quick-prompts');
const menuButton = document.getElementById('menu-button');
const menuModal = document.getElementById('menu-modal');
const closeMenuButton = document.getElementById('close-menu');

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

// ================================
// State Management
// ================================

let conversationHistory = [];
let isTyping = false;

// ================================
// Initialize
// ================================

window.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
    showWelcomeMessage();
    setupEventListeners();
    populateImaginePanel();
    populateExercisePanel();
    focusInput();

    // Hide quick prompts if conversation already exists
    if (conversationHistory.length > 0) {
        quickPromptsContainer.style.display = 'none';
        document.body.classList.add('prompts-hidden');
    }
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

    // Menu
    menuButton.addEventListener('click', () => menuModal.classList.add('active'));
    closeMenuButton.addEventListener('click', () => menuModal.classList.remove('active'));
    menuModal.addEventListener('click', (e) => {
        if (e.target === menuModal) {
            menuModal.classList.remove('active');
        }
    });

    // Menu options
    clearChatButton.addEventListener('click', handleClearChat);
    privacyInfoButton.addEventListener('click', handlePrivacyInfo);

    // Slide panels
    openImaginePanelButton.addEventListener('click', () => {
        menuModal.classList.remove('active');
        imaginePanel.classList.add('active');
    });

    openExercisePanelButton.addEventListener('click', () => {
        menuModal.classList.remove('active');
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
            } else if (menuModal.classList.contains('active')) {
                menuModal.classList.remove('active');
            }
        }
    });
}

// ================================
// Message Handling
// ================================

async function handleSendMessage() {
    const message = chatInput.value.trim();

    if (!message || isTyping) return;

    // Hide quick prompts after first message
    if (conversationHistory.length === 0) {
        quickPromptsContainer.style.display = 'none';
        document.body.classList.add('prompts-hidden');
    }

    // Add user message to chat
    addMessage(message, 'user');
    conversationHistory.push({ sender: 'user', text: message });

    // Clear input
    chatInput.value = '';
    focusInput();

    // Save history
    saveChatHistory();

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
                conversationHistory: conversationHistory.slice(-MAX_HISTORY_MESSAGES)
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

        // Add Mandy's response
        addMessage(data.response, 'mandy');
        conversationHistory.push({ sender: 'ai_mandy', text: data.response });

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

function addMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    // Convert markdown-style formatting
    const formattedContent = formatMessage(content);
    messageDiv.innerHTML = formattedContent;

    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function formatMessage(content) {
    // Simple markdown-like formatting
    let formatted = content;

    // Bold **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Paragraphs (double newline)
    formatted = formatted.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');

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
    if (confirm('Are you sure you want to clear this conversation? This cannot be undone.')) {
        conversationHistory = [];
        chatMessages.innerHTML = '';
        showWelcomeMessage();
        saveChatHistory();
        menuModal.classList.remove('active');

        // Show quick prompts again
        quickPromptsContainer.style.display = 'flex';
        document.body.classList.remove('prompts-hidden');

        focusInput();
    }
}

function handlePrivacyInfo() {
    menuModal.classList.remove('active');

    const privacyInfo = `**Privacy & Safety:**

✓ Your conversations are stored locally on your device only
✓ I'm an AI assistant, not a replacement for professional therapy
✓ For crisis support, please contact emergency services or a crisis hotline
✓ Visit Mandy's website at thoughtsonlifeandlove.com for professional therapy services

This is a supportive tool for self-reflection and learning, but not medical advice.`;

    addMessage(privacyInfo, 'mandy');
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
                // Handle both old format (role/content) and new format (sender/text)
                let sender, text;

                if (msg.sender && msg.text) {
                    // New format
                    sender = msg.sender === 'user' ? 'user' : 'mandy';
                    text = msg.text;
                } else if (msg.role && msg.content) {
                    // Old format - migrate to new format
                    sender = msg.role === 'user' ? 'user' : 'mandy';
                    text = msg.content;
                    // Update in array for next save
                    msg.sender = msg.role === 'user' ? 'user' : 'ai_mandy';
                    msg.text = msg.content;
                    delete msg.role;
                    delete msg.content;
                }

                addMessage(text, sender);
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        conversationHistory = [];
    }
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
        description: 'Taking care of your physical, emotional, and mental wellbeing. Setting boundaries, checking in with yourself, and honoring your needs.',
        prompt: 'Tell me about self-care and the "Me, Myself & I" domain of the IMAGINE framework'
    },
    {
        letter: 'M',
        title: 'Mindfulness',
        subtitle: 'Present moment awareness',
        icon: '🪷',
        description: 'Being fully present in the moment. Noticing thoughts and feelings without judgment, grounding yourself in the here and now.',
        prompt: 'I want to learn about mindfulness and being present in the moment'
    },
    {
        letter: 'A',
        title: 'Acceptance',
        subtitle: 'Letting go & self-compassion',
        icon: '🤲',
        description: 'Accepting what you cannot change, practicing self-compassion, and letting go of perfectionism and control.',
        prompt: 'Help me understand acceptance and how to be more compassionate with myself'
    },
    {
        letter: 'G',
        title: 'Gratitude',
        subtitle: 'Appreciation & perspective',
        icon: '🌟',
        description: 'Noticing and appreciating the good in your life. Shifting perspective to see what\'s working, not just what\'s broken.',
        prompt: 'I want to explore gratitude and appreciating the good things in my life'
    },
    {
        letter: 'I',
        title: 'Interactions',
        subtitle: 'Relationships & connection',
        icon: '💬',
        description: 'Building and maintaining healthy relationships. Communication, boundaries, and navigating difficult conversations.',
        prompt: 'I need help with relationships and how I interact with others'
    },
    {
        letter: 'N',
        title: 'Nurturing',
        subtitle: 'Fun, playfulness & joy',
        icon: '🎨',
        description: 'Making time for activities that bring you joy. Play, creativity, humor, and connecting with your inner child.',
        prompt: 'Tell me about nurturing myself through fun and playfulness'
    },
    {
        letter: 'E',
        title: 'Exploring',
        subtitle: 'Understanding patterns',
        icon: '🔍',
        description: 'Identifying and understanding your thoughts, feelings, and behavioral patterns. Recognizing safety behaviors and unhelpful thinking.',
        prompt: 'Help me explore and understand my thought patterns and behaviors'
    }
];

function populateImaginePanel() {
    imagineContent.innerHTML = IMAGINE_DOMAINS.map(domain => `
        <div class="resource-card">
            <div class="resource-card-header">
                <div class="resource-card-icon">${domain.icon}</div>
                <div class="resource-card-title">
                    <h3>${domain.letter} - ${domain.title}</h3>
                    <p class="subtitle">${domain.subtitle}</p>
                </div>
            </div>
            <p class="resource-card-description">${domain.description}</p>
            <div class="resource-card-actions">
                <button class="btn-primary chat-trigger" data-prompt="${domain.prompt}">
                    Chat with Mandy →
                </button>
            </div>
        </div>
    `).join('');

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
console.log('Cowch Chat initialized');
console.log('API Endpoint:', API_ENDPOINT);
console.log('Conversation history:', conversationHistory.length, 'messages');