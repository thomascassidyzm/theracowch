# Cowch telemetry: what we capture, and the route to Mandy

*A scout's map, 27 August 2026. Nothing here was built or changed — this is a read of what
is actually in the repo and actually live on cowch.app, plus a costed smallest path.
Every claim below is anchored to a file that was read or a live check that was run.*

---

## The short version

Three things, and the first is the surprise.

1. **A big slice of the telemetry we think we have is silently dead.** The events for
   exercises and IMAGINE pages are written, guarded, and never fire — those pages don't
   load the analytics script, so the tracking function doesn't exist there. That's 32
   exercise pages and 7 IMAGINE pages emitting nothing. What *does* work is everything
   fired from the main app screen.
2. **Vercel can tell you what testers as a crowd did. It can never tell you what a
   named tester did.** That's by design and the design is right; but "did tester X
   finish the questionnaire and come back on day 3" is a question the current system
   cannot answer, and no amount of dashboard work will make it answer it.
3. **The Mandy feed is the NDA flow again with a different payload** — the plumbing
   already exists and is proven. But the consent it would run under does *not* currently
   cover it, and the reason is mechanical rather than philosophical: a person arriving
   from Mandy's site straight onto the questionnaire page never sees the consent gate at
   all, and the page they land on promises them, in as many words, that nothing leaves
   their device.

---

## Part 1 — What is captured today

### The one telemetry system that leaves the device

`public/assets/js/analytics.js` — a deliberately thin wrapper over Vercel Web Analytics.
It is cookieless, and it has a `clean()` function that only forwards numbers, booleans
and strings truncated to 48 characters. Nothing a person typed can escape through it.
That design is correct and this document proposes no change to it.

It exposes `window.cowchTrack(name, props)`. Every event it sends also carries a
first-touch acquisition label called `source`, read from `?utm_source=` or `?ref=` on
the very first visit and kept in the browser under the key `cowch-source`. First-touch
means a later organic visit doesn't overwrite where someone originally came from.

**The events that actually fire** — all of them from the main app screen, `app.html`:

| Event | Properties | Where from |
|---|---|---|
| `chat_started` | — | `public/assets/chat-script.js` |
| `share` | `channel` = native / copy | `public/assets/js/share.js` |
| `install_banner_shown` | — | `public/assets/js/pwa-install.js` |
| `install_guide_opened` | `flow` | `public/assets/js/pwa-install.js` |
| `pwa_installed` | — | auto, on the browser's install event |
| `returned` | `since` = same_day / 1_3_days / 4_7_days / 1_4_weeks / over_month | auto |
| `exercise_open` | `id` = page slug | auto, from a click on any `/exercises/` link |
| `domain_open` | `id` = page slug | auto, from a click on any `/imagine/` link |
| `calf_welcome_open`, `calf_born` (`focus` = count), `calf_welcome_skip`, `calf_care` | — | `public/assets/js/calf.js` |

Plus automatic page views for every page on the site.

**The events that are written but never fire.** This is the finding.

| Event | Written in | Loaded on | Why it's dead |
|---|---|---|---|
| `exercise_engaged` (`area`, `exercise`) | `public/assets/js/imagine-engagement.js` | all 32 `/exercises/*.html` | those pages never load `analytics.js` |
| `imagine_guide_shown` / `_go` / `_next` / `_browse` (`area`, `pref`) | `public/assets/js/imagine-guide.js` | all 7 `/imagine/*.html` | same |

Both modules call the tracker defensively — `if (window.cowchTrack)` — so nothing breaks;
the call simply evaporates. The analytics script, and the Vercel insights snippet it
depends on, are loaded in exactly one file: `public/app.html`. **Verified live:** fetching
`https://cowch.app/exercises/gratitude.html` returns zero references to either script.

This is the concrete, mechanical version of the item already on the worklist — "Exercise/
IMAGINE page analytics — those pages have no analytics". The worklist reads as *we chose
not to instrument them*. The truth is closer to *we instrumented them and forgot the one
script tag that makes the instrument exist*. It is a two-line fix per page, or one shared
include.

### The second telemetry system, which never leaves the device

`public/assets/js/activity-log.js` writes to the browser under `cowch-activity-v1`,
deduplicated one entry per activity name per day and capped at 500 entries. It never
goes anywhere and nothing aggregates it. Only **6 of the 32** exercise pages even load it
(`wave`, `gratitude`, `box-breathing`, `grounding-54321`, `weather`, `body-scan`).

### The server side — is there any per-person behavioural record?

**No.** Read all of `api/`:

- `api/chat.js` — sends the message to Anthropic and returns the reply. It writes nothing
  durable. It does `console.log` a line of token-usage numbers (no message content) into
  Vercel's runtime logs, which are ephemeral.
