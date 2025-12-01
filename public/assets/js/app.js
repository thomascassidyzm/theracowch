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
            { title: 'The Wave', description: 'Watch emotions rise and fall like ocean waves', duration: '3 min', interactive: 'wave', prompt: 'Can you guide me through the wave exercise? I have a strong feeling and want to practice letting it rise and fall naturally.' },
            { title: 'What Am I Pushing Away?', description: 'Notice thoughts or feelings you might be avoiding', prompt: 'Can you guide me through a resistance scan? I want to gently notice what I might be avoiding or pushing away.' },
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

        // Interactive exercise URL mapping
        const EXERCISE_URLS = {
            breathing: '/exercises/box-breathing.html',
            grounding: '/exercises/grounding.html',
            weather: '/exercises/weather.html',
            wave: '/exercises/wave.html'
        };

        // Add click handlers for exercise cards
        domainPanelContent.querySelectorAll('.exercise-card').forEach(card => {
            card.addEventListener('click', () => {
                const interactive = card.dataset.interactive;
                if (interactive && EXERCISE_URLS[interactive]) {
                    // Open dedicated exercise page
                    closeDomainPanel();
                    window.location.href = EXERCISE_URLS[interactive];
                } else if (interactive) {
                    // Fallback for exercises without dedicated pages
                    const prompt = card.dataset.prompt;
                    triggerChatWithPrompt(prompt);
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
        // Go to Inner Weather exercise
        window.location.href = '/exercises/weather.html';
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
// YOU TAB TOOLS (Notice, Choice, Values)
// ============================================

// Storage keys
const NOTICE_STORAGE_KEY = 'cowch_notices';
const CHOICE_STORAGE_KEY = 'cowch_choices';
const VALUES_STORAGE_KEY = 'cowch_values';
const VALUES_ALIGNMENT_KEY = 'cowch_values_alignment';

// Notice state
let noticeSelectedColor = null;

// Daily prompts for Notice
const NOTICE_PROMPTS = [
    "What mattered to me today?",
    "What surprised me today?",
    "Where did I feel most like myself?",
    "What did I notice today?",
    "What did I give myself today?"
];

// Get today's date key
function getTodayKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// ============================================
// Tool Panel Management
// ============================================

function setupToolPanels() {
    // Tool card buttons open panels
    document.querySelectorAll('.tool-card[data-tool]').forEach(card => {
        card.addEventListener('click', () => {
            const tool = card.dataset.tool;
            openToolPanel(tool);
        });
    });

    // Back buttons close panels
    document.getElementById('notice-panel-back').addEventListener('click', () => closeToolPanel('notice'));
    document.getElementById('choice-panel-back').addEventListener('click', () => closeToolPanel('choice'));
    document.getElementById('values-panel-back').addEventListener('click', () => closeToolPanel('values'));
}

function openToolPanel(tool) {
    const panel = document.getElementById(`${tool}-panel`);
    if (panel) {
        panel.classList.add('active');
        // Initialize the tool when opened
        if (tool === 'notice') initNotice();
        if (tool === 'choice') initChoice();
        if (tool === 'values') initValues();
    }
}

function closeToolPanel(tool) {
    const panel = document.getElementById(`${tool}-panel`);
    if (panel) {
        panel.classList.remove('active');
    }
}

// ============================================
// NOTICE TOOL
// ============================================

function initNotice() {
    // Set daily prompt
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    document.getElementById('notice-daily-prompt').textContent = NOTICE_PROMPTS[dayOfYear % NOTICE_PROMPTS.length];

    // Load today's notice
    loadTodayNotice();

    // Setup color picker
    setupNoticeColorPicker();

    // Setup view toggle
    setupNoticeViewToggle();

    // Setup save button
    setupNoticeSave();
}

function setupNoticeColorPicker() {
    const colorOptions = document.querySelectorAll('.notice-color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            colorOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            noticeSelectedColor = option.dataset.color;
        });
    });
}

function setupNoticeViewToggle() {
    document.querySelectorAll('[data-notice-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.noticeView;
            document.querySelectorAll('[data-notice-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.getElementById('notice-today-view').classList.toggle('active', view === 'today');
            document.getElementById('notice-timeline-view').classList.toggle('active', view === 'timeline');

            if (view === 'timeline') renderNoticeTimeline();
        });
    });
}

