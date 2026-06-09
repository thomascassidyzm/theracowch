// ============================================
// Cowch App - Core JavaScript
// ============================================

// DOM Elements (initialized after DOM ready)
// Note: chatInput and chatMessages are owned by chat-script.js
let app, tabBtns, tabPanels;
let appChatInput, chatSendBtn, greetingText;

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
        setTimeout(() => { if (appChatInput) appChatInput.focus(); }, 100);
    }

    // Refresh the Your-Space cards whenever the user lands on it — picks up
    // anything completed earlier this session, and grows the pasture if it's
    // a new day.
    if (tabId === 'you') {
        if (typeof updateYourSpaceGreeting === 'function') updateYourSpaceGreeting();
        if (typeof updatePastureUI         === 'function') updatePastureUI();
        if (typeof updateWeeklySummaryUI   === 'function') updateWeeklySummaryUI();
        if (typeof updatePatternsUI        === 'function') updatePatternsUI();
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

// Handle URL hash navigation
function handleHashNavigation() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;

    // Tab navigation
    if (['home', 'imagine', 'chat', 'you'].includes(hash)) {
        switchTab(hash);
        return;
    }

    // Chat-specific hashes
    if (hash === 'privacy') {
        switchTab('chat');
        setTimeout(() => { if (window.handlePrivacyInfo) window.handlePrivacyInfo(); }, 200);
        history.replaceState(null, null, '#chat');
    } else if (hash === 'exercises') {
        switchTab('chat');
        setTimeout(() => {
            const ep = document.getElementById('exercise-panel');
            if (ep) ep.classList.add('active');
        }, 200);
        history.replaceState(null, null, '#chat');
    } else if (hash.startsWith('exercise-')) {
        const type = hash.replace('exercise-', '');
        switchTab('chat');
        setTimeout(() => { if (window.openInteractiveExercise) window.openInteractiveExercise(type); }, 300);
        history.replaceState(null, null, '#chat');
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
// Daily Quotes
// ============================================

const MANDY_QUOTES = [
    "Sometimes the bravest thing we can do is simply show up for ourselves. You're here, and that matters.",
    "You don't have to have it all figured out. Taking one small step is enough.",
    "Your feelings are valid, even the messy ones. They're part of being human.",
    "Rest isn't a reward for productivity. It's a basic need, and you deserve it.",
    "You've survived 100% of your hardest days so far. That's remarkable.",
    "Progress isn't always visible. Sometimes growth happens in the quiet moments.",
    "Be gentle with yourself today. You're doing harder things than anyone knows.",
    "It's okay to not be okay. What matters is that you're still here, still trying.",
    "Your worth isn't measured by what you accomplish. You matter just as you are.",
    "Small moments of peace add up. Even one deep breath is a gift to yourself.",
    "You don't have to earn rest or joy. They're already yours to claim.",
    "Some days just showing up is the victory. And that's more than enough.",
    "Healing isn't linear. It's okay to have setbacks while moving forward.",
    "The fact that you're looking after yourself right now? That takes courage.",
    "You're allowed to outgrow old versions of yourself. Change is natural.",
    "Not every day needs to be productive. Some days are for simply being.",
    "Your struggles don't define you, but how you treat yourself through them does.",
    "It's okay to ask for help. Strength includes knowing when you need support.",
    "You're not behind in life. You're exactly where you need to be right now.",
    "Every emotion you feel is trying to tell you something. Listen gently."
];

function updateDailyQuote() {
    const quoteElement = document.getElementById('daily-thought-text');
    if (quoteElement) {
        // Stable for the whole day so it really is a "thought for the day"
        // rather than changing on every reload.
        const idx = getEpochDays() % MANDY_QUOTES.length;
        quoteElement.textContent = MANDY_QUOTES[idx];
    }
}

// The home cloud shows only a "Mandy's thought for the day…" teaser; tapping it
// opens the full thought in a modal. Closing is handled by the global
// .close-modal handler (the X) and by tapping the backdrop here.
function setupDailyThought() {
    const cloud = document.getElementById('daily-thought');
    const modal = document.getElementById('thought-modal');
    if (!cloud || !modal) return;

    const open = function () { modal.classList.add('active'); };
    cloud.addEventListener('click', open);
    cloud.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });

    // Tap outside the card (on the dimmed backdrop) to dismiss.
    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.classList.remove('active');
    });
}

// ============================================
// Daily IMAGINE Suggested Exercise
// Cycles I → M → A → G → I → N → E day by day; each day picks a curated
// exercise from that letter's pool, so the user moves methodically through
// the whole framework over the course of a week and then revisits with
// fresh exercises the next time round.
// ============================================
const IMAGINE_DAILY = [
    { letter: 'I', domain: 'I, Me, Myself',  domainHref: '/imagine/self.html',
      exercises: [
          { name: 'Self-compassion break', href: '/exercises/self-compassion.html' },
          { name: 'Inner child check-in',  href: '/exercises/inner-child-work.html' },
          { name: 'Trigger mapping',       href: '/exercises/trigger-mapping.html' },
          { name: 'Pick an oracle card',   href: '/exercises/oracle-cards.html' }
      ]
    },
    { letter: 'M', domain: 'Mindfulness', domainHref: '/imagine/mindfulness.html',
      exercises: [
          { name: 'Box breathing (4×4×4×4)',  href: '/exercises/box-breathing.html' },
          { name: '5-minute body scan',       href: '/exercises/body-scan.html' },
          { name: '5-4-3-2-1 grounding',      href: '/exercises/grounding-54321.html' },
          { name: 'Watch the thought stream', href: '/exercises/thought-stream.html' },
          { name: 'One-minute reset',         href: '/exercises/minute-reset.html' }
      ]
    },
    { letter: 'A', domain: 'Acceptance', domainHref: '/imagine/acceptance.html',
      exercises: [
          { name: 'Radical acceptance',    href: '/exercises/radical-acceptance.html' },
          { name: 'Ride the wave',         href: '/exercises/wave.html' },
          { name: 'Inner-weather check-in',href: '/exercises/weather.html' }
      ]
    },
    { letter: 'G', domain: 'Gratitude', domainHref: '/imagine/gratitude.html',
      exercises: [
          { name: 'Add a gratitude star',  href: '/exercises/gratitude.html' },
          { name: 'Gratitude journal',     href: '/exercises/gratitude-journal.html' },
          { name: 'Notice a tiny win',     href: '/exercises/small-wins.html' }
      ]
    },
    { letter: 'I', domain: 'Interactions', domainHref: '/imagine/interactions.html',
      exercises: [
          { name: 'Set a boundary',           href: '/exercises/boundary-setting.html' },
          { name: 'Practice good communication', href: '/exercises/good-communication.html' },
          { name: 'A small act of kindness',  href: '/exercises/kindness.html' },
          { name: 'Map your connection web',  href: '/exercises/connection-web.html' }
      ]
    },
    { letter: 'N', domain: 'Nurturing', domainHref: '/imagine/nurturing.html',
      exercises: [
          { name: 'Joy bubbles',         href: '/exercises/joy.html' },
          { name: 'Playfulness diary',   href: '/exercises/playfulness-diary.html' },
          { name: 'Energy audit',        href: '/exercises/energy-audit.html' },
          { name: 'Silly dice',          href: '/exercises/silly-dice.html' },
          { name: 'A fun prompt',        href: '/exercises/fun-prompts.html' }
      ]
    },
    { letter: 'E', domain: 'Exploring', domainHref: '/imagine/exploring.html',
      exercises: [
          { name: 'Take a wonder walk',     href: '/exercises/wonder.html' },
          { name: 'Creative expression',    href: '/exercises/creative-expression.html' },
          { name: 'Comfort-zone ladder',    href: '/exercises/comfort-ladder.html' },
          { name: 'Check your values compass', href: '/exercises/values-compass.html' }
      ]
    }
];

function getEpochDays() {
    // Local-time epoch days so the daily rollover happens at midnight in
    // the user's timezone, not at UTC.
    const now = new Date();
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor(local.getTime() / (1000 * 60 * 60 * 24));
}

// User-set ordering from the onboarding gate; falls back to standard IMAGINE
// order when missing or invalid.
const IMAGINE_ORDER_KEY = 'cowch-imagine-order';

function getImagineOrder() {
    try {
        const saved = localStorage.getItem(IMAGINE_ORDER_KEY);
        if (saved) {
            const arr = JSON.parse(saved);
            if (Array.isArray(arr) && arr.length === IMAGINE_DAILY.length
                && arr.every(n => Number.isInteger(n) && n >= 0 && n < IMAGINE_DAILY.length)) {
                return arr;
            }
        }
    } catch (_) {}
    return IMAGINE_DAILY.map((_, i) => i);
}

// ============================================
// Day helper — shared by the pasture, weekly report and activity log
// ============================================
function streakDayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Parse a streakDayKey ("YYYY-MM-DD") back into a local-midnight Date, so a
// recorded visit-day lines up with the same rolling window other sources use.
function dayKeyToDate(key) {
    const parts = String(key || '').split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return new Date(NaN);
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Plain visit log. Opening the app counts as "showing up" even with no
// check-in / exercise / chat — the Weekly Summary and pasture both promise
// that a quiet visit still counts, so we record one day-key per calendar day.
const VISIT_LOG_KEY = 'cowch-visit-days';

function loadVisitDays() {
    try {
        const v = JSON.parse(localStorage.getItem(VISIT_LOG_KEY) || '[]');
        return Array.isArray(v) ? v.filter(k => typeof k === 'string') : [];
    } catch (_) { return []; }
}

const VISIT_LOG_BACKFILLED_KEY = 'cowch-visit-days-backfilled';

// One-time seed of the visit log for users who were here before plain visits
// were tracked. The pasture planted one item per visit-day (addedAt) and
// records the last grow day, so those dates are a good proxy for past visits —
// otherwise this week's already-made quiet visits would read as zero.
function backfillVisitDaysOnce() {
    try { if (localStorage.getItem(VISIT_LOG_BACKFILLED_KEY)) return; } catch (_) { return; }
    const keys = new Set(loadVisitDays());
    loadPastureItems().forEach(it => {
        if (it && it.addedAt) {
            const d = new Date(it.addedAt);
            if (!isNaN(d.getTime())) keys.add(streakDayKey(d));
        }
    });
    try {
        const lastGrow = localStorage.getItem(PASTURE_LASTGROW_KEY);
        if (lastGrow) keys.add(lastGrow);
    } catch (_) {}
    const cutoffKey = streakDayKey(new Date(Date.now() - 60 * 86400000));
    const merged = Array.from(keys).filter(k => typeof k === 'string' && k >= cutoffKey);
    try {
        localStorage.setItem(VISIT_LOG_KEY, JSON.stringify(merged));
        localStorage.setItem(VISIT_LOG_BACKFILLED_KEY, '1');
    } catch (_) {}
}

// Records that the app was opened today (de-duplicated by calendar day) and
// prunes anything older than ~60 days so storage stays bounded while the
// rolling 7-day window always has what it needs.
function recordVisitToday() {
    backfillVisitDaysOnce();
    const todayKey = streakDayKey(new Date());
    const log = loadVisitDays();
    if (log.indexOf(todayKey) !== -1) return;
    log.push(todayKey);
    const cutoffKey = streakDayKey(new Date(Date.now() - 60 * 86400000));
    const pruned = log.filter(k => k >= cutoffKey); // ISO day-keys sort lexically
    try { localStorage.setItem(VISIT_LOG_KEY, JSON.stringify(pruned)); } catch (_) {}
}
window.recordVisitToday = recordVisitToday;


// ============================================
// Values pasture — visual that thrives with consistent activity
// ============================================
function loadActivityLog() {
    try { return JSON.parse(localStorage.getItem('cowch-activity-v1') || '[]'); } catch (_) { return []; }
}

function gatherActiveDays(windowDays) {
    // A day counts as "active" if the app was opened that day (a quiet visit),
    // OR any of: weather check-in, goal added, exercise logged, chat message.
    const days = new Set();
    const fromMs = Date.now() - windowDays * 86400000;
    function add(ts) {
        if (!ts) return;
        const d = new Date(ts);
        if (isNaN(d.getTime()) || d.getTime() < fromMs) return;
        days.add(streakDayKey(d));
    }
    loadVisitDays().forEach(k => add(dayKeyToDate(k).getTime()));
    try {
        JSON.parse(localStorage.getItem('innerWeatherHistory') || '[]').forEach(e => add(e && e.timestamp));
    } catch (_) {}
    try {
        JSON.parse(localStorage.getItem('cowch_goals') || '[]').forEach(g => {
            add(g && g.timestamp);
            add(g && g.completedAt);
        });
    } catch (_) {}
    loadActivityLog().forEach(e => add(e && e.at));
    try {
        JSON.parse(localStorage.getItem('cowch_chat_history') || '[]').forEach(m => {
            if (m && m.role === 'user') add(m.ts);
        });
    } catch (_) {}
    return days;
}

const NS_SVG = 'http://www.w3.org/2000/svg';

// ── Pasture growth garden: a cumulative scene where each new day visited
//    plants one new thing. Flowers first; once a few are growing, little
//    trees and grass tufts join in. Items are draggable + deletable. ──
const PASTURE_ITEMS_KEY    = 'cowch-pasture-items-v1';
const PASTURE_LASTGROW_KEY = 'cowch-pasture-lastgrow';
const PASTURE_VISITDAYS_KEY = 'cowch-pasture-visitdays';
const PASTURE_MILESTONES_SEEN_KEY = 'cowch-pasture-milestones-seen';

// Time-based progression, measured in distinct days the user has grown the
// pasture (one per visit-day). Layers ambient scenery on top of the daily
// planted flowers/trees/grass.
const PASTURE_MILESTONES = [
    { key: 'butterflies', days: 15, note: '🦋 Butterflies have found your pasture!' },   // week 3
    { key: 'featuretree', days: 22, note: '🌳 A grand tree has taken root in your pasture!' }, // week 4
    { key: 'stream',      days: 29, note: '💧 A little stream now runs through your pasture.' }, // month 2
    { key: 'birdhouse',   days: 57, note: '🏠 A birdhouse has appeared in your pasture!' }  // month 3
];

function getPastureVisitDays() {
    try {
        const n = parseInt(localStorage.getItem(PASTURE_VISITDAYS_KEY), 10);
        if (Number.isInteger(n) && n >= 0) return n;
    } catch (_) {}
    return 0;
}
const PASTURE_FLOWER_COLORS = ['#F7B2C5', '#FFD56B', '#F6A5C0', '#FFB07A', '#E8A0BF',
                               '#FFC1A4', '#FFEC9E', '#C5E1A5', '#FFB6B6', '#D9A6F0'];

function loadPastureItems() {
    try {
        const arr = JSON.parse(localStorage.getItem(PASTURE_ITEMS_KEY) || '[]');
        if (Array.isArray(arr)) return arr;
    } catch (_) {}
    return [];
}
function savePastureItems(items) {
    try { localStorage.setItem(PASTURE_ITEMS_KEY, JSON.stringify(items)); } catch (_) {}
}

// The 1-based index of the item being added decides its kind. First few are
// flowers; from the 5th onward little trees (every 5th) and grass tufts
// (every 3rd) start appearing too.
function nextPastureItemType(n) {
    if (n <= 4) return 'flower';
    if (n % 5 === 0) return 'tree';
    if (n % 3 === 0) return 'grass';
    return 'flower';
}

// Pasture playable area (origin coords for items)
const PASTURE_X_MIN = 26, PASTURE_X_MAX = 334;
const PASTURE_Y_MIN = 116, PASTURE_Y_MAX = 166;

// Build a list of {x, y, r} zones a new item should avoid: the cow's
// footprint plus every existing item.
function pastureAvoidZones(items, cowPos) {
    const zones = [];
    if (cowPos) zones.push({ x: cowPos.x + 2, y: cowPos.y + 4, r: 30 });
    (items || []).forEach(it => {
        const r = it.type === 'tree' ? 20 : (it.type === 'grass' ? 14 : 15);
        zones.push({ x: it.x, y: it.y, r });
    });
    return zones;
}

function pastureIsClear(x, y, zones) {
    for (const z of zones) {
        const dx = x - z.x, dy = y - z.y;
        if (dx * dx + dy * dy < z.r * z.r) return false;
    }
    return true;
}

function randomPasturePosition(items, cowPos) {
    const zones = pastureAvoidZones(items, cowPos);
    // Try plenty of random spots that don't collide with anything.
    for (let i = 0; i < 60; i++) {
        const x = PASTURE_X_MIN + Math.random() * (PASTURE_X_MAX - PASTURE_X_MIN);
        const y = PASTURE_Y_MIN + Math.random() * (PASTURE_Y_MAX - PASTURE_Y_MIN);
        if (pastureIsClear(x, y, zones)) return { x, y };
    }
    // Fallback: pick the spot from a few samples that's furthest from any zone.
    let best = null, bestD = -Infinity;
    for (let i = 0; i < 12; i++) {
        const x = PASTURE_X_MIN + Math.random() * (PASTURE_X_MAX - PASTURE_X_MIN);
        const y = PASTURE_Y_MIN + Math.random() * (PASTURE_Y_MAX - PASTURE_Y_MIN);
        let minD = Infinity;
        for (const z of zones) {
            const dx = x - z.x, dy = y - z.y;
            const d = dx * dx + dy * dy;
            if (d < minD) minD = d;
        }
        if (minD > bestD) { bestD = minD; best = { x, y }; }
    }
    return best || { x: 180, y: 130 };
}

// One-time fix-up: relocate any item currently sitting on top of the cow.
// Future placements use the avoidance above; this just rescues the current
// state for users whose pasture grew before the avoidance was added.
const PASTURE_RELOCATED_KEY = 'cowch-pasture-relocated-v1';
function maybeRelocateCowCollisions() {
    try { if (localStorage.getItem(PASTURE_RELOCATED_KEY) === '1') return; } catch (_) {}
    const items = loadPastureItems();
    if (items.length) {
        const cowPos = loadCowPos();
        const cowZ = { x: cowPos.x + 2, y: cowPos.y + 4, r: 24 };
        let changed = false;
        items.forEach((it, idx) => {
            const dx = it.x - cowZ.x, dy = it.y - cowZ.y;
            if (dx * dx + dy * dy < cowZ.r * cowZ.r) {
                const others = items.filter((_, j) => j !== idx);
                const np = randomPasturePosition(others, cowPos);
                it.x = np.x; it.y = np.y;
                changed = true;
            }
        });
        if (changed) savePastureItems(items);
    }
    try { localStorage.setItem(PASTURE_RELOCATED_KEY, '1'); } catch (_) {}
}

// Adds one item if today is a new calendar day since the last growth, and
// ticks the monotonic visit-day counter that drives milestone unlocks.
// Returns { item, visitDays } or null if nothing happened today.
function maybeGrowPasture() {
    const todayKey = streakDayKey(new Date());
    let last = null;
    try { last = localStorage.getItem(PASTURE_LASTGROW_KEY); } catch (_) {}
    if (last === todayKey) return null;

    const visitDays = getPastureVisitDays() + 1;
    try { localStorage.setItem(PASTURE_VISITDAYS_KEY, String(visitDays)); } catch (_) {}

    const items = loadPastureItems();
    const type = nextPastureItemType(items.length + 1);
    const pos = randomPasturePosition(items, loadCowPos());
    const item = {
        id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36),
        type,
        x: pos.x,
        y: pos.y,
        variant: type === 'flower'
            ? Math.floor(Math.random() * PASTURE_FLOWER_COLORS.length)
            : Math.floor(Math.random() * 3),
        addedAt: new Date().toISOString()
    };
    items.push(item);
    savePastureItems(items);
    try { localStorage.setItem(PASTURE_LASTGROW_KEY, todayKey); } catch (_) {}
    return { item, visitDays };
}

