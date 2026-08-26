# Cowch: the so-what layer

*Draft in progress — Part 1 complete, Parts 2 and 3 landing shortly.*

**The commission**, in Tom's words: "we also need to improve the 'so what?' par too this
questionnaire / it doesn't really do much in that department", and then the sharper version —
"ok, so we have the tendencies, now what can we give people for them to increase/reduce/move in
the direction they want to".

---

## Part 1 — what we already have

### 1a. The repos: what exists, and what doesn't

Tom asked to "just check the original thrive life and thrive work repos". Here is the honest
answer.

**There is no `thrive-life` repo.** `gh repo list thomascassidyzm --limit 300` returns 58
repos; exactly two match "thrive":

| Repo | Visibility | Last pushed |
|---|---|---|
| `thomascassidyzm/thrive-website` | private | 21 Aug 2026 |
| `thomascassidyzm/thrive-work` | public | 14 Nov 2025 |

A wider sweep found nothing else: Tom belongs to no GitHub organisations; a global
`gh search repos "thrive-life"` returns only other people's unrelated projects; and the only
other life-named repo of Tom's is `conquering-life` (private, created Aug 2025, unrelated — no
OCEAN or assessment content).

**But "THRIVE Life" is real — it's an assessment, not a repo.** It lives *inside*
`thrive-website`, at `game/`:

- `game/index.html` — titled "THRIVE Life Assessment | Discover Your OCEAN Profile"
- `game/thrive-life-assessment.js` (365 lines) — the engine, exposed as `window.THRIVELifeAssessment`
- `game/life-results.html` (536 lines) — the results page
- `game/work-assessment-backup.html` (1,497 lines) — the *work* counterpart, in the same repo

So "the thrive life and thrive work repos" is one repo containing two assessments: **Life** and
**Work**. Both are in `thrive-website`. `thrive-work` is a separate, older, largely overlapping
repo. Nothing is missing; the naming was just a memory of two products, not two repos.

### 1b. The prior art: a combination-based insight engine

The closest thing to a so-what layer in the THRIVE estate is
`thrive-website/game/thrive-life-assessment.js:321-353` — `generateCoachingInsights()`. It takes
pairs of axes and emits a named pattern with a description and a suggestion. All three rules it
contains, verbatim:

> **Creative but Unstructured** *(O > 0.5 and C < −0.3)*
> "Your high openness combined with lower conscientiousness suggests amazing creative potential
> that might benefit from more structure."
> → "Try time-boxing your creative sessions to harness your imagination productively."

> **The Quiet Helper** *(E < −0.5 and A > 0.5)*
> "You genuinely care about others but prefer helping from behind the scenes."
> → "Your combination is rare and valuable - embrace your unique way of contributing."

> **The Anxious Achiever** *(N > 0.6 and C > 0.5)*
> "You push yourself hard and worry about getting things right."
> → "Your high standards serve you well, but remember that 'good enough' is sometimes perfect."

Three rules is a stub, not a system. But the *shape* is the prior art, and it's worth naming
because Part 3 deliberately rejects one half of it: **the names**. "The Anxious Achiever" is a
label, and the Cowch results page has already ruled labels out in as many words (see 1c). The
half worth keeping is the **combination** logic — that a so-what is more interesting when it
reads two axes together than when it reads one at a time.

Also note what this engine does *not* have: any handling of a no-population axis, any way for
the person to say which direction they want to go, and any link to anything they could actually
do. It describes and suggests once, and stops.

### 1c. Inside Cowch: the promise is already written, and it isn't kept

This is the part nobody asked me to dig up, and it turned out to be the most useful finding in
the job.

The results page of "What are you like, anyway?" ends like this
(`public/questionnaires/what-are-you-like.html:422`):

> These are directions to move in, not labels to wear. If something here landed — or landed
> wrong — that's worth a conversation. Copy your results and take them to your chat with
> Mandy, or keep them entirely to yourself. They're yours: they never left this device.

"Directions to move in" *is* the so-what promise. What follows it is one button — **Back to
Mandy** — which drops the person on the app home screen carrying nothing. The profile they
just spent thirty moments building is read by nobody. I checked: outside the two questionnaire
engines, nothing in the codebase ever reads the `cowch-q-wayl` localStorage key.
`public/assets/js/therapy-profile.js` builds a *separate* profile out of chat messages and has
no idea the questionnaire exists.