function loadTodayNotice() {
    const notices = JSON.parse(localStorage.getItem(NOTICE_STORAGE_KEY) || '{}');
    const today = getTodayKey();
    const todayNotice = notices[today];

    if (todayNotice) {
        // Set color
        if (todayNotice.color) {
            noticeSelectedColor = todayNotice.color;
            const colorOption = document.querySelector(`.notice-color-option[data-color="${todayNotice.color}"]`);
            if (colorOption) {
                document.querySelectorAll('.notice-color-option').forEach(o => o.classList.remove('selected'));
                colorOption.classList.add('selected');
            }
        }
        // Set energy
        if (todayNotice.energy !== undefined) {
            document.getElementById('notice-energy-slider').value = todayNotice.energy;
        }
        // Set text
        if (todayNotice.text) {
            document.getElementById('notice-text').value = todayNotice.text;
        }
    }
}

function setupNoticeSave() {
    document.getElementById('notice-save-btn').addEventListener('click', () => {
        const energy = document.getElementById('notice-energy-slider').value;
        const text = document.getElementById('notice-text').value;

        if (!noticeSelectedColor && !text.trim()) return;

        const notices = JSON.parse(localStorage.getItem(NOTICE_STORAGE_KEY) || '{}');
        const today = getTodayKey();

        notices[today] = {
            color: noticeSelectedColor,
            energy: parseInt(energy),
            text: text.trim(),
            prompt: document.getElementById('notice-daily-prompt').textContent
        };

        localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify(notices));

        // Feedback
        const btn = document.getElementById('notice-save-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Saved ✓';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    });
}

function renderNoticeTimeline() {
    const notices = JSON.parse(localStorage.getItem(NOTICE_STORAGE_KEY) || '{}');
    const container = document.getElementById('notice-timeline-container');

    if (Object.keys(notices).length === 0) {
        container.innerHTML = `
            <div class="tool-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <p>No notices yet. Start noticing today.</p>
            </div>
        `;
        return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    let html = `
        <div class="notice-timeline-header">
            <h3>${monthName}</h3>
        </div>
        <div class="notice-timeline-grid">
            <div class="notice-day-label">S</div>
            <div class="notice-day-label">M</div>
            <div class="notice-day-label">T</div>
            <div class="notice-day-label">W</div>
            <div class="notice-day-label">T</div>
            <div class="notice-day-label">F</div>
            <div class="notice-day-label">S</div>
    `;

    for (let i = 0; i < startingDayOfWeek; i++) {
        html += '<div class="notice-day-cell empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const notice = notices[dateKey];
        const isToday = day === now.getDate();

        if (notice && notice.color) {
            html += `
                <div class="notice-day-cell has-entry ${isToday ? 'today' : ''}"
                     style="background: ${notice.color};"
                     data-date="${dateKey}">
                    <div class="notice-day-number" style="color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${day}</div>
                </div>
            `;
        } else {
            html += `
                <div class="notice-day-cell empty ${isToday ? 'today' : ''}">
                    <div class="notice-day-number">${day}</div>
                </div>
            `;
        }
    }

    html += '</div>';
    container.innerHTML = html;

    // Click handlers for entries
    container.querySelectorAll('.notice-day-cell[data-date]').forEach(cell => {
        cell.addEventListener('click', () => {
            const dateKey = cell.dataset.date;
            const notice = notices[dateKey];
            if (notice) {
                const formattedDate = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
                alert(`${formattedDate}\n\n"${notice.prompt}"\n\n${notice.text || '(No text recorded)'}`);
            }
        });
    });
}

// ============================================
// CHOICE TOOL
// ============================================

function initChoice() {
    setupChoiceViewToggle();
    setupChoiceSave();
    renderChoiceTree();
}

function setupChoiceViewToggle() {
    document.querySelectorAll('[data-choice-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.choiceView;
            document.querySelectorAll('[data-choice-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.getElementById('choice-today-view').classList.toggle('active', view === 'today');
            document.getElementById('choice-tree-view').classList.toggle('active', view === 'tree');
            document.getElementById('choice-history-view').classList.toggle('active', view === 'history');

            if (view === 'tree') renderChoiceTree();
            if (view === 'history') renderChoiceHistory();
        });
    });
}

function setupChoiceSave() {
    document.getElementById('choice-save-btn').addEventListener('click', () => {
        const text = document.getElementById('choice-text').value.trim();
        if (!text) return;

        const choices = JSON.parse(localStorage.getItem(CHOICE_STORAGE_KEY) || '[]');
        choices.push({
            text: text,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            })
        });

        localStorage.setItem(CHOICE_STORAGE_KEY, JSON.stringify(choices));
        document.getElementById('choice-text').value = '';

        // Feedback
        const btn = document.getElementById('choice-save-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Added!';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);

        renderChoiceTree();
    });
}