// Returns the note for the highest not-yet-announced milestone the user has
// now reached, or null. Marks it announced.
function pendingPastureMilestoneNote(visitDays) {
    let seen = [];
    try { seen = JSON.parse(localStorage.getItem(PASTURE_MILESTONES_SEEN_KEY) || '[]'); } catch (_) {}
    if (!Array.isArray(seen)) seen = [];
    let note = null;
    PASTURE_MILESTONES.forEach(m => {
        if (visitDays >= m.days && seen.indexOf(m.key) === -1) {
            seen.push(m.key);
            note = m.note; // last (highest) crossed wins the headline
        }
    });
    if (note) {
        try { localStorage.setItem(PASTURE_MILESTONES_SEEN_KEY, JSON.stringify(seen)); } catch (_) {}
    }
    return note;
}

// ── Drawing helpers: each draws into a group whose origin (0,0) is the
//    item's base on the ground. ──
function drawFlower(g, item) {
    // IMAGINE flowers wear their area's colour (and grow a touch with engagement);
    // legacy "wildflowers" (no letter) keep the original soft pastel palette.
    const isImagine = item.letter && IMAGINE_PALETTE[item.letter];
    const color = isImagine
        ? IMAGINE_PALETTE[item.letter]
        : PASTURE_FLOWER_COLORS[(item.variant || 0) % PASTURE_FLOWER_COLORS.length];

    // Scale the whole flower from its base via an inner group.
    const s = isImagine ? (item.scale || 1) : 1;
    const fg = (s !== 1) ? document.createElementNS(NS_SVG, 'g') : g;
    if (s !== 1) { fg.setAttribute('transform', 'scale(' + s + ')'); g.appendChild(fg); }

    const stem = document.createElementNS(NS_SVG, 'line');
    stem.setAttribute('x1', 0); stem.setAttribute('y1', 0);
    stem.setAttribute('x2', 0); stem.setAttribute('y2', -14);
    stem.setAttribute('stroke', '#3F8458'); stem.setAttribute('stroke-width', 1.6);
    stem.setAttribute('stroke-linecap', 'round');
    fg.appendChild(stem);
    const sideLeaf = document.createElementNS(NS_SVG, 'ellipse');
    sideLeaf.setAttribute('cx', 3); sideLeaf.setAttribute('cy', -8);
    sideLeaf.setAttribute('rx', 2.5); sideLeaf.setAttribute('ry', 1.2);
    sideLeaf.setAttribute('fill', '#3F8458');
    sideLeaf.setAttribute('transform', 'rotate(30 3 -8)');
    fg.appendChild(sideLeaf);
    for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
        const petal = document.createElementNS(NS_SVG, 'circle');
        petal.setAttribute('cx', Math.cos(a) * 4.2);
        petal.setAttribute('cy', Math.sin(a) * 4.2 - 16);
        petal.setAttribute('r', 3.4);
        petal.setAttribute('fill', color);
        // A faint light rim keeps the petals legible on the green grass.
        if (isImagine) { petal.setAttribute('stroke', 'rgba(255,255,255,0.55)'); petal.setAttribute('stroke-width', 0.6); }
        fg.appendChild(petal);
    }
    const centre = document.createElementNS(NS_SVG, 'circle');
    centre.setAttribute('cx', 0); centre.setAttribute('cy', -16); centre.setAttribute('r', 2);
    centre.setAttribute('fill', '#C9A857');
    fg.appendChild(centre);
}
function drawTree(g, item) {
    const canopyColors = ['#5FA46B', '#4F8F60', '#76B47E'];
    const cc = canopyColors[(item.variant || 0) % canopyColors.length];
    const trunk = document.createElementNS(NS_SVG, 'rect');
    trunk.setAttribute('x', -2.5); trunk.setAttribute('y', -16);
    trunk.setAttribute('width', 5); trunk.setAttribute('height', 18);
    trunk.setAttribute('rx', 2); trunk.setAttribute('fill', '#6B4B30');
    g.appendChild(trunk);
    [{ x: 0, y: -22, r: 11 }, { x: -8, y: -17, r: 8 }, { x: 8, y: -17, r: 8 }, { x: 0, y: -28, r: 8 }].forEach(c => {
        const e = document.createElementNS(NS_SVG, 'circle');
        e.setAttribute('cx', c.x); e.setAttribute('cy', c.y); e.setAttribute('r', c.r);
        e.setAttribute('fill', cc);
        g.appendChild(e);
    });
}
function drawGrass(g, item) {
    const greens = ['#5FA46B', '#6FB37A', '#4F8F60'];
    const col = greens[(item.variant || 0) % greens.length];
    const blades = [
        'M -6 0 Q -7 -10 -4 -14', 'M -2 0 Q -3 -13 0 -18',
        'M 2 0 Q 3 -12 6 -15', 'M 6 0 Q 8 -8 10 -11'
    ];
    blades.forEach(d => {
        const p = document.createElementNS(NS_SVG, 'path');
        p.setAttribute('d', d);
        p.setAttribute('stroke', col); p.setAttribute('stroke-width', 2.2);
        p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round');
        g.appendChild(p);
    });
}

function clientToPastureSvg(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: clientX, y: clientY };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
}


// Time-of-day phase for the pasture sky. Returns 'dawn' | 'day' | 'sunset' | 'night'.
function getPastureTimeOfDay(date) {
    const h = (date || new Date()).getHours();
    if (h >= 5 && h <= 7)   return 'dawn';
    if (h >= 8 && h <= 16)  return 'day';
    if (h >= 17 && h <= 19) return 'sunset';
    return 'night';
}

const PASTURE_PHASES = {
    dawn: {
        sun:   { cx: 56,  cy: 62, r: 16, fill: '#FF9264', glow: '#FFD3A6' },
        cloud: '#FFE2CC', hill: '#9CB870', ground: '#86B05F'
    },
    day: {
        sun:   { cx: 50,  cy: 32, r: 18, fill: '#FFD56B', glow: '#FFEDB4' },
        cloud: '#FFFFFF', hill: '#A8C57E', ground: '#92BC6A'
    },
    sunset: {
        sun:   { cx: 302, cy: 66, r: 17, fill: '#FF5B47', glow: '#FFA075' },
        cloud: '#F2B58A', hill: '#7E9B66', ground: '#688F58'
    },
    night: {
        moon:  { cx: 290, cy: 38, r: 14, fill: '#F3EEDB', shade: '#1F2A4F' },
        cloud: null,
        hill: '#445C46', ground: '#3D5840'
    }
};

function buildPastureScenery(svg, vit) {
    const phase = getPastureTimeOfDay();
    svg.setAttribute('data-phase', phase);
    const p = PASTURE_PHASES[phase];

    if (phase === 'night') {
        // Stars scattered across the sky
        const stars = [
            { x: 30, y: 18 }, { x: 62, y: 36 }, { x: 96, y: 14 },
            { x: 128, y: 28 }, { x: 160, y: 12 }, { x: 196, y: 24 },
            { x: 226, y: 44 }, { x: 254, y: 14 }, { x: 328, y: 30 }
        ];
        stars.forEach((s, i) => {
            const c = document.createElementNS(NS_SVG, 'circle');
            c.setAttribute('cx', s.x); c.setAttribute('cy', s.y);
            c.setAttribute('r', (i % 3 === 0) ? 1.2 : 0.7);
            c.setAttribute('fill', '#FFFFFF');
            c.setAttribute('opacity', '0.85');
            svg.appendChild(c);
        });
        // Moon + crescent shading for a soft 3/4 phase
        const m = p.moon;
        const moonGlow = document.createElementNS(NS_SVG, 'circle');
        moonGlow.setAttribute('cx', m.cx); moonGlow.setAttribute('cy', m.cy);
        moonGlow.setAttribute('r', m.r + 6);
        moonGlow.setAttribute('fill', '#F3EEDB');
        moonGlow.setAttribute('opacity', '0.18');
        svg.appendChild(moonGlow);
        const moon = document.createElementNS(NS_SVG, 'circle');
        moon.setAttribute('cx', m.cx); moon.setAttribute('cy', m.cy);
        moon.setAttribute('r', m.r);
        moon.setAttribute('fill', m.fill);
        moon.setAttribute('opacity', '0.95');
        svg.appendChild(moon);
        const shade = document.createElementNS(NS_SVG, 'circle');
        shade.setAttribute('cx', m.cx + 5); shade.setAttribute('cy', m.cy - 1);
        shade.setAttribute('r', m.r - 1);
        shade.setAttribute('fill', m.shade);
        shade.setAttribute('opacity', '0.7');
        svg.appendChild(shade);
    } else {
        // Sun with a soft halo
        const glow = document.createElementNS(NS_SVG, 'circle');
        glow.setAttribute('cx', p.sun.cx); glow.setAttribute('cy', p.sun.cy);
        glow.setAttribute('r', p.sun.r + 10);
        glow.setAttribute('fill', p.sun.glow);
        glow.setAttribute('opacity', (0.30 + vit * 0.30).toFixed(2));
        svg.appendChild(glow);
        const sun = document.createElementNS(NS_SVG, 'circle');
        sun.setAttribute('cx', p.sun.cx); sun.setAttribute('cy', p.sun.cy);
        sun.setAttribute('r', p.sun.r);
        sun.setAttribute('fill', p.sun.fill);
        sun.setAttribute('opacity', (0.55 + vit * 0.45).toFixed(2));
        svg.appendChild(sun);
    }

    // Clouds — skip at night
    if (p.cloud) {
        [{ x: 220, y: 28, r: 12 }, { x: 250, y: 24, r: 14 }, { x: 280, y: 30, r: 11 }].forEach(c => {
            const e = document.createElementNS(NS_SVG, 'circle');
            e.setAttribute('cx', c.x); e.setAttribute('cy', c.y);
            e.setAttribute('r', c.r);
            e.setAttribute('fill', p.cloud);
            e.setAttribute('opacity', phase === 'sunset' ? '0.85' : '0.9');
            svg.appendChild(e);
        });
    }

    const hill = document.createElementNS(NS_SVG, 'path');
    hill.setAttribute('d', 'M 0 90 Q 90 60 180 86 T 360 92 L 360 180 L 0 180 Z');
    hill.setAttribute('fill', p.hill);
    svg.appendChild(hill);

    const ground = document.createElementNS(NS_SVG, 'path');
    ground.setAttribute('d', 'M 0 130 Q 80 116 160 128 T 360 130 L 360 180 L 0 180 Z');
    ground.setAttribute('fill', p.ground);
    svg.appendChild(ground);

    // The cow is rendered separately (renderPasture) so it can be dragged.
}

const PASTURE_COW_KEY = 'cowch-pasture-cow-v1';
const COW_SVG = `
        <!-- body -->
        <ellipse cx="2" cy="8" rx="17" ry="11" fill="#FFFFFF"/>
        <ellipse cx="8" cy="5" rx="6" ry="5" fill="#A77B52"/>
        <ellipse cx="-4" cy="11" rx="4" ry="3" fill="#A77B52"/>
        <!-- legs -->
        <rect x="-8" y="16" width="3" height="6" rx="1.5" fill="#7A6253"/>
        <rect x="-1" y="17" width="3" height="6" rx="1.5" fill="#7A6253"/>
        <rect x="7"  y="17" width="3" height="6" rx="1.5" fill="#7A6253"/>
        <rect x="13" y="16" width="3" height="6" rx="1.5" fill="#7A6253"/>
        <!-- tail -->
        <path d="M 18 4 Q 24 6 22 13" stroke="#A77B52" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <!-- head (front-facing, cute) -->
        <g transform="translate(-13, -5)">
            <!-- ears -->
            <ellipse cx="-9" cy="-3" rx="4.2" ry="2.6" fill="#FFFFFF" transform="rotate(-38 -9 -3)"/>
            <ellipse cx="-8.5" cy="-3" rx="2" ry="1.2" fill="#F7B2C5" transform="rotate(-38 -9 -3)"/>
            <ellipse cx="9" cy="-3" rx="4.2" ry="2.6" fill="#FFFFFF" transform="rotate(38 9 -3)"/>
            <ellipse cx="8.5" cy="-3" rx="2" ry="1.2" fill="#F7B2C5" transform="rotate(38 9 -3)"/>
            <!-- little horns -->
            <path d="M -3.5 -8 Q -4.5 -11 -2.5 -12" stroke="#E8C98A" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            <path d="M 3.5 -8 Q 4.5 -11 2.5 -12" stroke="#E8C98A" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            <!-- head -->
            <circle cx="0" cy="0" r="9.5" fill="#FFFFFF"/>
            <!-- brown patch over one eye -->
            <ellipse cx="4.5" cy="-2" rx="4.2" ry="4" fill="#A77B52"/>
            <!-- eyes -->
            <circle cx="-3.5" cy="-1" r="1.7" fill="#3C2E28"/>
            <circle cx="4.5" cy="-1" r="1.7" fill="#3C2E28"/>
            <circle cx="-3" cy="-1.6" r="0.6" fill="#FFFFFF"/>
            <circle cx="5" cy="-1.6" r="0.6" fill="#FFFFFF"/>
            <!-- muzzle -->
            <ellipse cx="0" cy="5.5" rx="6.5" ry="4.4" fill="#FFD9C7"/>
            <ellipse cx="-2.2" cy="5.5" rx="0.9" ry="1.1" fill="#C98A78"/>
            <ellipse cx="2.2" cy="5.5" rx="0.9" ry="1.1" fill="#C98A78"/>
            <!-- gentle smile -->
            <path d="M -2.5 8 Q 0 9.6 2.5 8" stroke="#C98A78" stroke-width="0.9" fill="none" stroke-linecap="round"/>
        </g>`;

function loadCowPos() {
    try {
        const p = JSON.parse(localStorage.getItem(PASTURE_COW_KEY));
        if (p && typeof p.x === 'number' && typeof p.y === 'number') return p;
    } catch (_) {}
    return { x: 62, y: 138 };
}
function saveCowPos(p) {
    try { localStorage.setItem(PASTURE_COW_KEY, JSON.stringify(p)); } catch (_) {}
}