- `api/compress-profile.js` — same shape, nothing durable.
- `api/courses.js`, `api/blog-quotes.js` — read-only content.
- `lib/request-gate.js` — writes short-lived rate-limit counters to Upstash Redis under
  `cowch:rl:<bucket>:<window>:<ip>`. Counters, not behaviour, and they expire.
- `api/push/subscribe.js` — stores push subscriptions under `cowch:sub:<id>` with an index
  set `cowch:subs`. That is a device push endpoint, not a behavioural record.
- `api/nda-sign.js` / `api/nda-export.js` — **the only durable, deliberate, per-person
  record in the system**, and it is signed NDAs: name, organisation, email, signature
  image, timestamp, user agent, IP, under `cowch:nda:<uuid>` with an index set
  `cowch:nda:all`. Not behaviour.

So: **there is no server-side record of what any individual did in Cowch.** That is the
product's privacy posture working exactly as designed, and it is the single fact that
shapes everything in Part 2.

---

## Part 2 — What aggregations are actually possible

Vercel Web Analytics is enabled on this project (Pro — recorded in `WORKLIST.md`), and
**verified live**: `https://cowch.app/_vercel/insights/script.js` returns 200, so events
really are reaching Vercel rather than being dropped.

### What it can answer today

- Page views per page, over time — including every exercise and IMAGINE page, because
  page views are automatic even where custom events are dead.
- Counts of each custom event in the table above.
- Breakdowns of those events by the low-cardinality properties we already send:
  `source` (where they came from), `channel` (how they shared), `flow`, `since`, `id`.
- A crude retention shape from the `returned` event's five buckets: how many sessions
  were a return within a day, within a week, within a month.
- Referrers, countries, devices — the standard set.

That is a genuinely useful crowd-level picture. "Did the Surrey talk QR code produce
installs?" is answerable: filter events by `source=surrey-talk`.

### What it can never answer

Vercel Web Analytics is **cookieless and carries no user id**. There is no field in any
event that identifies a person, and adding one would be a different product.

So none of these are answerable, now or after any amount of dashboard work:

- *Did tester X finish the questionnaire, and did she come back on day 3?*
- *How many of the people who started the wheel finished it?* — not a funnel we can
  follow per person; only two independent counts.
- *Which testers have gone quiet?*
- *Is one tester using it daily and four not at all, or are all five using it twice a
  week?* — identical in the aggregate, opposite in meaning.

**This is the honest heart of Part 2.** Tom asked for "aggregations to spot user
behaviour… we have a bunch of testers there at the moment." With a handful of named
testers, the questions worth asking are nearly all per-person, and per-person is exactly
what this telemetry deliberately cannot do. Aggregate analytics answers population
questions; a tester cohort is not a population.

### Gap — reported honestly, not guessed

There is **no Vercel login on this machine** (`~/.local/share/com.vercel.cli/` has a
config file but no `auth.json`; no `VERCEL_*` environment variables; no `.env` in the
repo). So I could not verify from here:

- whether the project's plan exposes a **query or export API** for Web Analytics, or only
  the dashboard;
- the current **data-retention window** on the plan;
- whether custom events are counting against a quota.

I have not substituted a plausible answer for any of these. If the export API matters to
the decision, it needs one look at the Vercel dashboard by someone logged in.

### The recommendation hiding in Part 2

Given a tester cohort, the cheapest instrument is not a dashboard. It is a five-minute
call with each tester. The aggregate telemetry is worth having — it's already mostly
built, and finishing it is cheap — but it should be framed as *validating the funnel at
scale later*, not *watching this month's testers*.

