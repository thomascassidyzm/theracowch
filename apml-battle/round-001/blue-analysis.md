# BLUE ANALYSIS: Cowch Application Structure

## Executive Summary

Cowch is a vanilla JavaScript PWA (Progressive Web App) providing AI-powered CBT (Cognitive Behavioral Therapy) wellness support. The application features a chat interface with "Mandy" (an AI therapist persona), the IMAGINE wellness framework, and personal tracking tools.

**Stack**: Vanilla JS, HTML5, CSS3 with CSS Variables, Vercel Serverless Functions, Claude API

---

## 1. Data Models

### 1.1 ConversationHistory
```
Type: Array<Message>
Storage: localStorage['theracowch_chat_history']
Max Size: Unbounded (trimmed on load to 100)

Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: ISO8601
}
```

### 1.2 TherapyProfile
```
Type: Object (Compressed Context)
Storage: localStorage['cowch_therapy_profile']

Profile {
  version: number
  created: ISO8601
  updated: ISO8601
  sessionCount: number
  messageCount: number

  patterns: string[]              // ["perfectionism", "anxiety"]
  patternStrength: {[key]: 1-5}

  imagine: {
    I: number,   // Self-care engagement
    M: number,   // Mindfulness
    A: number,   // Acceptance
    G: number,   // Gratitude
    I2: number,  // Interactions
    N: number,   // Nurturing
    E: number    // Exploring
  }

  insights: string[]              // Max 10, rotated
  activeThemes: string[]
  strengths: string[]

  preferences: {
    respondsTo: string[]
    avoids: string[]
  }

  lastSession: {
    date: ISO8601 | null
    summary: string | null
    mood: string | null
  }

  lastCompression: ISO8601 | null
  messagesSinceCompression: number
}
```

### 1.3 Notice Tool Data
```
Storage: localStorage['cowch_notices']
Type: {[dateKey]: NoticeEntry}

NoticeEntry {
  color: string (hex)
  energy: number (0-100)
  text: string
  prompt: string
}
```

### 1.4 Choice Tool Data
```
Storage: localStorage['cowch_choices']
Type: Array<Choice>

Choice {
  text: string
  timestamp: ISO8601
  date: string (formatted)
}
```

### 1.5 Values Tool Data
```
Storage: localStorage['cowch_values'] -> string[]
Storage: localStorage['cowch_values_alignment'] -> {[dateKey]: {[value]: 0-100}}
```

### 1.6 IMAGINE Engagement
```
Storage: localStorage['cowch_imagine_engagement']
Type: {[letter]: timestamp[]}  // Last 30 days only
```

---

## 2. UI Component Hierarchy

```
app.html
├── AppContainer
│   ├── TabBar (fixed bottom)
│   │   ├── HomeTab
│   │   ├── IMAGINETab
│   │   ├── ChatTab
│   │   └── YouTab
│   │
│   ├── TabContent
│   │   ├── HomePanel
│   │   │   ├── GreetingSection (dynamic time-based)
│   │   │   ├── DailyQuoteCard
│   │   │   ├── QuickActions
│   │   │   │   ├── ChatWithMandy (primary)
│   │   │   │   └── QuickCheckin
│   │   │   ├── ExerciseCards (2x2 grid)
│   │   │   └── IMAGINEMiniPreview
│   │   │
│   │   ├── IMAGINEPanel
│   │   │   ├── IMAGINEHeader
│   │   │   ├── DomainCards (7x)
│   │   │   │   └── DomainCard → navigates to domain page
│   │   │   └── ExercisesCTA
│   │   │
│   │   ├── ChatPanel
│   │   │   ├── ChatHeader
│   │   │   ├── ChatMessages
│   │   │   │   ├── WelcomeMessage (conditional)
│   │   │   │   ├── Message (user | mandy)
│   │   │   │   └── TypingIndicator
│   │   │   └── ChatInputArea
│   │   │       ├── ChatInput (textarea)
│   │   │       └── SendButton
│   │   │
│   │   └── YouPanel
│   │       ├── YouHeader
│   │       ├── ProgressCard
│   │       ├── ToolsSection
│   │       │   ├── NoticeCard → opens NoticeTool
│   │       │   ├── ChoiceCard → opens ChoiceTool
│   │       │   └── ValuesCard → opens ValuesTool
│   │       └── SettingsSection
│   │           ├── PrivacyButton
│   │           ├── InstallButton (iOS conditional)
│   │           ├── AboutButton
│   │           └── ClearHistoryButton
│   │
│   └── SlideInPanels
│       ├── DomainPanel (domain details + exercises)
│       ├── NoticeTool
│       │   ├── TodayView (color picker, energy slider, text)
│       │   └── TimelineView (calendar grid)
│       ├── ChoiceTool
│       │   ├── TodayView (text input)
│       │   ├── TreeView (SVG visualization)
│       │   └── HistoryView (list)
│       ├── ValuesTool
│       │   ├── TodayView (sliders per value)
│       │   ├── ChartView (radar chart SVG)
│       │   └── SetupView (preset selection)
│       └── ExercisesPanel (full exercise library)

chat.html
├── Header
│   ├── MenuButton → MenuPanel
│   ├── Title
│   └── NewChatButton
├── PromptBanner (conditional on-demand prompt)
├── ChatMessages
├── QuickPrompts (horizontal scroll)
├── ChatInputContainer
├── TabBar
│
├── MenuPanel (slide)
│   ├── Home link
│   ├── IMAGINE Framework
│   ├── Exercise Library
│   ├── Privacy & Safety
│   └── Clear Chat
│
├── IMAGINEPanel (slide)
├── ExercisePanel (slide)
│
└── ExerciseModals
    ├── BreathingModal (box breathing)
    ├── GroundingModal (5-4-3-2-1)
    ├── PMRModal (body diagram)
    ├── LadderModal (uncertainty ladder)
    ├── SocialModal (pulse check)
    └── WeatherModal (inner weather)
```