function renderChoiceTree() {
    const choices = JSON.parse(localStorage.getItem(CHOICE_STORAGE_KEY) || '[]');
    const count = choices.length;

    document.getElementById('choice-count').textContent = count;

    const leavesGroup = document.getElementById('choice-leaves');
    const branchesGroup = document.getElementById('choice-branches');
    leavesGroup.innerHTML = '';
    branchesGroup.innerHTML = '';

    // Generate leaf positions
    const leafPositions = [];
    for (let i = 0; i < count; i++) {
        const layer = Math.floor(i / 8);
        const angle = (i % 8) * (Math.PI / 4) + Math.random() * 0.3;
        const distance = 40 + layer * 25 + Math.random() * 15;
        const x = 150 + Math.cos(angle) * distance;
        const y = 200 - Math.sin(angle) * distance * 0.6;
        leafPositions.push({ x, y });
    }

    // Draw leaves
    leafPositions.forEach((pos, index) => {
        const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        leaf.setAttribute('class', 'choice-tree-leaf');
        leaf.setAttribute('cx', pos.x);
        leaf.setAttribute('cy', pos.y);
        leaf.setAttribute('r', '8');
        leaf.style.animationDelay = `${index * 0.05}s`;

        const colors = ['#9BC4A7', '#7EA88B', '#C9A857'];
        leaf.style.fill = colors[index % 3];
        leavesGroup.appendChild(leaf);
    });

    // Draw branches
    function addBranch(x1, y1, x2, y2) {
        const branch = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        branch.setAttribute('class', 'choice-tree-branch');
        branch.setAttribute('x1', x1);
        branch.setAttribute('y1', y1);
        branch.setAttribute('x2', x2);
        branch.setAttribute('y2', y2);
        branchesGroup.appendChild(branch);
    }

    if (count > 0) {
        addBranch(150, 250, 120, 180);
        addBranch(150, 250, 180, 180);
    }
    if (count > 5) {
        addBranch(120, 180, 90, 140);
        addBranch(180, 180, 210, 140);
    }
    if (count > 10) {
        addBranch(90, 140, 70, 100);
        addBranch(210, 140, 230, 100);
    }
}

function renderChoiceHistory() {
    const choices = JSON.parse(localStorage.getItem(CHOICE_STORAGE_KEY) || '[]');
    const container = document.getElementById('choice-list-container');

    if (choices.length === 0) {
        container.innerHTML = `
            <div class="tool-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <p>No choices tracked yet. Start noticing today.</p>
            </div>
        `;
        return;
    }

    const html = choices
        .slice()
        .reverse()
        .map(choice => `
            <div class="choice-item">
                <div class="choice-date">${choice.date}</div>
                <div class="choice-text">${choice.text}</div>
            </div>
        `)
        .join('');

    container.innerHTML = `<div class="choice-list">${html}</div>`;
}

// ============================================
// VALUES TOOL
// ============================================

function initValues() {
    setupValuesViewToggle();
    setupValuesPresets();
    setupValuesCustomInput();
    setupValuesSave();
    renderValuesTodayView();
}

function setupValuesViewToggle() {
    document.querySelectorAll('[data-values-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.valuesView;
            document.querySelectorAll('[data-values-view]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.getElementById('values-today-view').classList.toggle('active', view === 'today');
            document.getElementById('values-chart-view').classList.toggle('active', view === 'chart');
            document.getElementById('values-setup-view').classList.toggle('active', view === 'setup');

            if (view === 'today') renderValuesTodayView();
            if (view === 'chart') renderValuesChart();
            if (view === 'setup') loadValuesSetupView();
        });
    });
}

function setupValuesPresets() {
    document.getElementById('values-preset-grid').addEventListener('click', (e) => {
        if (e.target.classList.contains('values-preset-btn')) {
            e.target.classList.toggle('selected');
        }
    });
}

function setupValuesCustomInput() {
    document.getElementById('values-add-custom').addEventListener('click', () => {
        const input = document.getElementById('values-custom-input');
        const value = input.value.trim();
        if (!value) return;

        const presetContainer = document.getElementById('values-preset-grid');
        const btn = document.createElement('button');
        btn.className = 'values-preset-btn selected';
        btn.dataset.value = value;
        btn.textContent = value;
        presetContainer.appendChild(btn);
        input.value = '';
    });
}

