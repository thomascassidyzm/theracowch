/**
 * "What are you like, anyway?" — the engine.
 *
 * Ported faithfully from the canonical prototype
 * (thrive-website @30198ce, prototypes/proto-a.template.html). The maths, the
 * reveal choreography, the honest-exit handling and the room-of-100 language
 * encode founder rulings, not just code — change them upstream, not here.
 *
 * Load order: a plain <script> tag on
 * /questionnaires/what-are-you-like.html. No modules build in this repo.
 *
 * Everything stays on this device. The bank is fetched as static JSON; results
 * live in localStorage; nothing is ever uploaded.
 */
(function () {
  'use strict';

  var BANK_URL = '/questionnaires/data/what-are-you-like-bank.json?v=1';
  var STORE_KEY = 'cowch-q-wayl';

  /* ================= AXES =================
     Names, subtitles and room-of-100 sentences carried across verbatim.
     N is surfaced as "Sensitivity — how loudly the alarm system runs", never
     as neuroticism. R (risk appetite) is the sixth axis.

     TWO KINDS OF AXIS, and the difference is honesty, not decoration.
     O/C/E/A come from an established instrument with a real comparison
     population behind them, so "put 100 people in a room, you'd be standing
     around here" is a claim we can actually make. N and R are ours — there is
     no population of other people's answers behind them yet, so a percentile
     would be a made-up number. Those two carry `abs: true`: same maths, same
     honest width, but reported as a position on the axis's OWN scale
     (`loEnd` ↔ `hiEnd`) with no comparison to anybody. Don't quietly fold them
     back into the room of 100. */
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
     freely backwards and forwards inside the block you're in — and change
     anything in it — but not back across a reveal you've already seen. */
  var BLOCK = 10;

  /* The honest exit — one consistent phrasing bank-wide; a scenario may
     override it via its optional `exit` field (q.x). Choosing it is an
     abstention: zero weight in scoring, first-class signal in the profile. */
  var EXIT_DEFAULT = 'Something else — or it depends';

  /* ================= STATE ================= */
  var QUESTIONS = [];
  var TOTAL = 0;
  var state = {};
  var answers = [];      /* substantive picks: {id, opt} */
  var abstentions = [];  /* honest exits: {id, s, note} — out of the bars, into the narrative */
  /* One slot per moment: null (not answered yet), {opt:i}, or {exit:true, note}.
     This — not a running total — is the record. Scores are recomputed from it
     after every change, so changing an old answer simply cannot leave a stale
     contribution behind in the bands. */
  var responses = [];
  var qIndex = 0;
  var answered = 0;
  var lastSnapshot = null;  /* per-axis {sum,n} as of the previous reveal */
  /* The outgoing card stays in the DOM for the 280ms fade, so its buttons are
     still tappable — on a phone a double-tap would otherwise answer two moments
     with one card on screen. Answering and navigating are both closed until the
     next card is up. */
  var busy = false;

  function resetState() {
    responses = [];
    for (var i = 0; i < TOTAL; i++) responses.push(null);
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
    abstentions = [];
    answered = 0;
    responses.forEach(function (r, i) {
      if (!r) return;
      answered++;
      var q = QUESTIONS[i];
      if (r.exit) { abstentions.push({ id: q.id, s: q.s, note: r.note }); return; }
      var w = q.opts[r.opt].w;
      for (var k in w) {
        if (!state[k]) continue;  /* proposed axes are never scored */
        state[k].sum += w[k];
        state[k].n += Math.abs(w[k]);
      }
      answers.push({ id: q.id, opt: r.opt });
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

  /* ================= MATH ================= */
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
  /* The absolute read, for the two axes that have no comparison population.
     Same tanh estimate and same uncertainty as everywhere else — only the
     reporting changes: the 0–100 internal position becomes a reading on the
     axis's own 0–10 dial, and the honest width becomes "give or take". */
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

  /* ================= RENDER ================= */
  function buildBars(container, prefix) {
    container.innerHTML = AXES.map(function (a) {
      /* the caption is where the two kinds of axis visibly part company */
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
      /* per-moment now, not "first N" — a moment you skipped past stays visibly
         open until you go back and answer it */
      dots += '<span class="dot' + (isReveal ? ' reveal' : '') +
        (responses[i - 1] ? ' done' : '') + (i - 1 === qIndex ? ' here' : '') + '"></span>';
    }
    var next = blockEnd() + 1;
    j.innerHTML = dots + '<span class="journey-label">' +
      (next === TOTAL ? 'full picture' : 'next reveal') + ' at ' + next + '</span>';
  }

  /* Back / forward inside the current ten. Deliberately unfussy: you can walk
     forward past a moment you haven't answered, and walk back to it later. */
  function navRow() {
    var atStart = qIndex === blockStart();
    var atEnd = qIndex === blockEnd();
    var skipped = firstUnansweredInBlock();
    var nextLabel;
    if (!atEnd) nextLabel = 'Next →';
    else if (skipped !== -1) nextLabel = 'The one you skipped →';
    else nextLabel = blockEnd() === TOTAL - 1 ? 'The full picture →' : 'See what these ten say →';
    return '<div class="nav-row">' +
      '<button class="nav-btn" type="button" data-nav="back"' + (atStart ? ' disabled' : '') + '>← Back</button>' +
      '<button class="nav-btn" type="button" data-nav="next">' + nextLabel + '</button>' +
      '</div>';
  }

  function renderQuestion() {
    var q = QUESTIONS[qIndex];
    var r = responses[qIndex];
    var card = $('qcard');
    card.classList.add('entering');
    card.innerHTML =
      '<div class="qnum">Moment ' + (qIndex + 1) + ' of ' + TOTAL + '</div>' +
      '<p class="scenario">' + escapeHtml(q.s) + '</p>' +
      '<p class="prompt">Which would you do first?</p>' +
      q.opts.map(function (o, i) {
        var chosen = r && !r.exit && r.opt === i;
        return '<button class="opt' + (chosen ? ' chosen' : '') + '" type="button" data-opt="' + i + '">' +
          escapeHtml(o.t) + (chosen ? '<span class="chosen-tag">your answer</span>' : '') + '</button>';
      }).join('') +
      '<button class="opt opt-exit' + (r && r.exit ? ' chosen' : '') + '" type="button" data-exit="1">' +
        escapeHtml(q.x || EXIT_DEFAULT) +
        (r && r.exit ? '<span class="chosen-tag">your answer</span>' : '') + '</button>' +
      (r && r.exit && r.note ? '<p class="abs-recall">&ldquo;' + escapeHtml(r.note) + '&rdquo;</p>' : '') +
      (r ? '<p class="change-hint">Answered — tap another option if that’s not it.</p>' : '') +
      navRow();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        card.classList.remove('entering');
        card.style.transition = 'opacity 0.3s, transform 0.3s';
      });
    });
    busy = false;
    renderJourney();
  }

  /* ================= FLOW ================= */
  function startQuiz() {
    $('intro').classList.add('hidden');
    $('live').classList.remove('hidden');
    lastSnapshot = snapshot();
    renderQuestion();
  }

  function answer(i) {
    var wasNew = !responses[qIndex];
    responses[qIndex] = { opt: i };
    recompute();
    advance(wasNew);
  }

  /* The honest exit: no weights touched — this scenario simply won't count.
     One optional line in their own words; continuing without typing is one tap. */
  function abstain() {
    var q = QUESTIONS[qIndex];
    var r = responses[qIndex];
    var card = $('qcard');
    card.innerHTML =
      '<div class="qnum">Moment ' + (qIndex + 1) + ' of ' + TOTAL + '</div>' +
      '<p class="scenario scenario-quiet">' + escapeHtml(q.s) + '</p>' +
      '<p class="prompt">Fair enough. What would it depend on — or what would you do?</p>' +
      '<textarea class="exit-note" id="exitNote" rows="2" placeholder="Optional — a line in your own words">' +
        escapeHtml((r && r.exit && r.note) || '') + '</textarea>' +
      '<div class="btn-row"><button class="btn btn-primary" type="button" data-exit-continue="1">Continue</button></div>' +
      '<p class="exit-hint">Entirely optional — carry straight on if you like.</p>' +
      '<div class="nav-row"><button class="nav-btn" type="button" data-exit-cancel="1">← Back to the options</button></div>';
    var note = $('exitNote');
    if (note) note.focus({ preventScroll: true });
  }

  function abstainContinue() {
    var el = $('exitNote');
    var wasNew = !responses[qIndex];
    responses[qIndex] = { exit: true, note: ((el && el.value) || '').trim() };
    recompute();
    advance(wasNew);
  }

  /* Move to a moment in the current ten, with the same fade the quiz has
     always used. `busy` stays true for the whole transition — that's what
     stops a double-tap answering two moments with one card on screen. */
  function goTo(i) {
    busy = true;
    renderJourney();
    var card = $('qcard');
    card.classList.add('fading');
    setTimeout(function () {
      qIndex = i;
      card.classList.remove('fading');
      renderQuestion();
    }, 280);
  }

  /* After answering: on to the next moment in the ten; at the end of the ten,
     back to anything skipped; only when the ten is whole does the curtain lift.
     `wasNew` is what tells a fresh answer from a change of mind — filling the
     last gap finishes the ten wherever you're standing, while re-answering an
     old moment just carries on, so an edit never hijacks you to the reveal. */
  function advance(wasNew) {
    /* measurement-blind: nothing visible changes except the journey dots */
    if (wasNew && firstUnansweredInBlock() === -1) return reveal();
    if (qIndex < blockEnd()) return goTo(qIndex + 1);
    return navNext();
  }

  /* The curtain: a checkpoint at ten and twenty, the full picture at thirty. */
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
  /* One sentence, framed the way that axis is honestly allowed to be framed. */
  function traitLine(a) {
    return a.abs
      ? 'on its own scale you sit ' + positionLabel(a.k) + ': ' + traitSentence(a)
      : 'in a room of 100 people, ' + traitSentence(a);
  }

  function showCheckpoint() {
    busy = false;
    $('live').classList.add('hidden');
    var first = blockEnd() === CHECKPOINTS[0] - 1;

    $('cpTitle').textContent = first ? 'First look — ten moments in' : 'Second look — twenty moments in';
    $('cpSub').textContent = first
      ? "You've been answering blind. Here's what you've quietly been turning out to be like:"
      : 'Ten more moments since you last looked. Watch what they did:';

    var bars = $('cpBars'), curtain = $('cpCurtain'), insights = $('cpInsights'), buttons = $('cpButtons');
    bars.classList.add('hidden');
    curtain.classList.remove('gone');
    insights.innerHTML = '';
    buttons.innerHTML = '';
    $('checkpoint').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    /* a breath of anticipation, then the curtain lifts */
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
      });
    }, 1400);
  }

  /* Onward into the next ten. The reveal is the one door that only opens one
     way: what's behind it has been seen, so it stays behind it. */
  function continueQuiz() {
    qIndex = Math.min(blockEnd() + 1, TOTAL - 1);
    $('checkpoint').classList.add('hidden');
    $('live').classList.remove('hidden');
    $('qcard').classList.remove('fading');
    renderQuestion();
  }

  function finishQuiz() {
    busy = false;
    $('live').classList.add('hidden');
    $('checkpoint').classList.add('hidden');
    $('results').classList.remove('hidden');

    var scored = answered - abstentions.length;
    var dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    var meta = 'Built from ' + scored + ' scenario answer' + (scored === 1 ? '' : 's') +
      (abstentions.length ? ' · ' + abstentions.length + ' set aside as "it depends"' : '') +
      ' · overall picture ' + overallFocus() + '% in focus · ' + dateStr;
    $('resultsMeta').textContent = meta;
    $('printMeta').textContent = meta + ' — generated privately in your browser; nothing was uploaded.';

    /* the final act gets the same unveiling as the checkpoints */
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

    /* Where you said "it depends" — abstentions as attention map, never deficit.
       Zero weight in the bands above; first-class signal here and in the print copy. */
    $('abstainBlock').innerHTML = abstentions.length
      ? '<div class="abstain-block"><h3>Where you said &ldquo;it depends&rdquo;</h3>' +
        '<p class="abstain-intro">You set ' +
          (abstentions.length === 1 ? 'one scenario' : abstentions.length + ' scenarios') +
          ' aside — the options weren’t you, or the honest answer really was &ldquo;it depends&rdquo;. ' +
          (abstentions.length === 1 ? 'It carries' : 'They carry') + ' no weight in the bands above. ' +
          (abstentions.length === 1 ? 'It’s' : 'They’re') +
          ' marked here because this is often the most interesting part of the map: the places where ' +
          'context, not temperament, decides.</p><ul>' +
        abstentions.map(function (a) {
          return '<li>' + escapeHtml(a.s) +
            (a.note ? '<br><i class="abs-note">&ldquo;' + escapeHtml(a.note) + '&rdquo;</i>' : '') + '</li>';
        }).join('') + '</ul></div>'
      : '';

    save(meta);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ================= ON-DEVICE KEEPING =================
     localStorage only. No endpoint, no upload, no account linkage — the
     results are the person's, on their device, and they choose who sees them. */
  function save(meta) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        completed: new Date().toISOString(),
        meta: meta,
        scenariosSeen: answered,
        bands: AXES.map(function (a) {
          /* the stored record keeps the two kinds apart too — an absolute axis
             never gets written down as a percentile */
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
        answers: answers,
        abstentions: abstentions.map(function (a) { return { id: a.id, s: a.s, note: a.note }; })
      }));
    } catch (e) { /* private mode / full quota — the page still works */ }
  }

  /* A plain-text copy of the results, so someone can paste them into their
     chat with Mandy — or anywhere else — entirely at their own choice. */
  function firstPerson(s) {
    return s.replace(/\byou['’]d\b/g, 'I’d').replace(/\byour\b/g, 'my').replace(/\byou\b/g, 'I');
  }

  function resultsAsText() {
    var lines = ['What are you like, anyway? — my starting points', $('resultsMeta').textContent, ''];
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
    if (abstentions.length) {
      lines.push('', 'Where I said "it depends":');
      abstentions.forEach(function (a) {
        lines.push('  · ' + a.s + (a.note ? ' — "' + a.note + '"' : ''));
      });
    }
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
      if (t.dataset.opt !== undefined) return busy ? undefined : answer(parseInt(t.dataset.opt, 10));
      if (t.dataset.exit) return busy ? undefined : abstain();
      if (t.dataset.exitContinue) return busy ? undefined : abstainContinue();
      if (t.dataset.exitCancel) return busy ? undefined : renderQuestion();
      if (t.dataset.nav) return busy ? undefined : (t.dataset.nav === 'back' ? navBack() : navNext());
      if (t.dataset.continue) return continueQuiz();
      if (t.dataset.finish) return finishQuiz();
      if (t.dataset.start) return startQuiz();
      if (t.dataset.print) return window.print();
      if (t.dataset.copy) return copyResults(t);
      if (t.dataset.restart) return location.reload();
    });
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
        if (start) {
          start.disabled = false;
          start.textContent = 'Go on then — first look at 10';
        }
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
