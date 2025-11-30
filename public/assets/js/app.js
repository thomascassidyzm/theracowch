// ============================================
// Cowch App - Core JavaScript
// ============================================

const STORAGE_KEY = 'cowch-chat-history';
const API_ENDPOINT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api/chat'
    : '/api/chat';

// State
let conversationHistory = [];
let isTyping = false;

// DOM Elements (initialized after DOM ready)
let app, tabBtns, tabPanels;
let chatInput, chatSendBtn, chatMessages, greetingText;

// ============================================
// Tab Navigation
// ============================================

function switchTab(tabId) {
    // Update buttons
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update panels
    tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });

    // Focus chat input when switching to chat
    if (tabId === 'chat') {
        setTimeout(() => chatInput.focus(), 100);
    }
}

function setupTabNavigation() {
    // Tab button clicks
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
            // Update URL hash without scrolling
            history.replaceState(null, '', `#${btn.dataset.tab}`);
        });
    });

    // Action buttons that switch tabs
    document.querySelectorAll('[data-tab]').forEach(el => {
        if (!el.classList.contains('tab-btn')) {
            el.addEventListener('click', () => {
                switchTab(el.dataset.tab);
            });
        }
    });
}

// Handle URL hash navigation (e.g., from chat.html links)
function handleHashNavigation() {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['home', 'imagine', 'chat', 'you'].includes(hash)) {
        switchTab(hash);
    }
}

// ============================================
// Greeting
// ============================================

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Hello';

    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else if (hour < 21) greeting = 'Good evening';
    else greeting = 'Time to wind down';

    greetingText.textContent = greeting;
}

// ============================================
// IMAGINE Framework Data & Domain Panel
// ============================================

