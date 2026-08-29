> **RESOLVED — verified 29 August 2026, no code change needed.**
>
> This audit was written against a stale reading of the engines. Every one of its six
> findings had already been fixed on `main` by commit `e66e101` ("What are you like: risk
> and sensitivity get an absolute reading, not a percentile", 6 August 2026), which made
> the population framing conditional on each axis's own `abs` flag — the same flag that
> writes `scale: 'population'` vs `'absolute'` into the saved record.
>
> Checked line by line in both engines (`public/assets/js/what-are-you-like.js` and
> `what-are-you-like-rank.js`) and both pages:
>
> | Audit finding | Where it lives now | State |
> |---|---|---|
> | 1. Intro panel | `what-are-you-like.html:341`, `-rank.html:484` | fixed — "Four of them are relative… risk appetite and sensitivity are ours rather than borrowed" |
> | 2. Results reading guide | `.html:389/393`, `-rank.html:531/535` | fixed — the familiar four get the room of 100; the other two get their own explicit paragraph |
> | 3. Bar caption | `what-are-you-like.js:189`, `-rank.js:236` | fixed — absolute axes render `loEnd / "its own scale" / hiEnd` |
> | 4. Checkpoint reveal | `.js:424`, `-rank.js:581` (`traitLine`) | fixed — "on its own scale you sit …" for absolute axes |
> | 5. Per-trait write-up | `.js:503`, `-rank.js:659` | fixed — absolute axes get the 0–10 dial and "not where it puts you among other people" |
> | 6. Plain-text export | `.js:644`, `-rank.js:782` | fixed — two headed sections, the second "no room of 100 behind these two" |
>
> Kept in `docs/` because it is the reasoning behind that split, and because anything shown
> to Mandy must inherit the same rule: never imply a percentile for Sensitivity or Risk
> appetite. `api/questionnaire-report.js` follows it by reading each band's own `scale`.
>
> The secondary finding below — that the *reframing* of neuroticism as "Sensitivity" may
> not map cleanly onto the population norms it borrows — is **not** resolved by that commit
> and is still an open question for Tom.

---

# What are you like, anyway? — Wording Audit Findings

## Summary
Six instances where the "put 100 people in a room" framing is applied to all six axes (O, C, E, A, N, R) identically, but Risk appetite (R) and Sensitivity (N) lack real comparison populations. The language is misleading for these two because it claims a percentile position among 100 real people when no such population data exists.

---

## Flagged Findings

### 1. HTML line 330: Intro panel — initial framing
**Quoted sentence:**
> "Every result is relative: *put 100 people in a room — you'd be standing around here.*"

**Issue:** Presented as a universal statement, but only O, C, E, A have real population norms. N (Sensitivity) and R (Risk appetite) lack comparison populations, so "standing around here" among 100 real people is not factually supported for those two axes.

**More accurate phrasing:** "For the four familiar traits, every result is relative: put 100 people in a room — you'd be standing around here. For risk appetite and sensitivity, these show how you lean, not where you'd stand in a real crowd."

---

### 2. HTML line 377: Results section callout — reading guide
**Quoted sentence:**
> "How to read this: **put 100 people in a room.** Each band below shows where you'd most likely be standing — and how sure we can honestly be."

**Issue:** Same problem — it presents a universal interpretation method for all six axes. But N and R don't have population norms, so the "where you'd stand" framing is misleading.

**More accurate phrasing:** "How to read this: For the four Big Five traits, put 100 people in a room — each band shows where you'd most likely be standing. For sensitivity and risk appetite (which don't have population norms), the bands show your own tendency, relative to yourself: how you lean toward one end or the other."

---

### 3. JS line 170: Bar caption (all checkpoints and results)
**Visual caption under every trait bar:**
> "fewer of 100" | "room of 100" | "more of 100"

**Issue:** This caption is displayed identically for all six axes, including N and R. It directly invokes a "room of 100" reference point which is misleading when no such population norm exists.

**More accurate approach:** For N and R, alter the caption to something like "less likely" | "neutral zone" | "more likely" or omit the "100" reference entirely and use directional language instead.

---

### 4. JS line 404: Checkpoint reveal — trait summaries
**Quoted sentence** (part of checkpoint insight):
> "in a room of 100 people, " + traitSentence(a)

**Issue:** This line runs for all AXES (including N and R). The traitSentence values for N and R use "you'd likely be among the people..." phrasing, which is presented as a population reference but isn't backed by real data.

**Example of problematic output:** "Sensitivity is [sharpening fastest] — in a room of 100 people, you'd likely be among the people whose radar runs hot." (This sounds like a percentile position but isn't.)

**More accurate phrasing:** Conditional logic needed — for O, C, E, A keep "in a room of 100 people"; for N and R use "in terms of sensitivity / risk-taking, you'd likely be..." or similar directional language that doesn't invoke a population comparison.

---

### 5. JS line 451: Results section — per-trait write-up
**Quoted sentence** (built for each trait in the results HTML):
> "In a room of 100 people, " + traitSentence(a) + ". At [focus]% this is an indication, not a measurement — more scenarios would tighten it."

**Issue:** The "room of 100 people" opening is applied to all six axes. For N and R, this is misleading because there is no real population comparison to reference.

**Example of problematic output:** "In a room of 100 people, I'd likely be among the people already halfway out the door toward the uncertain thing. At [focus]% this is an indication, not a measurement..." (Invokes a population that doesn't have a norm.)

**More accurate phrasing:** "On risk appetite, you'd likely be among the people..." (directional, not population-comparative) OR "When facing uncertain things, you'd likely..." (behavior-forward rather than percentile-forward). Save the "room of 100" opening only for O, C, E, A.

---

### 6. JS line 505: Plain-text export
**Quoted sentence** (in resultsAsText() function):
> "Put 100 people in a room — here's roughly where I'd be standing."

**Issue:** This line appears in the text export and is followed by trait lines for all six axes. The same "room of 100" framing is applied universally, misleading for N and R.

**More accurate phrasing:** "Put 100 people in a room — here's roughly where I'd be standing on the familiar traits. On sensitivity and risk appetite (which don't have population norms), here's how I lean:" OR split the narrative: "Familiar traits (Big Five): [output] | Personal tendencies (Sensitivity & Risk): [output]"

---

## Secondary findings (less severe)

### Potential ambiguity: N as "Sensitivity" vs. "Neuroticism"
The test reframes neuroticism as **"Sensitivity — how loudly the alarm system runs."** While neuroticism has established population norms, this specific framing may not align exactly with standard measures. A user seeing "In a room of 100 people, you'd be among those whose alarm system runs hot" might reasonably assume this is a population percentile, when the test's particular definition of "sensitivity" might not have population data. This is less critical than R (which has zero population norm), but worth noting.

### Strength: confidence/precision language is appropriate
Lines like "At [focus]% this is an indication, not a measurement — more scenarios would tighten it" correctly soften the claims. The repeated "starting point, not a verdict" frames are good.

---

## No findings on these fronts
- **Diagnostic/clinical language:** Copy consistently avoids framing results as diagnosis or verdict. Callouts on lines 335 and 387 explicitly disclaim this.
- **Verdict tone:** "Never verdicts" (line 341, 361, 397 via .honesty class) is clear and repeated.
- **Measurement confidence:** The "indication, not measurement" language (line 452) appropriately hedges.
