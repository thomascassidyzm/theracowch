/**
 * "What are you like, anyway?" — the RANKED variant.
 *
 * Same instrument, same bank, same maths, one different mechanic: instead of
 * picking the option that's most like you, you put all four in order — most
 * like you at the top, least like you at the bottom.
 *
 * Why it exists (Max's proposal, via Tom): ranking removes the paralysis of
 * "I'm not sure which one to choose", and a ranking can't be wrong — so this
 * variant has NO honest exit, no "it depends", no free-text note. There is
 * nothing to abstain from. The single-choice instrument keeps all of that and
 * is untouched at /questionnaires/what-are-you-like.html.
 *
 * This is a deliberate FORK of what-are-you-like.js, not a shared module: the
 * live single-choice page is worth more than the DRY. Fixes to the maths or
 * the reveal choreography belong upstream (thrive-website @30198ce) and then
 * in both files.
 *
 * Load order: a plain <script> tag on
 * /questionnaires/what-are-you-like-rank.html. No modules build in this repo.
 *
 * Everything stays on this device. The bank is fetched as static JSON; results
 * live in localStorage; nothing is ever uploaded.
 */
(function () {
  'use strict';

  var BANK_URL = '/questionnaires/data/what-are-you-like-bank.json?v=1';
  var STORE_KEY = 'cowch-q-wayl-rank';
  /* Deliberately NOT the same key as the finished record. A run you are still
     inside and a run you have completed are different things, and one must
     never be able to masquerade as the other. */
  var PROGRESS_KEY = 'cowch-q-wayl-rank-progress';
  var PROGRESS_V = 1;

  /* ================= AXES =================
     Carried across verbatim from the single-choice engine. N is surfaced as
     "Sensitivity — how loudly the alarm system runs", never as neuroticism.
     R (risk appetite) is the sixth axis.

     TWO KINDS OF AXIS, and the difference is honesty, not decoration.
     O/C/E/A come from an established instrument with a real comparison
     population behind them, so "put 100 people in a room, you'd be standing
     around here" is a claim we can actually make. N and R are ours — there is
     no population of other people's answers behind them yet, so a percentile
     would be a made-up number. Those two carry `abs: true`: same maths, same
     honest width, but reported as a position on the axis's OWN scale. */
  var AXES = [
    { k: 'O', name: 'Openness', sub: 'novelty · ideas · the unfamiliar', color: 'var(--band-O)',
      hi: "you'd likely be among the people reaching for the unfamiliar option first",
      lo: "you'd likely be among the people who make the proven thing work brilliantly",
      mid: "you'd likely be mid-room — curious when it counts, unswayed by novelty for its own sake" },
    { k: 'C', name: 'Conscientiousness', sub: 'finishing · order · follow-through', color: 'var(--band-C)',
      hi: "you'd likely be among the people whose plans actually happen",
      lo: "you'd likely be among the improvisers — energy over administration",
      mid: "you'd likely be mid-room — structured where it matters, loose where it doesn't" },
    { k: 'E', name: 'Extraversion', sub: 'where the energy comes from', color: 'var(--band-E)',
      hi: "you'd likely be among the people the room recharges",
      lo: "you'd likely be among the people the room slowly drains — depth over crowd",
      mid: "you'd likely be mid-room — social by choice, solitary by design" },
    { k: 'A', name: 'Agreeableness', sub: 'accommodation · harmony · its price', color: 'var(--band-A)',
      hi: "you'd likely be among the people who absorb costs to keep the peace — watch what that bill runs to",
      lo: "you'd likely be among the people who say the plain thing — clarity over comfort",
      mid: "you'd likely be mid-room — generous, but not for free" },
    { k: 'N', name: 'Sensitivity', sub: 'how loudly the alarm system runs', color: 'var(--band-N)',
      abs: true, loEnd: 'quiet alarm', hiEnd: 'loud alarm',
      hi: "your alarm system runs hot — it catches real signals and false ones alike",
      lo: "your alarm system runs quiet — you put things down and leave them down",
      mid: "your alarm system runs middling — alert under real pressure, quiet otherwise" },
    { k: 'R', name: 'Risk appetite', sub: 'the sixth axis nobody measures', color: 'var(--band-R)',
      abs: true, loEnd: 'protect the downside', hiEnd: 'chase the uncertain',
      hi: "you move toward the uncertain thing — often already halfway out the door",
      lo: "you protect the downside first — and sleep well",
      mid: "you take risks, but you price them first" }
  ];

  var CHECKPOINTS = [10, 20];
  /* Moments come in blocks of ten, each closed by a reveal. You can move
     freely backwards and forwards inside the block you're in — and re-order
     anything in it — but not back across a reveal you've already seen. */
  var BLOCK = 10;

  /* ================= THE RANK → SCORE CONVERSION =================
     The one piece of real design in this variant, kept in one function so it
     stays obvious and tunable.

     A single choice tells you about one option. A ranking tells you about all
     four, so all four contribute — the top one positively, the bottom one
     negatively, the middle pair at a third of the weight because "second" and
     "third" out of four is a much softer statement than "first" and "last".

       rank 1 (most like me)  → +1.00
       rank 2                 → +0.33
       rank 3                 → −0.33
       rank 4 (least like me) → −1.00

     The coefficients' absolute values sum to 2.66, so every contribution is
     divided by 2.66. That normaliser is load-bearing, not cosmetic: the
     uncertainty/resolution maths below is calibrated against the accumulated
     `n` from thirty SINGLE-choice answers. Without it a ranked run would
     accumulate ~2.7× the evidence mass and the honest-width copy would lie —
     bands would read far sharper than the answers earned.

     Verified against the shipped 30-item bank: synthetic runs (random, and
     coherent personas ranking every item high/low/mixed) land per-axis
     resolution in 69–87% against the single-choice version's 66–90%, and
     estimates within a few points of the single-choice equivalent. */
  var RANK_COEFF = [1.0, 0.33, -0.33, -1.0];
  var RANK_NORM = 2.66;  /* = sum of |RANK_COEFF| */

  function scoreRanking(q, order, st) {
    for (var pos = 0; pos < order.length; pos++) {
      var c = RANK_COEFF[pos] / RANK_NORM;
      var w = q.opts[order[pos]].w;
      for (var k in w) {
        if (!st[k]) continue;  /* proposed axes are never scored */
        st[k].sum += c * w[k];
        st[k].n += Math.abs(c * w[k]);
      }
    }
  }

  /* ================= STATE ================= */
  var QUESTIONS = [];
  var TOTAL = 0;
  var state = {};
  var answers = [];      /* confirmed rankings: {id, order} */
  /* One slot per moment: null (not ranked yet) or {order:[i,i,i,i]} — option
     indices, best-first. This, not a running total, is the record; scores are
     recomputed from it after every change, so re-ordering an old moment can't
     leave a stale contribution behind in the bands. */
  var responses = [];
  /* The order the four options are SHOWN in before you touch them, shuffled
     once per moment so the bank's authored order can't nudge the ranking.
     Kept per moment so walking back and forth doesn't reshuffle under you. */
  var shuffles = [];
  var working = null;    /* the order currently on screen, before it's confirmed */
  var qIndex = 0;
  var answered = 0;
  var lastSnapshot = null;  /* per-axis {sum,n} as of the previous reveal */
  var busy = false;

  function shuffled(n) {
    var a = [];
    for (var i = 0; i < n; i++) a.push(i);
    for (var j = a.length - 1; j > 0; j--) {
      var r = Math.floor(Math.random() * (j + 1));
      var t = a[j]; a[j] = a[r]; a[r] = t;
    }
    return a;
  }

  function resetState() {
    responses = [];
    shuffles = [];
    for (var i = 0; i < TOTAL; i++) {
      responses.push(null);
      shuffles.push(shuffled(QUESTIONS[i].opts.length));
    }
    qIndex = 0;
    lastSnapshot = null;
    busy = false;
    recompute();
  }

  /* The single source of truth: rebuild every derived number from `responses`. */
  function recompute() {
    state = {};
    AXES.forEach(function (a) { state[a.k] = { sum: 0, n: 0 }; });
    answers = [];
    answered = 0;
    responses.forEach(function (r, i) {
      if (!r) return;
      answered++;
      var q = QUESTIONS[i];
      scoreRanking(q, r.order, state);
      answers.push({ id: q.id, order: r.order.slice() });
    });
  }

  /* ---- where we are in the block of ten ---- */
  function blockStart() { return Math.floor(qIndex / BLOCK) * BLOCK; }
  function blockEnd() { return Math.min(blockStart() + BLOCK, TOTAL) - 1; }
  function firstUnansweredInBlock() {
    for (var i = blockStart(); i <= blockEnd(); i++) if (!responses[i]) return i;
    return -1;
  }

  function snapshot() {
    var s = {};
    AXES.forEach(function (a) { s[a.k] = { sum: state[a.k].sum, n: state[a.k].n }; });
    return s;
  }

  /* ================= MATH =================
     Identical to the single-choice engine — the conversion above is the only
     place the two instruments differ. */
  function estimateOf(st, k) {
    var s = st[k];
    if (s.n === 0) return 50;
    return Math.max(6, Math.min(94, 50 + 44 * Math.tanh((s.sum / s.n) * 0.85)));
  }
  function uncertaintyOf(st, k) {
    return Math.max(9, 40 / Math.sqrt(st[k].n + 1));
  }
  function blurOf(st, k) {
    return Math.max(0, (uncertaintyOf(st, k) - 9) * 0.22);
  }
  function resolutionOf(st, k) {
    return Math.round(100 * (1 - (uncertaintyOf(st, k) - 9) / (40 - 9)));
  }
  function estimate(k) { return estimateOf(state, k); }
  function uncertainty(k) { return uncertaintyOf(state, k); }
  function resolutionPct(k) { return resolutionOf(state, k); }
  function dial(k) { return Math.round(estimate(k) / 10 * 10) / 10; }
  function dialSpread(k) { return Math.max(0.1, Math.round(uncertainty(k) / 10 * 10) / 10); }
  function positionLabel(k) {
    var est = estimate(k);
    return est >= 62 ? 'toward the high end' : est <= 38 ? 'toward the low end' : 'around the middle';
  }

  function overallFocus() {
    return Math.round(AXES.reduce(function (acc, a) { return acc + resolutionPct(a.k); }, 0) / AXES.length);
  }

  function $(id) { return document.getElementById(id); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ================= RENDER: bars ================= */
  function buildBars(container, prefix) {
    container.innerHTML = AXES.map(function (a) {
      var caption = a.abs
        ? '<span>' + a.loEnd + '</span><span>its own scale</span><span>' + a.hiEnd + '</span>'
        : '<span>fewer of 100</span><span>room of 100</span><span>more of 100</span>';
      return '<div class="trait" id="trait-' + prefix + a.k + '">' +
        '<div class="trait-head">' +
          '<span class="trait-name">' + a.name + ' <small>' + a.sub + '</small></span>' +
          '<span class="trait-res" id="res-' + prefix + a.k + '"></span>' +
        '</div>' +
        '<div class="bar" id="bar-' + prefix + a.k + '">' +
          '<div class="ticks"></div>' +
          '<div class="band" id="band-' + prefix + a.k + '" style="background:' + a.color + ';"></div>' +
          '<div class="band-dot" id="dot-' + prefix + a.k + '"></div>' +
        '</div>' +
        '<div class="bar-caption">' + caption + '</div>' +
      '</div>';
    }).join('');
  }

  function paintAxisFrom(st, prefix, a, withPulse) {
    var est = estimateOf(st, a.k), u = uncertaintyOf(st, a.k);
    var left = Math.max(0, est - u), right = Math.min(100, est + u);
    var band = $('band-' + prefix + a.k);
    var dot = $('dot-' + prefix + a.k);
    var res = $('res-' + prefix + a.k);
    var bar = $('bar-' + prefix + a.k);
    if (!band) return;
    band.style.left = left + '%';
    band.style.width = (right - left) + '%';
    band.style.filter = 'blur(' + blurOf(st, a.k) + 'px)';
    band.style.opacity = st[a.k].n === 0 ? 0.35 : 0.9;
    dot.style.left = est + '%';
    dot.style.opacity = resolutionOf(st, a.k) >= 55 ? 0.9 : 0;
    if (res) {
      res.textContent = st[a.k].n === 0 ? 'no signal yet' : resolutionOf(st, a.k) + '% in focus';
      if (withPulse) {
        res.classList.add('bump');
        bar.classList.remove('pulse'); void bar.offsetWidth; bar.classList.add('pulse');
        setTimeout(function () { res.classList.remove('bump'); }, 1200);
      }
    }
  }

  function paintBarsFrom(st, prefix) {
    AXES.forEach(function (a) { paintAxisFrom(st, prefix, a, false); });
  }

  /* The unveiling: paint the "before" state instantly, then sharpen one trait
     at a time. Withholding is the theatre; this is the payoff. */
  function unveil(container, prefix, beforeState, done) {
    buildBars(container, prefix);
    container.querySelectorAll('.band, .band-dot').forEach(function (el) { el.style.transition = 'none'; });
    paintBarsFrom(beforeState, prefix);
    void container.offsetWidth;
    container.querySelectorAll('.band, .band-dot').forEach(function (el) { el.style.transition = ''; });
    var orderAxes = AXES.slice().sort(function (x, y) {
      return (resolutionOf(state, x.k) - resolutionOf(beforeState, x.k)) -
             (resolutionOf(state, y.k) - resolutionOf(beforeState, y.k));
    });
    orderAxes.forEach(function (a, i) {
      setTimeout(function () { paintAxisFrom(state, prefix, a, true); }, 500 + i * 420);
    });
    if (done) setTimeout(done, 500 + orderAxes.length * 420 + 600);
  }

  function renderJourney() {
    var j = $('journey');
    var dots = '';
    for (var i = 1; i <= TOTAL; i++) {
      var isReveal = CHECKPOINTS.indexOf(i) !== -1 || i === TOTAL;
      dots += '<span class="dot' + (isReveal ? ' reveal' : '') +
        (responses[i - 1] ? ' done' : '') + (i - 1 === qIndex ? ' here' : '') + '"></span>';
    }
    var next = blockEnd() + 1;
    j.innerHTML = dots + '<span class="journey-label">' +
      (next === TOTAL ? 'full picture' : 'next reveal') + ' at ' + next + '</span>';
  }

  /* ================= RENDER: the ranking card ================= */
  var POS_LABEL = ['Most like me', '', '', 'Least like me'];

  function rowsHtml(q) {
    return working.map(function (optIndex, pos) {
      var o = q.opts[optIndex];
      var edge = POS_LABEL[pos] || '';
      return '<li class="rank-row" data-pos="' + pos + '" role="listitem">' +
        '<span class="rank-n" aria-hidden="true">' + (pos + 1) + '</span>' +
        '<span class="rank-text">' + escapeHtml(o.t) +
          (edge ? '<span class="rank-edge">' + edge + '</span>' : '') +
        '</span>' +
        '<span class="rank-moves">' +
          '<button class="rank-move" type="button" data-move="up" data-pos="' + pos + '"' +
            (pos === 0 ? ' disabled' : '') + ' aria-label="Move up — more like me">▲</button>' +
          '<button class="rank-move" type="button" data-move="down" data-pos="' + pos + '"' +
            (pos === working.length - 1 ? ' disabled' : '') + ' aria-label="Move down — less like me">▼</button>' +
        '</span>' +
      '</li>';
    }).join('');
  }

  /* Repaint the numbers, edge labels and move buttons after a reorder, without
     rebuilding the list — moving the node rather than re-rendering is what
     keeps focus on the button that was just pressed. */
  function refreshRowChrome() {
    var list = $('rankList');
    if (!list) return;
    var rows = list.querySelectorAll('.rank-row');
    rows.forEach(function (row, pos) {
      row.dataset.pos = pos;
      var n = row.querySelector('.rank-n');
      if (n) n.textContent = pos + 1;
      var edge = row.querySelector('.rank-edge');
      var want = POS_LABEL[pos] || '';
      if (edge && !want) edge.remove();
      else if (edge) edge.textContent = want;
      else if (want) {
        var span = document.createElement('span');
        span.className = 'rank-edge';
        span.textContent = want;
        row.querySelector('.rank-text').appendChild(span);
      }
      var up = row.querySelector('[data-move="up"]');
      var down = row.querySelector('[data-move="down"]');
      if (up) { up.disabled = pos === 0; up.dataset.pos = pos; }
      if (down) { down.disabled = pos === rows.length - 1; down.dataset.pos = pos; }
    });
  }

  /* `working` is rebuilt from the DOM after every reorder, so the list on
     screen is always the answer that would be recorded. */
  function syncWorkingFromDom() {
    var list = $('rankList');
    if (!list) return;
    working = Array.prototype.map.call(list.querySelectorAll('.rank-row'), function (row) {
      return parseInt(row.dataset.opt, 10);
    });
  }

  /* Flag "there's more list below this edge" so the fade in the stylesheet
     can appear. Cheap enough to run on every reorder and every scroll. */
  function markListOverflow() {
    var body = $('qbody');
    if (!body) return;
    var more = body.scrollHeight - body.clientHeight - body.scrollTop > 2;
    body.classList.toggle('has-more', more);
  }

  function announce(msg) {
    var live = $('rankLive');
    if (live) live.textContent = msg;
  }

  function renderQuestion() {
    var q = QUESTIONS[qIndex];
    var r = responses[qIndex];
    working = (r ? r.order : shuffles[qIndex]).slice();
    var card = $('qcard');
    card.classList.add('entering');
    /* .qbody holds everything you READ — the moment, the four rows, the hint.
       It is the one thing in the card that scrolls, so the confirm button and
       the back/forward row below it are pinned at the bottom of the card and
       stay reachable at any content height. */
    card.innerHTML =
      '<div class="qbody" id="qbody">' +
        '<div class="qnum">Moment ' + (qIndex + 1) + ' of ' + TOTAL + '</div>' +
        '<p class="scenario">' + escapeHtml(q.s) + '</p>' +
        '<p class="prompt">Put these in order — most like you at the top.</p>' +
        '<ol class="rank-list" id="rankList" role="list">' + rowsHtml(q) + '</ol>' +
        '<p class="rank-hint">Use the arrows to put these in order. Nothing here is right or wrong — go on what you&rsquo;ve actually done before.</p>' +
        (r ? '<p class="change-hint">Ranked — shuffle it about if that&rsquo;s not it.</p>' : '') +
      '</div>' +
      '<div class="btn-row"><button class="btn btn-primary" type="button" data-confirm="1">' +
        (r ? 'Keep this order →' : 'That&rsquo;s my order →') + '</button></div>' +
      navRow() +
      '<div class="sr-live" id="rankLive" aria-live="polite"></div>';
    /* stamp the option index onto each row so the DOM is the source of order */
    var list = $('rankList');
    list.querySelectorAll('.rank-row').forEach(function (row, pos) {
      row.dataset.opt = working[pos];
    });
    $('qbody').addEventListener('scroll', markListOverflow, { passive: true });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        card.classList.remove('entering');
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        markListOverflow();
      });
    });
    busy = false;
    renderJourney();
  }

  /* Back / forward inside the current ten. You can walk forward past a moment
     you haven't ranked, and walk back to it later. */
  function navRow() {
    var atStart = qIndex === blockStart();
    var atEnd = qIndex === blockEnd();
    var skipped = firstUnansweredInBlock();
    var nextLabel;
    if (!atEnd) nextLabel = 'Skip for now →';
    else if (skipped !== -1) nextLabel = 'The one you skipped →';
    else nextLabel = blockEnd() === TOTAL - 1 ? 'The full picture →' : 'See what these ten say →';
    return '<div class="nav-row">' +
      '<button class="nav-btn" type="button" data-nav="back"' + (atStart ? ' disabled' : '') + '>← Back</button>' +
      '<button class="nav-btn" type="button" data-nav="next">' + nextLabel + '</button>' +
      '</div>';
  }

  function moveRow(pos, dir) {
    var list = $('rankList');
    if (!list) return;
    var rows = list.querySelectorAll('.rank-row');
    var target = pos + dir;
    if (target < 0 || target >= rows.length) return;
    var row = rows[pos];
    if (dir < 0) list.insertBefore(row, rows[target]);
    else list.insertBefore(rows[target], row);
    syncWorkingFromDom();
    refreshRowChrome();
    markListOverflow();
    var text = row.querySelector('.rank-text').firstChild.textContent;
    announce('Now ' + (target + 1) + ' of ' + rows.length + ': ' + text);
    /* keep the keyboard/screen-reader user on the button they just pressed */
    /* Keep the keyboard/screen-reader user on the button they just pressed. If
       that press took the row to the top or the bottom the button is now
       disabled, so hand focus to its sibling on the same row rather than
       dropping it to the document. */
    var moved = list.querySelectorAll('.rank-row')[target];
    if (!moved) return;
    /* On a long moment the list scrolls; keep the row you just moved in sight.
       'nearest' only ever scrolls the list — the page itself is pinned. */
    if (moved.scrollIntoView) moved.scrollIntoView({ block: 'nearest' });
    var btn = moved.querySelector('[data-move="' + (dir < 0 ? 'up' : 'down') + '"]');
    if (!btn || btn.disabled) btn = moved.querySelector('[data-move="' + (dir < 0 ? 'down' : 'up') + '"]');
    if (btn && !btn.disabled) btn.focus({ preventScroll: true });
  }

  /* ---- the answering view holds still ----
     Ranking is the one place where nothing should move except the rows. The
     page is pinned while a moment is on screen and released for the intro,
     the reveals and the results, which are long and want scrolling. */
  function lockPage(on) {
    /* Pin from the top: the answering view is a full screen of its own, and
       every exit from it scrolls its destination to the top anyway, so there
       is no scroll position worth restoring. */
    if (on) window.scrollTo(0, 0);
    document.documentElement.classList.toggle('answering', !!on);
    document.body.classList.toggle('answering', !!on);
    if (on) fitToVisibleViewport();
    else document.body.style.height = '';
  }

  /* `100dvh` is the right unit and modern iOS honours it — but the bug that
     trapped Max was a pinned box laid out TALLER than the screen, so measure
     the screen rather than trust a unit. visualViewport is what the person can
     actually see, and an inline height can't be out-cascaded by anything.
     Skipped while pinch-zoomed: then the small visual viewport is the user's
     own doing and re-laying the page out to it would fight them. */
  function fitToVisibleViewport() {
    var vv = window.visualViewport;
    if (!vv || !document.body.classList.contains('answering')) return;
    if (vv.scale && vv.scale > 1.01) return;
    document.body.style.height = Math.round(vv.height) + 'px';
  }

  /* ================= FLOW ================= */
  function startQuiz() {
    $('intro').classList.add('hidden');
    $('live').classList.remove('hidden');
    lockPage(true);
    lastSnapshot = snapshot();
    renderQuestion();
  }

  /* Whatever was saved, they have asked to walk away from it. */
  function startOver() {
    clearProgress();
    resetState();
    startQuiz();
  }

  /* Confirming is an explicit act — a stray touch on the list reorders
     something visibly, it never scores a moment. */
  function confirmOrder() {
    syncWorkingFromDom();
    var wasNew = !responses[qIndex];
    responses[qIndex] = { order: working.slice() };
    recompute();
    saveProgress();
    advance(wasNew);
  }

  function goTo(i) {
    busy = true;
    renderJourney();
    var card = $('qcard');
    card.classList.add('fading');
    setTimeout(function () {
      qIndex = i;
      saveProgress();
      card.classList.remove('fading');
      renderQuestion();
    }, 280);
  }

  /* After confirming: on to the next moment in the ten; at the end of the ten,
     back to anything skipped; only when the ten is whole does the curtain lift.
     `wasNew` tells a fresh ranking from a change of mind — filling the last gap
     finishes the ten wherever you're standing, while re-ranking an old moment
     just carries on, so an edit never hijacks you to the reveal. */
  function advance(wasNew) {
    if (wasNew && firstUnansweredInBlock() === -1) return reveal();
    if (qIndex < blockEnd()) return goTo(qIndex + 1);
    return navNext();
  }

  function reveal() {
    busy = true;
    renderJourney();
    setTimeout(blockEnd() === TOTAL - 1 ? finishQuiz : showCheckpoint, 350);
  }

  function navBack() {
    if (qIndex > blockStart()) goTo(qIndex - 1);
  }

  function navNext() {
    if (qIndex < blockEnd()) return goTo(qIndex + 1);
    var skipped = firstUnansweredInBlock();
    if (skipped !== -1) return goTo(skipped);
    reveal();
  }

  function sortedByResolution() {
    return AXES.slice().sort(function (a, b) { return resolutionPct(b.k) - resolutionPct(a.k); });
  }
  function traitSentence(a) {
    var est = estimate(a.k);
    return est >= 62 ? a.hi : est <= 38 ? a.lo : a.mid;
  }
  function traitLine(a) {
    return a.abs
      ? 'on its own scale you sit ' + positionLabel(a.k) + ': ' + traitSentence(a)
      : 'in a room of 100 people, ' + traitSentence(a);
  }

  function showCheckpoint() {
    busy = false;
    lockPage(false);
    $('live').classList.add('hidden');
    var first = blockEnd() === CHECKPOINTS[0] - 1;

    $('cpTitle').textContent = first ? 'First look — ten moments in' : 'Second look — twenty moments in';
    $('cpSub').textContent = first
      ? "You've been ordering blind. Here's what you've quietly been turning out to be like:"
      : 'Ten more moments since you last looked. Watch what they did:';

    var bars = $('cpBars'), curtain = $('cpCurtain'), insights = $('cpInsights'), buttons = $('cpButtons');
    bars.classList.add('hidden');
    curtain.classList.remove('gone');
    insights.innerHTML = '';
    buttons.innerHTML = '';
    $('checkpoint').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(function () {
      curtain.classList.add('gone');
      bars.classList.remove('hidden');
      unveil(bars, 'cp', lastSnapshot, function () {
        var top2 = sortedByResolution().slice(0, 2);
        insights.innerHTML = top2.map(function (a) {
          return '<div class="insight"><b>' + a.name + '</b> is ' +
            (first ? 'sharpening fastest' : 'the clearest thing on the board') +
            ' — ' + traitLine(a) + '. ' +
            '<span class="insight-note">(' + resolutionPct(a.k) +
            '% in focus — the band is still honest about its width.)</span></div>';
        }).join('');
        buttons.innerHTML = first
          ? '<button class="btn btn-primary" type="button" data-continue="1">Keep going — next look at 20</button>' +
            '<button class="btn btn-ghost" type="button" data-finish="1">Finish with what I have</button>'
          : '<button class="btn btn-primary" type="button" data-continue="1">The final ten — full picture at 30</button>' +
            '<button class="btn btn-ghost" type="button" data-finish="1">Finish with what I have</button>';
        lastSnapshot = snapshot();
        saveProgress();
      });
    }, 1400);
  }

  function continueQuiz() {
    qIndex = Math.min(blockEnd() + 1, TOTAL - 1);
    saveProgress();
    $('checkpoint').classList.add('hidden');
    $('live').classList.remove('hidden');
    lockPage(true);
    $('qcard').classList.remove('fading');
    renderQuestion();
  }

  function finishQuiz() {
    busy = false;
    lockPage(false);
    $('live').classList.add('hidden');
    $('checkpoint').classList.add('hidden');
    $('results').classList.remove('hidden');

    var dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    var meta = 'Built from ' + answered + ' ranked moment' + (answered === 1 ? '' : 's') +
      ' · overall picture ' + overallFocus() + '% in focus · ' + dateStr;
    $('resultsMeta').textContent = meta;
    $('printMeta').textContent = meta + ' — generated privately in your browser; nothing was uploaded.';

    unveil($('resultBars'), 'r', lastSnapshot || snapshot(), null);

    $('resultText').innerHTML = AXES.map(function (a) {
      var est = Math.round(estimate(a.k));
      var u = Math.round(uncertainty(a.k));
      var head = a.abs
        ? '· ' + dial(a.k).toFixed(1) + ' on its own 0–10 dial, give or take ' + dialSpread(a.k).toFixed(1)
        : '· roughly ' + Math.max(1, est - u) + '–' + Math.min(99, est + u) + ' of 100';
      var body = a.abs
        ? 'On this axis&rsquo;s own scale, running from ' + a.loEnd + ' to ' + a.hiEnd +
          ', you sit ' + positionLabel(a.k) + ': ' + traitSentence(a) +
          '. That&rsquo;s where your answers put you on the axis, not where it puts you among ' +
          'other people. At ' + resolutionPct(a.k) +
          '% focus this is an indication, not a measurement — more scenarios would tighten it.'
        : 'In a room of 100 people, ' + traitSentence(a) + '. At ' + resolutionPct(a.k) +
          '% focus this is an indication, not a measurement — more scenarios would tighten it.';
      return '<div class="result-trait">' +
        '<h3>' + a.name + ' <span class="pct">' + head + '</span></h3>' +
        '<p>' + body + '</p>' +
        '</div>';
    }).join('');

    save(meta);
    /* the run is over: the finished record is now the thing worth keeping,
       and a half-finished run must not linger behind it */
    clearProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ================= ON-DEVICE KEEPING =================
     localStorage only. No endpoint, no upload, no account linkage. Stored
     under its own key so a ranked run and a single-choice run never overwrite
     one another. */
  function save(meta) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        variant: 'rank',
        completed: new Date().toISOString(),
        meta: meta,
        scenariosSeen: answered,
        bands: AXES.map(function (a) {
          var b = {
            k: a.k, name: a.name,
            scale: a.abs ? 'absolute' : 'population',
            focus: resolutionPct(a.k),
            sentence: traitSentence(a)
          };
          if (a.abs) {
            b.dial = dial(a.k);
            b.spread = dialSpread(a.k);
            b.position = positionLabel(a.k);
          } else {
            b.low = Math.max(1, Math.round(estimate(a.k) - uncertainty(a.k)));
            b.high = Math.min(99, Math.round(estimate(a.k) + uncertainty(a.k)));
          }
          return b;
        }),
        answers: answers
      }));
    } catch (e) { /* private mode / full quota — the page still works */ }
  }

  /* ---- the run in progress ----
     Thirty moments is a long way to walk on a phone, and until now every step
     of it lived only in memory: one reload, one backgrounded tab, one service
     worker update, and the whole run was gone and you started again at moment
     one. That is the "it asks me things I already answered" people reported.

     So: written after every change, and read back on load. Same rule as the
     results — this device, this browser, no endpoint, no upload, no account.
     What gets stored is `responses`, the per-moment record that is already the
     single source of truth here, plus `shuffles`: the shown-order of each
     moment's four options is part of what the person saw, and re-rolling it
     under a resumed run would move the rows about for no reason. */
  function saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({
        v: PROGRESS_V,
        saved: new Date().toISOString(),
        total: TOTAL,
        qIndex: qIndex,
        responses: responses,
        shuffles: shuffles,
        lastSnapshot: lastSnapshot
      }));
    } catch (e) { /* private mode / full quota — the run still works, just not across reloads */ }
  }

  /* A saved run is only meaningful against the bank it was answered from: the
     indices ARE the questions. If the bank has changed size, or anything about
     the shape is off, throw it away rather than resume someone into nonsense. */
  function loadProgress() {
    var raw, d;
    try { raw = localStorage.getItem(PROGRESS_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try { d = JSON.parse(raw); } catch (e) { return null; }
    if (!d || d.v !== PROGRESS_V || d.total !== TOTAL) return null;
    if (!Array.isArray(d.responses) || d.responses.length !== TOTAL) return null;
    if (!Array.isArray(d.shuffles) || d.shuffles.length !== TOTAL) return null;
    if (typeof d.qIndex !== 'number' || d.qIndex < 0 || d.qIndex >= TOTAL) return null;
    /* nothing ranked yet is not a run worth resuming */
    if (!d.responses.some(function (r) { return !!r; })) return null;
    return d;
  }

  function clearProgress() {
    try { localStorage.removeItem(PROGRESS_KEY); } catch (e) { /* nothing sensible left to do */ }
  }

  function resumeQuiz(d) {
    responses = d.responses;
    shuffles = d.shuffles;
    qIndex = d.qIndex;
    lastSnapshot = d.lastSnapshot || null;
    busy = false;
    recompute();
    $('intro').classList.add('hidden');
    $('live').classList.remove('hidden');
    lockPage(true);
    /* the reveal needs a "before" to sharpen away from; if the saved run
       predates its first checkpoint, where we are now IS the before */
    if (!lastSnapshot) lastSnapshot = snapshot();
    renderQuestion();
  }

  function firstPerson(s) {
    return s.replace(/\byou['’]d\b/g, 'I’d').replace(/\byour\b/g, 'my').replace(/\byou\b/g, 'I');
  }

  function resultsAsText() {
    var lines = ['What are you like, anyway? — my starting points (ranked)', $('resultsMeta').textContent, ''];
    lines.push('FOUR OF THE FAMILIAR FIVE — where I’d stand in a room of 100 people.', '');
    AXES.filter(function (a) { return !a.abs; }).forEach(function (a) {
      var est = Math.round(estimate(a.k)), u = Math.round(uncertainty(a.k));
      lines.push(a.name + ' — roughly ' + Math.max(1, est - u) + '–' + Math.min(99, est + u) +
        ' of 100 (' + resolutionPct(a.k) + '% in focus)');
      lines.push('  ' + firstPerson(traitSentence(a)));
    });
    lines.push('', 'RISK AND SENSITIVITY — no room of 100 behind these two.',
      'They’re Cowch’s own axes, so there’s no comparison population yet. These are',
      'absolute readings on each axis’s own scale — where my answers put me, not where',
      'that puts me among other people.', '');
    AXES.filter(function (a) { return a.abs; }).forEach(function (a) {
      lines.push(a.name + ' — ' + dial(a.k).toFixed(1) + ' on its own 0–10 dial (' + a.loEnd +
        ' → ' + a.hiEnd + '), give or take ' + dialSpread(a.k).toFixed(1) +
        ' (' + resolutionPct(a.k) + '% in focus)');
      lines.push('  ' + positionLabel(a.k) + ': ' + firstPerson(traitSentence(a)));
    });
    lines.push('',
      'READ TOGETHER',
      'My familiar-five position, how I handle risk, and how loudly my alarm system',
      'runs — taken together that’s a starting point, not a verdict. Where it tends to',
      'earn its keep is anywhere two people have to fit together: a relationship, or a',
      'business with someone. Not a prediction of how either will go. Just a better set',
      'of questions to ask early — and earlier than you’d otherwise think to ask them.');
    lines.push('', 'A starting point, not a verdict.');
    return lines.join('\n');
  }

  function copyResults(btn) {
    var text = resultsAsText();
    var done = function () {
      var was = btn.textContent;
      btn.textContent = 'Copied ✓';
      setTimeout(function () { btn.textContent = was; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* nothing sensible left to do */ }
    document.body.removeChild(ta);
  }

  /* ================= WIRING ================= */
  function wire() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.move) return busy ? undefined : moveRow(parseInt(t.dataset.pos, 10), t.dataset.move === 'up' ? -1 : 1);
      if (t.dataset.confirm) return busy ? undefined : confirmOrder();
      if (t.dataset.nav) return busy ? undefined : (t.dataset.nav === 'back' ? navBack() : navNext());
      if (t.dataset.continue) return continueQuiz();
      if (t.dataset.finish) return finishQuiz();
      if (t.dataset.start) {
        var saved = loadProgress();
        return saved ? resumeQuiz(saved) : startQuiz();
      }
      if (t.dataset.startover) return startOver();
      if (t.dataset.print) return window.print();
      if (t.dataset.copy) return copyResults(t);
      /* "Start over" from the results: a completed run is behind them, so the
         reload must not find a stale run in progress and offer to resume it. */
      if (t.dataset.restart) { clearProgress(); return location.reload(); }
    });
    /* Rotating the phone or the browser bars sliding away changes how much
       room the list has — re-check whether there's still more below. */
    var refit = function () { fitToVisibleViewport(); markListOverflow(); };
    window.addEventListener('resize', refit, { passive: true });
    window.addEventListener('orientationchange', refit, { passive: true });
    /* The URL bar sliding away changes the visible height without always
       firing a window resize on iOS. */
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', refit, { passive: true });
      window.visualViewport.addEventListener('scroll', refit, { passive: true });
    }
  }

  function boot() {
    fetch(BANK_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('bank ' + r.status);
        return r.json();
      })
      .then(function (doc) {
        QUESTIONS = doc.questions;
        TOTAL = QUESTIONS.length;
        resetState();
        wire();
        var start = $('startBtn');
        var saved = loadProgress();
        if (start) {
          start.disabled = false;
          /* Naming the moment is the whole point: it says "your answers are
             still here" before they have to trust that they are. */
          start.textContent = saved
            ? 'Pick up where you left off — moment ' + (saved.qIndex + 1) + ' of ' + TOTAL
            : 'Go on then — first look at 10';
        }
        var note = $('resumeNote');
        if (note && saved) note.classList.remove('hidden');
      })
      .catch(function () {
        var start = $('startBtn');
        if (start) {
          start.disabled = true;
          start.textContent = 'Couldn’t load — try again in a moment';
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