const IMAGINE_DOMAINS = {
    self: {
        letter: 'I',
        title: 'I, Me, Myself',
        subtitle: 'Self-care, boundaries & compassion',
        color: '#E88A6A',
        description: 'This domain is about nurturing your relationship with yourself. It includes self-care practices, setting healthy boundaries, and developing self-compassion.',
        exercises: [
            { title: '5-Minute Body Reset', description: 'Boost energy through small intentional movement', duration: '5 min', prompt: 'Can you guide me through a 5-minute body reset? I want to do some intentional movement to boost my energy.' },
            { title: 'The 1% Boundary', description: 'Build confidence in saying "no" or setting limits', prompt: 'Can you guide me through the 1% Boundary exercise? I want to practice setting small, healthy boundaries.' },
            { title: 'Talk to Yourself Like a Friend', description: 'Reduce harsh self-talk and build resilience', prompt: 'Can you help me practice self-compassion? I noticed some harsh self-talk and want to respond to myself like I would a friend.' },
            { title: 'Something Just for Me', description: 'Strengthen self-care through intentional enjoyment', prompt: "Can you help me create a 'yes list' of things I enjoy but haven't done recently?" }
        ]
    },
    mind: {
        letter: 'M',
        title: 'Mindfulness',
        subtitle: 'Present moment awareness',
        color: '#7EA88B',
        description: 'Mindfulness helps you step out of autopilot and into the present moment. These exercises help calm your nervous system and anchor you in the here and now.',
        exercises: [
            { title: 'Box Breathing', description: '4-4-4-4 breathing to calm your nervous system', duration: '4 min', interactive: 'breathing', prompt: 'Can you guide me through box breathing?' },
            { title: '5-4-3-2-1 Grounding', description: 'Use your senses to anchor in the present', duration: '3 min', interactive: 'grounding', prompt: 'Can you guide me through the 5-4-3-2-1 grounding technique?' },
            { title: 'Progressive Muscle Relaxation', description: 'Release tension through guided body awareness', duration: '10 min', interactive: 'pmr', prompt: 'Can you guide me through progressive muscle relaxation?' },
            { title: 'Give Your Brain a Breather', description: 'A 2-minute mindfulness reset', duration: '2 min', prompt: 'Can you guide me through a 2-minute mind unclutter exercise? I need to step out of constant thinking and just notice.' }
        ]
    },
    accept: {
        letter: 'A',
        title: 'Acceptance',
        subtitle: 'Making peace with what is',
        color: '#B8860B',
        description: 'Acceptance isn\'t about giving up - it\'s about acknowledging reality so you can respond wisely rather than react. These exercises help you make peace with what you cannot change.',
        exercises: [
            { title: 'What Am I Pushing Away?', description: 'Notice thoughts or feelings you might be avoiding', prompt: 'Can you guide me through a resistance scan? I want to gently notice what I might be avoiding or pushing away.' },
            { title: 'Let the Feeling Rise & Fall', description: 'Learn that emotions come in waves, not permanent states', prompt: 'Can you guide me through the wave exercise? I have a strong feeling and want to practice letting it rise and fall naturally.' },
            { title: 'Sort It Out', description: 'Distinguish between what you can and cannot control', prompt: 'Can you help me do the circle of control exercise? I want to sort out what I can control versus what I need to accept.' }
        ]
    },
    thanks: {
        letter: 'G',
        title: 'Gratitude',
        subtitle: 'Noticing the good',
        color: '#DDA0DD',
        description: 'Gratitude isn\'t about toxic positivity - it\'s about training your brain to notice good things alongside the difficult ones. These exercises build your appreciation muscle.',
        exercises: [
            { title: 'Notice the Small Stuff', description: 'Tune into subtle positives you might have missed', duration: '2 min', prompt: 'Can you help me with the tiny wins gratitude check? I want to notice three small things that made today even slightly better.' },
            { title: 'A Different Angle', description: 'Reframe a challenge through appreciation', prompt: "Can you guide me through the gratitude lens exercise? I have a challenge I'd like to look at from a different angle." }
        ]
    },
    connect: {
        letter: 'I',
        title: 'Interactions',
        subtitle: 'Connection with others',
        color: '#6B8E9F',
        description: 'We\'re social creatures, and connection matters for wellbeing. These exercises help you notice your interaction patterns and take small steps toward meaningful connection.',
        exercises: [
            { title: 'How Connected Was Today?', description: 'Build awareness of your daily interaction levels', duration: '2 min', interactive: 'social', prompt: 'Can you help me do a social pulse check? I want to reflect on my connections today.' },
            { title: 'Who Did I See This Week?', description: 'Spot patterns in how often you connect', prompt: "Can you help me with the connection tracker? I want to reflect on who I've connected with this week." },
            { title: 'A Small Step Away From Isolation', description: 'Break isolation with one tiny, achievable action', prompt: 'Can you guide me through the one-step outward challenge? I want to take a small step toward connection today.' }
        ]
    },
    play: {
        letter: 'N',
        title: 'Nurture Fun & Play',
        subtitle: 'Joy and lightness',
        color: '#F4A460',
        description: 'Play isn\'t just for kids - it\'s essential for mental health. These exercises help you reconnect with joy, lightness, and your playful side.',
        exercises: [
            { title: 'Scheduled Silly Time', description: 'Interrupt seriousness with 10 minutes of play', duration: '10 min', prompt: 'Can you help me take a 10-minute play break? I need to reconnect with my playful side.' },
            { title: 'Replaying Joy', description: 'Unlock playfulness through nostalgia', prompt: 'Can you guide me through the childhood micro-joy exercise? I want to rediscover something I loved as a child.' },
            { title: 'The Mini Laugh Experiment', description: 'Trigger laughter on purpose to shift your state', duration: '3 min', prompt: "Can you guide me through the 3-minute laugh starter? I want to try triggering laughter even if I don't feel like it." }
        ]
    },
    explore: {
        letter: 'E',
        title: 'Explore',
        subtitle: 'Growth and discovery',
        color: '#8FBC8F',
        description: 'Growth happens at the edge of your comfort zone. These exercises help you gently stretch your boundaries and build tolerance for uncertainty.',
        exercises: [
            { title: 'What\'s Protecting You... and Limiting You?', description: 'Identify behaviours that block growth', prompt: 'Can you help me spot my safety behaviours? I want to notice what I do to avoid discomfort and what it might be costing me.' },
            { title: 'Grow Without Overwhelm', description: 'Try something 10% more challenging', prompt: 'Can you guide me through the 10% stretch exercise? I want to gently push my comfort zone without overwhelming myself.' },
            { title: 'Investigate Instead of Assuming', description: 'Replace anxious predictions with curiosity', prompt: "Can you help me be a curious detective? I have a situation where I'm assuming the worst and want to gather real evidence instead." },
            { title: 'Uncertainty Ladder', description: 'Build tolerance for uncertainty in gradual steps', interactive: 'ladder', prompt: 'Can you help me with the uncertainty ladder? I want to practice tolerating uncertainty in small, manageable steps.' },
            { title: 'Inner Weather Report', description: 'Check in with your internal state without judgment', duration: '3 min', interactive: 'weather', prompt: "Can you guide me through an inner weather report? I want to explore what's happening inside me right now." }
        ]
    }
};