---

## 3. Logic Flows

### 3.1 Message Send Flow
```
User types → Input changes → Enable send button
User clicks send OR presses Enter
  → Get message text
  → Clear input
  → Add user message to UI
  → Push to conversationHistory
  → Save to localStorage
  → Show typing indicator
  → Build API context (profile + recent messages)
  → POST /api/chat
  → Receive response
  → Remove typing indicator
  → Type out response character-by-character
  → Add to conversationHistory
  → Generate quick replies (optional)
  → Check if compression needed
  → Save history
```

### 3.2 Tab Navigation Flow
```
User clicks tab button
  → Get tab ID from data-tab
  → Update button active states
  → Update panel visibility (toggle .active class)
  → Focus chat input if switching to chat
  → Update URL hash (history.replaceState)
```

### 3.3 Domain Panel Flow
```
User clicks domain card
  → Get domain key from data-domain
  → Look up domain in DOMAIN_PAGES mapping
  → Navigate to domain page (window.location.href)

OR (fallback for unmapped):
  → Look up domain in IMAGINE_DOMAINS
  → Populate panel with title, subtitle, description
  → Generate exercise cards HTML
  → Add click handlers for each exercise
  → Show panel (.active class)
```

### 3.4 Exercise Modal Flow (e.g., Box Breathing)
```
User opens modal
  → Show modal (.active class)
  → Set initial instruction text

User clicks Start
  → Begin breathing cycle
  → Animate circle (scale/color transitions)
  → Update instruction text for each phase:
    - "Breathe in..." (4 sec)
    - "Hold..." (4 sec)
    - "Breathe out..." (4 sec)
    - "Hold..." (4 sec)
  → Repeat for N cycles
  → Show completion message
  → Record IMAGINE engagement (M domain)
```

### 3.5 Profile Compression Flow
```
After each message:
  → Increment messagesSinceCompression
  → Check if >= COMPRESS_AFTER_MESSAGES (8)

If compression needed:
  → Build compression prompt with recent messages
  → POST /api/compress-profile
  → Parse JSON response
  → Merge patterns, insights, strengths into profile
  → Reset compression counter
  → Increment sessionCount
  → Save profile
```

### 3.6 Pattern Detection Flow
```
On user message:
  → Lowercase message
  → Regex match for keywords:
    - anxiety: /anxious|anxiety|worry|nervous|panic|fear|scared/
    - depression: /sad|depressed|down|worthless|hopeless/
    - relationships: /relationship|partner|family|friend/
    - trauma: /childhood|trauma|abuse|past/
    - perfectionism: /perfect|mistake|failure|should|must/
    - stress: /stress|overwhelmed|pressure|burnout/
  → Return dominant pattern
  → Include in API response for context
```

### 3.7 Tool Panel Flows (Notice, Choice, Values)

