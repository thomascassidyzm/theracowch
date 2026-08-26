# Cowch: the so-what layer

**The commission**, in Tom's words: *"we also need to improve the 'so what?' par too this
questionnaire / it doesn't really do much in that department"*, and the sharper version —
*"ok, so we have the tendencies, now what can we give people for them to increase/reduce/move in
the direction they want to"*.

**The short version.** You have already written this layer, twice, in two different repos, and
both times in better copy than I would have produced. You have also already built the
intervention the evidence actually supports — `comfort-ladder.html` — and never once pointed the
profile at it. The literature says the effect of deliberate trait change is real, small, and
driven by *completed small behaviours*, not by goals or insight. So the job is not invention.
It is wiring, one honest new screen, and the discipline to promise a fifth as much as
Understand Myself does.

---

# Part 1 — what we already have

## 1a. The repos: what exists, and what doesn't

You asked to "just check the original thrive life and thrive work repos". The honest answer:

**There is no `thrive-life` repo.** `gh repo list thomascassidyzm --limit 300` returns 58 repos;
exactly two match "thrive" — `thrive-website` (private) and `thrive-work` (public). You belong
to no GitHub organisations, a global search for "thrive-life" returns only strangers' projects,
and the only other life-named repo of yours is `conquering-life` (private, Aug 2025, no
assessment content).