// Domain to page URL mapping
const DOMAIN_PAGES = {
    self: '/imagine/self.html',
    mind: '/imagine/mindfulness.html',
    accept: '/imagine/acceptance.html',
    thanks: '/imagine/gratitude.html',
    connect: '/imagine/interactions.html',
    play: '/imagine/nurturing.html',
    explore: '/imagine/exploring.html'
};

function setupDomainPanel() {
    const domainPanel = document.getElementById('domain-panel');
    const domainPanelBack = document.getElementById('domain-panel-back');
    const domainPanelName = document.getElementById('domain-panel-name');
    const domainPanelSubtitle = document.getElementById('domain-panel-subtitle');
    const domainPanelContent = document.getElementById('domain-panel-content');

    // Navigate to section page when clicking a domain card
    document.querySelectorAll('.domain-card').forEach(card => {
        card.addEventListener('click', () => {
            const domainKey = card.dataset.domain;
            const pageUrl = DOMAIN_PAGES[domainKey];
            if (pageUrl) {
                window.location.href = pageUrl;
            } else {
                // Fallback to panel for unmapped domains
                openDomainPanel(domainKey);
            }
        });
    });

    // Also handle IMAGINE mini letters on home tab
    document.querySelectorAll('.imagine-mini-letter').forEach(letter => {
        letter.addEventListener('click', () => {
            const domainKey = letter.dataset.domain;
            // Map mini letter data-domain to actual domain keys
            const domainMap = {
                'I': 'self',
                'M': 'mind',
                'A': 'accept',
                'G': 'thanks',
                'I2': 'connect',
                'N': 'play',
                'E': 'explore'
            };
            const actualDomain = domainMap[domainKey] || domainKey;
            const pageUrl = DOMAIN_PAGES[actualDomain];
            if (pageUrl) {
                window.location.href = pageUrl;
            }
        });
    });

    function openDomainPanel(domainKey) {
        const domain = IMAGINE_DOMAINS[domainKey];
        if (!domain) return;

        domainPanelName.textContent = domain.title;
        domainPanelSubtitle.textContent = domain.subtitle;

        domainPanelContent.innerHTML = `
            <div class="domain-description">
                <p>${domain.description}</p>
            </div>
            <div class="exercise-list">
                ${domain.exercises.map((ex, i) => `
                    <div class="exercise-card ${ex.interactive ? 'interactive' : ''}"
                         data-prompt="${ex.prompt.replace(/"/g, '&quot;')}"
                         data-interactive="${ex.interactive || ''}">
                        <div class="exercise-card-header">
                            <h4>${ex.interactive ? '&#9658; ' : ''}${ex.title}</h4>
                            ${ex.duration ? `<span class="exercise-duration">${ex.duration}</span>` : ''}
                        </div>
                        <p>${ex.description}</p>
                    </div>
                `).join('')}
            </div>
            <button class="talk-to-mandy-btn" data-domain="${domainKey}">
                Talk to Mandy about ${domain.title}
            </button>
        `;

        // Add click handlers for exercise cards
        domainPanelContent.querySelectorAll('.exercise-card').forEach(card => {
            card.addEventListener('click', () => {
                const interactive = card.dataset.interactive;
                if (interactive) {
                    // Open interactive exercise in chat.html
                    closeDomainPanel();
                    window.location.href = `/chat.html#exercise-${interactive}`;
                } else {
                    // Send prompt to chat
                    const prompt = card.dataset.prompt;
                    triggerChatWithPrompt(prompt);
                }
            });
        });

        // Talk to Mandy button
        domainPanelContent.querySelector('.talk-to-mandy-btn').addEventListener('click', () => {
            const prompt = `I'd like to explore the ${domain.title} area of the IMAGINE framework. Can you tell me more about it and help me get started?`;
            triggerChatWithPrompt(prompt);
        });

        domainPanel.classList.add('active');
    }

    function closeDomainPanel() {
        domainPanel.classList.remove('active');
    }

    domainPanelBack.addEventListener('click', closeDomainPanel);

    function triggerChatWithPrompt(prompt) {
        closeDomainPanel();
        switchTab('chat');
        setTimeout(() => {
            chatInput.value = prompt;
            chatInput.dispatchEvent(new Event('input'));
            sendMessage();
        }, 300);
    }

    // Make closeDomainPanel available globally for external use
    window.closeDomainPanel = closeDomainPanel;
}

