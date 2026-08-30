# Cowch.app — codebase deep dive

*A read of the repo as it stands at `a2014a9` (30 Aug 2026), written for the two decisions in front of
it: what goes on the worklist next, and whether anything must be fixed before Surrey. Read-only —
nothing here was changed, only written down.*

---

## The verdict, first

### Risks, ranked

**1. `/api/chat` caps one field out of five, so the rate limit bounds requests, not spend.**
`api/chat.js:30` rejects a `message` over 4,000 characters. The other four fields the handler pulls off
`req.body` — `profile`, `recentMessages`, `history`, `questionnaire` — have no cap at all, and
`recentMessages` is forwarded verbatim into the Anthropic `messages` array (`api/chat.js:576-584`).
`lib/request-gate.js` says out loud that the Origin lock is browser-enforced and `curl` walks past it;
its own defence is the per-IP limit of 60 requests per 10 minutes. Sixty requests each carrying a
200k-token context is roughly 12M input tokens per ten minutes from one address. *Who it bites:* Tom's
Anthropic bill. *Fix, one sentence:* cap the whole body (`JSON.stringify(req.body).length`) and slice
`recentMessages` to the last 3 entries of ≤4,000 chars each server-side, the way
`api/compress-profile.js:21` already caps its entire payload.

**2. The on-device claim on both "What are you like, anyway?" intros is no longer true.**
`public/questionnaires/what-are-you-like.html:346` and `what-are-you-like-rank.html:488` both say
"Everything you tap stays on this device." Since `8ea7ad6` (29 Aug) the six scored bands are read by
`therapy-profile.js` (`getQuestionnaireResult`, line 245) into `buildAPIContext()` and posted to
`/api/chat` on **every** message — so they go to Anthropic. The results panel is more careful but still
lands wrong: "Nothing is sent anywhere for that to work" (line 421) means *no separate send, no server
record*, and is read by a Data Protection Officer as *no transmission*. There is no toggle. *Who it
bites:* the person, and the university trust position, which is the whole beachhead. *Fix:* reword both
intros and the panel to "stays on this device, except the six results, which travel with your chat so
Mandy has the background", and add a one-line opt-out.

**3. `/api/nda-sign` is an unauthenticated, uncapped, untimed write into Redis.**
No `gate()`, no origin lock, no rate limit (`api/nda-sign.js:28`). Every string field is `.slice()`d
except `signatureDataUrl`, which is stored whole (line 68) with `redis.set` and no TTL, alongside the
signer's IP and user-agent. Anyone who finds `/api/nda-sign` can write unbounded blobs into the same
Upstash store the rate limiter depends on — and the rate limiter fails *closed*, so filling the store
takes the chat down with it. *Who it bites:* the store, then every user. *Fix:* wrap it in `gate()` with
its own bucket and cap `signatureDataUrl` at ~200KB.

**4. Zero telemetry on the questionnaire funnel.** All 32 exercise pages and all 7 IMAGINE pages load
`analytics.js`; **0 of the 7 questionnaire pages do.** For a pilot whose measurement instrument *is* the
questionnaire, completion rate is currently unobservable. *Who it bites:* the next agent, and the Surrey
evaluation. *Fix:* one script tag plus the `va` stub on the seven pages, and a `questionnaire_completed`
event at the reveal.

**5. The chat system prompt lives in two places, and `CLAUDE.md` names only one.** `lib/prompt-base.js`
is 530 lines; `api/chat.js` appends a further **432 lines** of prompt inline across three template
literals — including the entire crisis-detection protocol (lines 42-90) and the identity paragraph. An
agent told "the prompt lives in `lib/prompt-base.js`" will edit the wrong file and conclude the deploy
is broken. *Who it bites:* the next agent, on the highest-stakes text in the product. *Fix:* one line in
`CLAUDE.md` naming both, or move the appended blocks into `lib/`.

