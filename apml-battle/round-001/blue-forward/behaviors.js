/**
 * APML Forward Compilation: Behaviors
 * Generated from: blue-reverse.apml
 *
 * This file implements the behaviors/flows defined in the APML specification.
 */

// ==========================================
// Behavior: time-based-greeting (computed)
// ==========================================

function computeTimeBasedGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 17) {
    return 'Good afternoon';
  } else if (hour < 21) {
    return 'Good evening';
  } else {
    return 'Time to wind down';
  }
}

// ==========================================
// Behavior: haptic (utility)
// ==========================================

const HAPTIC_PATTERNS = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 20],
  error: [30, 50, 30, 50, 30]
};

function hapticFeedback(style) {
  // Platform check from APML spec
  if (!navigator.vibrate) {
    return;
  }

  const pattern = HAPTIC_PATTERNS[style];
  if (pattern) {
    navigator.vibrate(pattern);
  }
}

// ==========================================
// Behavior: detect-pattern (function)
// ==========================================

const PATTERN_KEYWORDS = {
  anxiety: /\b(anxious|anxiety|worry|worried|nervous|panic|fear|scared)\b/i,
  depression: /\b(sad|depressed|depression|down|hopeless|worthless|empty|numb)\b/i,
  relationships: /\b(relationship|partner|husband|wife|boyfriend|girlfriend|family|friend)\b/i,
  trauma: /\b(childhood|trauma|abuse|past|triggered|flashback)\b/i,
  perfectionism: /\b(perfect|perfectionism|mistake|failure|should|must|not good enough)\b/i,
  stress: /\b(stress|stressed|overwhelmed|pressure|too much|burnout)\b/i
};

function detectPattern(text) {
  const lower = text.toLowerCase();
  const scores = {};

  for (const [pattern, regex] of Object.entries(PATTERN_KEYWORDS)) {
    const matches = lower.match(new RegExp(regex, 'gi'));
    scores[pattern] = matches ? matches.length : 0;
  }

  // Find highest scored pattern
  let maxPattern = 'general';
  let maxScore = 0;

  for (const [pattern, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxPattern = pattern;
      maxScore = score;
    }
  }

  return {
    pattern: maxPattern,
    confidence: maxScore
  };
}

// ==========================================
// Behavior: type-message (effect)
// ==========================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeMessage(content, targetElement, options = {}) {
  const {
    speed = 12,
    scrollTarget = null,
    onComplete = null
  } = options;

  // Parse markdown to DOM nodes
  const parsed = parseMarkdown(content);

  // Recursively type nodes
  await typeNodes(targetElement, parsed, speed, scrollTarget);

  if (onComplete) {
    onComplete();
  }
}