**But "THRIVE Life" is real — it's an assessment, not a repo.** It lives inside `thrive-website`
at `game/`: `thrive-life-assessment.js`, `game/index.html` ("THRIVE Life Assessment | Discover
Your OCEAN Profile"), `game/life-results.html` — sitting right next to
`game/work-assessment-backup.html`. Two products, one repo. Nothing is lost.

## 1b. The best so-what copy you have is in `proto-b.html` — and it needs two people

`thrive-website/prototypes/proto-b.html` is the richest source in the whole estate. Cowch was
ported from **proto-a**, which describes and stops by design. **proto-b** is the same six axes
with a full *implication → what to do about it* card for every one, and the register is exactly
right. The tone rule is written into the code as a comment:

> `// Tone rule: differences are attention maps, not verdicts. No negative labels, ever.`
> — `prototypes/proto-b.html:233`

**Risk appetite** — your sixth axis, and the only card flagged `headline:true`:

> This is the gap that sinks partnerships that looked fine on paper — and it's the one almost
> nothing measures. When a real fork arrives — the remortgage, the job jump, the offer that
> expires on Friday — [A]'s instinct will be to reach for what it could become, and [B]'s will
> be to weigh what it could cost.
>
> In the room, that feels like one of you being brave and one being sensible, and each of you
> privately assumes the other secretly agrees. You don't — and that's fine. [A]'s appetite is
> why the big chances get taken at all; [B]'s pricing is why you'd still be standing if one went
> badly. You need both. You just can't leave it to instinct.
>
> **Where attention is needed:** decide how big decisions get made before one is on the table.
> Agree together what counts as bet-the-house — and there, the cautious voice gets a real veto.
> Everywhere below that line, the bold voice gets real room.
> — `prototypes/proto-b.html:240-242`

**Sensitivity** — handled precisely as Cowch needs it, no pathology anywhere:

> [A]'s early-warning system runs sensitive: it spots real trouble early, and it also fires on
> things that turn out fine. [B]'s runs quiet: restful to be around, and occasionally late to a
> real problem. Both systems work. They're just tuned differently.
>
> **Where attention is needed:** when [A] raises a worry, "you're overthinking it" will land as
> dismissal even when it's meant as comfort — check the smoke before judging the detector. And
> [B]'s calm is not proof that nothing's wrong.
> — `prototypes/proto-b.html:295-297`

**Conscientiousness**, containing the single best clause in the estate:

> **Where attention is needed:** make the load visible. Decide together which things truly need
> a plan, and let the rest stay loose **on purpose** rather than by default. "On purpose" is the
> whole difference.
> — `prototypes/proto-b.html:263-264`

**Agreeableness**, with a specific and checkable instruction:

> **Where attention is needed:** [A]'s agreement can't always be taken at face value — ask
> twice. And [B]'s bluntness is not an attack — assume good faith first. Both of those take
> deliberate effort exactly because neither is your instinct.
> — `prototypes/proto-b.html:285-286`

And the shared-blind-spot variants, which turn "you're both high" into an action:

> **Both high on risk:** You'd take the leaps together — which is exhilarating, and means nobody
> in this pair is naturally pricing the downside. Appoint something that does: an outside voice,
> a rule, a number you agreed while calm.
>
> **Both low:** You'd keep each other safe — and possibly stuck. Agree in advance what would
> have to be true for a bold move, so that caution stays a choice rather than a wall.
> — `prototypes/proto-b.html:244-245`

The page framing:

> Where your instincts pull differently — and where a little deliberate attention buys a lot.
>
> This is a starting point, not a verdict. It maps instincts, never worth — and it never scores
> the two of you.
> — `prototypes/proto-b.html:170-172`

> These are the places you'll each quietly assume the other sees it your way — and be wrong.
> Nobody here is wrong. These are just the seams.
> — `prototypes/proto-b.html:199-201`

And — mark this, it matters for Part 2 —

> Instruments like this explain roughly 20% of the differences between people. Useful — far from
> everything.
> — `prototypes/proto-b.html:225`

**The catch, and it is the central one in this whole document: every single card above is
written for two people.** It reads "[A] and [B]", it needs both sets of answers, and its whole
so-what move is *the difference between you*. Cowch has one source. Part 3 says what survives
the amputation.

## 1c. `PATTERN_ADJUSTMENT_SYSTEM.md` — you have already designed the change layer

In `thrive-work`, `PATTERN_ADJUSTMENT_SYSTEM.md` plus
`engines/pattern-adjustment-engine.js` (1,002 lines) is a complete, worked design for
"you're here, you want to be there, here's exactly how". The core move:

> **Core Innovation:** "You're at 89/100 for harmony-keeping. Want to move toward 65/100 for
> stronger boundaries? Here's exactly how."
> — `PATTERN_ADJUSTMENT_SYSTEM.md:7`

> **Any position can be goal:** High → Lower (89 → 65): "I want stronger boundaries" · Low →
> Higher (28 → 50): "I want more structure" · Maintain (72 → 72): "This position works for me"
> **No "right" answer:** User defines their ideal position based on their goals.
> — `PATTERN_ADJUSTMENT_SYSTEM.md:339-346`

> **Shows WHEN each position serves you:** 89/100 Agreeableness: "Serves you when team cohesion
> and diplomacy matter" · 65/100: "Serves you when self-advocacy and authenticity matter" ·
> 28/100: "Serves you when direct confrontation and boundaries matter"
> — `PATTERN_ADJUSTMENT_SYSTEM.md:348-353`

> **Not:** "Be more assertive" **Instead:** "In THIS scenario [taking credit], choose THIS
> response [speak up] instead of THIS [let it slide]"
> — `PATTERN_ADJUSTMENT_SYSTEM.md:357-360`

It carries the trade-off honestly, in both columns:

> **WHAT YOU'LL GAIN:** Stronger boundaries and self-advocacy · More authentic self-expression ·
> Less resentment and burnout · Clearer needs communication
> **POTENTIAL TRADE-OFFS:** More interpersonal conflict · May seem difficult or demanding ·
> Harder to build quick rapport · Less team harmony
> — `PATTERN_ADJUSTMENT_SYSTEM.md:96-120`

And the shipped scenario objects are exactly the shape the evidence in Part 2 calls for:

> ```
> { scenario: 'Boss adds work to your already full plate',
>   currentPattern: 'Say yes to avoid disappointing them (people_pleaser)',
>   newPattern:  'Explain current workload, discuss priorities (boundary_setter)',
>   pointShift: '+3 toward boundary-setting', difficulty: 'Hard', setting: 'Work requests' }
> ```
> — `engines/pattern-adjustment-engine.js:866-873`

> ```
> { scenario: 'Sunday evening before a busy Monday',
>   currentPattern: 'Wing it, deal with Monday when it comes (spontaneous_adapter)',
>   newPattern:  'Spend 15 minutes planning the week (careful_planner)',
>   pointShift: '+2 toward structure', difficulty: 'Easy', setting: 'Weekly planning' }
> ```
> — `engines/pattern-adjustment-engine.js:920-927`

With a four-week ramp:

> 1: 'Notice your automatic pattern 3 times without changing it' · 2: 'Try the new pattern once
> in a low-stakes situation' · 3: 'Practice the new pattern 3 times this week' · 4: 'Make the
> new pattern your default in familiar situations'
> — `engines/pattern-adjustment-engine.js:471-476`

**One caution.** The arithmetic attached to it —

> Each intentional behavioral choice = +2 points toward new pattern · Weekly practice (3-4
> choices) = ~5-8 point shift · Typical adjustment timeline: 3-6 weeks for 15-30 point shifts
> — `PATTERN_ADJUSTMENT_SYSTEM.md:230-233`

— is **not supported by the evidence**, and by a wide margin. A 15–30 percentile-point shift in
3–6 weeks is roughly three to six times the best effect anyone has measured, in half the time.
See Part 2. The *design* is right; the *dosage claim* has to go.

## 1d. The five-field template — the most reusable thing in the estate

Present in both repos (`engines/pattern-analysis-engine.js`), ~46 entries across the
`question-banks/`:

> ```
> 'harmony_keeper': {
>   observation: 'You often prioritize group harmony, sometimes over your own needs',
>   whatThisMeans: 'You have a gift for creating peaceful environments and building consensus',
>   explorationQuestions: ['What happens inside you when there's group tension?',
>                          'What would it feel like to voice disagreement?'],
>   growthInvitation: 'You might find that your authentic voice actually strengthens group dynamics',
>   experimentSuggestion: 'Try sharing a small disagreement in a safe group setting and notice what happens'
> }
> ```
> — `engines/pattern-analysis-engine.js:22-27`

**observation → whatThisMeans → explorationQuestions → growthInvitation → experimentSuggestion.**
That is a so-what layer in five fields, and the last one is the only place in either repo where
a specific, time-boxed thing to actually do this week appears. It is also, not coincidentally,
the field the evidence in Part 2 says is the only one that does anything.

## 1e. The prior art to reject

`thrive-website/game/thrive-life-assessment.js:321-353` has a three-rule combination engine:

> **The Anxious Achiever** *(N > 0.6 and C > 0.5)* — "You push yourself hard and worry about
> getting things right." → "Your high standards serve you well, but remember that 'good enough'
> is sometimes perfect."

Keep the **combination** idea — reading two axes together is more interesting than one at a
time, and `pattern-analysis-engine.js` develops it properly with
`signature / insight / challenge / opportunity`. **Reject the names.** "The Anxious Achiever" is
a label, and your own Cowch results page has already ruled labels out in as many words. It is
also, on the claims rail, the worst sentence in the estate: a two-word pseudo-diagnosis
containing an anxiety word.

`assessments/viral-game/questions.json` in `thrive-work` goes further — 16 archetypes with
famous people and ideal roles. That is a BuzzFeed quiz. It is not this product.

## 1f. Inside Cowch: the promise is already written, and it isn't kept

This is the finding that reframes the job. The results page of "What are you like, anyway?" ends
like this (`public/questionnaires/what-are-you-like.html:422`):

> These are directions to move in, not labels to wear. If something here landed — or landed
> wrong — that's worth a conversation. Copy your results and take them to your chat with Mandy,
> or keep them entirely to yourself. They're yours: they never left this device.

*"Directions to move in"* **is** the so-what promise. What follows it is one button — **Back to
Mandy** — that drops the person on the home screen carrying nothing. Outside the two
questionnaire engines, **nothing in the codebase ever reads the `cowch-q-wayl` localStorage
key**. `therapy-profile.js` builds a completely separate profile out of chat messages and has no
idea the questionnaire exists. Mandy does not know the person just spent thirty moments telling
her who they are.

So the gap is narrower than "invent a so-what layer". It is: **the measurement runs, the promise
is made, and the thread is dropped.**

## 1g. Cowch's other questionnaires already do the so-what

**Flexible Thinker** (`public/questionnaires/flexible-thinker.html:131-143`) is the template —
band → what it costs → one small experiment:

> Your mind is working hard to keep things controlled and predictable, which made sense at some
> point. **The cost is options.** Even one small daily practice in noticing-without-acting can
> start to widen the gap between feeling something and doing something.

> You bend more often than you break. There are still some sticky places where you get caught —
> usually around being wrong, sitting with hard feelings, or holding uncertainty. Notice which
> questions you scored lowest on; that's where the next bit of growth lives.

> Flexibility isn't a personality trait — it's a skill, and you can build it.

Then one concrete thing, from its `experiments` array (line 138):

> Pick one strong thought today and finish the sentence: "I'm noticing the thought that…" before
> deciding what to do with it.

> Find one situation this week where you can ask "what's another way of seeing this?" before
> reacting.

**Values** (`values.html:127,133-136`) supplies the direction, and routes somewhere:

> These are the ten you chose. Pin them somewhere you'll see them. When you're feeling flat,
> stuck, or pulled off course, ask: "Which of these would I be living right now if today was a
> good day?"

> **One small action.** Pick one value from your list and ask yourself: what's the smallest
> possible thing I could do today that points me toward this? Not a grand gesture — a
> five-minute choice.

…ending in a button that says **"Talk to Mandy about a value"**. "What are you like" has no
equivalent.

## 1h. There are already 32 exercises, and one of them is the intervention

`public/exercises/` holds **32 pages**, indexed by IMAGINE in `app.js:191-248`:
`boundary-setting`, `good-communication`, `connection-web`, `kindness`, `comfort-ladder`,
`wonder`, `creative-expression`, `values-compass`, `trigger-mapping`, `thought-stream`,
`energy-audit`, `wellness-checkin`, `self-compassion`, `radical-acceptance`, `wave`, `weather`,
`small-wins`, `box-breathing`, `body-scan`, `grounding-54321`, `minute-reset`, `joy`,
`playfulness-diary`, `silly-dice`, `fun-prompts`, `oracle-cards`.

`public/exercises/comfort-ladder.html` is a graded ladder with prediction-testing built in:

> Before you try a situation, write down what you **predict** will happen. Afterwards, write
> down what **actually** happened. This is how CBT helps shift negative predictions by
> reality-testing them.

> Tick each situation once you've practised it several times and it feels more manageable.
> There's no rush — go at your own pace. Every step counts.

*Predict → do → compare → tick, one rung at a time* is structurally the same mechanism as the
weekly-challenge design that the personality-change literature has actually found effects for.
**Cowch has already built the intervention.**

## 1i. What does not exist anywhere

- **No so-what content for a one-source, six-axis profile.** proto-b is two-person; the
  pattern engines are keyed to `pattern_type` labels from a different question bank, not to
  Cowch's O/C/E/A/N/R bands.
- **No handling of a no-population axis.** Every so-what artefact in the estate assumes a
  percentile. Nothing anywhere addresses what to say about Sensitivity and Risk without a room.
- **No so-what for the honest exits.** proto-a has the attention-map copy; nothing acts on it.
- **`docs/DECISIONS.md` in `thrive-website` contains register and abstention rulings and
  *no so-what decisions at all*.** There is no ruling to inherit here. This document is the
  first attempt at one.

---

# Part 2 — what the literature supports

## 2a. The headline number: real, and small

The best evidence is a **preregistered** systematic review: Haehner, Wright & Bleidorn (2024),
*Communications Psychology* 2:115, 30 longitudinal volitional-personality-change studies,
N = 7,719 — https://doi.org/10.1038/s44271-024-00167-5

- **Intervention-induced change: d = 0.22, 95% CI [0.005, 0.433]** (7 studies). Note the lower
  bound almost touches zero.
- **At follow-up after the intervention ended: d = 0.37 [0.14, 0.59]** (4 studies).
- **Merely having a goal to change, no intervention: d ≈ 0.14.**

**In your own room-of-100 currency, d = 0.22 moves someone from the 50th percentile to about
the 59th.** That is the honest headline. It is real, it is worth having, and it is nine people.

The most product-relevant study is a digital one: Stieger et al. (2021), *PNAS* 118(8), the
**PEACH** smartphone app — 3-month coaching intervention, RCT, **n = 1,523** —
https://doi.org/10.1073/pnas.2017548118. Against the control group: **d = 0.44** (increase
goals), **d = −0.41** (decrease). Its widely-quoted d = 0.52 is a within-person pre-post figure,
not the controlled contrast, and should never be quoted as "the" effect. Its most popular goals
are worth knowing: **decrease neuroticism 26.7%, increase conscientiousness 26.1%, increase
extraversion 24.6%.**