So the gap Tom felt is real, and it is narrower than "we need to invent a so-what layer". It is:
**the measurement runs, the promise is made, and then the thread is dropped.**

### 1d. Cowch's other questionnaires already do the so-what

**Flexible Thinker** (`public/questionnaires/flexible-thinker.html:131-143`) is the template.
Each band names what the pattern *costs* and points at what's next:

> Your mind is working hard to keep things controlled and predictable, which made sense at some
> point. The cost is options. Even one small daily practice in noticing-without-acting can start
> to widen the gap between feeling something and doing something.

> You bend more often than you break. There are still some sticky places where you get caught —
> usually around being wrong, sitting with hard feelings, or holding uncertainty. Notice which
> questions you scored lowest on; that's where the next bit of growth lives.

> Flexibility isn't a personality trait — it's a skill, and you can build it.

Then it hands over one concrete thing, from an `experiments` array (line 138):

> Pick one strong thought today and finish the sentence: "I'm noticing the thought that…"
> before deciding what to do with it.

> Find one situation this week where you can ask "what's another way of seeing this?" before
> reacting.

> Choose one tiny action that aligns with what matters to you, and do it even if you're not in
> the mood.

The shape: **band → what it costs you → one small experiment, this week.** That is a so-what
layer, in this product, in the right register, already shipped.

**Values** (`public/questionnaires/values.html:127,133-136`) supplies the other half — the
*direction*:

> These are the ten you chose. Pin them somewhere you'll see them. When you're feeling flat,
> stuck, or pulled off course, ask: "Which of these would I be living right now if today was a
> good day?"

> **One small action.** Pick one value from your list and ask yourself: what's the smallest
> possible thing I could do today that points me toward this? Not a grand gesture — a
> five-minute choice.

And, unlike "What are you like", it routes somewhere specific: **"Talk to Mandy about a value"**.

### 1e. There are already 32 exercises, and one of them is the intervention

`public/exercises/` holds **32 exercise pages**, indexed by the IMAGINE framework in
`public/assets/js/app.js:191-248` across seven domains — Self, Mindfulness, Acceptance,
Gratitude, Interactions, Nurturing, Exploring. Among them: `boundary-setting`,
`good-communication`, `connection-web`, `kindness`, `comfort-ladder`, `wonder`,
`creative-expression`, `values-compass`, `trigger-mapping`, `thought-stream`, `energy-audit`,
`wellness-checkin`, `self-compassion`, `radical-acceptance`, `wave`, `weather`, `small-wins`,
`box-breathing`, `body-scan`, `grounding-54321`, `minute-reset`, `joy`, `playfulness-diary`,
`silly-dice`, `fun-prompts`, `oracle-cards`.

The one that matters most here is `public/exercises/comfort-ladder.html` — a graded-exposure
ladder with an explicit prediction-testing step:

> Before you try a situation, write down what you **predict** will happen. Afterwards, write
> down what **actually** happened. This is how CBT helps shift negative predictions by
> reality-testing them.

> Tick each situation once you've practised it several times and it feels more manageable.
> There's no rush — go at your own pace. Every step counts.

Hold that one in mind for Part 2. *Predict → do → compare → tick, one rung at a time, at your
own pace* is structurally the same mechanism as the weekly-challenge design that the volitional
personality-change literature has actually found effects for. **Cowch has already built the
intervention. It has never once pointed the personality profile at it.**

### 1f. The wording audit already sitting in the repo root

`wording-audit-what-are-you-like.md` (untracked; not mine to act on) flags six places where the
"put 100 people in a room" framing is applied to all six axes when only four have a comparison
population — including the bar caption "fewer of 100 | room of 100 | more of 100", which renders
identically under Sensitivity and Risk appetite. That audit is about the *descriptive* layer,
but it matters here, because a recommendation carries more weight than a description: a so-what
built on a percentile framing inherits the problem twice over. Part 3 takes that split head-on.

---

*Parts 2 and 3 to follow in this document.*
