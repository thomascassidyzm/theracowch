# Cowch — working brief

**For:** Claude Code on the web, running as **Opus 4.8** — a thinking partner,
not a ticket-taker. Decide what matters, decompose it yourself, and hand the
detailed/mechanical execution down to Sonnet or Haiku. Don't wait for
hand-holding; do wait on the few human calls flagged at the end.

**The mission:** a careful, mission-led **soft launch to validate** Cowch, with a
beachhead of **UK university students**. Mandy Kloppers — a real BABCP-accredited
therapist — is going into the **University of Surrey** (Guildford, local to her)
in person. Free for students. No rush to monetise. People need something like
this; the job is to get it to them well, not fast.

**Read for the full picture:** `docs/marketing-strategy.md` (strategy + sources +
a copy-ready university pilot one-pager), `docs/sharing-and-marketing.md`
(share/install already shipped), `CLAUDE.md` (no build step; only `public/` +
`api/` reach the live site; work on a `claude/*` branch and the auto-merge
workflow ships it).

---

## Fixed constraints — these bound every decision

1. **The claims line (non-negotiable).** Cowch is a **non-clinical wellbeing
   product**. Under MHRA 2025 guidance the *claims* are what make software a
   medical device; the ASA bans treat/cure claims; Illinois bans advertising "AI
   therapy". So never frame Cowch as therapy / a therapist / treatment /
   diagnosis / "CBT for [a condition]"; do frame it as a wellbeing companion,
   *built by* a real therapist, CBT/ACT-**informed**, **not a replacement for
   therapy**, with crisis routing to humans. 18+. (Full reasoning in the strategy
   doc, §3.) If something can't be done without crossing this line, stop and say so.
2. **Free for students. Mission-led pace.** Never paywall the student crisis.
   Validate first; don't optimise for growth or revenue yet.
3. **Privacy is the architecture, not a feature.** On-device by design — it's
   also the thing that makes universities able to say yes. Don't erode it.
4. **Ship via the repo's flow** (`claude/*` branch → auto-merge → Vercel). Bump
   `sw.js` `CACHE_NAME`/`BUILD_DATE` if you change served assets.

---

## Areas to think through  *(judgment — reason it out, propose, ask Tom if it's his call)*

- **The honest-CBT voice.** How do we sound like genuine help — warm, useful,
  grounded in Mandy's real approach — while staying clearly on the non-clinical
  side of the line? This is a wording *design* problem, not find-and-replace.
  _A first claims-safety audit shipped 14 Jun (`docs/claims-audit.md`): the AI no
  longer calls itself a therapist, the legal pages are exemplary, branding aligned
  to "companion", and `vision.html` was removed. The open part is the deeper
  voice question — how far the AI should speak AS the named clinician vs. in her
  approach (Mandy's call)._
- **What "validated" actually means.** Pick the few signals that would tell us
  this is working (someone came back; someone said it helped; a wellbeing team
  said yes) and ignore vanity metrics.
- **The crisis answer.** Nail the one paragraph a university wellbeing team needs
  to hear about "what happens if a student is in crisis?" — Cowch routes to
  humans, it does not detect, triage, or own safety. Get this exactly right; it
  gates trust.
- **How warm is too warm.** Mandy's voice should feel like a real person's
  *approach*, not a synthetic friend to confide in *instead of* people (the thing
  regulators are worried about). Where's that line, in tone and in features?
- **Complement, not replacement.** How Cowch describes its relationship to a
  university's existing services so it's true *and* makes adoption easy.
- **The Surrey pilot's shape.** Bottom-up (talks → install) vs top-down (Centre
  for Wellbeing endorsement); the lightest evaluation that's still credible (a
  simple pre/post wellbeing measure?); how to gather consenting testimonials.
- **When money enters, later.** How a paid layer could appear for the *general*
  audience and as a bridge to Mandy's 1:1 therapy — without ever betraying
  free-for-students.