For contrast, the clinical benchmark — Roberts et al. (2017), *Psychological Bulletin* 143(2),
207 studies, average 24 weeks: overall **d = 0.37**, emotional stability **d = 0.69** —
https://doi.org/10.1037/bul0000088. That is what actual therapy achieves, and Cowch must never
imply it is in this bracket.

## 2b. The active ingredient: completed behaviours. Not goals, not insight.

**This is the single most important finding for the product.** Hudson, Briley, Chopik &
Derringer (2019), *JPSP* 117(4), 839–857, "You have to follow through" — 15 weeks, participants
freely accepted and completed weekly pre-written behavioural challenges:

> **Merely accepting challenges did not predict trait change. Only actually completing them
> did.** — https://doi.org/10.1037/pspp0000221

The goal does nothing (d ≈ 0.14). The profile does nothing. The insight does nothing.
**Small completed actions do the work.**

Second mechanism with strong support: **implementation intentions** — "if I'm in situation X,
then I will do Y". Hudson & Fraley (2015), *JPSP* 109(3) ran two 16-week experiments; the one
that trained implementation intentions worked, the other did not —
https://doi.org/10.1037/pspp0000021. The wider base: Gollwitzer & Sheeran (2006), 94 independent
tests, >8,000 participants, **d = 0.65** on goal attainment.