// Shared drag: g is positioned at translate(pos.x,pos.y); updates pos live
// and calls onCommit(pos) when the drag ends.
function makePastureDraggable(g, pos, svg, onCommit) {
    let dragging = false, sP = null, sX = 0, sY = 0;
    g.addEventListener('pointerdown', e => {
        if (e.target.closest('.pasture-delete-badge')) return;
        dragging = true;
        g.classList.add('dragging');
        try { g.setPointerCapture(e.pointerId); } catch (_) {}
        sP = clientToPastureSvg(svg, e.clientX, e.clientY);
        sX = pos.x; sY = pos.y;
    });
    g.addEventListener('pointermove', e => {
        if (!dragging) return;
        const p = clientToPastureSvg(svg, e.clientX, e.clientY);
        pos.x = Math.max(14, Math.min(346, sX + (p.x - sP.x)));
        pos.y = Math.max(104, Math.min(174, sY + (p.y - sP.y)));
        g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    });
    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        g.classList.remove('dragging');
        try { g.releasePointerCapture(e.pointerId); } catch (_) {}
        if (onCommit) onCommit(pos);
    }
    g.addEventListener('pointerup', endDrag);
    g.addEventListener('pointercancel', endDrag);
}

function buildCowNode(ctx) {
    const pos = loadCowPos();
    const g = document.createElementNS(NS_SVG, 'g');
    g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
    g.classList.add('pasture-item', 'pasture-cow');
    if (ctx.editing) {
        // Big transparent hit-area over the whole cow for easy grabbing
        const hit = document.createElementNS(NS_SVG, 'rect');
        hit.setAttribute('x', -26); hit.setAttribute('y', -24);
        hit.setAttribute('width', 54); hit.setAttribute('height', 48);
        hit.setAttribute('fill', 'transparent');
        hit.setAttribute('class', 'pasture-hit');
        g.appendChild(hit);
    }
    const art = document.createElementNS(NS_SVG, 'g');
    art.innerHTML = COW_SVG;
    g.appendChild(art);
    if (ctx.editing) {
        g.classList.add('editing');
        makePastureDraggable(g, pos, ctx.svg, saveCowPos);
    }
    return g;
}

let pastureEditing = false;

function buildPastureItemNode(item, ctx) {
    // ctx: { editing, svg, items, onDelete }
    const g = document.createElementNS(NS_SVG, 'g');
    g.setAttribute('transform', `translate(${item.x}, ${item.y})`);
    g.classList.add('pasture-item');
    g.dataset.id = item.id;

    // In edit mode, a transparent hit-area gives a large, reliable grab
    // target (the actual petals/blades/trunk are thin and hard to hit).
    if (ctx.editing) {
        const hit = document.createElementNS(NS_SVG, 'rect');
        const h = item.type === 'tree' ? 40 : (item.type === 'grass' ? 24 : 28);
        hit.setAttribute('x', -14);
        hit.setAttribute('y', -h);
        hit.setAttribute('width', 28);
        hit.setAttribute('height', h + 6);
        hit.setAttribute('fill', 'transparent');
        hit.setAttribute('class', 'pasture-hit');
        g.appendChild(hit);
    }

    if (item.type === 'tree') drawTree(g, item);
    else if (item.type === 'grass') drawGrass(g, item);
    else drawFlower(g, item);

    if (ctx.editing) {
        g.classList.add('editing');

        // Delete badge floats above the item
        const badge = document.createElementNS(NS_SVG, 'g');
        badge.setAttribute('class', 'pasture-delete-badge');
        const topY = item.type === 'tree' ? -38 : (item.type === 'grass' ? -22 : -26);
        badge.setAttribute('transform', `translate(8, ${topY})`);
        const bc = document.createElementNS(NS_SVG, 'circle');
        bc.setAttribute('cx', 0); bc.setAttribute('cy', 0); bc.setAttribute('r', 7);
        bc.setAttribute('fill', '#E35B32');
        const bx = document.createElementNS(NS_SVG, 'text');
        bx.setAttribute('x', 0); bx.setAttribute('y', 3.5);
        bx.setAttribute('text-anchor', 'middle');
        bx.setAttribute('fill', '#fff');
        bx.setAttribute('font-size', '11');
        bx.setAttribute('font-weight', '900');
        bx.textContent = '×';
        badge.appendChild(bc); badge.appendChild(bx);
        badge.addEventListener('pointerdown', e => { e.stopPropagation(); });
        badge.addEventListener('click', e => {
            e.stopPropagation();
            ctx.onDelete(item.id);
        });
        g.appendChild(badge);

        // Drag to move (shared helper saves the whole items array on commit)
        makePastureDraggable(g, item, ctx.svg, () => savePastureItems(ctx.items));
    }

    return g;
}

// Ambient milestone scenery that sits BEHIND the planted items + cow.
function renderPastureBackFeatures(svg, visitDays) {
    // Month 2: a little stream across the lower pasture
    if (visitDays >= 29) {
        const stream = document.createElementNS(NS_SVG, 'path');
        stream.setAttribute('d', 'M -10 150 Q 80 142 150 156 T 370 150 L 370 174 Q 220 166 150 172 Q 70 177 -10 168 Z');
        stream.setAttribute('fill', '#9CD3E8');
        stream.setAttribute('opacity', '0.9');
        svg.appendChild(stream);
        const shine = document.createElementNS(NS_SVG, 'path');
        shine.setAttribute('d', 'M 20 156 Q 90 150 150 160 T 340 156');
        shine.setAttribute('stroke', '#D6EEF7');
        shine.setAttribute('stroke-width', '2');
        shine.setAttribute('fill', 'none');
        shine.setAttribute('opacity', '0.8');
        svg.appendChild(shine);
    }
    // Week 4: a grand feature tree on the right
    if (visitDays >= 22) {
        const g = document.createElementNS(NS_SVG, 'g');
        g.setAttribute('transform', 'translate(322, 108)');
        g.innerHTML = `
            <rect x="-4" y="-2" width="8" height="30" rx="3" fill="#6B4B30"/>
            <circle cx="0" cy="-12" r="17" fill="#5FA46B"/>
            <circle cx="-13" cy="-3" r="12" fill="#4F8F60"/>
            <circle cx="13" cy="-3" r="12" fill="#6FB37A"/>
            <circle cx="0" cy="-24" r="12" fill="#76B47E"/>`;
        svg.appendChild(g);
    }
    // Month 3: a birdhouse on a post, left side
    if (visitDays >= 57) {
        const g = document.createElementNS(NS_SVG, 'g');
        g.setAttribute('transform', 'translate(36, 104)');
        g.innerHTML = `
            <rect x="-1.5" y="0" width="3" height="40" fill="#7A6253"/>
            <polygon points="-13,-12 13,-12 0,-25" fill="#9B6B43"/>
            <rect x="-11" y="-12" width="22" height="18" rx="2" fill="#C98A5E"/>
            <circle cx="0" cy="-2" r="4" fill="#3C2E28"/>
            <rect x="-1" y="6" width="2" height="6" fill="#7A6253"/>`;
        svg.appendChild(g);
    }
}

// Butterflies fly in FRONT of everything (week 3+).
function renderPastureButterflies(svg, visitDays) {
    if (visitDays < 15) return;
    // Butterflies don't fly at night — let them rest with the user.
    if (getPastureTimeOfDay() === 'night') return;
    const spots = [{ x: 120, y: 66 }, { x: 250, y: 58 }, { x: 300, y: 92 }];
    const colors = ['#F7B2C5', '#FFD56B', '#D9A6F0'];
    const count = visitDays >= 29 ? 3 : 2;
    for (let i = 0; i < count; i++) {
        const s = spots[i];
        const outer = document.createElementNS(NS_SVG, 'g');
        outer.setAttribute('transform', `translate(${s.x}, ${s.y})`);
        const inner = document.createElementNS(NS_SVG, 'g');
        inner.setAttribute('class', 'pasture-butterfly');
        inner.style.animationDelay = (i * 1.3) + 's';
        const c = colors[i % colors.length];
        inner.innerHTML = `
            <ellipse cx="-2.6" cy="-1" rx="2.6" ry="3.4" fill="${c}"/>
            <ellipse cx="2.6" cy="-1" rx="2.6" ry="3.4" fill="${c}"/>
            <ellipse cx="-2.2" cy="2.5" rx="2" ry="2.4" fill="${c}" opacity="0.85"/>
            <ellipse cx="2.2" cy="2.5" rx="2" ry="2.4" fill="${c}" opacity="0.85"/>
            <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#3C2E28" stroke-width="1"/>`;
        outer.appendChild(inner);
        svg.appendChild(outer);
    }
}

function renderPasture() {
    const svg = document.getElementById('pasture-svg');
    if (!svg) return;
    const items = loadPastureItems();
    const visitDays = getPastureVisitDays();
    svg.innerHTML = '';
    svg.classList.toggle('editing', pastureEditing);

    // Fuller pasture (more items) → brighter scenery, capped at 12.
    buildPastureScenery(svg, Math.min(1, items.length / 12));

    // Milestone scenery behind the cow + items.
    renderPastureBackFeatures(svg, visitDays);

    // Cow sits behind the planted items but is itself draggable in edit mode.
    svg.appendChild(buildCowNode({ editing: pastureEditing, svg }));

    // Draw back-to-front: smaller y (further back) first.
    const ordered = items.slice().sort((a, b) => a.y - b.y);
    const items_ref = items; // keep the array identity for drag-save
    ordered.forEach((item, i) => {
        const node = buildPastureItemNode(item, {
            editing: pastureEditing,
            svg,
            items: items_ref,
            onDelete: (id) => {
                const next = loadPastureItems().filter(it => it.id !== id);
                savePastureItems(next);
                const countEl = document.getElementById('pasture-count');
                if (countEl) countEl.textContent = next.length;
                renderPasture();
            }
        });
        node.style.animationDelay = (i * 0.04) + 's';
        svg.appendChild(node);
    });

    // Butterflies flutter in front of everything.
    renderPastureButterflies(svg, visitDays);
}

function updatePastureUI() {
    // The pasture now lives in its own panel; bail if that DOM isn't present.
    if (!document.getElementById('pasture-svg')) return;
    const countEl = document.getElementById('pasture-count');
    const blurb = document.getElementById('pasture-blurb');
    const growNote = document.getElementById('pasture-grow-note');
    const tallyEl = document.getElementById('pasture-tally');
    const blockSub = document.getElementById('pasture-block-sub');

    // One-time backfill: users who had a pasture before visit-day tracking
    // get their counter seeded from their existing item count.
    try {
        if (localStorage.getItem(PASTURE_VISITDAYS_KEY) === null) {
            const existing = loadPastureItems().length;
            if (existing > 0) localStorage.setItem(PASTURE_VISITDAYS_KEY, String(existing));
        }
    } catch (_) {}

    // One-time rescue: nudge any item that's currently sitting on top of
    // the cow off it (legacy pasture before the avoidance was added).
    maybeRelocateCowCollisions();

    const grown = maybeGrowPasture();
    syncImagineFlowers();            // turn any new IMAGINE exercises into flowers
    const items = loadPastureItems();
    const visitDays = getPastureVisitDays();
    if (countEl) countEl.textContent = items.length;

    // Keep the Your-Space entry block's subtitle in step with the garden.
    if (blockSub) {
        const n = items.length;
        blockSub.textContent = n === 0
            ? 'A flower blooms for every step you take'
            : n + (n === 1 ? ' thing' : ' things') + ' growing — tap to tend your garden';
    }

    if (growNote) {
        // A freshly-crossed milestone takes priority over the daily grow note.
        const milestoneNote = grown ? pendingPastureMilestoneNote(visitDays) : null;
        if (milestoneNote) {
            growNote.hidden = false;
            growNote.textContent = milestoneNote;
        } else if (grown) {
            const labelByType = { flower: 'a new flower 🌸', tree: 'a little tree 🌳', grass: 'a tuft of grass 🌿' };
            growNote.hidden = false;
            growNote.textContent = 'Today your pasture grew ' + (labelByType[grown.item.type] || 'something new') + '!';
        } else {
            growNote.hidden = true;
        }
    }

    if (blurb) {
        if (items.length === 0) {
            blurb.textContent = 'Every day you visit, something new grows here. Your first sprout appears today.';
        } else if (items.length === 1) {
            blurb.textContent = 'Your first sprout! Come back tomorrow and the pasture keeps growing.';
        } else {
            const next = PASTURE_MILESTONES.find(m => visitDays < m.days);
            const nextHint = next ? ' Keep visiting — more appears as the weeks go by.' : '';
            blurb.textContent = items.length + ' things growing. Tap “Rearrange” to move or remove anything.' + nextHint;
        }
    }

    // Tally of distinct days the user has shown up.
    if (tallyEl) {
        const n = Math.max(visitDays, items.length);
        tallyEl.innerHTML = 'You have shown up <strong>' + n + '</strong> time' + (n === 1 ? '' : 's') + ' so far. Investing in yourself is good for you 🤩';
    }

    renderPasture();
}
window.updatePastureUI = updatePastureUI;

// Your Space header greeting that follows the same phases as the pasture
// (dawn / morning / afternoon / sunset / evening / night).
function updateYourSpaceGreeting() {
    const head = document.getElementById('you-greeting');
    const sub  = document.getElementById('you-greeting-sub');
    if (!head) return;
    const h = new Date().getHours();
    let title, blurb;
    if (h >= 5 && h <= 7) {
        title = 'Good morning 🌅';
        blurb = 'A soft start to the day.';
    } else if (h >= 8 && h <= 11) {
        title = 'Good morning ☀️';
        blurb = 'A gentle look at your morning.';
    } else if (h >= 12 && h <= 16) {
        title = 'Good afternoon 🌤️';
        blurb = 'A pause in the middle of the day.';
    } else if (h >= 17 && h <= 19) {
        title = 'Good evening 🌇';
        blurb = 'Wind down gently.';
    } else if (h >= 20 && h <= 21) {
        title = 'Good evening 🌙';
        blurb = 'Soft hours — rest matters.';
    } else {
        title = 'Good night 🌙';
        blurb = 'Quiet hours. Be gentle with yourself.';
    }
    head.textContent = title;
    if (sub) sub.textContent = blurb;
}
window.updateYourSpaceGreeting = updateYourSpaceGreeting;

function setupPastureEdit() {
    const btn = document.getElementById('pasture-edit-btn');
    const hint = document.getElementById('pasture-edit-hint');
    if (!btn) return;
    btn.addEventListener('click', () => {
        pastureEditing = !pastureEditing;
        btn.classList.toggle('active', pastureEditing);
        btn.textContent = pastureEditing ? '✓ Done' : '✥ Rearrange';
        if (hint) hint.hidden = !pastureEditing;
        renderPasture();
    });
}
window.setupPastureEdit = setupPastureEdit;


// ============================================
// Weekly in-app report — rolling 7 days, derived from existing storage
// ============================================
const EXERCISE_LABELS = {
    'wave':            { label: 'Ride the wave',      verb: 'rode the wave' },
    'box-breathing':   { label: 'Box breathing',      verb: 'breathed the box' },
    'grounding-54321': { label: '5-4-3-2-1 grounding',verb: 'grounded with 5-4-3-2-1' },
    'body-scan':       { label: '5-minute body scan', verb: 'did a body scan' },
    'gratitude-stars': { label: 'Gratitude stars',    verb: 'added a gratitude star' },
    'inner-weather':   { label: 'Inner weather',      verb: 'checked in with your inner weather' }
};
const WEATHER_LABELS = {
    'sunny': '☀️ sunny', 'partly-cloudy': '🌤️ partly cloudy', 'cloudy': '☁️ cloudy',
    'overcast': '☁️ overcast', 'rainy': '🌧️ rainy', 'stormy': '⛈️ stormy',
    'foggy': '🌫️ foggy', 'rainbow': '🌈 rainbow'
};
// Adjective form for the dominant weather ("This week was mostly ___").
const WEATHER_WORDS = {
    'sunny': 'sunny', 'partly-cloudy': 'partly cloudy', 'cloudy': 'cloudy',
    'overcast': 'overcast', 'rainy': 'rainy', 'stormy': 'stormy',
    'foggy': 'foggy', 'rainbow': 'bright'
};
// Noun form for the "with moments of ___ and ___" tail.
const WEATHER_NOUNS = {
    'sunny': 'sunshine', 'partly-cloudy': 'cloud', 'cloudy': 'cloud',
    'overcast': 'grey skies', 'rainy': 'rain', 'stormy': 'storms',
    'foggy': 'fog', 'rainbow': 'brightness'
};
const HARD_WEATHER = ['cloudy', 'overcast', 'rainy', 'stormy', 'foggy'];

