# WORKLIST — theracowch (cowch.app) · shared, multi-agent. READ THIS HEADER BEFORE EDITING.

The live "what's next" for this repo, for **all** agents (local, cloud/web, any account).
Coarse on purpose — for Opus: **directions, things to build, areas to think through.** One line per
item; if it needs detail, **link a doc** (`docs/marketing-strategy.md`, `docs/sharing-and-marketing.md`,
`docs/claims-audit.md`), don't inline it. This is *not* a bug tracker or a subtask list, and it sits
**on top of** the deploy rail in `CLAUDE.md` — it doesn't restate it.

### How to use (the whole protocol)

**Status marks** — one box + a suffix, nothing else:
- `[ ]` open — free to grab
- `[~] @handle MM-DD` — claimed / in progress (e.g. `[~] @web-acctB 06-14`)
- `[x] @handle MM-DD` — done (leave it; the groomer archives it)
- `[!] @handle MM-DD — why` — blocked / parked

`@handle` = a stable tag you pick for yourself (`@tom-local`, `@cloud-3`, `@web-acctB`). Date = today, `MM-DD`.

- **Grab:** flip `[ ]`→`[~] @you MM-DD` and commit **only that one line** (`worklist: claim <slug>`). If it's already `[~]`, pick another. A `[~]` older than **5 days** with no branch behind it is stale — re-grab it, note `(was @x, stale)`.
- **Add:** append `[ ]` to the **end** of the relevant section. Never renumber/reorder/reflow existing lines (append-only keeps merges trivial).
- **Finish:** flip `[~]`→`[x] @you MM-DD`, same one-line commit.
- **Merge conflicts here are always two independent line edits → keep BOTH, strip the markers.** Never overwrite the other side. Don't bundle worklist edits with code commits.
- **Branch hygiene** (inherits `CLAUDE.md`): work on a `claude/*` branch; it auto-merges **wholesale to `main`** (→ Vercel deploys `cowch.app`). So **never** add your claim/commit onto someone else's `claude/*` branch, and never bundle a claim with a code change. **No build step** — only `public/` + `api/` reach the live site; bump `public/sw.js` `CACHE_NAME` if you change served assets.