// ============================================
// Chat Functionality
// ============================================

function setupChat() {
    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        chatSendBtn.disabled = !chatInput.value.trim();
    });

    // Send on Enter (Shift+Enter for newline)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (chatInput.value.trim()) {
                sendMessage();
            }
        }
    });

    chatSendBtn.addEventListener('click', sendMessage);
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || isTyping) return;

    // Add user message
    addMessage(message, 'user');
    conversationHistory.push({ role: 'user', content: message });

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatSendBtn.disabled = true;

    // Save history
    saveChatHistory();

    // Show typing indicator
    isTyping = true;
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message mandy typing';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(typingDiv);
    scrollToBottom();

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history: conversationHistory.slice(-10)
            })
        });

        const data = await response.json();

        // Remove typing indicator
        typingDiv.remove();

        // Add response with typing effect
        await addMessageWithTyping(data.response, 'mandy');
        conversationHistory.push({ role: 'assistant', content: data.response });
        saveChatHistory();

    } catch (error) {
        console.error('Error:', error);
        typingDiv.remove();
        addMessage("I'm having trouble connecting right now. Please try again in a moment.", 'mandy');
    }

    isTyping = false;
    chatSendBtn.disabled = false;
}

function addMessage(content, sender, skipTyping = false) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.innerHTML = formatMessage(content);
    chatMessages.appendChild(div);
    scrollToBottom();
}

// Add message with typing effect for Mandy
async function addMessageWithTyping(content, sender) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    chatMessages.appendChild(div);

    const formattedContent = formatMessage(content);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedContent;

    await typeNodes(div, tempDiv.childNodes);
    scrollToBottom();
}

// Type through DOM nodes with natural pauses
async function typeNodes(target, nodes) {
    for (const node of nodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const textNode = document.createTextNode('');
            target.appendChild(textNode);
            for (const char of text) {
                textNode.textContent += char;
                scrollToBottom();
                // Natural typing delays
                let delay = 12 + Math.random() * 8;
                if ('.!?'.includes(char)) delay = 150;
                else if (',;:'.includes(char)) delay = 80;
                await sleep(delay);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = document.createElement(node.tagName.toLowerCase());
            for (const attr of node.attributes) {
                el.setAttribute(attr.name, attr.value);
            }
            target.appendChild(el);
            await typeNodes(el, node.childNodes);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Markdown formatting
function formatMessage(content) {
    let formatted = content;

    // Process line by line for lists and headers
    const lines = formatted.split('\n');
    const processed = [];
    let inList = false;

    for (let line of lines) {
        if (line.match(/^[-*]\s+/)) {
            const text = line.replace(/^[-*]\s+/, '');
            if (!inList) {
                line = '<ul><li>' + text + '</li>';
                inList = true;
            } else {
                line = '<li>' + text + '</li>';
            }
        } else if (inList && line.trim() !== '') {
            processed.push('</ul>');
            inList = false;
        }
        processed.push(line);
    }
    if (inList) processed.push('</ul>');

    formatted = processed.join('\n');

    // Bold **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic *text*
    formatted = formatted.replace(/(?<![*])\*(?!\*)([^*]+)\*(?![*])/g, '<em>$1</em>');

    // Paragraphs
    formatted = formatted.split('\n\n').map(p => {
        if (p.match(/^<(ul|li|h)/)) return p;
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return formatted;
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveChatHistory() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
    } catch (e) {
        console.error('Error saving chat history:', e);
    }
}

function loadChatHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            conversationHistory = JSON.parse(saved);
            // Clear default message and show history
            if (conversationHistory.length > 0) {
                chatMessages.innerHTML = '';
                conversationHistory.forEach(msg => {
                    const sender = msg.role === 'user' ? 'user' : 'mandy';
                    addMessage(msg.content, sender);
                });
            }
        }
    } catch (e) {
        console.error('Error loading chat history:', e);
    }
}

// ============================================
// Quick Check-in
// ============================================

function setupQuickCheckin() {
    document.getElementById('quick-checkin').addEventListener('click', () => {
        switchTab('chat');
        setTimeout(() => {
            chatInput.value = "I'd like to do a quick check-in. How am I feeling today?";
            chatInput.dispatchEvent(new Event('input'));
            sendMessage();
        }, 300);
    });
}

// ============================================
// Clear History
// ============================================

function setupClearHistory() {
    document.getElementById('clear-btn').addEventListener('click', () => {
        if (confirm('Clear all conversation history? This cannot be undone.')) {
            clearConversation();
        }
    });

    // New Chat button in chat header
    document.getElementById('new-chat-btn').addEventListener('click', () => {
        clearConversation();
    });
}

// ============================================
// Settings Buttons
// ============================================

function isIOSSafari() {
    const ua = window.navigator.userAgent;
    const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
    const webkit = !!ua.match(/WebKit/i);
    const notChrome = !ua.match(/CriOS/i);
    const notFirefox = !ua.match(/FxiOS/i);
    return iOS && webkit && notChrome && notFirefox;
}

function isInStandaloneMode() {
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: standalone)').matches;
}