// Weaves the week's weather + how often the user showed up into one warm,
// human sentence rather than a stat readout.
function buildWeeklyNarrative(wxEntries, showedUpDays) {
    const dayWord = showedUpDays === 1 ? 'day' : 'days';

    if (wxEntries.length === 0) {
        if (showedUpDays > 0) {
            return `You showed up for yourself ${showedUpDays} ${dayWord} this week. Even a quiet visit counts.`;
        }
        return 'A fresh week ahead. Check in when you’re ready and your story will start to fill in.';
    }

    const dominantAdj = WEATHER_WORDS[wxEntries[0].key] || wxEntries[0].key;
    const nouns = wxEntries.slice(1).map(w => WEATHER_NOUNS[w.key] || w.key);
    let weather;
    if (nouns.length === 0) {
        weather = `This week was ${dominantAdj}.`;
    } else if (nouns.length === 1) {
        weather = `This week was mostly ${dominantAdj}, with some ${nouns[0]}.`;
    } else {
        weather = `This week was mostly ${dominantAdj}, with moments of ${nouns[0]} and ${nouns[1]}.`;
    }

    if (showedUpDays === 0) return weather;

    const wasHard = HARD_WEATHER.indexOf(wxEntries[0].key) !== -1;
    const closing = wasHard
        ? ` You still kept returning to yourself ${showedUpDays} ${dayWord} — that matters.`
        : ` You showed up for yourself ${showedUpDays} ${dayWord}.`;
    return weather + closing;
}

function weeklyDaysWindow() {
    const out = new Set();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        out.add(streakDayKey(d));
    }
    return out;
}

function updateWeeklyReportUI() {
    const card = document.getElementById('weekly-card');
    if (!card) return;
    const range = document.getElementById('weekly-range');
    const headline = document.getElementById('weekly-headline');
    const stats = document.getElementById('weekly-stats');
    const exList = document.getElementById('weekly-exercises');
    const wxList = document.getElementById('weekly-weather');
    const goalsTitle = document.getElementById('weekly-goals-title');
    const goalsList = document.getElementById('weekly-goals');

    const today = new Date();
    const start = new Date(today); start.setDate(start.getDate() - 6);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    range.textContent = fmt(start) + ' – ' + fmt(today);

    const weekDays = weeklyDaysWindow();
    const inWeek = (ts) => {
        if (!ts) return false;
        const d = new Date(ts);
        return !isNaN(d.getTime()) && weekDays.has(streakDayKey(d));
    };

    // Check-ins
    let checkins = [];
    let weatherCounts = {};
    try {
        checkins = JSON.parse(localStorage.getItem('innerWeatherHistory') || '[]')
            .filter(c => c && inWeek(c.timestamp));
        checkins.forEach(c => {
            const w = c.weather || 'unknown';
            weatherCounts[w] = (weatherCounts[w] || 0) + 1;
        });
    } catch (_) {}

    // Goals added/completed — keep the names so we can list them, not just count.
    let goalsAdded = 0, goalsDone = 0;
    const bloomedGoals = [];   // completed this week
    const newGoals = [];       // started this week and not yet completed
    try {
        const goals = JSON.parse(localStorage.getItem('cowch_goals') || '[]');
        goals.forEach(g => {
            if (!g) return;
            const title = (g.specific || g.text || '').trim();
            const type = (g.type || 'long') === 'short' ? 'short' : 'long';
            const startedThisWeek = inWeek(g.timestamp);
            const bloomedThisWeek = g.completed && inWeek(g.completedAt);
            if (startedThisWeek) goalsAdded++;
            if (bloomedThisWeek) {
                goalsDone++;
                if (title) bloomedGoals.push({ title, type });
            } else if (startedThisWeek && !g.completed && title) {
                newGoals.push({ title, type });
            }
        });
    } catch (_) {}

    // Exercises (from activity log)
    const exCounts = {};
    loadActivityLog().forEach(e => {
        if (!inWeek(e && e.at)) return;
        if (!e.name) return;
        exCounts[e.name] = (exCounts[e.name] || 0) + 1;
    });

    // Active days this week
    const activeThisWeek = gatherActiveDays(7);
    const showedUpDays = activeThisWeek.size;

    // Stats grid
    stats.innerHTML = '';
    const statTiles = [
        { num: showedUpDays + '/7', lbl: 'Days you showed up' },
        { num: checkins.length, lbl: 'Check-ins' },
        { num: goalsAdded, lbl: 'Goals growing' },
        { num: goalsDone, lbl: 'Goals bloomed' }
    ];
    statTiles.forEach(t => {
        const tile = document.createElement('div');
        tile.className = 'weekly-stat';
        tile.innerHTML = '<div class="num">' + t.num + '</div><div class="lbl">' + t.lbl + '</div>';
        stats.appendChild(tile);
    });

    // Goals in bloom — list the actual goals (bloomed first, then new) rather
    // than leaving it as a bare count.
    const escG = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (goalsList && goalsTitle) {
        goalsList.innerHTML = '';
        const hasAny = bloomedGoals.length || newGoals.length;
        goalsTitle.hidden = !hasAny;
        bloomedGoals.forEach(g => {
            const row = document.createElement('div');
            row.className = 'weekly-goal-row';
            row.innerHTML =
                '<span class="g-emoji">' + (g.type === 'short' ? '🌸' : '🍎') + '</span>' +
                '<span class="g-body"><span class="g-title">' + escG(g.title) + '</span>' +
                '<span class="g-meta">bloomed this week</span></span>';
            goalsList.appendChild(row);
        });
        newGoals.forEach(g => {
            const row = document.createElement('div');
            row.className = 'weekly-goal-row is-new';
            row.innerHTML =
                '<span class="g-emoji">🌱</span>' +
                '<span class="g-body"><span class="g-title">' + escG(g.title) + '</span>' +
                '<span class="g-meta">' + (g.type === 'short' ? 'short-term' : 'long-term') + ' goal, started this week</span></span>';
            goalsList.appendChild(row);
        });
    }

    // Exercises list
    const exEntries = Object.keys(exCounts)
        .map(k => ({ name: k, count: exCounts[k] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
    exList.innerHTML = '';
    if (exEntries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'weekly-empty';
        empty.textContent = 'No exercises logged yet — try one this week and it’ll show up here.';
        exList.appendChild(empty);
    } else {
        exEntries.forEach(e => {
            const meta = EXERCISE_LABELS[e.name] || { label: e.name };
            const row = document.createElement('div');
            row.className = 'weekly-row';
            row.innerHTML = '<span>' + meta.label + '</span><span class="count">' + e.count + 'x</span>';
            exList.appendChild(row);
        });
    }

    // Weather pattern list
    const wxEntries = Object.keys(weatherCounts)
        .map(k => ({ key: k, count: weatherCounts[k] }))
        .sort((a, b) => b.count - a.count);
    wxList.innerHTML = '';
    if (wxEntries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'weekly-empty';
        empty.textContent = 'No inner-weather check-ins yet this week.';
        wxList.appendChild(empty);
    } else {
        wxEntries.slice(0, 4).forEach(w => {
            const row = document.createElement('div');
            row.className = 'weekly-row';
            const lbl = WEATHER_LABELS[w.key] || w.key;
            row.innerHTML = '<span>' + lbl + '</span><span class="count">' + w.count + ' day' + (w.count === 1 ? '' : 's') + '</span>';
            wxList.appendChild(row);
        });
    }

    // Warm, personal narrative of the week's weather + showing up.
    headline.textContent = buildWeeklyNarrative(wxEntries, showedUpDays);
}
window.updateWeeklyReportUI = updateWeeklyReportUI;

// ============================================
// Weekly Summary — a reflective, rolling check-in.
// Free-text reflection (good / not-so-good / problem-solving) plus a small
// to-do list for the week ahead. Everything autosaves to localStorage and the
// to-do list rolls over: unfinished items simply stay until you clear them.
// ============================================
const WEEKLY_REFLECTION_KEY = 'cowch_weekly_reflection';
const WEEKLY_TODOS_KEY = 'cowch_weekly_todos';
const REFLECTION_FIELDS = { good: 'summary-good', tough: 'summary-tough', solve: 'summary-solve' };

// Words/phrases in the "something that wasn't so good" reflection that suggest
// the week genuinely weighed on the person. When one shows up we gently offer
// a chat with Mandy — see maybeOfferMandyChat(). The field is negative-only by
// design, so we lean toward stronger distress signals rather than mild grumbles.
const DISTRESS_SIGNALS = [
    'overwhelm', "can't cope", 'cant cope', "can't go on", 'cant go on',
    'anxious', 'anxiety', 'panic', 'depress', 'hopeless', 'worthless',
    'lonely', 'so alone', 'all alone', 'scared', 'afraid', 'terrified',
    'crying', 'cried', 'in tears', 'breaking down', 'broke down', 'broken',
    'exhausted', 'burnt out', 'burned out', 'burnout', 'stressed', 'stress',
    'struggling', 'struggle', 'awful', 'terrible', 'unbearable', "can't sleep",
    'cant sleep', 'falling apart', 'fell apart', 'give up', 'giving up',
    'too much', 'numb', 'grief', 'grieving', 'ashamed', 'no point',
    'hate myself', 'dread', 'despair', 'devastated', 'heartbroken'
];

// True if the "tough" reflection text sounds distressing enough to offer support.
function summaryToughSoundsDistressing(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return DISTRESS_SIGNALS.some(word => lower.indexOf(word) !== -1);
}

// Remember the exact reflection text we last prompted on, so the popup doesn't
// reappear every time the field loses focus without a change.
let _mandyCheckinPromptedFor = '';

// If the "tough" reflection sounds distressing, surface the "chat to Mandy?"
// popup. Dismissible and shown at most once per distinct piece of text.
function maybeOfferMandyChat() {
    const el = document.getElementById('summary-tough');
    if (!el) return;
    const text = el.value.trim();
    if (!text || text === _mandyCheckinPromptedFor) return;
    if (!summaryToughSoundsDistressing(text)) return;
    const modal = document.getElementById('mandy-checkin-modal');
    if (!modal) return;
    _mandyCheckinPromptedFor = text;
    modal.classList.add('active');
}

function loadWeeklyReflection() {
    try { return JSON.parse(localStorage.getItem(WEEKLY_REFLECTION_KEY) || '{}') || {}; }
    catch (_) { return {}; }
}
function saveWeeklyReflection(data) {
    try { localStorage.setItem(WEEKLY_REFLECTION_KEY, JSON.stringify(data)); } catch (_) {}
}
function loadWeeklyTodos() {
    try {
        const t = JSON.parse(localStorage.getItem(WEEKLY_TODOS_KEY) || '[]');
        return Array.isArray(t) ? t : [];
    } catch (_) { return []; }
}
function saveWeeklyTodos(todos) {
    try { localStorage.setItem(WEEKLY_TODOS_KEY, JSON.stringify(todos)); } catch (_) {}
}

function flashWeeklySaved() {
    const el = document.getElementById('summary-saved');
    if (!el) return;
    el.textContent = 'Saved ✓';
    el.classList.add('show');
    clearTimeout(flashWeeklySaved._t);
    flashWeeklySaved._t = setTimeout(() => { el.classList.remove('show'); }, 1600);
}

// Build a warm one-line recap of how active the week has been, reusing the
// same data that powers Week in Bloom.
function buildSummaryHighlights() {
    const weekDays = weeklyDaysWindow();
    const inWeek = (ts) => {
        if (!ts) return false;
        const d = new Date(ts);
        return !isNaN(d.getTime()) && weekDays.has(streakDayKey(d));
    };

    const showedUpDays = gatherActiveDays(7).size;

    let checkins = 0;
    try {
        checkins = JSON.parse(localStorage.getItem('innerWeatherHistory') || '[]')
            .filter(c => c && inWeek(c.timestamp)).length;
    } catch (_) {}

    const exCounts = {};
    let exTotal = 0;
    loadActivityLog().forEach(e => {
        if (!e || !e.name || !inWeek(e.at)) return;
        exCounts[e.name] = (exCounts[e.name] || 0) + 1;
        exTotal++;
    });
    let topEx = null, topCount = 0;
    Object.keys(exCounts).forEach(k => { if (exCounts[k] > topCount) { topCount = exCounts[k]; topEx = k; } });

    // Always lead with the exact number of times shown up — matching the
    // pasture's "shown up X times" wording — so the count is never vague.
    let sentence = 'This week you&rsquo;ve shown up <strong>' + showedUpDays +
        '</strong> time' + (showedUpDays === 1 ? '' : 's');

    const extra = [];
    if (checkins) extra.push(checkins === 1 ? 'checked in once' : 'checked in ' + checkins + ' times');
    if (exTotal) extra.push(exTotal === 1 ? 'done 1 exercise' : 'done ' + exTotal + ' exercises');
    if (extra.length === 1) {
        sentence += ', and ' + extra[0] + '.';
    } else if (extra.length === 2) {
        sentence += ', ' + extra[0] + ' and ' + extra[1] + '.';
    } else {
        sentence += '.';
    }

    if (!showedUpDays && !checkins && !exTotal) {
        sentence += ' Open the app any day this week and the rest fills in here.';
    }

    if (topEx && topCount > 1) {
        const meta = (typeof EXERCISE_LABELS !== 'undefined' && EXERCISE_LABELS[topEx]) || { label: topEx };
        sentence += ' You came back to <strong>' + meta.label + '</strong> the most.';
    }
    return sentence;
}

function renderWeeklyTodos() {
    const list = document.getElementById('summary-todo-list');
    const clearBtn = document.getElementById('summary-clear-done');
    if (!list) return;
    const todos = loadWeeklyTodos();
    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    list.innerHTML = '';
    if (!todos.length) {
        const empty = document.createElement('div');
        empty.className = 'summary-todo-empty';
        empty.textContent = 'Nothing here yet — add a small plan for the week ahead.';
        list.appendChild(empty);
    } else {
        todos.forEach(t => {
            const row = document.createElement('div');
            row.className = 'summary-todo-row' + (t.done ? ' is-done' : '');
            row.innerHTML =
                '<button type="button" class="summary-todo-check" data-id="' + t.id + '" ' +
                    'aria-label="' + (t.done ? 'Mark as not done' : 'Mark as done') + '" ' +
                    'aria-pressed="' + (t.done ? 'true' : 'false') + '">✓</button>' +
                '<span class="summary-todo-text">' + esc(t.text) + '</span>' +
                '<button type="button" class="summary-todo-remove" data-id="' + t.id + '" aria-label="Remove">✕</button>';
            list.appendChild(row);
        });
    }
    if (clearBtn) clearBtn.hidden = !todos.some(t => t.done);
}

// Populate the summary card from storage. Called on init and each time the
// You tab is opened. Avoids clobbering a field the user is actively editing.
function updateWeeklySummaryUI() {
    const card = document.getElementById('summary-card');
    if (!card) return;

    const range = document.getElementById('summary-range');
    if (range) {
        const today = new Date();
        const start = new Date(today); start.setDate(start.getDate() - 6);
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        range.textContent = fmt(start) + ' – ' + fmt(today);
    }

    const highlights = document.getElementById('summary-highlights');
    if (highlights) highlights.innerHTML = buildSummaryHighlights();

    const data = loadWeeklyReflection();
    Object.keys(REFLECTION_FIELDS).forEach(key => {
        const el = document.getElementById(REFLECTION_FIELDS[key]);
        if (el && el !== document.activeElement) el.value = data[key] || '';
    });

    renderWeeklyTodos();

    // Keep the Your-Space entry block's subtitle in step with the summary.
    const blockSub = document.getElementById('summary-block-sub');
    if (blockSub) {
        const pending = loadWeeklyTodos().filter(t => t && !t.done).length;
        const started = Object.keys(REFLECTION_FIELDS).some(k => (data[k] || '').trim());
        blockSub.textContent = pending > 0
            ? pending + (pending === 1 ? ' plan' : ' plans') + ' for the week ahead — tap to review'
            : (started ? 'Tap to add to this week’s reflection'
                       : 'Reflect on your week and set intentions');
    }
}
window.updateWeeklySummaryUI = updateWeeklySummaryUI;

// Wire the Your-Space entry block to open the Weekly Summary on its own screen.
function setupSummaryPanel() {
    const block = document.getElementById('summary-block');
    const panel = document.getElementById('summary-panel');
    const back = document.getElementById('summary-panel-back');
    if (!block || !panel) return;
    if (!block.dataset.wired) {
        block.dataset.wired = '1';
        block.addEventListener('click', () => {
            updateWeeklySummaryUI();          // refresh with the latest before opening
            panel.classList.add('active');
        });
    }
    if (back && !back.dataset.wired) {
        back.dataset.wired = '1';
        back.addEventListener('click', () => panel.classList.remove('active'));
    }
}
window.setupSummaryPanel = setupSummaryPanel;

// ============================================
// IMAGINE palette + pasture flowers. Each of the seven areas has a fixed
// colour (shared with the home letters, domain cards and tracker). Doing an
// IMAGINE exercise plants a flower of that area's colour in the Progress
// Pasture, so the garden becomes a living picture of where attention has
// gone — a sparse colour is a gentle invitation, never a scolding.
// ============================================
const IMAGINE_ENGAGEMENT_KEY = 'cowch_imagine_engagement';

// Keys match the engagement store (Interactions = I2). The displayed letter is
// the first character, so I2 shows as "I".
const IMAGINE_PALETTE = {
    I:  '#E87EA8',   // I, Me, Myself — pink
    M:  '#5BB4E0',   // Mindfulness   — light blue
    A:  '#9C7CD4',   // Acceptance    — purple
    G:  '#34B7AE',   // Gratitude     — turquoise
    I2: '#F2C13D',   // Interactions  — yellow
    N:  '#E8923C',   // Nurturing     — orange
    E:  '#9AA84B'    // Exploring     — olive
};
const IMAGINE_LEGEND = [
    { key: 'I',  label: 'I, Me, Myself' },
    { key: 'M',  label: 'Mindfulness' },
    { key: 'A',  label: 'Acceptance' },
    { key: 'G',  label: 'Gratitude' },
    { key: 'I2', label: 'Interactions' },
    { key: 'N',  label: 'Nurturing' },
    { key: 'E',  label: 'Exploring' }
];

function loadImagineEngagement() {
    try {
        const d = JSON.parse(localStorage.getItem(IMAGINE_ENGAGEMENT_KEY) || '{}');
        return (d && typeof d === 'object') ? d : {};
    } catch (_) { return {}; }
}

// High-water mark per area: the latest engagement timestamp already turned into
// a flower, so each exercise plants exactly one flower (and we never replant
// the same one even after the 30-day engagement log prunes it).
const PASTURE_IMAGINE_HW_KEY = 'cowch-pasture-imagine-hw';
const PASTURE_IMAGINE_CAP = 12;   // max flowers per area, to avoid overcrowding

function loadPastureImagineHW() {
    try {
        const v = JSON.parse(localStorage.getItem(PASTURE_IMAGINE_HW_KEY) || '{}');
        return (v && typeof v === 'object') ? v : {};
    } catch (_) { return {}; }
}

// Turn any new IMAGINE engagements into colour-coded flowers. Additive only
// (flowers are never removed automatically) and capped per area. On a user's
// first run after this lands, the high-water marks are empty, so their recent
// history backfills into an initial bloom.
function syncImagineFlowers() {
    const data = loadImagineEngagement();
    const hw = loadPastureImagineHW();
    const items = loadPastureItems();
    const existing = {};
    items.forEach(it => { if (it.letter) existing[it.letter] = (existing[it.letter] || 0) + 1; });
    const cowPos = (typeof loadCowPos === 'function') ? loadCowPos() : null;

    let planted = 0, hwChanged = false;
    Object.keys(IMAGINE_PALETTE).forEach(letter => {
        const raw = Array.isArray(data[letter]) ? data[letter].filter(t => typeof t === 'number') : [];
        if (!raw.length) return;
        raw.sort((a, b) => a - b);
        const fresh = raw.filter(t => t > (hw[letter] || 0));
        if (!fresh.length) return;
        hwChanged = true;
        const room = Math.max(0, PASTURE_IMAGINE_CAP - (existing[letter] || 0));
        const toPlant = Math.min(fresh.length, room);
        for (let i = 0; i < toPlant; i++) {
            const pos = randomPasturePosition(items, cowPos);
            items.push({
                id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
                type: 'flower',
                letter: letter,
                x: pos.x,
                y: pos.y,
                scale: 0.92 + Math.random() * 0.3,
                addedAt: new Date().toISOString()
            });
            planted++;
        }
        hw[letter] = raw[raw.length - 1]; // advance past everything seen, even if capped
    });
    if (planted > 0) savePastureItems(items);
    if (hwChanged) { try { localStorage.setItem(PASTURE_IMAGINE_HW_KEY, JSON.stringify(hw)); } catch (_) {} }
    return planted;
}

// The little colour key under the pasture, so it's clear which colour is which
// part of IMAGINE.
function renderPastureLegend() {
    const grid = document.getElementById('pasture-legend-grid');
    if (!grid) return;
    grid.innerHTML = '';
    IMAGINE_LEGEND.forEach(d => {
        const row = document.createElement('div');
        row.className = 'pasture-legend-item';
        row.innerHTML =
            '<span class="pasture-legend-swatch" style="background:' + IMAGINE_PALETTE[d.key] + ';"></span>' +
            '<span class="pasture-legend-letter">' + d.key.charAt(0) + '</span>' +
            '<span class="pasture-legend-label">' + d.label + '</span>';
        grid.appendChild(row);
    });
}

// Teaser row of the seven colours on the Your-Space entry block.
function renderPastureBlockDots() {
    const dots = document.getElementById('pasture-block-dots');
    if (!dots) return;
    dots.innerHTML = '';
    IMAGINE_LEGEND.forEach(d => {
        const i = document.createElement('i');
        i.style.background = IMAGINE_PALETTE[d.key];
        dots.appendChild(i);
    });
}

// Wire the Your-Space entry block to open the full pasture on its own screen.
function setupPasturePanel() {
    const block = document.getElementById('pasture-block');
    const panel = document.getElementById('pasture-panel');
    const back = document.getElementById('pasture-panel-back');
    if (!block || !panel) return;
    renderPastureBlockDots();
    renderPastureLegend();
    if (!block.dataset.wired) {
        block.dataset.wired = '1';
        block.addEventListener('click', () => {
            updatePastureUI();              // sync + render with the latest data
            panel.classList.add('active');
        });
    }
    if (back && !back.dataset.wired) {
        back.dataset.wired = '1';
        back.addEventListener('click', () => panel.classList.remove('active'));
    }
}
window.setupPasturePanel = setupPasturePanel;

// Wire up the summary card once. Autosaves reflection text and manages the
// rolling to-do list.
function setupWeeklySummary() {
    const card = document.getElementById('summary-card');
    if (!card || card.dataset.wired) return;
    card.dataset.wired = '1';

    // Autosave reflection fields (debounced) on input.
    Object.keys(REFLECTION_FIELDS).forEach(key => {
        const el = document.getElementById(REFLECTION_FIELDS[key]);
        if (!el) return;
        el.addEventListener('input', () => {
            clearTimeout(el._saveTimer);
            el._saveTimer = setTimeout(() => {
                const data = loadWeeklyReflection();
                data[key] = el.value;
                data.updatedAt = Date.now();
                saveWeeklyReflection(data);
                flashWeeklySaved();
            }, 500);
        });
    });

    // Add a new to-do.
    const form = document.getElementById('summary-todo-form');
    const input = document.getElementById('summary-todo-input');
    if (form && input) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;
            const todos = loadWeeklyTodos();
            todos.push({ id: 'td' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, done: false, createdAt: Date.now() });
            saveWeeklyTodos(todos);
            input.value = '';
            renderWeeklyTodos();
            flashWeeklySaved();
        });
    }

    // Toggle / remove via delegation.
    const list = document.getElementById('summary-todo-list');
    if (list) {
        list.addEventListener('click', (e) => {
            const checkBtn = e.target.closest('.summary-todo-check');
            const removeBtn = e.target.closest('.summary-todo-remove');
            if (checkBtn) {
                const id = checkBtn.dataset.id;
                const todos = loadWeeklyTodos();
                const t = todos.find(x => x.id === id);
                if (t) { t.done = !t.done; t.completedAt = t.done ? Date.now() : null; }
                saveWeeklyTodos(todos);
                renderWeeklyTodos();
            } else if (removeBtn) {
                const id = removeBtn.dataset.id;
                saveWeeklyTodos(loadWeeklyTodos().filter(x => x.id !== id));
                renderWeeklyTodos();
            }
        });
    }

    // Clear completed items.
    const clearBtn = document.getElementById('summary-clear-done');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            saveWeeklyTodos(loadWeeklyTodos().filter(t => !t.done));
            renderWeeklyTodos();
            flashWeeklySaved();
        });
    }

    // When the person finishes writing about something that wasn't so good and
    // it sounds distressing, gently offer to chat it through with Mandy.
    const toughEl = document.getElementById(REFLECTION_FIELDS.tough);
    if (toughEl) {
        // Small delay so debounced autosave settles before we check the text.
        toughEl.addEventListener('blur', () => setTimeout(maybeOfferMandyChat, 200));
    }

    const mandyModal = document.getElementById('mandy-checkin-modal');
    if (mandyModal) {
        const close = () => mandyModal.classList.remove('active');
        const yesBtn = document.getElementById('mandy-checkin-yes');
        const noBtn = document.getElementById('mandy-checkin-no');

        if (yesBtn) yesBtn.addEventListener('click', () => {
            close();
            const tough = (document.getElementById('summary-tough') || {}).value || '';
            const prompt = tough.trim()
                ? `In my weekly summary I wrote that something that wasn't so good was: "${tough.trim()}". Can we talk it through?`
                : "Something this week wasn't so good and I'd like to talk it through.";
            switchTab('chat');
            // Let the chat tab mount before sending (mirrors triggerChatWithPrompt).
            setTimeout(() => {
                if (window.triggerChatPrompt) window.triggerChatPrompt(prompt);
                else if (typeof triggerChatPrompt === 'function') triggerChatPrompt(prompt);
            }, 300);
        });

        if (noBtn) noBtn.addEventListener('click', close);
        // Tap the backdrop to dismiss.
        mandyModal.addEventListener('click', (e) => { if (e.target === mandyModal) close(); });
    }
}
window.setupWeeklySummary = setupWeeklySummary;