Note how exactly `pattern-adjustment-engine.js` already encodes this — "Boss adds work to your
already full plate → explain current workload" *is* an if-then. And how exactly
`comfort-ladder.html` already encodes it — predict, do, compare.

## 2c. Which axes actually move — and this reshapes the product

Consistent across three independent sources:

| Axis | Haehner 2024 | Hudson 2020 (16 wks) | Roberts 2017 (clinical) |
|---|---|---|---|
| Extraversion | d = 0.38 | ~0.16 SD | 0.38 |
| Sensitivity / emotional stability | d = 0.33 | ~0.16 SD | **0.69** |
| Conscientiousness | d = 0.31 | — | smaller |
| Openness | d = 0.21 | ~0.05 SD | smaller |
| **Agreeableness** | **d = 0.15** | **~0.05 SD** | smaller |

**The movable three are E, N and C. Agreeableness and Openness are close to immovable in these
designs.** This is awkward, because Agreeableness is where the most obviously useful so-what
sits — the over-accommodating, boundary-less pattern that both `PATTERN_ADJUSTMENT_SYSTEM.md`
and proto-b lead with. The literature says that is the *hardest* trait to shift.

That does not kill the boundary work. It relocates it: **you can change what you do in a
situation without changing the trait**, and the honest framing is behavioural, not dispositional
— "get better at the asking", not "become less agreeable".