**6. Two campus-shaped edges in the rate limit.** `lib/request-gate.js` predicts its own failure: the
key is per-IP, and "a whole campus can sit behind one NAT address". 60 chats per 10 minutes shared
across a Surrey hall is one lecture theatre away from every student seeing "Too many requests — give it
a minute." The file also names the fix (a per-install client token in the key) and rules out the wrong
one (a looser IP limit). *Who it bites:* every student in a demo, simultaneously, in the room.

**7. Design-scratch pages are publicly reachable.** `calf-gallery.html`, `calf-motion-compare.html`,
`cow-frame-mockup.html`, `cow-poses.html`, `cowch-characters.html`, `pasture-photoreal-mockup.html`,
`mockups/mockup-1..5.html` — eleven internal pages served verbatim on cowch.app with no `noindex`
(`nda.html` has one; these do not). *Who it bites:* nobody today; it is a link away from being awkward.

**8. Someone else's product is shipped inside this one.** `public/vfs/courses/spa_for_eng_30seeds/`
holds SSi Spanish-course seed/lego JSON, and `api/courses.js` serves a manifest of it with
`Access-Control-Allow-Origin: *`. Nothing in `public/` calls it. *Fix:* delete both.

### The next real piece of work

**Make the questionnaire→Mandy hand-over honest, visible and measured.** One piece with three parts,
all in the same subsystem: (a) correct the on-device wording on both intros and the results panel; (b)
add a single visible control — "Mandy uses your results in chat" with an off switch, read by
`getQuestionnaireResult()`; (c) put `analytics.js` on the seven questionnaire pages and emit
`questionnaire_completed`.