#### Notice
```
Open panel → Load today's notice (if exists) → Set color/energy/text
User selects color → Store in noticeSelectedColor
User adjusts energy slider → Update slider
User types text → Update textarea
User clicks Save:
  → Build notice object {color, energy, text, prompt}
  → Save to localStorage[today_key]
  → Show confirmation feedback

Timeline view:
  → Load all notices from storage
  → Generate calendar grid for current month
  → Color cells based on notice.color
  → Click cell → alert with details
```

---

## 4. External Integrations

### 4.1 Chat API (/api/chat)
```
Request:
  POST /api/chat
  Body: {
    message: string
    profile?: CompressedProfile
    recentMessages?: Message[]
    history?: Message[]  // fallback
    currentPattern?: string
    sessionPhase?: string
  }

Response:
  {
    response: string
    pattern: string
    timestamp: ISO8601
    sessionPhase: string
  }

Backend:
  → Fetch IMAGINE framework prompts (cached 2hr)
  → Build system prompt with profile context
  → Call Anthropic Claude API (claude-sonnet-4-20250514)
  → Detect pattern from user message
  → Return formatted response
```

### 4.2 Compress Profile API (/api/compress-profile)
```
Request:
  POST /api/compress-profile
  Body: {
    prompt: string  // Full compression prompt with context
  }

Response:
  {
    compressed: string  // JSON string with profile updates
  }
```

### 4.3 Blog Quotes API (/api/blog-quotes)
```
External fetch for daily quotes rotation (not main flow)
```

---

## 5. State Management

### Global State Variables (app.js)
```javascript
let conversationHistory = []    // Current chat messages
let isTyping = false            // Prevent double-send
```

### Global State Variables (chat-script.js)
```javascript
let conversationHistory = []    // Chat messages
let isTyping = false            // Send lock
let currentPrompt = null        // Active on-demand prompt
```

### DOM Element References
```javascript
// Cached on DOMContentLoaded
let app, tabBtns, tabPanels
let chatInput, chatSendBtn, chatMessages, greetingText
// ... many more modal/panel references
```

### Window-attached Modules
```javascript
window.TherapyProfile = { ... }  // Profile management API
window.MandyPrompts = { ... }    // On-demand prompt system
```

---

## 6. Styling System

### CSS Variables (variables.css)
- **Typography**: Gabarito font, size scale, weight scale
- **Colors**: Dark warm palette, coral accent, text colors
- **Spacing**: 8-point grid (xs→3xl)
- **Borders**: Brutalist thick borders (5px, 3px, 2px)
- **Radii**: Chunky rounded corners (32px, 24px, 16px)
- **Shadows**: Offset brutalist shadows
- **Transitions**: Bounce/brutal timing functions

### Animation Keyframes
- slideDown, slideRight, slideUp
- fadeIn, pulse, float
- typingBounce (for chat indicator)

---

## 7. Key Patterns Identified

1. **DOM-centric State**: State primarily in localStorage + DOM classes
2. **Event Delegation**: Mix of direct listeners and delegated handlers
3. **Async Character Typing**: Novel UX pattern for AI message reveal
4. **Profile Compression**: LLM-powered context summarization
5. **Time-based Content**: Greetings, quotes, prompts change by time
6. **Multi-modal Exercises**: Interactive breathing/grounding with timers
7. **SVG Visualizations**: Tree growth, radar charts, body diagrams
8. **Pull-to-refresh**: Touch gesture for prompt generation
9. **Haptic Feedback**: vibrate() API for native feel
10. **iOS PWA Handling**: Safe areas, keyboard detection, standalone mode

---

## 8. Files Analyzed

| File | Lines | Purpose |
|------|-------|---------|
| public/assets/js/app.js | ~1360 | Main app logic |
| public/assets/chat-script.js | ~2000+ | Chat page logic |
| public/assets/js/therapy-profile.js | ~304 | Profile compression |
| public/assets/on-demand-prompts.js | ~426 | Prompt generation |
| api/chat.js | ~287 | Serverless chat API |
| public/app.html | ~2400 | Main app markup |
| public/chat.html | ~1340 | Chat page markup |
| public/assets/css/variables.css | ~202 | Design tokens |

---

## Next Steps

With this analysis complete, the next phase is reverse-compiling this application into APML (Application Programming Markup Language) to express the **intent** behind each component, data model, and behavior.