function setupSettingsButtons() {
    // Show install button only on iOS Safari when not already installed
    const installBtn = document.getElementById('install-btn');
    if (installBtn && isIOSSafari() && !isInStandaloneMode()) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', () => {
            alert('To add Cowch to your home screen:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"\n\nThen you can access Cowch like any other app!');
        });
    }

    // Privacy button - navigate to chat with privacy info
    const privacyBtn = document.getElementById('privacy-btn');
    if (privacyBtn) {
        privacyBtn.addEventListener('click', () => {
            window.location.href = '/chat.html#privacy';
        });
    }

    // About button - ask Mandy about herself
    const aboutBtn = document.getElementById('about-btn');
    if (aboutBtn) {
        aboutBtn.addEventListener('click', () => {
            switchTab('chat');
            setTimeout(() => {
                chatInput.value = "Tell me about yourself, Mandy. What's the IMAGINE framework and how can you help me?";
                chatInput.dispatchEvent(new Event('input'));
                sendMessage();
            }, 300);
        });
    }
}

function clearConversation() {
    localStorage.removeItem(STORAGE_KEY);
    conversationHistory = [];
    chatMessages.innerHTML = `
        <div class="message mandy">
            Hi there! I'm Mandy, and I'm so glad you're here. This is a space for you - no judgment, just support. What's on your mind?
        </div>
    `;
}

// ============================================
// IMAGINE Tracker
// ============================================

function updateImagineTracker() {
    try {
        const data = localStorage.getItem('cowch-imagine-engagement');
        if (data) {
            const engagement = JSON.parse(data);
            document.querySelectorAll('.imagine-mini-letter').forEach(el => {
                const domain = el.dataset.domain;
                if (engagement[domain] && engagement[domain] > 0) {
                    el.classList.add('active');
                }
            });
        }
    } catch (e) {
        // Ignore errors
    }
}

// ============================================
// Initialize
// ============================================

function init() {
    // Initialize DOM references
    app = document.getElementById('app');
    tabBtns = document.querySelectorAll('.tab-btn');
    tabPanels = document.querySelectorAll('.tab-panel');
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    chatMessages = document.getElementById('chat-messages');
    greetingText = document.getElementById('greeting-text');

    // Setup all functionality
    updateGreeting();
    setupTabNavigation();
    setupDomainPanel();
    setupChat();
    setupQuickCheckin();
    setupClearHistory();
    setupSettingsButtons();
    loadChatHistory();
    updateImagineTracker();

    // Handle hash navigation
    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