function setupValuesSave() {
    // Save values setup
    document.getElementById('values-save-values-btn').addEventListener('click', () => {
        const selectedButtons = document.querySelectorAll('.values-preset-btn.selected');
        const values = Array.from(selectedButtons).map(btn => btn.dataset.value);

        if (values.length < 3) {
            alert('Please select at least 3 values');
            return;
        }
        if (values.length > 6) {
            alert('Please select no more than 6 values');
            return;
        }

        localStorage.setItem(VALUES_STORAGE_KEY, JSON.stringify(values));

        // Feedback
        const btn = document.getElementById('values-save-values-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Values Saved ✓';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);

        renderValuesTodayView();
    });

    // Save today's alignment
    document.getElementById('values-save-btn').addEventListener('click', () => {
        const values = JSON.parse(localStorage.getItem(VALUES_STORAGE_KEY) || '[]');
        const alignmentData = JSON.parse(localStorage.getItem(VALUES_ALIGNMENT_KEY) || '{}');
        const today = getTodayKey();

        const todayScores = {};
        values.forEach(value => {
            const slider = document.querySelector(`.value-slider[data-value="${value}"]`);
            if (slider) {
                todayScores[value] = parseInt(slider.value);
            }
        });

        alignmentData[today] = todayScores;
        localStorage.setItem(VALUES_ALIGNMENT_KEY, JSON.stringify(alignmentData));

        // Feedback
        const btn = document.getElementById('values-save-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Saved ✓';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);

        renderValuesChart();
    });
}

function loadValuesSetupView() {
    const values = JSON.parse(localStorage.getItem(VALUES_STORAGE_KEY) || '[]');
    const buttons = document.querySelectorAll('.values-preset-btn');

    buttons.forEach(btn => btn.classList.remove('selected'));

    values.forEach(value => {
        const btn = document.querySelector(`.values-preset-btn[data-value="${value}"]`);
        if (btn) btn.classList.add('selected');
    });
}

function renderValuesTodayView() {
    const values = JSON.parse(localStorage.getItem(VALUES_STORAGE_KEY) || '[]');
    const container = document.getElementById('values-today-list');
    const saveBtn = document.getElementById('values-save-btn');

    if (values.length === 0) {
        container.innerHTML = `
            <p class="tool-empty-state" style="padding: 1rem;">
                Set up your values first to start tracking
            </p>
        `;
        saveBtn.style.display = 'none';
        return;
    }

    const alignmentData = JSON.parse(localStorage.getItem(VALUES_ALIGNMENT_KEY) || '{}');
    const today = getTodayKey();
    const todayScores = alignmentData[today] || {};

    const html = values.map(value => `
        <div class="value-item">
            <div class="value-header">
                <span class="value-name">${value}</span>
                <span class="value-score" id="score-${value.replace(/\s+/g, '-')}">
                    ${todayScores[value] !== undefined ? todayScores[value] + '%' : '50%'}
                </span>
            </div>
            <input
                type="range"
                min="0"
                max="100"
                value="${todayScores[value] !== undefined ? todayScores[value] : 50}"
                class="value-slider"
                data-value="${value}"
            >
            <div class="value-slider-labels">
                <span>Not at all</span>
                <span>Completely</span>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
    saveBtn.style.display = 'block';

    // Add slider listeners
    document.querySelectorAll('.value-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const value = e.target.dataset.value;
            const score = e.target.value;
            const scoreEl = document.getElementById(`score-${value.replace(/\s+/g, '-')}`);
            if (scoreEl) scoreEl.textContent = score + '%';
        });
    });
}

function renderValuesChart() {
    const values = JSON.parse(localStorage.getItem(VALUES_STORAGE_KEY) || '[]');
    const alignmentData = JSON.parse(localStorage.getItem(VALUES_ALIGNMENT_KEY) || '{}');
    const today = getTodayKey();
    const todayScores = alignmentData[today] || {};

    if (values.length === 0) return;

    const center = 150;
    const maxRadius = 120;
    const angleStep = (2 * Math.PI) / values.length;

    const axesGroup = document.getElementById('values-axes');
    const labelsGroup = document.getElementById('values-labels');
    axesGroup.innerHTML = '';
    labelsGroup.innerHTML = '';

    // Draw axes and labels
    values.forEach((value, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + Math.cos(angle) * maxRadius;
        const y = center + Math.sin(angle) * maxRadius;

        // Axis line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'values-radar-axis');
        line.setAttribute('x1', center);
        line.setAttribute('y1', center);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y);
        axesGroup.appendChild(line);

        // Label
        const labelX = center + Math.cos(angle) * (maxRadius + 20);
        const labelY = center + Math.sin(angle) * (maxRadius + 20);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('class', 'values-label');
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY);
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = value;
        labelsGroup.appendChild(text);
    });

    // Draw data shape
    const points = values.map((value, i) => {
        const score = todayScores[value] !== undefined ? todayScores[value] : 0;
        const radius = (score / 100) * maxRadius;
        const angle = i * angleStep - Math.PI / 2;
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        return `${x},${y}`;
    }).join(' ');

    document.getElementById('values-data-shape').setAttribute('points', points);

    // Calculate average
    const scores = Object.values(todayScores);
    const avg = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    document.getElementById('values-avg-score').textContent = avg + '%';
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
    setupToolPanels();
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