// ============================================
// Patterns I'm noticing — gentle, non-judgmental reflections from the week
// ============================================
function buildWeeklyPatterns() {
    const weekDays = weeklyDaysWindow();
    const inWeek = (ts) => {
        if (!ts) return false;
        const d = new Date(ts);
        return !isNaN(d.getTime()) && weekDays.has(streakDayKey(d));
    };

    let checkins = [];
    try { checkins = JSON.parse(localStorage.getItem('innerWeatherHistory') || '[]'); } catch (_) {}
    const weekCheckins = checkins.filter(c => c && inWeek(c.timestamp));
    const wxCounts = {};
    let hardDays = 0;
    weekCheckins.forEach(c => {
        wxCounts[c.weather] = (wxCounts[c.weather] || 0) + 1;
        if (HARD_WEATHER.indexOf(c.weather) !== -1) hardDays++;
    });
    const wxSorted = Object.keys(wxCounts).map(k => ({ key: k, count: wxCounts[k] })).sort((a, b) => b.count - a.count);

    const exCounts = {};
    try {
        JSON.parse(localStorage.getItem('cowch-activity-v1') || '[]').forEach(e => {
            if (e && e.name && inWeek(e.at)) exCounts[e.name] = (exCounts[e.name] || 0) + 1;
        });
    } catch (_) {}
    const exSorted = Object.keys(exCounts).map(k => ({ name: k, count: exCounts[k] })).sort((a, b) => b.count - a.count);

    const showedUp = gatherActiveDays(7).size;
    const patterns = [];

    // Dominant weather
    if (wxSorted[0] && wxSorted[0].count >= 2) {
        const adj = WEATHER_WORDS[wxSorted[0].key] || wxSorted[0].key;
        const cap = adj.charAt(0).toUpperCase() + adj.slice(1);
        patterns.push({ emoji: '☁️', text: cap + ' weather visited often this week.' });
    }

    // A calming exercise leaned on during hard-weather days
    const calming = ['grounding-54321', 'box-breathing', 'body-scan'];
    const calmingUsed = exSorted.find(e => calming.indexOf(e.name) !== -1);
    if (hardDays >= 1 && calmingUsed) {
        const label = (EXERCISE_LABELS[calmingUsed.name] || { label: calmingUsed.name }).label;
        patterns.push({ emoji: '🌿', text: label + ' helped on the harder days.' });
    }

    // Most-used exercise (if different from the calming one already noted)
    if (exSorted[0] && exSorted[0].count >= 2 && (!calmingUsed || exSorted[0].name !== calmingUsed.name)) {
        const label = (EXERCISE_LABELS[exSorted[0].name] || { label: exSorted[0].name }).label;
        patterns.push({ emoji: '🔁', text: label + ' was something you kept reaching for.' });
    }

    // Showing up steadily
    if (showedUp >= 5) {
        patterns.push({ emoji: '🌱', text: 'You showed up most days — that steadiness adds up.' });
    }

    // Day-of-week dip
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const lowByDow = [0, 0, 0, 0, 0, 0, 0], totByDow = [0, 0, 0, 0, 0, 0, 0];
    weekCheckins.forEach(c => {
        const dow = new Date(c.timestamp).getDay();
        totByDow[dow]++;
        if (HARD_WEATHER.indexOf(c.weather) !== -1) lowByDow[dow]++;
    });
    for (let i = 0; i < 7; i++) {
        if (totByDow[i] >= 2 && lowByDow[i] === totByDow[i]) {
            patterns.push({ emoji: '📅', text: dayNames[i] + 's tended to feel heavier — worth a gentle eye.' });
            break;
        }
    }

    return patterns.slice(0, 3);
}

function updatePatternsUI() {
    const card = document.getElementById('patterns-card');
    if (!card) return;
    const list = document.getElementById('patterns-list');
    const patterns = buildWeeklyPatterns();
    list.innerHTML = '';
    if (patterns.length === 0) {
        const e = document.createElement('div');
        e.className = 'patterns-empty';
        e.textContent = 'As you check in over the week, I’ll gently reflect any patterns back to you here.';
        list.appendChild(e);
        return;
    }
    patterns.forEach(p => {
        const row = document.createElement('div');
        row.className = 'pattern-item';
        row.innerHTML = '<span class="pattern-emoji">' + p.emoji + '</span><span class="pattern-text">' + p.text + '</span>';
        list.appendChild(row);
    });
}
window.updatePatternsUI = updatePatternsUI;

// ============================================
// Daily reminders (gentle, customizable, 1–2/day, snoozable)
// ============================================
const REMINDERS_KEY = 'cowch-reminders-v1';
const REMINDER_NUDGES = {
    morning: [
        { title: "How's your inner weather today? ☁️", body: "A 30-second check-in is waiting on the Cowch." },
        { title: "Good morning 🌤️", body: "One small notice for yourself — what are you carrying today?" },
        { title: "Soft start ✨", body: "Tap in for a one-minute reset before the day picks up speed." }
    ],
    evening: [
        { title: "3-minute grounding waiting for you 🌿", body: "Wind down with 5-4-3-2-1 grounding or a body scan." },
        { title: "Pause for a moment 🌙", body: "What was kind to you today? Add one gratitude star." },
        { title: "End of day check-in 💝", body: "Inner weather, a tiny win, or just hello — no pressure." }
    ]
};

function remindersLoad() {
    try {
        const raw = localStorage.getItem(REMINDERS_KEY);
        if (raw) return Object.assign(remindersDefault(), JSON.parse(raw));
    } catch (_) {}
    return remindersDefault();
}
function remindersDefault() {
    return {
        enabled: false,
        morning: { on: true,  time: '09:00' },
        evening: { on: false, time: '20:00' },
        snoozeUntil: 0
    };
}
function remindersSave(s) {
    try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(s)); } catch (_) {}
}

let reminderTimers = [];
function clearReminderTimers() {
    reminderTimers.forEach(t => clearTimeout(t));
    reminderTimers = [];
}
function nextOccurrence(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
}
function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function fireReminder(slot) {
    const nudge = pickRandom(REMINDER_NUDGES[slot]);
    const opts = {
        body: nudge.body,
        icon: '/apple-touch-icon.png',
        badge: '/icons/icon-96x96.svg',
        tag: 'cowch-' + slot,
        requireInteraction: false,
        data: { url: '/app.html' }
    };
    try {
        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                reg.showNotification(nudge.title, opts);
                return;
            }
        }
        if (Notification.permission === 'granted') {
            new Notification(nudge.title, opts);
        }
    } catch (_) {}
}

// Server-driven push: pushes the latest prefs + the browser's PushSubscription
// up to /api/push/subscribe so the cron dispatcher can reach the device when
// the app isn't open. Safe no-op if push isn't supported or VAPID isn't set.
function urlBase64ToUint8Array(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

async function syncPushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();

        if (!sub) {
            // No subscription yet — fetch the VAPID public key + create one
            let publicKey;
            try {
                const r = await fetch('/api/push/keys');
                if (!r.ok) return; // push not configured server-side
                const j = await r.json();
                publicKey = j && j.publicKey;
            } catch (_) { return; }
            if (!publicKey) return;
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });
        }

        const s = remindersLoad();
        const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
        await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subscription: sub.toJSON(),
                prefs: {
                    enabled: s.enabled,
                    morning: s.morning,
                    evening: s.evening,
                    snoozeUntil: s.snoozeUntil,
                    tz
                }
            })
        });
    } catch (err) {
        // Browser/permission/network noise — swallowed on purpose; the
        // page-side setTimeout fallback in scheduleRemindersForToday() will
        // still deliver while the tab is open.
        console.warn('push subscribe failed (continuing with local timers):', err);
    }
}

async function removePushSubscription() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint })
        });
    } catch (_) {}
}