*Better:* it closes the only place where the product's central promise and its actual behaviour
disagree, and it is the exact thing a university reviewer opens the app to check. It also turns the
newest subsystem from unmeasured to measured before the pilot rather than after.
*Simpler:* three small edits in files that were touched last week, no new endpoint, no new storage key
beyond one boolean, and it deletes an unresolved question rather than adding one.
*Cheaper in total:* it is the cheapest of the candidates to build and the only one whose *not* doing it
carries an unbounded cost — a wrong privacy claim in front of an institution is not a bug you patch, it
is a position you lose. The spend risk (#1) is cheaper still to fix and I would land it in the same
sitting, but it is a five-line guard, not a piece of work.

*What I am not recommending, and why.* Not splitting `public/app.html` — 4,820 of its 8,872 lines are
CSS and the file is not what is hurting anyone this month. Not unforking `what-are-you-like-rank.js`;
the drift is real (below) but it costs a rewrite of a thing under live test. Not the per-install rate
limit token (#6) — it is the right fix, but it is speculative until a real campus trips it, and the
failure is visible and recoverable when it happens. Not touching the prompt's condition-specific
content: it was audited on 2026-06-14 and kept deliberately.

---

## 1. The served surface

Sixty HTML pages ship. Sixteen at the top level, 32 under `exercises/`, 7 under `imagine/`, 7 under
`questionnaires/`, 5 under `mockups/`, one printable in `qr/`. Of the top-level sixteen, five are live
product (`app.html`, `index.html`, `about`, `privacy`, `terms`, `accessibility`, `offline`), two are the
Surrey pack (`for-universities.html`, `privacy-for-institutions.html`), one is the tester NDA
(`nda.html`, correctly `noindex`), and six are design scratch that shipped by accident of living in
`public/`. `public/vfs/` is not Cowch at all.

`vercel.json` is three lines of substance: one redirect, `max-age=0, must-revalidate` on everything, and
a cron hitting `/api/push/send` every 15 minutes. **The cron is doing real work, not vestigial work** —
`app.js:2873-2917` genuinely calls `/api/push/keys`, `/api/push/subscribe` and `/api/push/unsubscribe`,
and `api/push/send.js` scans subscriptions, matches the user's saved reminder time in their own
timezone, and dedupes with a 26-hour per-(user, slot, day) marker. Whether anyone has subscribed is
**not observable from here** (it lives in Upstash) — see Gaps. The `must-revalidate` header is what makes
the whole no-build model safe: every asset is revalidated, so `?v=91`-style query strings on the script
tags are belt-and-braces rather than the mechanism.

I sampled three exercise pages (`wave`, `box-breathing`, `heal-framework`) and read the script tags on
all 32. The pattern: a self-contained page, its own inline logic, `analytics.js` + `imagine-engagement.js`
on all 32 (`exercise_engaged` fires from the latter), and `activity-log.js` on only 6 of 32 — so 26
exercises are invisible to `cowch-activity-v1`, which is what the in-app weekly report reads. Server-side
telemetry sees the opens; the *user's own* weekly report does not.

## 2. The client app

`public/app.html` is 8,872 lines: **4,820 lines of CSS in two `<style>` blocks, 1,238 lines of JS in three
inline `<script>` blocks, and ~2,800 lines of markup.** The inline JS is not leftovers — it owns the
service-worker update banner (`7642-7700`), an IMAGINE onboarding overlay, and two document-level
capture-phase "safety net" click handlers. Those two are the tell. The quick-reply handler
(`7869-7930`) exists because per-button and delegated listeners in `chat-script.js` were double-firing,
and it works by `stopPropagation()` on capture plus writing `#chat-input.value` directly, with the
comment: "so a click can never be lost to a stale chat-script variable". The modal-close handler below
it is the same shape. Defensive layers like this are what accumulate when three files can all claim the
same DOM node.

Which they can. **`public/assets/chat-script.js` is 4,075 lines and is loaded by `app.html:7607` — the
brief for this deep dive did not mention it, `CLAUDE.md` does not list it, and it owns the entire chat
path.** `app.js:3498` says "Chat - delegated to chat-script.js via initChat()", `3723` says
"clearConversation is now handled by chat-script.js", `3729` says "updateImagineTracker is provided by
chat-script.js". So the app is really four files, in a load order that matters:
`pwa-install → share → analytics → therapy-profile → on-demand-prompts → chat-script → app.js → calf.js`,
with cross-file contracts carried entirely on `window`: `CowchInstall`, `CowchShare`, `TherapyProfile`,
`cowchTrack`, `logCowchActivity`, `triggerChatPrompt`, `recordCowchMood`, plus `__cowchChatTracked`,
`__cowchImagineRecorded`, `__cowchImagineGuide` as once-only latches. Every call site is guarded
(`if (window.CowchShare && ...)`), which is the right discipline — but it means a missing script tag
degrades silently rather than erroring, which is precisely how the 32 exercise pages went months
without analytics.

**State.** There is no state model; there is localStorage. I count roughly 80 distinct keys in three
naming eras: unprefixed legacy (`innerWeatherHistory`, `healSessions`, `diaryEntries`, `achievements` —
18 of them, all written by individual exercise pages), `cowch_snake_case` (~34), and `cowch-kebab-v1`
(~28, the newest and the only ones carrying a version suffix). **Nothing migrates anything.** The single
migration function in the repo is `migrateStorageKey()` at `chat-script.js:350`, which copies one old
chat-history key to `theracowch_chat_history` and nothing else. Every read is a `try { JSON.parse(...) }
catch { return default }`, so a shape change silently resets that feature's data rather than crashing —
survivable, and the reason nothing has visibly broken, but it means a schema change is a silent data
loss and no one would see it. On a version change, nothing happens at all: `sw.js` clears the *HTTP*
cache, never localStorage. The `-v1` suffixes are the only place anyone has left themselves room.

**The fork.** `what-are-you-like.js` (767 lines) and `what-are-you-like-rank.js` (908). They share the
item bank properly — both fetch `/questionnaires/data/what-are-you-like-bank.json`, so the 30 moments
exist once. The *engine* is forked and has diverged: ~473 differing lines, and of the 9 commits touching
either file, **only 2 touched both.** Seven one-sided changes. The 08-26 resume fix landed in both; the
08-10 viewport work landed only in the ranked one. They persist to different keys
(`cowch-q-wayl-progress` / `cowch-q-wayl-rank-progress`) and write the same band shape, which
`therapy-profile.js:243` depends on — that shared contract is the thing to protect if anyone touches
either.

## 3. The serverless layer

Eleven functions, 1,723 lines. Three tiers of guard, and the tiers are not aligned with the risk.

| Endpoint | Who can call | Guard | Cost per call |
|---|---|---|---|
| `chat` | anyone with a spoofable Origin | `gate()`: origin + 60/10min per IP, fails closed | Sonnet 4.6, 500 max output, cached ~1k-line prefix |
| `compress-profile` | same | `gate()`: 20/10min + 8,000-char body cap | Haiku 4.5, 500 output |
| `nda-sign` | **anyone** | none | one Redis write, unbounded size, no TTL |
| `nda-export` | token holder | `NDA_EXPORT_TOKEN`, 503 when unset | reads |
| `questionnaire-report` | token holder | `QSHARE_EXPORT_TOKEN`, 503 when unset | reads |
| `push/{keys,subscribe,unsubscribe}` | anyone | none | small Redis writes |
| `push/send` | cron (`CRON_SECRET` if set) | Bearer check *only if the env var exists* | web-push fan-out |
| `courses`, `blog-quotes` | anyone, CORS `*` | none | fs read / one outbound fetch |

`lib/request-gate.js` is the best-written file in the repo and should be read before anything else in
`api/`: it is honest about what the Origin lock cannot do, it fails closed on purpose with the reasoning
written down, and it explains why the limits are loose. Its blind spot is that it gates *requests*,
and the money is in *tokens* — risk #1.

Two smaller things. `api/blog-quotes.js:22` fetches `thoughtsonlifeandlove.com/sitemap.xml`, throws the
response away, and returns a hard-coded array of quotes; the fetch exists only so the `catch` can fire.
Nothing in `public/` calls it. And `api/push/send.js:86` only enforces `CRON_SECRET` **if it is set** —
unset, the dispatcher is world-callable, which at worst lets someone trigger the day's reminders early
(the per-slot marker stops duplicates). Whether it is set is not observable from here.

The chat handler also does two things worth naming as design, not defect. It asks the model to append a
hidden `[[MOOD: low|okay|good]]` tag to every reply, strips it, and hands it to `recordCowchMood()` —
which stores one value on device and tints the pasture cow (`app.js:1169`). And it keyword-classifies the
user's message server-side into `anxiety | depression | relationships | trauma | perfectionism`
(`chat.js:672-700`), returned as `pattern` and used only to pick quick-reply buttons; nothing is stored
server-side. Neither is a diagnosis and neither is persisted anywhere central, but
`privacy-for-institutions.html:110` says Cowch "does not diagnose, assess, triage, or monitor risk", and
a careful reader looking at a per-message emotional-state classifier will want that sentence to be
precise about *inference for UI* versus *assessment*. Worth one wording pass, not a code change.

## 4. The questionnaire / Mandy path

What it is now, in one line: **the person's six scored bands never leave their device except as part of
the chat request they were already making.** `therapy-profile.js:245` reads `cowch-q-wayl-rank` (or
`cowch-q-wayl`), takes named fields only — deliberately not `answers` and not `abstentions`, which carry
free text — and `buildAPIContext()` posts them with every message. `api/chat.js` renders them through
`lib/questionnaire-context.js`, which converts bands to speakable phrases ("somewhat higher than most
people") and refuses to invent a population for the two Cowch-owned axes, into the **uncached** second
system block with explicit usage rules: background to listen with, never a label, believe the person over
the questionnaire.

What was built and removed, inside 24 hours: an opt-in "send a copy to Mandy" panel
(`public/assets/js/questionnaire-share.js`, 195 lines) and its endpoint (`api/questionnaire-share.js`,
138 lines), both deleted in `a2014a9` on Tom's ruling. What survives them is `api/questionnaire-report.js`
— **a read endpoint whose only writer no longer exists.** Its own header says so honestly: it reads "a
closed set that empties as the 12-month TTLs expire". It is guarded, it 503s until `QSHARE_EXPORT_TOKEN`
is set, and it stores name and email for anyone who used the panel during its few live hours. Whether
that set is empty is not observable from here.

Where the design is still half-landed: (a) the hand-over is silent — no consent moment, no visible
control, and the copy that describes it is wrong in the direction that matters (risk #2); (b)
`lib/questionnaire-context.js` has two consumers, one of which is now dead; (c) `docs/route-to-mandy.md`
was rewritten for the new shape and is current, which makes it the one document to read here.

## 5. Data, privacy and the claims rail

**"Privacy is the architecture" survives the code read.** There is no user table, no account, no login,
no session store, and no server-side write of anything a user typed. Every journal, mood, goal,
reflection, calf, wheel harvest and questionnaire answer lives in localStorage on the device. The three
Redis keyspaces (`cowch:nda:*`, `cowch:sub:*`, `cowch:qshare:*`, plus `cowch:rl:*` counters) hold NDA
signatures, push endpoints, the closed questionnaire-share set and rate-limit counters — nothing else.

Everything that leaves the device, exhaustively:

1. **`/api/chat`, per message** — the message itself; the last 3 messages verbatim; the model-written
   `profile` (patterns, themes, insights, strengths, last-session summary — derived from the user's own
   conversation); the six questionnaire bands. Onward to Anthropic. This is the big one and it is
   inherent to having a chat product.
2. **`/api/compress-profile`, every 8 messages** — a prompt built from recent messages. Onward to
   Anthropic (Haiku).
3. **Vercel Web Analytics** — event name plus short scalars only. `analytics.js` `clean()` truncates
   strings to 48 chars and drops objects; the events are `chat_started`, `exercise_open`, `domain_open`,
   `exercise_engaged`, `imagine_guide_*`, `returned` (bucketed), `share`, `install_*`, `pwa_installed`,
   each carrying a first-touch `source` label. This one is genuinely clean.
4. **`/api/push/subscribe`** — the browser's push endpoint and keys, plus reminder time and timezone.
5. **`/api/nda-sign`** — name, organisation, email, signature image, IP, user-agent. Testers only,
   explicit.
6. **The removed `questionnaire-share`** — no longer a path.

**Claims rail.** It holds in shipped copy. `terms.html:92`, `privacy.html:93`, `for-universities.html:92`,
`privacy-for-institutions.html:110-119` and `app.html:4862` all carry the non-clinical framing; the
questionnaire pages say "not a test, not a diagnosis" in their own words; `manifest.json` categories are
`health, wellness`, not medical. `lib/prompt-base.js:10` opens with the correct identity and
`api/chat.js:368-372` reaffirms it. **The only drift since the 2026-06-14 audit is the on-device claim,
not the therapy claim** (risk #2).

One thing to see and *not* mistake for drift: `api/chat.js:476-505` carries "THERAPEUTIC KNOWLEDGE —
ANXIETY" and "— DEPRESSION" blocks, condition-specific, including a sentence on antidepressants and
serotonin. They were added on 2026-04-09, and `docs/claims-audit.md:35` shows the 06-14 audit read
`api/chat.js` and kept them. It is a considered position, and the blocks do route to a doctor. But it is
also the paragraph a Surrey reviewer would quote back if they ever read the prompt, so it should be a
known, chosen exposure rather than a surprise.

## 6. The PWA and cache layer

The precache list is six URLs (`/`, `app.html`, `index.html`, `manifest.json`, `offline.html`, one jpg) —
deliberately tiny. Everything else is fetched: HTML with `cache: 'reload'`, JS/CSS network-first, API
network-first, all else cache-first. `CACHE_NAME` is `cowch-wellness-v232`, `BUILD_DATE` '29 Aug 2026',
surfaced in Settings over a `GET_VERSION` MessageChannel — so the stamp reflects the *controlling* worker,
not the server, which is the correct choice.

**The bump discipline is real:** 120 commits since June touched `public/assets` or `app.html`; 119 touched
`sw.js`. The twelve misses are listed in the git log and are all questionnaire/asset JS — which, being
network-first and outside the precache list, would not have stranded anyone. A user on an old build sees
the banner on the next foreground poll (`app.html:7642-7700` polls on load, on visibility change, and
periodically, because iOS never reloads a resumed PWA), taps it, `SKIP_WAITING` fires, `controllerchange`
reloads once, with a 2.5s belt-and-braces reload if it doesn't. This is the most carefully-built thing
in the client and should not be touched.

Two small notes. The API branch does `cache.put(request, clone)` on every API response — for `POST /api/chat`
that rejects with a `TypeError` inside an unhandled promise, harmless but noisy in the console. And
**the worklist's "manifest.json references `/screenshots/*` that 404" is wrong**: `manifest.json` has no
`screenshots` key at all, and all three icon paths resolve. The real gap is that there *are* no
screenshots, so the install preview is bare — a different, smaller job than the one written down.

## 7. Debt and landing state

**Everything is landed.** Nine local and seven remote `claude/*` branches, and `git cherry origin/main <branch>`
returns all-`-` (or empty) for every one of them. There is no unlanded work anywhere in this repo.

The confusion is a **stale local `main`, 16 commits behind `origin/main`** (`993b386` vs `a2014a9`).
Measured against that stale ref, `claude/mandy-questionnaire-feed` looks like 16 unlanded commits across
52 files and 774 insertions; measured against `origin/main` it is zero. Any agent that reasons about
this repo without `git fetch` first will reach the wrong conclusion, and did.

**The seven capitalised root files are the estate's poison shape**, and they are older than the brief
suggested — `CHAT_DEPLOYMENT_GUIDE.md`, `CHAT_INTERFACE_SUMMARY.md`, `MANDY_AI_TRAINING_SUMMARY.md` last
touched **2025-11-03**; `CLEANUP_PLAN.md`, `ENHANCED_MANDY_AI_SUMMARY.md`, `IMPLEMENTATION_STATUS.md`,
`theracowch-app-specification.apml` **2025-11-06**. Ten months. They read as coherent, confident English
describing an architecture that has since moved (the prompt was bundled in June, the chat path was
reshaped, `vision.html` was deleted). `IMPLEMENTATION_STATUS.md` and `CHAT_DEPLOYMENT_GUIDE.md` are the
two most likely to mislead, because their titles claim currency. My call: they are historical, not
reference; the honest move is `docs/archive/` with one line at the top of each saying "superseded, see
CLAUDE.md" — not deletion, since they are the only record of the pre-June design.

Smaller items: `node_modules/` is *mostly* gitignored — only 35 files are tracked, all of them the
`tailwindcss` package, committed before the ignore rule and now just noise (no build step consumes them).
`apml-battle/` is 152KB of a design bake-off, inert, harmless, and arguably worth keeping as a record.
`public/vfs/courses/` + `api/courses.js` are SSi language-course files served publicly from the wellbeing
product (risk #8). `public/assets/on-demand-prompts.js` (420 lines) is live, not dead — it exposes `window.MandyPrompts`
and `chat-script.js:1496` calls `getDailyPrompt()`; it is simply a fifth file nobody documents.

## Gaps — what I could not see

- **Upstash contents.** Whether any push subscriptions exist (so whether the 15-minute cron sends
  anything), whether any questionnaire shares were written in the panel's few live hours, how many NDAs
  are stored. All of it is behind credentials I do not have.
- **Vercel dashboard.** Which env vars are actually set — `CRON_SECRET`, `QSHARE_EXPORT_TOKEN`,
  `NDA_EXPORT_TOKEN`, the Upstash pair. Several guards are conditional on those existing, so their real
  posture is unverified.
- **Live analytics.** No claim in this document about what users actually do is measured; every
  behavioural statement is inference from the code.
- **Live production behaviour.** Nothing here was executed, requested or deployed. The spend arithmetic
  in risk #1 is an order-of-magnitude read of the code paths, not an observed bill.