## 2d. The scepticism, which is substantial

**Self-report contamination is the central unresolved problem.**

- Only **2 of the 30 studies** in Haehner et al. used other-reports at all, and effects were
  descriptively **smaller** with other-reports.
- Where observers exist, the effect is **asymmetric**: PEACH found observer d = 0.35 for
  *increase* goals but a **non-significant −0.22 for decrease goals**. The 26.7% who wanted
  *less* neuroticism showed **no observer-detectable change at all.** Since "turn the alarm
  down" is exactly what Cowch users are most likely to want from the Sensitivity axis, this is
  a direct hit on the most tempting promise in the product.
- **The most incisive finding in the field:** Olaru et al. (2024), *European Journal of
  Personality* 38(2), re-analysed PEACH (N = 552) with measurement-invariance testing and found
  change was **not at the trait-domain level** — it concentrated in *sociability* and
  *productiveness/organisation*, "but not on the other facets of these trait domains", and
  observer-reported changes were small and non-significant.
  https://doi.org/10.1177/08902070221145088 **What moves may be a handful of items, not a
  trait.**
- Küchler et al. (2025), *Communications Psychology* 3:171 — the cleanest "is it just
  self-concept?" test. Explicit self-report moved (d ≈ 0.33–0.38); **implicit (reaction-time)
  measures barely moved at all** (extraversion d ≈ 0.098; emotional stability not credibly).
  https://doi.org/10.1038/s44271-025-00350-2
- **Against** the pure demand-characteristics reading: Hudson & Fraley found change in
  *trait-relevant daily behaviour*, and Hudson, Derringer & Briley (2019), *JRP* 83, found
  people change in desired ways **even when they don't perceive they have changed**. That is a
  genuine counter-argument. It is one study.

**Samples**: 62% college students, 52% US, mean age 25.6, **67.7% female**. The authors
themselves say the literature is "largely restricted to relatively young and affluent samples
from the US and Europe". Cowch is 18+ and UK — the overlap is partial at best.

**Attrition**: Küchler lost **49% by 12 months**. PEACH's observer participation collapsed from
0.66 observers per participant at pretest to **0.29 at follow-up**, which undermines its own
observer result.

**Publication bias**: Egger's test not significant (b = −1.76, p = .579) — but with 7
intervention studies that test has almost no power. Read it as "no evidence found", not "no
bias".

**Persistence**: the follow-up d = 0.37 is genuinely good news, but rests on 4 studies. And
PEACH's waitlist controls crossed over after one month, so its 3-month follow-up has **no
control group at all**.

**Does it help?** Hudson & Fraley (2016), *PSPB* 42(5): people who *succeeded* in changing
showed **increases** in wellbeing, and merely having change goals did not damage wellbeing —
https://doi.org/10.1177/0146167216637840. Correlational, not randomised on success.

## 2e. Risk appetite: the axis with the thinnest ground under it

I asked specifically about R and the answer is uncomfortable: **risk preference is substantially
domain-specific**, and there is essentially no evidence that it can be deliberately shifted as a
general disposition. It is not in the volitional-change literature at all — no study has tried.
Cowch's R axis therefore gets the most cautious so-what of the six: describe the pattern, name
where it shows up, offer a prediction test, and promise nothing about moving it.

## 2f. What Understand Myself actually does, and where it is weak

**The instrument** is the **Big Five Aspect Scales**: DeYoung, Quilty & Peterson (2007), *JPSP*
93, 880–896, PMID 17983306. 100 IPIP-derived items, two aspects per trait.

**A correction to your description, Tom:** four of the five aspect splits you gave are exactly
right. The fifth is not. The report's own contents page reads *"Openness to Experience: Openness
and Intellect"* — **not** "Intellect / Aesthetics". "Aesthetics" is the common gloss on that
aspect; it is not the product's label. (Source: a full published report PDF at
canities.dk/wp-content/uploads/2020/04/Understand-Myself-Big-Five-test-edited-pdf.pdf)