function scheduleRemindersForToday() {
    clearReminderTimers();
    // Always try to sync server-side push first — that's the reliable path
    // even when the app isn't open. We then fall back to in-page setTimeouts
    // as a best-effort layer while the tab is alive.
    const s = remindersLoad();
    if (s.enabled) {
        syncPushSubscription();
    } else {
        removePushSubscription();
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!s.enabled) return;
    if (s.snoozeUntil && Date.now() < s.snoozeUntil) return;

    const queue = [];
    if (s.morning.on) queue.push({ slot: 'morning', when: nextOccurrence(s.morning.time) });
    if (s.evening.on) queue.push({ slot: 'evening', when: nextOccurrence(s.evening.time) });

    queue.forEach(q => {
        const ms = q.when - new Date();
        // Cap at 24h so we always re-evaluate on the next app open
        const delay = Math.min(ms, 1000 * 60 * 60 * 24);
        const id = setTimeout(() => fireReminder(q.slot), delay);
        reminderTimers.push(id);
    });
}

function nextScheduledReminder() {
    const s = remindersLoad();
    if (!s.enabled) return null;
    if (s.snoozeUntil && Date.now() < s.snoozeUntil) {
        return { snoozed: true, snoozeUntil: s.snoozeUntil };
    }
    const candidates = [];
    if (s.morning.on) candidates.push({ slot: 'morning', when: nextOccurrence(s.morning.time) });
    if (s.evening.on) candidates.push({ slot: 'evening', when: nextOccurrence(s.evening.time) });
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.when - b.when);
    return candidates[0];
}

function setupReminders() {
    const card = document.getElementById('reminders-card');
    if (!card) return;

    const master   = document.getElementById('reminders-master');
    const mTime    = document.getElementById('reminder-morning-time');
    const mOn      = document.getElementById('reminder-morning-on');
    const eTime    = document.getElementById('reminder-evening-time');
    const eOn      = document.getElementById('reminder-evening-on');
    const permBox  = document.getElementById('reminders-perm');
    const permBtn  = document.getElementById('reminders-perm-btn');
    const permMsg  = document.getElementById('reminders-perm-msg');
    const snoozeBtn = document.getElementById('reminder-snooze');
    const testBtn   = document.getElementById('reminder-test');
    const statusEl  = document.getElementById('reminder-status');

    function paintToggle(btn, on) {
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
    }

    function paint() {
        const s = remindersLoad();
        paintToggle(master, s.enabled);
        paintToggle(mOn, s.morning.on);
        paintToggle(eOn, s.evening.on);
        mTime.value = s.morning.time;
        eTime.value = s.evening.time;

        const supported = 'Notification' in window;
        if (!supported) {
            permBox.hidden = false;
            permMsg.textContent = 'This device doesn’t support notifications.';
            if (permBtn) permBtn.style.display = 'none';
        } else if (Notification.permission === 'granted') {
            permBox.hidden = true;
        } else if (Notification.permission === 'denied') {
            permBox.hidden = false;
            permMsg.textContent = 'Notifications are blocked for this site. Enable them in your browser settings to receive gentle reminders.';
            if (permBtn) permBtn.style.display = 'none';
        } else {
            permBox.hidden = !s.enabled;
            permMsg.textContent = 'Notifications need permission to reach you. Tap below to grant.';
            if (permBtn) permBtn.style.display = '';
        }

        if (snoozeBtn) {
            const snoozed = s.snoozeUntil && Date.now() < s.snoozeUntil;
            snoozeBtn.classList.toggle('active', !!snoozed);
            snoozeBtn.innerHTML = snoozed
                ? '✓ Snoozed until tomorrow'
                : '😴 Snooze for today';
        }

        // Status line — gives a clear "yes, this is wired up" signal
        if (statusEl) {
            statusEl.classList.remove('is-warn');
            if (!supported) {
                statusEl.textContent = 'Reminders aren’t supported in this browser.';
                statusEl.classList.add('is-warn');
            } else if (Notification.permission === 'denied') {
                statusEl.textContent = 'Reminders are blocked. Open browser settings and allow notifications for this site.';
                statusEl.classList.add('is-warn');
            } else if (!s.enabled) {
                statusEl.textContent = 'Reminders are off. Flip the switch above to start receiving them.';
                statusEl.classList.add('is-warn');
            } else if (Notification.permission !== 'granted') {
                statusEl.textContent = 'Reminders are on but need notification permission — tap “Allow notifications” above.';
                statusEl.classList.add('is-warn');
            } else {
                const next = nextScheduledReminder();
                if (!next) {
                    statusEl.textContent = 'No times selected. Toggle Morning or Evening above.';
                    statusEl.classList.add('is-warn');
                } else if (next.snoozed) {
                    const until = new Date(next.snoozeUntil);
                    statusEl.textContent = 'Snoozed until ' + until.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' tomorrow.';
                } else {
                    const when = next.when;
                    const sameDay = when.toDateString() === new Date().toDateString();
                    const whenLabel = sameDay ? 'today' : 'tomorrow';
                    const time = when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    statusEl.textContent = 'Next ' + next.slot + ' reminder ' + whenLabel + ' at ' + time + '.';
                }
            }
        }

        if (testBtn) {
            const canTest = supported && Notification.permission === 'granted';
            testBtn.disabled = !canTest;
            testBtn.title = canTest
                ? 'Send yourself a test reminder right now'
                : 'Grant notification permission first';
        }
    }

    function save(updater) {
        const s = remindersLoad();
        updater(s);
        remindersSave(s);
        scheduleRemindersForToday();
        paint();
    }

    // Master toggle: when turning ON, request permission FIRST so we don't
    // end up in a half-enabled state where the user thinks reminders are
    // running but the browser is silently dropping them.
    async function handleMasterToggle() {
        const currently = remindersLoad().enabled;
        if (!currently) {
            // Turning on
            if ('Notification' in window && Notification.permission === 'default') {
                const result = await Notification.requestPermission();
                if (result !== 'granted') {
                    // Permission denied or dismissed — leave enabled flag off so
                    // status copy stays accurate
                    paint();
                    return;
                }
            }
            save(s => { s.enabled = true; });
        } else {
            save(s => { s.enabled = false; });
        }
    }
    master.addEventListener('click', handleMasterToggle);

    mOn.addEventListener('click', () => save(s => { s.morning.on = !s.morning.on; }));
    eOn.addEventListener('click', () => save(s => { s.evening.on = !s.evening.on; }));
    mTime.addEventListener('change', () => save(s => { s.morning.time = mTime.value; }));
    eTime.addEventListener('change', () => save(s => { s.evening.time = eTime.value; }));

    permBtn.addEventListener('click', () => {
        if (!('Notification' in window)) return;
        Notification.requestPermission().then(() => {
            paint();
            scheduleRemindersForToday();
        });
    });

    if (snoozeBtn) {
        snoozeBtn.addEventListener('click', () => {
            const s = remindersLoad();
            const snoozed = s.snoozeUntil && Date.now() < s.snoozeUntil;
            if (snoozed) {
                save(x => { x.snoozeUntil = 0; });
            } else {
                const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(4, 0, 0, 0);
                save(x => { x.snoozeUntil = t.getTime(); });
            }
        });
    }

    if (testBtn) {
        testBtn.addEventListener('click', async () => {
            if (!('Notification' in window)) return;
            if (Notification.permission === 'default') {
                const res = await Notification.requestPermission();
                if (res !== 'granted') { paint(); return; }
            }
            if (Notification.permission !== 'granted') { paint(); return; }
            const original = testBtn.textContent;
            testBtn.disabled = true;
            testBtn.textContent = '✓ Sent — check your tray';
            await fireReminder('morning');
            setTimeout(() => {
                testBtn.textContent = original;
                paint();
            }, 2500);
        });
    }

    paint();
    scheduleRemindersForToday();
}
window.setupReminders = setupReminders;

// ============================================
// IMAGINE Framework Data & Domain Panel
// ============================================

const IMAGINE_DOMAINS = {
    self: {
        letter: 'I',
        title: 'I, Me, Myself',
        subtitle: 'Self-care, boundaries & compassion',
        color: '#E87EA8',
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
        color: '#5BB4E0',
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
        color: '#9C7CD4',
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
        color: '#34B7AE',
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
        color: '#F2C13D',
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
        color: '#E8923C',
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
        color: '#9AA84B',
        description: 'Growth happens at the edge of your comfort zone. These exercises help you gently stretch your boundaries and build tolerance for uncertainty.',
        exercises: [
            { title: 'What\'s Protecting You... and Limiting You?', description: 'Identify behaviours that block growth', prompt: 'Can you help me spot my safety behaviours? I want to notice what I do to avoid discomfort and what it might be costing me.' },
            { title: 'Grow Without Overwhelm', description: 'Try something 10% more challenging', prompt: 'Can you guide me through the 10% stretch exercise? I want to gently push my comfort zone without overwhelming myself.' },
            { title: 'Investigate Instead of Assuming', description: 'Replace anxious predictions with curiosity', prompt: "Can you help me be a curious detective? I have a situation where I'm assuming the worst and want to gather real evidence instead." },
            { title: 'Uncertainty Ladder', description: 'Build tolerance for uncertainty in gradual steps', interactive: 'ladder', prompt: 'Can you help me with the uncertainty ladder? I want to practice tolerating uncertainty in small, manageable steps.' },
            { title: 'Inner Weather Report', description: 'Check in with your internal state without judgment', duration: '3 min', interactive: 'weather', prompt: "Can you guide me through an inner weather report? I want to explore what's happening inside me right now." },
            { title: 'Trigger Mapping', description: 'Map what triggered you so it feels clearer and more manageable', duration: '5 min', interactive: 'trigger', prompt: 'I feel triggered or overwhelmed. Can you help me map what just happened step by step?' }
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
            if (window.triggerChatPrompt) {
                window.triggerChatPrompt(prompt);
            } else if (typeof triggerChatPrompt === 'function') {
                triggerChatPrompt(prompt);
            }
        }, 300);
    }

    // Make closeDomainPanel available globally for external use
    window.closeDomainPanel = closeDomainPanel;
}

// ============================================
// Chat - delegated to chat-script.js via initChat()
// ============================================

// ============================================
// Questionnaires
// ============================================

function setupQuickCheckin() {
    var btn = document.getElementById('open-questionnaires');
    if (!btn) return;
    btn.addEventListener('click', function () {
        window.location.href = '/questionnaires/';
    });
}

// ============================================
// Clear History
// ============================================

function setupClearHistory() {
    document.getElementById('clear-btn').addEventListener('click', () => {
        if (window.handleClearChat) {
            window.handleClearChat();
        }
    });

    // New Chat button in chat header
    document.getElementById('new-chat-btn').addEventListener('click', () => {
        if (window.handleClearChat) {
            window.handleClearChat();
        }
    });
}

// ============================================
// Settings Buttons
// ============================================

function isInStandaloneMode() {
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: standalone)').matches;
}

function setupSettingsButtons() {
    // Show install button on every platform unless already installed.
    // Routes through the unified PWA install guide (window.CowchInstall).
    const installBtn = document.getElementById('settings-install-btn');
    if (installBtn && !isInStandaloneMode()) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', () => {
            if (window.CowchInstall && window.CowchInstall.openGuide) {
                window.CowchInstall.openGuide();
            }
        });
    }

    // Privacy button — open the full Privacy Policy page
    const privacyBtn = document.getElementById('privacy-btn');
    if (privacyBtn) {
        privacyBtn.addEventListener('click', () => {
            window.location.href = '/privacy.html';
        });
    }

    // About button — open the dedicated About page
    const aboutBtn = document.getElementById('about-btn');
    if (aboutBtn) {
        aboutBtn.addEventListener('click', () => {
            window.location.href = '/about.html';
        });
    }

    // Theme picker — peachy / warm / cool
    setupThemePicker();

    // Build version stamp + "check for updates / clear cache" control
    setupAppVersion();
    setupForceRefresh();
}

// Ask the active service worker which build it is, over a MessageChannel.
// Resolves to { version, buildDate } or null if there's no SW / it doesn't
// answer (e.g. an older SW that predates the GET_VERSION handler).
function getActiveSwVersion() {
    return new Promise((resolve) => {
        const ctrl = navigator.serviceWorker && navigator.serviceWorker.controller;
        if (!ctrl) { resolve(null); return; }
        const channel = new MessageChannel();
        const timer = setTimeout(() => resolve(null), 1500);
        channel.port1.onmessage = (e) => {
            clearTimeout(timer);
            resolve(e.data || null);
        };
        try {
            ctrl.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
        } catch (_e) {
            clearTimeout(timer);
            resolve(null);
        }
    });
}

// Show a small "theracowch · v120 · 5 Jun 2026" stamp in Settings so users can
// confirm at a glance which build they're running. If a newer build is already
// waiting to install, append a gentle "update available" note.
async function setupAppVersion() {
    // Tidy up the one-shot cache-buster left by a force refresh, if present.
    try {
        const here = new URL(window.location.href);
        if (here.searchParams.has('_fresh')) {
            here.searchParams.delete('_fresh');
            window.history.replaceState(null, '', here.pathname + here.search + here.hash);
        }
    } catch (_e) { /* ignore */ }

    const stamp = document.getElementById('app-version-stamp');
    if (!stamp) return;

    let label = 'theracowch';
    const info = await getActiveSwVersion();
    if (info && info.version) {
        // CACHE_NAME looks like 'cowch-wellness-v120' — show just the vNNN part.
        const match = String(info.version).match(/v\d+/i);
        const ver = match ? match[0] : info.version;
        label = 'theracowch · ' + ver;
        if (info.buildDate) label += ' · ' + info.buildDate;
    }
    stamp.textContent = label;

    // If a new SW is sitting in "waiting", let them know an update is ready.
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && reg.waiting && navigator.serviceWorker.controller) {
                const note = document.createElement('span');
                note.className = 'app-version-update';
                note.textContent = 'A new version is ready — tap “Check for updates”';
                stamp.appendChild(document.createElement('br'));
                stamp.appendChild(note);
            }
        } catch (_e) { /* ignore */ }
    }
}

// "Check for updates & clear cache" button. Nukes all service-worker caches,
// unregisters the worker, and reloads — the in-app equivalent of deleting and
// reinstalling the PWA, so the very latest build loads fresh from the network.
function setupForceRefresh() {
    const btn = document.getElementById('refresh-app-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        const label = btn.querySelector('.refresh-app-label');
        if (btn.dataset.busy === '1') return;
        btn.dataset.busy = '1';
        btn.disabled = true;
        if (label) label.textContent = 'Updating…';

        try {
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
            }
            if (window.caches && caches.keys) {
                const keys = await caches.keys();
                await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
            }
        } catch (_e) {
            /* best effort — reload anyway */
        }

        // Bypass any lingering HTTP cache with a one-shot query param, then reload.
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('_fresh', Date.now().toString());
            window.location.replace(url.toString());
        } catch (_e) {
            window.location.reload();
        }
    });
}

function setupThemePicker() {
    const buttons = document.querySelectorAll('.theme-option[data-theme-choice]');
    if (!buttons.length) return;

    const VALID = ['peachy', 'warm', 'cool'];
    let saved = 'peachy';
    try {
        const t = localStorage.getItem('cowch-theme');
        if (VALID.indexOf(t) !== -1) saved = t;
    } catch (e) {}

    const apply = (choice) => {
        if (choice === 'peachy') {
            delete document.documentElement.dataset.theme;
        } else {
            document.documentElement.dataset.theme = choice;
        }
        try { localStorage.setItem('cowch-theme', choice); } catch (e) {}
        buttons.forEach((b) => {
            b.classList.toggle('active', b.dataset.themeChoice === choice);
            b.setAttribute('aria-pressed', b.dataset.themeChoice === choice ? 'true' : 'false');
        });
    };

    apply(saved);
    buttons.forEach((b) => {
        b.addEventListener('click', () => apply(b.dataset.themeChoice));
    });
}

// clearConversation is now handled by chat-script.js via window.handleClearChat

// ============================================
// IMAGINE Tracker
// ============================================

// updateImagineTracker is provided by chat-script.js

// ============================================
// YOU TAB TOOLS (Notice, Choice, Values)
// ============================================

// Storage keys
const CHOICE_STORAGE_KEY = 'cowch_goals';
const VALUES_STORAGE_KEY = 'cowch_values';
const VALUES_ALIGNMENT_KEY = 'cowch_values_alignment';

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
    document.getElementById('exercises-panel-back').addEventListener('click', () => closeToolPanel('exercises'));

    // Explore All Exercises button
    document.getElementById('explore-exercises-btn').addEventListener('click', (e) => {
        e.preventDefault();
        openToolPanel('exercises');
    });

    // Home page "See all exercises" button (removed from the home tab — guarded
    // in case it's reintroduced later)
    const seeAllExercises = document.getElementById('home-see-all-exercises');
    if (seeAllExercises) {
        seeAllExercises.addEventListener('click', () => {
            openToolPanel('exercises');
        });
    }
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
// CHECK-IN TOOL (mood calendar fed by /exercises/weather.html)
// ============================================