function parseMarkdown(content) {
  // Create temporary div to parse
  const temp = document.createElement('div');
  let formatted = content;

  // Process line by line for lists and headers
  const lines = formatted.split('\n');
  const processedLines = [];
  let inList = false;

  for (let line of lines) {
    // Horizontal rules
    if (line.match(/^([-_*]){3,}$/)) {
      line = '<hr>';
    }
    // Headers
    else if (line.match(/^#{1,3}\s+/)) {
      const level = line.match(/^#{1,3}/)[0].length;
      const text = line.replace(/^#{1,3}\s+/, '');
      line = `<h${level + 2}>${text}</h${level + 2}>`;
    }
    // Unordered lists
    else if (line.match(/^[-*]\s+/)) {
      const text = line.replace(/^[-*]\s+/, '');
      if (!inList) {
        line = '<ul><li>' + text + '</li>';
        inList = true;
      } else {
        line = '<li>' + text + '</li>';
      }
    }
    else if (inList && line.trim() !== '') {
      processedLines.push('</ul>');
      inList = false;
    }

    processedLines.push(line);
  }

  if (inList) {
    processedLines.push('</ul>');
  }

  formatted = processedLines.join('\n');

  // Bold and italic
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/(?<![*_])\*(?!\*)([^*]+)\*(?![*_])/g, '<em>$1</em>');
  formatted = formatted.replace(/(?<![*_])_(?!_)([^_]+)_(?![*_])/g, '<em>$1</em>');

  // Paragraphs
  formatted = formatted.split('\n\n').map(p => {
    if (p.match(/^<(h[3-5]|ul|li|hr)/)) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  temp.innerHTML = formatted;
  return Array.from(temp.childNodes);
}

async function typeNodes(targetParent, nodes, speed, scrollTarget) {
  for (let node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      // Text node - type character by character
      const text = node.textContent;
      const textNode = document.createTextNode('');
      targetParent.appendChild(textNode);

      for (let i = 0; i < text.length; i++) {
        textNode.textContent += text[i];

        if (scrollTarget) {
          scrollTarget.scrollTop = scrollTarget.scrollHeight;
        }

        // Natural pauses at punctuation (from APML spec)
        const char = text[i];
        let delay = speed;

        if (char === '.' || char === '!' || char === '?') {
          delay = 150; // sentence-end
        } else if (char === ',' || char === ':' || char === ';') {
          delay = 80; // clause-end
        } else if (char === '\n') {
          delay = 100;
        } else if (char === ' ') {
          delay = Math.round(speed * 1.25);
        }

        await sleep(delay);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Element node - recreate and type children
      const element = document.createElement(node.nodeName);

      // Copy attributes
      for (let attr of node.attributes || []) {
        element.setAttribute(attr.name, attr.value);
      }

      targetParent.appendChild(element);

      // Recursively type children
      await typeNodes(element, Array.from(node.childNodes), speed, scrollTarget);
    }
  }
}

// ==========================================
// Behavior: send-message (flow)
// ==========================================

async function sendMessageFlow(context) {
  const {
    chatInput,
    chatMessages,
    sendButton,
    conversationHistory,
    isTypingRef,
    onHistoryUpdate,
    onTypingStateChange
  } = context;

  // Preconditions
  const message = chatInput.value.trim();
  if (!message) return;
  if (isTypingRef.current) return;

  // Step: capture-input
  chatInput.value = '';
  hapticFeedback('light');

  // Step: add-user-message
  const userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'message user';
  userMessageDiv.textContent = message;
  chatMessages.appendChild(userMessageDiv);

  const userMessage = { role: 'user', content: message };
  conversationHistory.push(userMessage);
  onHistoryUpdate(conversationHistory);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Step: show-typing
  isTypingRef.current = true;
  onTypingStateChange(true);
  sendButton.disabled = true;

  const typingDiv = document.createElement('div');
  typingDiv.className = 'message mandy typing';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Step: call-api
  try {
    const profile = window.APMLModels?.TherapyProfile.load() || {};
    const apiContext = window.APMLModels?.TherapyProfile.buildAPIContext(profile, conversationHistory) || {};

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        profile: apiContext.profile,
        recentMessages: apiContext.recentMessages
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();

    // Step: display-response
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }

    const assistantMessageDiv = document.createElement('div');
    assistantMessageDiv.className = 'message mandy';
    chatMessages.appendChild(assistantMessageDiv);

    await typeMessage(data.response, assistantMessageDiv, {
      speed: 12,
      scrollTarget: chatMessages
    });

    const assistantMessage = { role: 'assistant', content: data.response };
    conversationHistory.push(assistantMessage);
    onHistoryUpdate(conversationHistory);

    // Step: cleanup
    isTypingRef.current = false;
    onTypingStateChange(false);
    sendButton.disabled = false;
    chatInput.focus();

    // Check compression
    if (window.APMLModels?.TherapyProfile) {
      const currentProfile = window.APMLModels.TherapyProfile.load();
      currentProfile.messagesSinceCompression += 2; // user + assistant
      currentProfile.messageCount += 2;
      window.APMLModels.TherapyProfile.save(currentProfile);

      if (window.APMLModels.TherapyProfile.needsCompression(currentProfile)) {
        await compressProfileFlow(conversationHistory, currentProfile);
      }
    }

  } catch (error) {
    console.error('Chat API Error:', error);

    // Error handling
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'message mandy';
    errorDiv.textContent = "I'm having trouble connecting right now. Please try again in a moment.";
    chatMessages.appendChild(errorDiv);

    isTypingRef.current = false;
    onTypingStateChange(false);
    sendButton.disabled = false;
  }
}

// ==========================================
// Behavior: compress-profile (async-flow)
// ==========================================

async function compressProfileFlow(conversationHistory, profile) {
  try {
    const recentMessages = conversationHistory.slice(-8);

    // Build compression prompt
    const prompt = `You are updating a therapy profile for a wellness app user. Analyze these recent messages and update the profile.

CURRENT PROFILE:
${JSON.stringify(profile, null, 2)}

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

    const response = await fetch('/api/compress-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error('Compression failed');
    }

    const data = await response.json();
    const updates = JSON.parse(data.compressed);

    // Merge and save
    const mergedProfile = window.APMLModels.TherapyProfile.mergeCompressionResult(profile, updates);
    window.APMLModels.TherapyProfile.save(mergedProfile);

    console.log('Profile compressed successfully');

  } catch (e) {
    console.warn('Profile compression failed:', e);
    // Don't block - fail silently as per APML spec
  }
}

// ==========================================
// Behavior: switch-tab (flow)
// ==========================================

function switchTabFlow(event, context) {
  const { tabButtons, tabPanels, onTabChange } = context;

  // Get target tab
  const button = event.currentTarget;
  const tabId = button.dataset.tab;

  // Update button states
  tabButtons.forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');

  // Update panel visibility
  tabPanels.forEach(panel => panel.classList.remove('active'));
  const targetPanel = document.getElementById(`tab-${tabId}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  // Post-switch actions
  if (tabId === 'chat') {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
      setTimeout(() => chatInput.focus(), 100);
    }
  }

  // Update URL hash
  history.replaceState(null, null, `#${tabId}`);

  if (onTabChange) {
    onTabChange(tabId);
  }
}

// ==========================================
// Behavior: box-breathing-exercise (interactive)
// ==========================================

class BoxBreathingExercise {
  constructor(config = {}) {
    this.cycles = config.cycles || 4;
    this.duration = config.duration || 4000;
    this.currentPhase = 'ready';
    this.currentCycle = 0;
    this.isRunning = false;

    // Callbacks
    this.onPhaseChange = config.onPhaseChange || (() => {});
    this.onComplete = config.onComplete || (() => {});
    this.onCycleUpdate = config.onCycleUpdate || (() => {});
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.currentCycle = 0;

    while (this.currentCycle < this.cycles && this.isRunning) {
      // Inhale
      this.currentPhase = 'inhale';
      this.onPhaseChange('inhale', 'Breathe in...');
      await this.wait(this.duration);

      if (!this.isRunning) break;

      // Hold in
      this.currentPhase = 'hold-in';
      this.onPhaseChange('hold-in', 'Hold...');
      await this.wait(this.duration);

      if (!this.isRunning) break;

      // Exhale
      this.currentPhase = 'exhale';
      this.onPhaseChange('exhale', 'Breathe out...');
      await this.wait(this.duration);

      if (!this.isRunning) break;

      // Hold out
      this.currentPhase = 'hold-out';
      this.onPhaseChange('hold-out', 'Hold...');
      await this.wait(this.duration);

      if (!this.isRunning) break;

      this.currentCycle++;
      this.onCycleUpdate(this.currentCycle, this.cycles);
    }

    if (this.isRunning) {
      this.currentPhase = 'complete';
      this.onPhaseChange('complete', 'Well done! Take a moment to notice how you feel.');

      // Record IMAGINE engagement (M domain)
      if (window.APMLModels?.ImagineEngagement) {
        window.APMLModels.ImagineEngagement.record('M');
      }

      hapticFeedback('success');
      this.onComplete();
    }

    this.isRunning = false;
  }

  stop() {
    this.isRunning = false;
  }

  reset() {
    this.stop();
    this.currentPhase = 'ready';
    this.currentCycle = 0;
    this.onPhaseChange('ready', 'Ready to begin?');
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==========================================
// Behavior: save-notice (flow)
// ==========================================

function saveNoticeFlow(context) {
  const {
    colorInput,
    energySlider,
    textInput,
    promptElement,
    saveButton
  } = context;

  // Gather data
  const color = colorInput.value || colorInput.dataset.selected;
  const energy = parseInt(energySlider.value, 10);
  const text = textInput.value.trim();
  const prompt = promptElement.textContent;

  // Validate (precondition)
  if (!color && !text) {
    return false;
  }

  // Save
  if (window.APMLModels?.NoticeEntry) {
    window.APMLModels.NoticeEntry.save({
      color,
      energy,
      text,
      prompt
    });
  }

  // Feedback
  const originalText = saveButton.textContent;
  saveButton.textContent = 'Saved';
  saveButton.disabled = true;

  setTimeout(() => {
    saveButton.textContent = originalText;
    saveButton.disabled = false;
  }, 2000);

  return true;
}

// ==========================================
// Exports
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    computeTimeBasedGreeting,
    hapticFeedback,
    detectPattern,
    typeMessage,
    sendMessageFlow,
    compressProfileFlow,
    switchTabFlow,
    BoxBreathingExercise,
    saveNoticeFlow
  };
}

// Browser global
if (typeof window !== 'undefined') {
  window.APMLBehaviors = {
    computeTimeBasedGreeting,
    hapticFeedback,
    detectPattern,
    typeMessage,
    sendMessageFlow,
    compressProfileFlow,
    switchTabFlow,
    BoxBreathingExercise,
    saveNoticeFlow
  };
}