⚠️ **The claims line is a hard rail — read before touching any user-facing copy or the chat prompt.** Cowch is a **non-clinical wellbeing product**: never frame it as therapy / a therapist / treatment / diagnosis / "CBT for [a condition]"; always "wellbeing companion, built on a real therapist's approach, CBT/ACT-**informed**, *not* a replacement for therapy", with crisis routing to humans. 18+. The chat system prompt lives in **`lib/prompt-base.js`** (edit there — it's bundled, not a public file; no version-bump). Full reasoning: `docs/marketing-strategy.md` §3 + `docs/claims-audit.md`.

---

## 🧭 Directions / bets   (the why — changes rarely)

- **Mission-led soft launch to *validate*** — not growth, not revenue yet. Free for students; never paywall the student crisis. → `docs/marketing-strategy.md`
- **Beachhead = UK university students, Surrey first.** Mandy is local to Guildford and already works there; Surrey's Mental-Health-Charter submission (~Sept 2026) is the timing hook. Sit *outside* the clinical-procurement frame; complement existing services, don't replace them. → `docs/marketing-strategy.md` §5
- **Own the position: real therapist, NOT AI therapy, private by design.** The AI-therapy backlash is the trust advantage. Stay non-clinical in product *and* marketing — that's also what keeps us off the medical-device line. → `docs/claims-audit.md`
- **Privacy is the architecture, not a feature.** On-device journals; a university can endorse with no heavy DPIA *because* there's no student data to process. Don't erode it.
- **Universities as a repeatable channel:** Surrey → a portable pilot playbook → other local / Charter universities.
- **Mandy's audience is the compounding engine:** warm (blog → email) seeds everything; social scales the stories that land; paid ads only ever *amplify* a proven message.
- **The ethical deep-end:** Cowch as a warm, honest bridge to real human help, including Mandy's own 1:1 practice.

## 🔨 To build   (claimable — one line, link the plan)

- [x] @claude-local 06-14 **University-facing pitch surface — SHIPPED** (`public/for-universities.html`): brand-styled, print-friendly, noindex, not in app nav — the gap / what-it-is / why-yes / the ask (~50-student evaluated pilot). From `docs/marketing-strategy.md` App. A.
- [x] @claude-local 06-14 **One-page institutional privacy / data-flow statement — SHIPPED** (`public/privacy-for-institutions.html`): on-device, no central student DB, no DTAC/DCB0129 trigger, at-a-glance Q&A — the DPIA-killer.
- [x] @claude-local 06-14 **Campus on-ramp — SHIPPED** (`public/qr/`): printable `talk-card.html` (error-level-H QR → `cowch.app/?utm_source=surrey-talk`, attributes in Vercel + telemetry `source`) + standalone SVG/PNG for slides + README for per-talk variants.
- [ ] **Warm welcome for shared/invited arrivals** — a `?ref=*` first-visit nudge ("someone thought this might help you", once, then in); reuse `window.CowchInstall`.
- [ ] **Gentle, once-only share nudge** after a genuinely good moment (calls `window.CowchShare.share()`; a `localStorage` flag so it never nags).
- [ ] **Install & preview polish** — real screenshots (`manifest.json` references `/screenshots/*` that 404); confirm the social card renders everywhere.
- [ ] **Light, consent-aware feedback / testimonial capture** from early users + the pilot.
- [ ] **Exercise/IMAGINE page analytics** — those pages have *no* analytics (only 6/32 even load `activity-log.js`); we see app-side opens, not their page-views/completions. Light them up only if the open-rate signal proves worth deepening.
- [x] @claude-local 06-13 **Share→install loop + social preview cards — SHIPPED.** `CowchShare` (native sheet / copy+toast), two entry points (YOU-tab pill + Settings); OG/Twitter cards on `index.html`+`app.html` with a brand 1200×630 `og-image.png`. → `docs/sharing-and-marketing.md`
- [x] @claude-local 06-13 **Validation telemetry (first pass) — SHIPPED.** Privacy-safe Vercel events: `chat_started`, `exercise_open`/`domain_open`, `returned`, install funnel, `share` — each with a first-touch `source`. Vercel Web Analytics enabled (Pro). → `docs/sharing-and-marketing.md`
- [x] @web-calf 06-14 **Interactive calf companion (Finch-inspired) — SHIPPED v1.** Stork-delivery welcome flow → name your calf + yourself → a few gentle on-device intake questions → pick focus areas (reorders daily IMAGINE + seeds profile). Persistent, growing calf card on Home; "spend a moment" care actions deep-link to IMAGINE exercises (caring for the calf = caring for you). Non-clinical, no breakable streaks, on-device only. `public/assets/js/calf.js` + `calf.css`. Open design left: how warm/central the calf becomes vs. Mandy.
- [x] @claude-local 06-14 **Claims-safety pass — SHIPPED.** Audited all copy + the chat system prompt (AI no longer calls itself a therapist; proactively reaffirms "general wellbeing support, not therapy"); removed `vision.html`; aligned "coach"→"companion"; moved the prompt into a bundled `lib/prompt-base.js`. → `docs/claims-audit.md`

## 🤔 Areas to think through   (open design — link the think-piece)

- [ ] **How far the AI speaks AS Mandy** — the named, credentialed clinician vs. *in her approach*. Softened in the audit, not fully resolved — **Mandy's call**. → `docs/claims-audit.md`
- [ ] **What "validated" actually means** — pick the few signals that say it's working (someone came back; someone said it helped; a wellbeing team said yes) and ignore vanity metrics.
- [ ] **The crisis answer** — the one paragraph a wellbeing team needs: Cowch routes to humans, does *not* detect / triage / own safety. Gates university trust.
- [ ] **How warm is too warm** — Mandy's voice as a real person's *approach*, not a synthetic friend to confide in *instead of* people (the FTC parasocial worry). Where's the line, in tone and in features?
- [ ] **Complement, not replacement** — how Cowch describes its relationship to a university's existing services so it's true *and* easy to adopt.
- [ ] **The Surrey pilot's shape** — bottom-up (talks → install) vs top-down (Centre for Wellbeing endorsement); the lightest credible evaluation (pre/post wellbeing measure?); consenting testimonials. → `docs/marketing-strategy.md` §5
- [ ] **When money enters, later** — a paid layer for the *general* audience + a bridge to Mandy's 1:1, without ever betraying free-for-students.

## 🚧 In flight / don't collide

- The chat system prompt now lives in **`lib/prompt-base.js`** (bundled, imported by `api/chat.js`). Edit *that* file to change the prompt — NOT a public `.txt`, no version-bump, no CDN cache. Don't reintroduce the fetch-a-public-file loader.
- All marketing/claims work to date is merged to `main` and live — nothing half-shipped to coordinate around right now.

## ⛔ Blocked / parked

- [!] @mandy 06-14 **Warm seed** — the blog post + email to her list, in her words. The first channel; everything else leans on it.
- [!] @tom 06-14 **Surrey: confirm the contact + a talk date** — Centre for Wellbeing owner; whether the pilot runs via a talk / society / wellbeing service (loop in the School of Psychology for a measure).
- [!] @tom 06-14 **Mandy reviews the live chat voice** — she may want it warmer or more arm's-length now the reaffirmation is live.
- [!] @tom 06-14 **Prime the social-preview caches** after any OG change — run `cowch.app` through the FB / Twitter / LinkedIn debuggers once (links in `docs/sharing-and-marketing.md`).

## ✅ Done (archive — groomer-managed, don't hand-edit)

- 2026-06-14 — Claims-safety audit + proactive not-therapy reaffirmation; chat prompt bundled to `lib/prompt-base.js`; `vision.html` removed; "coach"→"companion".
- 2026-06-13 — Share→install loop, social preview cards, Vercel Web Analytics (enabled, Pro) + validation telemetry; marketing strategy (`docs/marketing-strategy.md`) + this worklist.

---

*Cross-repo: this is the theracowch worklist, same shape as `ssi-learning-app`'s. A daily repo-only "groomer" routine can archive `[x]`s, free stale `[~]`s, and surface shipped/dead items as a commit for review — it never silently rewrites live intent.*