const WEATHER_ICONS = {
    'sunny': '☀️', 'partly-cloudy': '🌤️', 'cloudy': '☁️',
    'overcast': '☁️', 'rainy': '🌧️', 'stormy': '⛈️',
    'foggy': '🌫️', 'rainbow': '🌈'
};
const LOW_MOODS = ['partly-cloudy', 'cloudy', 'overcast', 'rainy', 'stormy', 'foggy'];

function initNotice() {
    renderCheckinCalendar();
}

function renderCheckinCalendar() {
    const grid = document.getElementById('checkin-cal-grid');
    const empty = document.getElementById('checkin-cal-empty');
    const lowAlert = document.getElementById('checkin-low-alert');
    const dayAlert = document.getElementById('checkin-day-alert');
    if (!grid) return;

    grid.innerHTML = '';

    const history = JSON.parse(localStorage.getItem('innerWeatherHistory') || '[]');

    if (history.length === 0) {
        empty.style.display = 'block';
        grid.style.display = 'none';
        lowAlert.style.display = 'none';
        dayAlert.style.display = 'none';
        return;
    }
    empty.style.display = 'none';
    grid.style.display = '';

    ['M','T','W','T','F','S','S'].forEach(label => {
        const el = document.createElement('div');
        el.className = 'mood-cal-label';
        el.textContent = label;
        grid.appendChild(el);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d);
    }

    const checkinMap = {};
    history.forEach(entry => {
        const ed = new Date(entry.timestamp);
        const key = ed.getFullYear() + '-' + (ed.getMonth() + 1) + '-' + ed.getDate();
        if (!checkinMap[key]) checkinMap[key] = entry;
    });

    const firstDay = days[0].getDay();
    const startPad = (firstDay + 6) % 7;
    for (let p = 0; p < startPad; p++) {
        const e = document.createElement('div');
        e.className = 'mood-cal-day empty';
        grid.appendChild(e);
    }

    days.forEach(date => {
        const el = document.createElement('div');
        el.className = 'mood-cal-day';
        const key = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
        if (date.getTime() === today.getTime()) el.classList.add('today');
        const ci = checkinMap[key];
        if (ci && WEATHER_ICONS[ci.weather]) {
            el.classList.add('has-checkin');
            el.innerHTML = '<span class="cal-weather">' + WEATHER_ICONS[ci.weather] + '</span><span class="cal-num">' + date.getDate() + '</span>';
        } else {
            el.innerHTML = '<span class="cal-num">' + date.getDate() + '</span>';
        }
        grid.appendChild(el);
    });

    // 3+ consecutive low-mood days alert
    let consecutive = 0;
    for (let c = 0; c < days.length; c++) {
        const d = days[days.length - 1 - c];
        const k = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        const ci = checkinMap[k];
        if (ci && LOW_MOODS.indexOf(ci.weather) !== -1) consecutive++;
        else break;
    }
    if (consecutive >= 3) {
        lowAlert.innerHTML = "You've had a few low-weather days in a row. What's around you that might be feeding it? <a href=\"#chat\" data-tab=\"chat\">Bring it to Mandy</a>.";
        lowAlert.style.display = 'block';
    } else {
        lowAlert.style.display = 'none';
    }

    // Day-of-week pattern alert
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayLow = [0,0,0,0,0,0,0];
    const dayTot = [0,0,0,0,0,0,0];
    days.forEach(date => {
        const k = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
        const ci = checkinMap[k];
        if (ci) {
            const dow = date.getDay();
            dayTot[dow]++;
            if (LOW_MOODS.indexOf(ci.weather) !== -1) dayLow[dow]++;
        }
    });
    let patternDay = null;
    for (let pd = 0; pd < 7; pd++) {
        if (dayTot[pd] >= 2 && dayLow[pd] === dayTot[pd]) { patternDay = pd; break; }
    }
    if (patternDay !== null) {
        dayAlert.innerHTML = 'You tend to dip on a <strong>' + dayNames[patternDay] + '</strong>. Worth bringing to <a href="#chat" data-tab="chat">Mandy</a>.';
        dayAlert.style.display = 'block';
    } else {
        dayAlert.style.display = 'none';
    }
}

// ============================================
// CHOICE TOOL
// ============================================

// Currently-selected term in the Add form
let goalCurrentTerm = 'short';

function initChoice() {
    setupChoiceViewToggle();
    setupGoalTermToggle();
    setupChoiceSave();
    setupGoalCompleteDelegate();
    renderChoiceTree();
}

function setupGoalCompleteDelegate() {
    const container = document.getElementById('choice-list-container');
    if (!container || container.dataset.goalToggleBound === '1') return;
    container.dataset.goalToggleBound = '1';
    container.addEventListener('click', function (e) {
        if (!e.target || !e.target.closest) return;

        const toggleBtn = e.target.closest('[data-goal-toggle]');
        if (toggleBtn) {
            const idx = parseInt(toggleBtn.getAttribute('data-goal-toggle'), 10);
            if (Number.isInteger(idx)) toggleGoalCompleted(idx);
            return;
        }

        const delBtn = e.target.closest('[data-goal-delete]');
        if (delBtn) {
            const idx = parseInt(delBtn.getAttribute('data-goal-delete'), 10);
            if (Number.isInteger(idx) && confirm('Delete this goal? This can’t be undone.')) {
                deleteGoal(idx);
            }
            return;
        }

        const clearBtn = e.target.closest('[data-goal-clear]');
        if (clearBtn) {
            if (confirm('Start again? This removes all your goals and clears the tree. This can’t be undone.')) {
                clearAllGoals();
            }
            return;
        }
    });
}

function setupGoalTermToggle() {
    const buttons = document.querySelectorAll('.goal-term-btn');
    if (!buttons.length) return;
    // Default to short
    goalCurrentTerm = 'short';
    buttons.forEach(b => {
        b.classList.toggle('active', b.dataset.goalTerm === 'short');
        b.setAttribute('aria-checked', b.dataset.goalTerm === 'short' ? 'true' : 'false');
        // Re-bind cleanly each open
        b.onclick = () => {
            goalCurrentTerm = b.dataset.goalTerm;
            buttons.forEach(o => {
                const on = o === b;
                o.classList.toggle('active', on);
                o.setAttribute('aria-checked', on ? 'true' : 'false');
            });
        };
    });
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
    const btn = document.getElementById('choice-save-btn');
    if (!btn) return;
    btn.onclick = () => {
        const specific    = document.getElementById('goal-specific').value.trim();
        const measurable  = document.getElementById('goal-measurable').value.trim();
        const achievable  = document.getElementById('goal-achievable').value.trim();
        const realistic   = document.getElementById('goal-realistic').value.trim();
        const timebound   = document.getElementById('goal-timebound').value;

        // Specific is the headline — required at minimum.
        if (!specific) {
            const sField = document.getElementById('goal-specific');
            sField.focus();
            return;
        }

        const goals = JSON.parse(localStorage.getItem(CHOICE_STORAGE_KEY) || '[]');
        goals.push({
            type: goalCurrentTerm === 'long' ? 'long' : 'short',
            specific, measurable, achievable, realistic, timebound,
            // Backwards-compat alias for any older renderers
            text: specific,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            })
        });
        localStorage.setItem(CHOICE_STORAGE_KEY, JSON.stringify(goals));

        // Clear the form
        ['goal-specific', 'goal-measurable', 'goal-achievable', 'goal-realistic'].forEach(id => {
            document.getElementById(id).value = '';
        });
        document.getElementById('goal-timebound').value = '';

        const original = btn.textContent;
        btn.textContent = 'Added!';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2000);

        renderChoiceTree();
    };
}

// Northern-hemisphere meteorological seasons. Used to theme the goal tree
// (leaf colours, completion flowers/fruits, sky tint).
function getGoalsSeason(date) {
    const m = (date || new Date()).getMonth();
    if (m >= 2 && m <= 4)  return 'spring';
    if (m >= 5 && m <= 7)  return 'summer';
    if (m >= 8 && m <= 10) return 'autumn';
    return 'winter';
}
const GOAL_SEASON_PALETTE = {
    spring: {
        leafShort: ['#A6D78A', '#BFE19A'],
        leafLong:  ['#7EBE7B', '#9CD27E'],
        flower:    ['#F7B2C5', '#FFD1DC', '#E8A0BF', '#FFFFFF'],
        fruit:     ['#FFB07A', '#FFCBA4'],
        trunk:     '#5D4A3C',
        label:     '🌸 Spring tree'
    },
    summer: {
        leafShort: ['#7DC388', '#9DD79B'],
        leafLong:  ['#4F8F60', '#5FA46B'],
        flower:    ['#F7A8C5', '#FFD56B', '#FF8FA3'],
        fruit:     ['#E0533D', '#F0876A', '#C44A2F'],
        trunk:     '#5D4A3C',
        label:     '☀️ Summer tree'
    },
    autumn: {
        leafShort: ['#E5A468', '#E08F4A'],
        leafLong:  ['#C2632D', '#A85428', '#8C4523'],
        flower:    ['#D89665', '#C97B63'],
        fruit:     ['#9B3A1A', '#C9531E', '#7C2E18'],
        trunk:     '#6B4B30',
        label:     '🍂 Autumn tree'
    },
    winter: {
        leafShort: ['#7EA88B', '#6B9580'],
        leafLong:  ['#5C8772', '#6F9A85'],
        flower:    ['#FFFFFF', '#E7EEF2'],
        fruit:     ['#7E9686', '#A5B8AC'],
        trunk:     '#4A3B30',
        label:     '❄️ Winter tree'
    }
};

function renderChoiceTree() {
    const goals = JSON.parse(localStorage.getItem(CHOICE_STORAGE_KEY) || '[]');
    const completedCount = goals.filter(g => g.completed).length;
    const totalCount = goals.length;
    document.getElementById('choice-count').textContent =
        completedCount > 0 ? (totalCount + ' goals · ' + completedCount + ' blooming') : totalCount;

    const svg = document.getElementById('choice-tree-svg');
    const groundGroup   = document.getElementById('choice-ground');
    const trunkGroup    = document.getElementById('choice-trunk');
    const branchesGroup = document.getElementById('choice-branches');
    const leavesGroup   = document.getElementById('choice-leaves');
    [groundGroup, trunkGroup, branchesGroup, leavesGroup].forEach(g => { if (g) g.innerHTML = ''; });

    const season = getGoalsSeason();
    const palette = GOAL_SEASON_PALETTE[season];
    svg.setAttribute('data-season', season);

    // Season label (cached element, recreated if absent)
    let seasonLabel = document.getElementById('choice-season-label');
    if (!seasonLabel) {
        seasonLabel = document.createElement('span');
        seasonLabel.id = 'choice-season-label';
        seasonLabel.className = 'choice-season-label';
        svg.parentNode && svg.parentNode.insertBefore(seasonLabel, svg.nextSibling);
    }
    seasonLabel.textContent = palette.label;

    const NS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs) {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        return e;
    }

    // ── Ground + grass ──
    groundGroup.appendChild(el('ellipse', { cx: 150, cy: 398, rx: 132, ry: 15, fill: '#86B05F', opacity: 0.55 }));
    groundGroup.appendChild(el('ellipse', { cx: 150, cy: 393, rx: 104, ry: 13, fill: '#9CC07A', opacity: 0.6 }));
    [104, 128, 172, 196].forEach(gx => {
        groundGroup.appendChild(el('path', { d: `M ${gx} 394 q -2 -8 1 -12`, stroke: '#6FA052', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }));
        groundGroup.appendChild(el('path', { d: `M ${gx + 5} 394 q 2 -7 -1 -11`, stroke: '#6FA052', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }));
    });

    // ── Tapered trunk + root flares + bark line ──
    trunkGroup.appendChild(el('path', {
        d: 'M 134 396 C 132 358 140 318 144 288 C 145 274 146 262 146 250 L 154 250 C 154 262 155 274 156 288 C 160 318 168 358 166 396 Z',
        fill: palette.trunk
    }));
    trunkGroup.appendChild(el('path', { d: 'M 140 392 C 128 392 120 396 110 400 C 124 398 134 396 142 396 Z', fill: palette.trunk }));
    trunkGroup.appendChild(el('path', { d: 'M 160 392 C 172 392 180 396 190 400 C 176 398 166 396 158 396 Z', fill: palette.trunk }));
    trunkGroup.appendChild(el('path', { d: 'M 150 388 C 149 356 150 318 150 282', stroke: 'rgba(0,0,0,0.12)', 'stroke-width': 1.5, fill: 'none' }));

    // ── Soft decorative canopy behind the goal flowers, so the tree has body ──
    const canopyColor = palette.leafLong[0];
    [{ x: 150, y: 232, r: 36 }, { x: 108, y: 252, r: 26 }, { x: 192, y: 252, r: 26 },
     { x: 150, y: 262, r: 28 }, { x: 124, y: 232, r: 22 }, { x: 176, y: 232, r: 22 }].forEach(c => {
        branchesGroup.appendChild(el('circle', { cx: c.x, cy: c.y, r: c.r, fill: canopyColor, opacity: 0.16 }));
    });

    function addBranch(x1, y1, x2, y2, w) {
        branchesGroup.appendChild(el('line', {
            x1, y1, x2, y2, stroke: palette.trunk, 'stroke-width': w || 4, 'stroke-linecap': 'round'
        }));
    }

    // A proper little flower. `full` = a fuller double-layer bloom (completed).
    function addFlower(cx, cy, idx, full) {
        const g = el('g', { class: 'choice-tree-flower', transform: 'translate(' + cx + ', ' + cy + ')' });
        g.style.animationDelay = (idx * 0.05) + 's';
        const color = palette.flower[idx % palette.flower.length];
        const petalR = full ? 3.8 : 3.0;
        const offset = full ? 4.4 : 3.6;
        if (full) {
            for (let p = 0; p < 5; p++) {
                const a = (p / 5) * Math.PI * 2 - Math.PI / 2 + 0.34;
                g.appendChild(el('circle', { cx: Math.cos(a) * offset, cy: Math.sin(a) * offset, r: petalR * 0.8, fill: color, opacity: 0.7 }));
            }
        }
        for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
            g.appendChild(el('circle', { cx: Math.cos(a) * offset, cy: Math.sin(a) * offset, r: petalR, fill: color }));
        }
        g.appendChild(el('circle', { cx: 0, cy: 0, r: full ? 2.2 : 1.8, fill: '#C9A857' }));
        leavesGroup.appendChild(g);
    }

    function addFruit(cx, cy, idx) {
        const g = el('g', { class: 'choice-tree-fruit', transform: 'translate(' + cx + ', ' + cy + ')' });
        g.style.animationDelay = (idx * 0.05) + 's';
        const fruitColor = palette.fruit[idx % palette.fruit.length];
        g.appendChild(el('line', { x1: 0, y1: -10, x2: 0, y2: -6, stroke: palette.trunk, 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
        const stemLeaf = el('ellipse', { cx: 3, cy: -8, rx: 2.5, ry: 1.2, fill: season === 'autumn' ? '#9C5A2A' : '#5B9D6A' });
        stemLeaf.setAttribute('transform', 'rotate(30 3 -8)');
        g.appendChild(stemLeaf);
        g.appendChild(el('circle', { cx: 0, cy: 0, r: 7, fill: fruitColor }));
        g.appendChild(el('ellipse', { cx: -2.2, cy: -2, rx: 1.6, ry: 2.2, fill: '#FFFFFF', opacity: 0.35 }));
        leavesGroup.appendChild(g);
    }

    // Default older entries with no type to "long" so they still render meaningfully.
    const longs  = goals.filter(g => (g.type || 'long') !== 'short');
    const shorts = goals.filter(g => (g.type || 'long') === 'short');

    // ── Long-term: tall branches fanning from the top of the trunk ──
    const trunkTopX = 150;
    const trunkTopY = 252;
    longs.forEach((g, i) => {
        const layer = Math.floor(i / 6);
        const slot  = i % 6;
        const angleDeg = -160 + slot * 26;
        const rad = angleDeg * Math.PI / 180;
        const length = 130 + layer * 28;
        const x2 = trunkTopX + Math.cos(rad) * length;
        const y2 = trunkTopY + Math.sin(rad) * length;
        addBranch(trunkTopX, trunkTopY, x2, y2, 5);
        // a small sub-twig partway along, for detail
        const mx = trunkTopX + (x2 - trunkTopX) * 0.55;
        const my = trunkTopY + (y2 - trunkTopY) * 0.55;
        addBranch(mx, my, mx + (x2 - trunkTopX) * 0.16, my - 12, 2.5);
        if (g.completed) addFruit(x2, y2, i);
        else addFlower(x2, y2, i, false);
    });

    // ── Short-term: small twigs along the trunk ──
    shorts.forEach((g, i) => {
        const trunkY = 282 + (i * 14);
        const yClamped = Math.min(trunkY, 388);
        const side = (i % 2 === 0) ? -1 : 1;
        const length = 26 + (i % 3) * 6;
        const x1 = 150 + side * 11;
        const x2 = x1 + side * length;
        const y2 = yClamped - 10;
        addBranch(x1, yClamped, x2, y2, 3);
        addFlower(x2, y2, i, !!g.completed);
    });
}

function renderChoiceHistory() {
    const goals = JSON.parse(localStorage.getItem(CHOICE_STORAGE_KEY) || '[]');
    const container = document.getElementById('choice-list-container');

    if (goals.length === 0) {
        container.innerHTML = `
            <div class="tool-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <p>No goals set yet. Add your first one.</p>
            </div>
        `;
        return;
    }

    const escapeHtml = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    const formatDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso + 'T00:00:00');
        if (isNaN(d.getTime())) return iso;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    const formatTimestamp = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Sort: active first (newest at top), completed at the bottom (most-recent completion first)
    const indexed = goals.map((g, i) => Object.assign({}, g, { _idx: i }));
    const active = indexed.filter(g => !g.completed).reverse();
    const done = indexed.filter(g => g.completed)
        .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));

    const html = active.concat(done).map(g => {
        const type = (g.type || 'long') === 'short' ? 'short' : 'long';
        const title = escapeHtml(g.specific || g.text || '(untitled goal)');
        const due = g.timebound ? ' · by ' + escapeHtml(formatDate(g.timebound)) : '';
        const hasDetails = g.measurable || g.achievable || g.realistic;
        const detailRows = hasDetails ? `
            <details>
                <summary>SMART details</summary>
                <dl>
                    ${g.measurable ? `<dt>M</dt><dd>${escapeHtml(g.measurable)}</dd>` : ''}
                    ${g.achievable ? `<dt>A</dt><dd>${escapeHtml(g.achievable)}</dd>` : ''}
                    ${g.realistic  ? `<dt>R</dt><dd>${escapeHtml(g.realistic)}</dd>`  : ''}
                </dl>
            </details>` : '';
        const completedBits = g.completed
            ? `<span class="goal-item-completed-tag">${type === 'short' ? '🌸 Bloomed' : '🍎 Fruited'} ${formatTimestamp(g.completedAt)}</span>`
            : '';
        const buttonLabel = g.completed ? '↩ Reopen' : '✓ Mark complete';
        return `
            <div class="goal-item${g.completed ? ' completed' : ''}" data-goal-idx="${g._idx}">
                <div class="goal-item-head">
                    <div class="goal-item-title">${title}${completedBits}</div>
                    <span class="goal-item-tag ${type}">${type === 'short' ? 'Short-term' : 'Long-term'}</span>
                </div>
                <div class="goal-item-meta">Added ${escapeHtml(g.date || '')}${due}</div>
                ${detailRows}
                <div class="goal-item-actions">
                    <button type="button" class="goal-complete-btn${g.completed ? ' completed' : ''}" data-goal-toggle="${g._idx}">
                        ${buttonLabel}
                    </button>
                    <button type="button" class="goal-delete-btn" data-goal-delete="${g._idx}">🗑 Delete</button>
                </div>
            </div>`;
    }).join('');

    container.innerHTML = html +
        '<button type="button" class="goal-clear-btn" data-goal-clear="1">Start again &mdash; clear all goals</button>';
}

