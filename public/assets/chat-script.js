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
const aboutImagineButton = document.getElementById('about-imagine');
const privacyInfoButton = document.getElementById('privacy-info');

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
    aboutImagineButton.addEventListener('click', handleAboutImagine);
    privacyInfoButton.addEventListener('click', handlePrivacyInfo);
}

// ================================
// Message Handling
// ================================

async function handleSendMessage() {
    const message = chatInput.value.trim();

    if (!message || isTyping) return;

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
        focusInput();
    }
}

function handleAboutImagine() {
    menuModal.classList.remove('active');

    const imagineInfo = `The **IMAGINE framework** has 7 domains for holistic wellbeing:

**I** - Me, Myself & I (Self-care)
**M** - Mindfulness (Present moment)
**A** - Acceptance (Letting go)
**G** - Gratitude (Positive focus)
**I** - Interactions (Relationships)
**N** - Nurturing (Fun & playfulness)
**E** - Exploring (Understanding patterns)

Each domain supports your mental health and personal growth in different ways.`;

    addMessage(imagineInfo, 'mandy');
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

// Debug info
console.log('Cowch Chat initialized');
console.log('API Endpoint:', API_ENDPOINT);
console.log('Conversation history:', conversationHistory.length, 'messages');