**The norms are opaque, and this is its weakest link.** The claim is "a proprietary sample of
10,000 people ranging in age, race, sex, and background". There is no technical manual, no
demographic table, no recruitment statement, no collection date. Every percentile it prints
inherits the credibility of a sample nobody outside the company has seen. Compare IPIP-NEO,
whose norm tables are on OSF for anyone to inspect.

**They do not norm by age or sex, and they say so:**

> "We could have compared you to others of your sex and age, but decided that it would be more
> informative and simpler to let you know what you are like compared with everyone else,
> regardless of age and sex." — understandmyself.com FAQ

Then they bolt the correction on as prose inside the report:

> "Women are also higher in compassion than men. The mean percentile for women in a general
> population (women and men) is 61. For men it is 39."

**That is a fudge and Cowch should not copy it.** A woman at the 61st percentile for compassion
is told, three sentences apart, that she is more compassionate than 60 people in the room and
that she is exactly average for her sex. Both are true; the product never reconciles them. If
Cowch ever adds a demographic correction it goes *in* the number, or it is explicitly *not
offered* — never trailing behind as arithmetic the reader has to do themselves.

**The room-of-100 rendering itself**, verbatim, so you can see how flat it is next to yours:

> "Your score puts you at the 1st percentile for politeness. If you were one of 100 people in a
> room, you would be less polite than 98 of them and more polite than 1 of them."

Note it carries **no width and no confidence** — the number is presented as exact. Cowch's
"roughly 34–52 of 100 · 68% in focus · an indication, not a measurement" is straightforwardly
more honest than the market leader. That is a real advantage and it is already shipped.

## 2g. The 22%: where it comes from, and what the truth is

**I could not source "22% predictive" to Understand Myself.** A full 207,000-character report
was searched: there is no such claim, and the site makes no numeric predictive-validity claim
anywhere. So it is not their number.

**My strong suspicion is that it is your own number, from proto-b:**

> Instruments like this explain roughly 20% of the differences between people. Useful — far from
> everything. — `prototypes/proto-b.html:225`

Whatever its origin, here is what the evidence says:

- **Roberts, Kuncel, Shiner, Caspi & Goldberg (2007)**, *Perspectives on Psychological Science*
  2(4), 313–345 — the definitive life-outcomes paper. Its figures for mortality, divorce and
  occupational attainment all plot on an axis running **0 to 0.30 in the correlation metric**.
  So the best-established life-outcome effects of personality live at **r ≈ .10–.25 — which is
  1% to 6% of variance.**
- **Funder & Ozer (2019)**, *AMPPS* 2, 156–168 — benchmarks: r = .05 very small, .10 small,
  **.20 medium**, .30 large. So personality-to-outcome effects are *medium-to-large by the
  field's own standards*, and tiny in absolute terms. Both things are true.
- **Soto (2019)**, *Psychological Science* 30(5) — preregistered replications of 78
  trait-outcome links, median N = 1,504: **87% replicated**, at **77% of original strength**.
  The direction is real; the older magnitudes are inflated by about a quarter.

**Verdict on "22%":** if it means one trait predicting one outcome in variance terms, it is
**wildly generous** — the truth is 1–6%. If it means a whole battery's R² for a favourable
outcome, it is **about right and at the optimistic end** (10–15% typical). If it means "the
description is right about you 22% of the time", it is meaningless — nobody computes that.

**And steal this line from Roberts et al. outright**, because it is the best piece of context in
the entire literature and it rescues the small numbers from sounding useless:

> "interventions — like consuming aspirin to treat heart disease or using chemotherapy to treat
> breast cancer — translate into correlations of .02 or .03."

## 2h. What the evidence does NOT support

Say none of these, ever:

1. **"You can change your personality."** Unqualified, it is false. d = 0.22 over three months
   in motivated volunteers is what is on offer.
2. **Any dosage arithmetic.** "+2 points per choice", "15–30 points in 3–6 weeks"
   (`PATTERN_ADJUSTMENT_SYSTEM.md:230`) is 3–6× the measured effect at double the speed. Cut it.
3. **"Turn your sensitivity down."** The one direction with *no* observer-detectable support.
4. **That change persists.** Suggestive (4 studies), not established.
5. **That the change is in the trait rather than in a couple of behaviours.** Olaru says it
   probably isn't.
6. **That knowing your profile changes anything.** Goals alone: d ≈ 0.14. Insight is not an
   intervention.
7. **Any claim about risk appetite being movable.** Nobody has tested it.
8. **Anything derived from the clinical literature.** Roberts 2017's d = 0.69 is *therapy*.
   Cowch is not therapy and must not borrow therapy's effect sizes.

---