// Toggle a goal's completed flag and refresh both tree + history.
function toggleGoalCompleted(idx) {
    const goals = JSON.parse(localStorage.getItem(CHOICE_STORAGE_KEY) || '[]');
    if (idx < 0 || idx >= goals.length) return;
    const g = goals[idx];
    if (g.completed) {
        delete g.completed;
        delete g.completedAt;
    } else {
        g.completed = true;
        g.completedAt = new Date().toISOString();
    }
    localStorage.setItem(CHOICE_STORAGE_KEY, JSON.stringify(goals));
    renderChoiceTree();
    renderChoiceHistory();
}
window.toggleGoalCompleted = toggleGoalCompleted;

// Delete a single goal by its original index.
function deleteGoal(idx) {
    const goals = JSON.parse(localStorage.getItem(CHOICE_STORAGE_KEY) || '[]');
    if (idx < 0 || idx >= goals.length) return;
    goals.splice(idx, 1);
    localStorage.setItem(CHOICE_STORAGE_KEY, JSON.stringify(goals));
    renderChoiceTree();
    renderChoiceHistory();
}
window.deleteGoal = deleteGoal;

// Clear every goal and reset the tree.
function clearAllGoals() {
    localStorage.setItem(CHOICE_STORAGE_KEY, JSON.stringify([]));
    renderChoiceTree();
    renderChoiceHistory();
}
window.clearAllGoals = clearAllGoals;

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
// WELLNESS DASHBOARD
// A simple 30-day tracker for the seven things people most often want to keep
// an eye on: mood, anxiety, sleep, connection, self-care, gratitude and
// values-based action. Each is a quick 1–5 daily self-rating, stored on-device
// under its own localStorage key. Purely additive — it doesn't touch the
// weather check-ins, pasture, weekly summary or anything else.
// ============================================
const WELLNESS_LOG_KEY = 'cowch_wellness_log_v1';

// Order here drives both the check-in and the trends. `invert: true` marks a
// metric where a *lower* score is the healthier direction (anxiety), so its
// trend colouring flips.
const WELLNESS_METRICS = [
    { key: 'mood',       emoji: '🙂', label: 'Mood',                low: 'Very low',     high: 'Great',           color: '#E8923C' },
    { key: 'anxiety',    emoji: '😰', label: 'Anxiety',             low: 'Calm',         high: 'Very anxious',    color: '#9C7CD4', invert: true },
    { key: 'sleep',      emoji: '😴', label: 'Sleep',               low: 'Poor',         high: 'Great',           color: '#5B8DEF' },
    { key: 'connection', emoji: '🤝', label: 'Connection',          low: 'Isolated',     high: 'Connected',       color: '#E87EA8' },
    { key: 'selfcare',   emoji: '🛁', label: 'Self-care',           low: 'Neglected',    high: 'Nurtured',        color: '#34B7AE' },
    { key: 'gratitude',  emoji: '🙏', label: 'Gratitude',           low: 'Hard to find', high: 'Abundant',        color: '#F2C13D' },
    { key: 'values',     emoji: '🎯', label: 'Values-based action', low: 'Off track',    high: 'Lived my values', color: '#5FB36A' }
];

function wdDayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function loadWellnessLog() {
    try {
        const v = JSON.parse(localStorage.getItem(WELLNESS_LOG_KEY) || '[]');
        return Array.isArray(v) ? v : [];
    } catch (_) { return []; }
}
function saveWellnessLog(log) {
    try { localStorage.setItem(WELLNESS_LOG_KEY, JSON.stringify(log.slice(-180))); } catch (_) {}
}

// Today's entry (or null).
function getTodayWellness() {
    const key = wdDayKey(new Date());
    return loadWellnessLog().find(e => e && e.day === key) || null;
}

function flashWellnessSaved(msg) {
    const el = document.getElementById('wd-saved');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(flashWellnessSaved._t);
    flashWellnessSaved._t = setTimeout(() => el.classList.remove('show'), 1800);
}

// Pull selected pill values out of the DOM and upsert today's entry. Merges
// with anything already logged today, so a second pass can fill in more areas.
function saveTodayWellness() {
    const scores = {};
    WELLNESS_METRICS.forEach(m => {
        const sel = document.querySelector('#wd-row-' + m.key + ' .wd-pill.selected');
        if (sel) scores[m.key] = parseInt(sel.dataset.value, 10);
    });
    if (!Object.keys(scores).length) {
        flashWellnessSaved('Tap a number for at least one area first.');
        return;
    }
    const log = loadWellnessLog();
    const key = wdDayKey(new Date());
    const now = new Date().toISOString();
    const existing = log.find(e => e && e.day === key);
    if (existing) {
        existing.scores = Object.assign({}, existing.scores, scores);
        existing.at = now;
    } else {
        log.push({ day: key, at: now, scores: scores });
    }
    saveWellnessLog(log);
    flashWellnessSaved('Saved ✓');
    renderWellnessCharts();
    updateWellnessBlockSub();
}

// Build the seven 1–5 pill rows, pre-filling today's saved values.
function renderWellnessInputs() {
    const wrap = document.getElementById('wd-metric-inputs');
    if (!wrap) return;
    const today = getTodayWellness();
    wrap.innerHTML = '';
    WELLNESS_METRICS.forEach(m => {
        const row = document.createElement('div');
        row.className = 'wd-row';
        row.id = 'wd-row-' + m.key;
        const saved = (today && today.scores) ? today.scores[m.key] : null;
        let pills = '';
        for (let v = 1; v <= 5; v++) {
            pills += '<button type="button" class="wd-pill' + (saved === v ? ' selected' : '') +
                '" data-value="' + v + '" style="--wd-color:' + m.color + '" ' +
                'aria-pressed="' + (saved === v ? 'true' : 'false') + '" ' +
                'aria-label="' + m.label + ' ' + v + ' of 5">' + v + '</button>';
        }
        row.innerHTML =
            '<div class="wd-row-head"><span class="wd-row-emoji">' + m.emoji + '</span>' +
            '<span class="wd-row-label">' + m.label + '</span></div>' +
            '<div class="wd-pills">' + pills + '</div>' +
            '<div class="wd-scale-ends"><span>1 · ' + m.low + '</span><span>' + m.high + ' · 5</span></div>';
        wrap.appendChild(row);
    });

    // One selection per row (delegated; wrap element persists across rebuilds).
    if (!wrap.dataset.wired) {
        wrap.dataset.wired = '1';
        wrap.addEventListener('click', (e) => {
            const pill = e.target.closest('.wd-pill');
            if (!pill) return;
            const row = pill.closest('.wd-row');
            row.querySelectorAll('.wd-pill').forEach(p => {
                p.classList.remove('selected');
                p.setAttribute('aria-pressed', 'false');
            });
            pill.classList.add('selected');
            pill.setAttribute('aria-pressed', 'true');
        });
    }
}

// Per-metric 30-day sparkline plus average and a trend arrow.
function renderWellnessCharts() {
    const charts = document.getElementById('wd-charts');
    const empty = document.getElementById('wd-empty');
    if (!charts) return;

    const log = loadWellnessLog();

    // 30-day window of day keys, oldest → today.
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        days.push(wdDayKey(d));
    }
    const byDay = {};
    log.forEach(e => { if (e && e.day) byDay[e.day] = e; });

    const anyData = days.some(k => byDay[k] && byDay[k].scores);
    if (empty) empty.style.display = anyData ? 'none' : 'block';
    charts.style.display = anyData ? '' : 'none';
    if (!anyData) { charts.innerHTML = ''; return; }

    const W = 300, H = 44, padT = 6, padB = 8;
    const xAt = i => (i / 29) * W;
    const yAt = v => (H - padB) - ((v - 1) / 4) * (H - padT - padB);

    charts.innerHTML = '';
    WELLNESS_METRICS.forEach(m => {
        const series = days.map(k => {
            const e = byDay[k];
            const v = (e && e.scores) ? e.scores[m.key] : undefined;
            return (typeof v === 'number') ? v : null;
        });
        const present = series.filter(v => v !== null);
        if (!present.length) return; // skip metrics never logged

        const avg = present.reduce((a, b) => a + b, 0) / present.length;

        // Trend: recent half vs earlier half of the logged points.
        const half = Math.max(1, Math.floor(present.length / 2));
        const recent = present.slice(-half);
        const earlier = present.slice(0, Math.max(1, present.length - half));
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        const delta = recentAvg - earlierAvg;
        let arrow = '→', dir = 'flat';
        if (delta > 0.25) { arrow = '↗'; dir = 'up'; }
        else if (delta < -0.25) { arrow = '↘'; dir = 'down'; }
        // For anxiety (invert), a downward trend is the welcome one.
        const good = m.invert ? (dir === 'down') : (dir === 'up');
        const bad  = m.invert ? (dir === 'up')   : (dir === 'down');
        const trendClass = dir === 'flat' ? 'flat' : (good ? 'good' : (bad ? 'bad' : 'flat'));

        const pts = [];
        series.forEach((v, i) => { if (v !== null) pts.push({ x: xAt(i), y: yAt(v) }); });
        const poly = pts.map(p => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
        const dots = pts.map(p => '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.6" fill="' + m.color + '"/>').join('');
        const guides = [1, 3, 5].map(v => {
            const y = yAt(v).toFixed(1);
            return '<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="rgba(60,46,40,0.08)" stroke-width="1"/>';
        }).join('');

        const card = document.createElement('div');
        card.className = 'wd-chart';
        card.innerHTML =
            '<div class="wd-chart-head">' +
                '<span class="wd-chart-emoji">' + m.emoji + '</span>' +
                '<span class="wd-chart-label">' + m.label + '</span>' +
                '<span class="wd-chart-stats">' +
                    '<span class="wd-chart-avg">avg ' + avg.toFixed(1) + '</span>' +
                    '<span class="wd-chart-trend wd-trend-' + trendClass + '" aria-hidden="true">' + arrow + '</span>' +
                '</span>' +
            '</div>' +
            '<svg class="wd-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" ' +
                'aria-label="' + m.label + ': average ' + avg.toFixed(1) + ' out of 5 over ' + present.length + ' logged days">' +
                guides +
                (pts.length > 1 ? '<polyline points="' + poly + '" fill="none" stroke="' + m.color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' : '') +
                dots +
            '</svg>' +
            '<div class="wd-chart-foot"><span>' + m.low + '</span>' +
                '<span class="wd-chart-count">' + present.length + ' day' + (present.length === 1 ? '' : 's') + ' logged</span>' +
                '<span>' + m.high + '</span></div>';
        charts.appendChild(card);
    });
}

// Keep the Your-Space entry block's subtitle in step with the log.
function updateWellnessBlockSub() {
    const sub = document.getElementById('wellness-block-sub');
    if (!sub) return;
    const log = loadWellnessLog();
    if (!log.length) {
        sub.textContent = 'Track mood, sleep, connection & more over 30 days';
        return;
    }
    const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
    const cutoff = new Date(todayD); cutoff.setDate(cutoff.getDate() - 29);
    const recent = log.filter(e => {
        const d = new Date(e.day + 'T00:00:00');
        return !isNaN(d.getTime()) && d >= cutoff;
    });
    const n = recent.length;
    const checkedToday = !!getTodayWellness();
    sub.textContent = checkedToday
        ? 'Checked in today · ' + n + ' day' + (n === 1 ? '' : 's') + ' tracked'
        : n + ' day' + (n === 1 ? '' : 's') + ' tracked — add today’s check-in';
}

// Refresh the whole panel (range header + inputs + charts + entry block).
function updateWellnessUI() {
    const range = document.getElementById('wellness-range');
    if (range) {
        const today = new Date();
        const start = new Date(today); start.setDate(start.getDate() - 29);
        const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        range.textContent = fmt(start) + ' – ' + fmt(today);
    }
    renderWellnessInputs();
    renderWellnessCharts();
    updateWellnessBlockSub();
}
window.updateWellnessUI = updateWellnessUI;

// Wire the Your-Space entry block to open the dashboard on its own screen.
function setupWellnessPanel() {
    const block = document.getElementById('wellness-block');
    const panel = document.getElementById('wellness-panel');
    const back = document.getElementById('wellness-panel-back');
    const saveBtn = document.getElementById('wd-save-btn');
    if (!block || !panel) return;
    if (!block.dataset.wired) {
        block.dataset.wired = '1';
        block.addEventListener('click', () => {
            updateWellnessUI();
            panel.classList.add('active');
        });
    }
    if (back && !back.dataset.wired) {
        back.dataset.wired = '1';
        back.addEventListener('click', () => panel.classList.remove('active'));
    }
    if (saveBtn && !saveBtn.dataset.wired) {
        saveBtn.dataset.wired = '1';
        saveBtn.addEventListener('click', saveTodayWellness);
    }
    updateWellnessBlockSub();
}
window.setupWellnessPanel = setupWellnessPanel;

// ============================================
// Initialize
// ============================================

function init() {
    // Initialize DOM references
    app = document.getElementById('app');
    tabBtns = document.querySelectorAll('.tab-btn');
    tabPanels = document.querySelectorAll('.tab-panel');
    appChatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    greetingText = document.getElementById('greeting-text');

    // Record this visit first so a quiet open already counts toward the
    // Weekly Summary "shown up" total and the pasture on this same load.
    recordVisitToday();

    // Setup all functionality
    updateGreeting();
    updateDailyQuote();
    setupDailyThought();
    updateYourSpaceGreeting();
    updatePastureUI();
    setupPastureEdit();
    setupPasturePanel();
    setupWeeklySummary();
    setupSummaryPanel();
    updateWeeklySummaryUI();
    setupWellnessPanel();
    updatePatternsUI();
    setupReminders();
    setupTabNavigation();
    setupDomainPanel();
    setupToolPanels();
    setupQuickCheckin();
    setupClearHistory();
    setupSettingsButtons();
    updateImagineTracker();

    // Initialize chat via chat-script.js
    if (window.initChat) {
        window.initChat();
    }

    // Handle hash navigation (extended for chat-specific hashes)
    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