**Flagged default (Tom didn't say):** he didn't say where aggregated telemetry should
surface. I've assumed he wants it on his phone, which on this estate means a published
document or a simple page, not a Vercel dashboard login. If he's happy logging into
Vercel, the whole surfacing question collapses and there's nothing to build.

---

## Part 3 — The "what are you like, anyway?" data

Two live variants, both entirely on-device:

| | Single-choice | Ranked |
|---|---|---|
| Page | `public/questionnaires/what-are-you-like.html` | `.../what-are-you-like-rank.html` |
| Engine | `public/assets/js/what-are-you-like.js` | `.../what-are-you-like-rank.js` |
| Completed result key | `cowch-q-wayl` | `cowch-q-wayl-rank` |
| Run-in-progress key | `cowch-q-wayl-progress` | `cowch-q-wayl-rank-progress` |
| Free text? | **yes** — the "honest exit" note | **no** |

Both share the 30-item bank and scoring data in
`public/questionnaires/data/what-are-you-like-bank.json`.

### The actual shape of a completed result

Written once, on completion, as a single JSON blob:

- `completed` — an ISO timestamp
- `variant` — `'rank'` on the ranked engine only
- `meta` — a one-line human sentence, e.g. "Built from 28 scenario answers…"
- `scenariosSeen` — how many moments were answered
- `bands` — one entry per axis, and this is the scored result:
  - `k`, `name` — the six axes: **O** Openness, **C** Conscientiousness, **E**
    Extraversion, **A** Agreeableness, **N** Sensitivity, **R** Risk appetite
  - `scale` — `'population'` or `'absolute'`
  - `focus` — a confidence percentage
  - `sentence` — the human write-up for that axis
  - for population axes: `low` / `high` — the room-of-100 confidence band
  - for absolute axes: `dial`, `spread`, `position`
- `answers` — **the per-moment raw record** (`{id, opt}` per moment)
- `abstentions` — single-choice only: `{id, s, note}`, where **`note` is free text the
  person typed**

Two things worth Tom's eye here. First, the engines already distinguish population axes
from absolute ones — Sensitivity and Risk appetite have no real comparison population and
are stored as absolute dials, not percentiles. The uncommitted working note
`wording-audit-what-are-you-like.md` flags that the *copy* still says "in a room of 100
people" for all six, which is misleading for those two. That matters here because
anything sent to Mandy must not imply a percentile that doesn't exist.

Second, **the single-choice variant carries free text** in `abstentions[].note`. Any
payload definition has to say explicitly whether that goes.

### The wheel build

`public/questionnaires/build-your-wheel.html` / `public/assets/js/wellness-wheel.js`
keeps its harvest under `cowch-wheel-build`: the person's own words, verbatim, keyed to
each of thirteen spokes. The code comment is unambiguous — "On this device, in this
browser, and nowhere else — no endpoint exists to send it to."

**My read: this is the most personal data in the app and should not be in a first feed
to Mandy.** A scored axis is a summary; the wheel harvest is a person's own sentences
about their life. Flagged as a call for Tom and Mandy, but my recommendation is firm.

### The fact that governs everything downstream

**Today, nothing from any of these questionnaires ever leaves the device, and there is no
server endpoint anywhere in the repo that could receive it.** Verified live: fetching
`https://cowch.app/questionnaires/what-are-you-like.html` shows no analytics script and
no consent gate on the page.

---

## Part 4 — The route to Mandy

### (a) The consent capture that exists

**One gate, and it is the only one.** `public/app.html` (the element `consent-gate`,
around line 4857) shows a first-launch dialog with three checkboxes behind a single
"I agree and continue" button:

1. "I am 18 or over, or using this app with a parent or guardian involved in my care."
2. "I have read and agree to the [Privacy Policy] and [Terms of Use]."
3. "I understand this app is for wellbeing support and is not a substitute for clinical
   therapy or crisis services."

Acceptance is stored in the browser as `cowch-consent-v1` = `'accepted'`, read by
`consentIsAccepted()` in `public/assets/js/app.js` (line 2487).

I searched for any other consent capture — a per-feature opt-in, something on the
questionnaire pages, something in the policies. **There is none.** The only other
consented artefact in the system is the NDA (`api/nda-sign.js`), which is a separate,
much heavier thing for a different audience.

The Privacy Policy the checkbox incorporates by reference is relevant. Two useful facts
from it: **the data controller is Mandy Kloppers herself** (§"the controller is Mandy
Kloppers"), so this is not a third-party disclosure — it is the controller receiving data
she already controls, which is a materially easier position than it first looks. And §4
says data stays on the device *"unless you actively export or share them"*, which is
precisely the hook a share action would hang on.

### (b) Does that consent cover sending questionnaire answers to Mandy?

**No — not plainly, and the reason is mechanical rather than legal.**

Two sentences decide it, both verbatim from what is on the pages today.

The consent gate lives in `app.html` and nowhere else. A person who arrives from Mandy's
site and lands directly on `cowch.app/questionnaires/what-are-you-like.html` **never sees
it** — verified live, that page contains no consent gate. So for exactly the population
this feature targets, there may be no consent record at all.

And the questionnaire page itself tells them the opposite of what a feed would do:

> "Everything you tap stays on your device."

and, on the results screen:

> "They're yours: they never left this device."

That is the finding, and per the brief I stop here rather than design the fix. What to do
about it is Tom's call and a different job. Worth saying plainly, though, because it
changes the size of the problem: because Mandy is the controller and not a third party,
this looks like a wording-and-placement problem, not a legal-basis problem.

### (c) The delivery route — how answers actually reach her

This is the mechanical part, and there is a real obstacle in it.

**1. What identifies someone as having come from Mandy's site.** The intended signal is
`cowch-source`, the first-touch label from `?utm_source=` or `?ref=`. It survives
indefinitely once written, and browser storage is shared across the whole cowch.app
origin, so a value written on `app.html` *is* readable from a questionnaire page.

**But it is written and read in exactly one file — `analytics.js` — which loads only on
`app.html`.** So the person who follows a link from Mandy's site straight to
`cowch.app/questionnaires/what-are-you-like.html?ref=mandy` **never gets a source
recorded**, and the questionnaire page has no code that reads one. The attribution
machinery Tom correctly identified as already existing does exist — it just doesn't run
anywhere near the questionnaire. Making it run there is small (load one script, or lift
the twelve lines that write the key), but it is not zero, and nothing works until it's
done.

**2. What the payload is.** My recommended default: the `bands` array (the six scored
axes with their confidence bands), plus `completed`, `variant`, `scenariosSeen` and
`meta`. **Not** `answers` — the per-moment raw record. **Not** `abstentions`, which carry
free text. **Not** the wheel harvest. *Flagged: this is a call for Tom and Mandy, and it
is a clinical-usefulness question as much as a privacy one — Mandy may say the raw
answers are the interesting part.* Also flagged: I've assumed **both variants** feed,
since a result is a result and the `bands` shape is identical in each.

**3. What receives it.** Nothing today. But `api/nda-sign.js` is the working precedent
for exactly this shape: a POST that validates a consent flag, stamps a server-side
timestamp, writes one record under `cowch:<thing>:<uuid>` and adds the id to an index set
in Upstash Redis. The store is already provisioned, the client library is already a
dependency, the pattern is already deployed and proven. A questionnaire equivalent is
that file with a different body validation and a different key prefix. **The honest
answer is: this is the NDA flow again with a different payload.**

**4. How Mandy reads it.** `api/nda-export.js` is the existing answer to this same
question — a shared-secret token in the URL, no login system, deliberately. It works, but
**it is the model to copy only halfway**: it returns raw JSON. A clinician on a phone
tapping that link gets a wall of braces. For NDAs, which Tom mostly reads, that's fine.
For a stream of client results Mandy reads on her phone, it isn't. The same endpoint
returning a simple HTML page — one card per person, newest first, six axes each — is the
same amount of code and the difference between "she uses it" and "she doesn't."

**5. Retention and deletion.** Stating the fact, not proposing a policy: the NDA
precedent sets **no expiry** — `redis.set` with no TTL, records live forever. If the
questionnaire feed copies it exactly, it inherits that. Privacy Policy §7 covers
retention in general terms. That's the gap, in one line.

---

## Part 5 — The smallest path

Three steps. Each is shippable on its own and useful even if the next never happens.

**Step 1 — Make the dead events fire.** Add the analytics script to the 32 exercise pages
and 7 IMAGINE pages so the `exercise_engaged` and `imagine_guide_*` events that are
already written actually run.
*Better:* it converts "we see opens, not completions" into real engagement data.
*Simpler:* one script tag per page, no new code, no new concepts — the events already
exist and are already privacy-safe.
*Cheaper:* nothing new to maintain; it finishes something already paid for. This also
closes the standing worklist item.

**Step 2 — Carry `cowch-source` onto the questionnaire pages.** Load the analytics script
(or just its first-touch block) on the questionnaire pages so a `?ref=mandy` arrival is
actually recorded.
*Better:* it's the prerequisite for anything Mandy-related, and independently it tells us
whether her audience is arriving at all.
*Simpler:* it reuses machinery that exists rather than inventing an attribution scheme.
*Cheaper:* it falls out of step 1 nearly free, since it's the same script.

**Step 3 — The feed itself: `api/questionnaire-share.js` + a human-readable export.**
A copy of the NDA pattern with a different payload, and an export endpoint that returns
HTML rather than JSON.
*Better:* Mandy actually receives what people choose to send her, and can read it on a
phone.
*Simpler:* it is a proven file pattern on a provisioned store, not a new subsystem.
*Cheaper:* no database, no auth build-out, no dashboard — one shared secret, same as NDAs.
**Blocked until the Part 4(b) gap is resolved** — that's Tom's call and not part of this
path.

### My position

**Step 1.** In one word: **fire.** The events are already written, already safe, and
already wrong; finishing them costs an afternoon, and unlike anything else here it needs
no decision from anyone.

And the finding underneath: **the aggregation problem and the Mandy feed are different
problems, and only one of them is worth doing now.** Aggregation is cheap to finish and
answers population questions — worth doing, but it will not tell Tom what his handful of
named testers are doing, and no build will make it. The Mandy feed is a genuinely good
idea with proven plumbing, and it is currently blocked on one sentence on one page rather
than on any technical work.

---

## Explicit gaps

- **No Vercel account access from this machine.** Could not verify whether a Web
  Analytics query/export API is available on this plan, what the retention window is, or
  whether custom events face a quota. Nothing was assumed in place of these.
- **No Upstash credentials.** Could not check how many NDA records exist or whether the
  store is near any limit. The code was read; the data was not.
- Everything else in this document was read from a file in the repo or checked live
  against cowch.app.