# Part 3 — the proposal

## The shape, in one sentence

After the thirty moments, Cowch shows the person **one thing they might want to move, the
honest size of what moving it buys, and one small experiment from the 32 exercises it already
has** — then carries the profile into the chat so Mandy knows who she is talking to.

Not a new content product. **A routing layer plus one new screen.**

**Better**: it keeps a promise the results page already makes and currently breaks.
**Simpler**: no new framework, no new exercises, no new maths — the intervention, the routing
and the register all exist. **Cheaper**: no server, no account, no stored population, nothing
uploaded; the on-device property survives intact.

## What appears after the bars, in order

### Screen 1 — "What this doesn't tell you", and it goes *first*

Not a footnote. The opening move. Illustrative wording:

> Before any of this: a tendency is not a forecast. Where you lean tells you something real
> about what you'll probably do, and very little about what you can do. Most of what happens
> next is the situation you're in, not the shape you are.
>
> Instruments like this account for maybe a twentieth of the differences between people's lives.
> Worth knowing — for scale, the effect of taking aspirin for your heart is smaller still.

This is honest, it is empirically correct (2g), and it inoculates against the Barnum effect,
which is the failure mode of every personality product. It is also the sentence Understand
Myself does not have, and it is free.

### Screen 2 — "Where the friction probably is": the cost, never the label

One axis, not six. The one with the strongest lean *and* the clearest cost. Name the cost in the
second person, always with the upside attached, never with a type name. Illustrative, high A:

> In a room of 100 people, you'd likely be among the people who absorb costs to keep the peace.
> That buys you a lot of goodwill, and people trust you with things they wouldn't trust to
> anyone else. The bill usually arrives later and privately — as the thing you agreed to and
> then quietly resented.
>
> If that landed, the friction is probably in the asking, not the caring.

The last line is the whole move, and it is what Part 2c forces: **Agreeableness barely shifts,
so don't offer to shift it.** Offer to change what happens in the room instead.

### Screen 3 — ask the direction. Never assume it.

One tap, three options, and "leave it" is a real answer:

> Would you want to move on this, leave it exactly as it is, or you're not sure?
> Leaving it alone is a real answer, and often the right one.

`PATTERN_ADJUSTMENT_SYSTEM.md:339-346` already has this ruling — "Any position can be goal…
No 'right' answer" — and it is the single best decision in the estate. Keep it verbatim in
spirit. It is also what keeps the layer the right side of the claims rail: nothing is being
corrected, because nothing is being called wrong.

### Screen 4 — one experiment, this week, from what exists

One. Not a plan, not a programme, not a ladder of six. Chosen by the axis *and* the stated
direction, routing into the existing library:

| Lean + wants to move | Route to | Why |
|---|---|---|
| High A | `boundary-setting.html` | the asking, not the caring |
| Low C | `energy-audit.html` | smallest version, never "get organised" |
| Low E | `comfort-ladder.html` | graded, own pace — the movable axis |
| High N (loud alarm) | `wave.html`, `weather.html`, `grounding-54321.html` | ride it, don't silence it |
| Low/High R | `comfort-ladder.html` | framed purely as a prediction test |
| High O + low C | `energy-audit.html` | the estate's oldest observed pattern |

And the copy carries an if-then, because that is the mechanism that works (2b):

> **This week, one thing.** When someone adds to your plate and you feel the yes arriving — say
> "let me check what that pushes back" before you answer. Once. Then notice what actually
> happened, which is almost never what you predicted.

Note it names a **situation** and a **response**: that is an implementation intention
(Gollwitzer & Sheeran, d = 0.65), and `comfort-ladder.html` already runs the predict-versus-
actual check.

### Screen 5 — the abstentions, which are the best signal Cowch has

Currently surfaced and given no so-what. Illustrative:

> You set six moments aside as "it depends". That isn't a gap in the picture — it's the sharpest
> part of it. Six times, the situation mattered more than your shape did. Those are the places
> where changing how you set things up will do far more than changing anything about you.

This is the **most defensible claim in the entire layer**, because the situationist finding is
better evidenced than anything in the volitional-change literature. Nobody else can say it,
because nobody else has an honest exit.

## The four-axes / two-axes split — solved, not fudged

- **O, C, E, A** keep the room of 100. A norm licenses a comparison, and a comparison licenses
  "you might find this harder than most people do".
- **N and R get a different *kind* of so-what**, not a weaker version of the same one. Not "you
  are more X than others" but **a pattern-across-your-own-answers story**. Illustrative:

> On this axis's own scale, you sit toward protecting the downside. Across your thirty moments
> that showed up most in the ones with money and reputation in them, and least in the social
> ones. That's not a rule about you — but if you ever wanted to test it, the money ones are
> where to look.