## Stuff to build  *(near-term outcomes — you decide the how)*

- A **university-facing pitch surface** (the one-pager in the strategy doc,
  Appendix A, made into something Mandy can actually hand over / show / print).
- A **one-page privacy / data-flow statement** for institutions — the thing that
  lets a wellbeing team clear Cowch without a heavy DPIA, because there's no
  student data to process.
- A **campus on-ramp** for Mandy's talks: a scannable, attributable link/QR
  straight into the app, and a simple printable card. Use
  `cowch.app/?utm_source=surrey-talk` — that attributes both natively in Vercel
  *and* in our telemetry `source` property (see below).
- A **warm welcome for shared/invited arrivals** — a recipient shouldn't land
  cold in the chat; "someone thought this might help you," once, then in.
- A **gentle, once-only share nudge** after a genuinely good moment.
- **Install & preview polish** — real screenshots (the manifest references some
  that 404), confirm the social card renders everywhere.
- A **light, consent-aware way to capture feedback/testimonials** from early
  users and the pilot.
- **Make the chat system prompt load reliably (tech debt).** `api/chat.js`
  fetches the prompt base over HTTP from a public `.txt`, which Vercel
  edge-caches — so prompt edits silently don't go live unless you **bump the
  filename version** (`…-enhanced.v2.txt` → `v3`, and update the fetch in
  chat.js). For a claims-sensitive app, a prompt fix that silently doesn't deploy
  is a real risk. Proper fix: load the prompt from a bundled module (no HTTP, no
  public exposure). Until then, version-bump on every prompt edit.
- **Telemetry — ✅ first pass shipped (13 Jun 2026).** Validation signals now flow
  to Vercel Web Analytics (privacy-safe, no message/journal content): `chat_started`,
  `exercise_open`/`domain_open`, `returned` (coarse bucket), `install_banner_shown`,
  `install_guide_opened`, `pwa_installed`, `share` — each carries a first-touch
  `source` from `?ref=`/`utm_source`. **Follow-up:** the exercise & IMAGINE pages
  themselves have *no* analytics (only 6/32 even load `activity-log.js`), so we
  currently see *opens from the app* but not page-views or completions on those
  pages. Lighting them up (a shared snippet + a completion event) is the next
  increment if the open-rate signal proves worth deepening.

## Directions to move in  *(the longer arc — keep pulling toward these)*

- **Own the position:** real therapist, *not* AI therapy, private by design —
  turn the AI-therapy backlash into the brand's trust advantage.
- **Universities as a repeatable channel:** Surrey first → a portable pilot
  playbook → other local / Mental-Health-Charter universities.
- **Mandy's audience as the compounding engine:** a sustainable content cadence
  in her voice (blog → email → social), seeding everything else.
- **Earn an evidence trail** from pilots over time — modest and honest — since
  that's exactly what the paid incumbents lean on and Cowch currently can't claim.
- **The ethical deep-end:** Cowch as a warm, honest bridge to real human help,
  including Mandy's own 1:1 practice.
- **Practitioner referrals** as a slow, compounding layer alongside everything.

---

## Only a human can do these (Tom / Mandy)

- ~~Turn on **Vercel Web Analytics** in the dashboard~~ ✅ DONE (13 Jun 2026) —
  enabled + redeployed; `/_vercel/insights/script.js` serves on cowch.app. Page
  views flow now; custom events (`pwa_installed`, `share`) display under Analytics
  → Events (account is on the Pro plan, so custom events are supported).
- Mandy's **warm seed** — the blog post + email to her list, in her words.
- Confirm the **Surrey contact + a talk date**, and whether the pilot runs via a
  talk, a society, or the wellbeing service (loop in Psychology for a measure).
- Prime the **social-preview caches** after any card change (debugger links in
  `docs/sharing-and-marketing.md`).

_Keep this file honest: as directions get decided or things get built, update it
so it stays the shared picture — not a stale checklist._