That needs **no norm and no second person**, and it is *more* specific than anything Understand
Myself can print. The bank already carries per-scenario weights, so the data for it exists today.

**This is the recommendation: stop treating N and R as axes missing a norm, and start treating
them as axes that get the better so-what.** The constraint is an advantage.

## One source vs two

| Claim | One source | Needs two |
|---|---|---|
| Your lean, with width | ✅ | |
| The likely cost of that lean | ✅ | |
| An experiment to try | ✅ | |
| Where your own answers disagreed with each other (exits) | ✅ | |
| Where the axis showed up across scenarios | ✅ | |
| "You two will clash about X" | | ✅ |
| "You're the more X of the two of you" | | ✅ |
| Shared blind spots (`bothHigh`/`bothLow`) | | ✅ |

**Recommendation: do not build the couple report.** proto-b is the best writing in your estate
and it is a trap here: it requires account linkage, a sharing mechanism and a server, which
breaks "no endpoint, no upload, no account" — the one property this product has that Understand
Myself does not. It is also the highest-risk claims surface you could build, because it tells
two people what is wrong with their relationship.

**Build the one-source substitute instead: a printable "how to work with me" sheet.** The print
path already exists (`printMeta`, the print stylesheet). Take proto-b's best cards, rewrite them
single-sided — "when I go quiet it isn't a no", "my agreement can't always be taken at face
value, ask me twice" — and let the person hand it to whoever they like. Same relational value,
one source, no server, and it makes no claim about the other person at all.

## What it must never say

- No condition names, ever. **"Assess", "screen", "monitor" are banned words** per
  `docs/marketing-strategy.md` §3 — this layer *notices* and *reflects*.
- **No type names.** No "The Anxious Achiever". Directions, not labels.
- **No "you should."** Every action is an offer with a visible opt-out.
- **No dosage arithmetic.** Delete "+2 points per choice" and "15–30 points in 3–6 weeks".
- **No outcome promises** — not happier, not better at your job, not less anxious.
- **No percentile language on N or R.**
- **No claim a tendency is fixed, and none that it is easily changed.** Both are wrong.
- **Never "turn your sensitivity down"** — the one direction with no observer support at all.

## The wiring nobody has done

Separately from the screens, and arguably worth more than all of them: **let Mandy read the
profile.** `cowch-q-wayl` sits in localStorage and nothing reads it. Passing a compressed band
summary into the chat context — the same on-device path `therapy-profile.js` already uses —
means the person who just spent thirty moments describing themselves doesn't have to start
again. It is the cheapest item in this document and probably the one they'd notice most.

## The one fork I can't resolve for you

**Does the layer offer change at all on Agreeableness and Openness?**

The evidence says those two barely move (d = 0.15 and 0.21, the weakest in the table) — and
Agreeableness is exactly where the most useful so-what sits and where both your prior designs
lead. Two honest options:

**A. Offer the experiment on all six**, framed behaviourally throughout ("get better at the
asking") rather than dispositionally ("become less agreeable"), and let the person judge.

**B. Offer change only on E, N and C**, and give A and O a *situational* so-what instead —
"this one doesn't really move, so change the situation, not yourself".

**My recommendation is A**, for one reason: option B smuggles in a claim it can't support
either — that A and O *cannot* be moved — when the actual finding is that these particular
interventions moved them least, in mostly-undergraduate samples, on self-report. A is honest
about the mechanism (behaviour in a situation), doesn't over-claim about the trait, and doesn't
lock a person out of working on the thing they care about. But B is more conservative, and if
you'd rather promise less, B is defensible.

*Every piece of example copy in Part 3 is an illustration of register, not proposed shipped
wording. The words are yours.*

---

## Gaps, honestly

- **`thrive-work` was read for the so-what layer only** (143MB). The corporate decks, the
  ClearMinds hypnotherapy material and the PDFs were skipped.
- **"22% predictive" could not be sourced.** It is not an Understand Myself claim. My best
  guess is proto-b's own "roughly 20%" line, but I could not confirm it and am flagging it
  rather than assuming you misremembered.
- **Barrick & Mount (1991) ρ = .22 could not be verified from the primary text** — both the
  Wiley page and the PDF resisted extraction. The surrounding argument doesn't depend on it.
- **Per-trait effect sizes in the Haehner 2024 column** were read by automated fetch of the
  Nature page rather than transcribed by eye from the table. Good, not hand-verified.
- **No study anywhere has tested whether risk appetite can be deliberately moved.** That is an
  absence of evidence, not evidence of absence — but it means Cowch's R so-what has the least
  ground under it of the six.
- **`docs/DECISIONS.md` in `thrive-website` carries no so-what rulings at all**, so there is no
  prior decision to inherit or contradict.
