# Cowch — marketing & launch worklist

**For:** Claude Code (web) working autonomously. **Owner:** Tom (AFK).
**Read first:** `docs/marketing-strategy.md` (the full strategy + sources),
`docs/sharing-and-marketing.md` (share/install mechanics already shipped), and
`CLAUDE.md` (how this repo deploys — there is **no build step**; only files in
`public/` and `api/` reach the live site; you work on a `claude/*` branch and the
auto-merge workflow ships it to `cowch.app`).

**The mission right now:** a careful, mission-led **soft launch to validate**,
with a beachhead of **UK university students** — Mandy Kloppers (a real
BABCP-accredited therapist) is going into the **University of Surrey** (Guildford,
local to her) in person. Free for students; no rush to monetise.

---

## ⚠️ THE CLAIMS GUARDRAIL — applies to EVERY user-facing word you write

Cowch must stay a **non-clinical wellbeing product**. Under MHRA 2025 guidance,
software becomes a *regulated medical device* based on **what it claims**; the
ASA bans treat/cure claims; Illinois bans advertising "AI therapy". So in any
copy you touch (app, pages, meta tags, share text, images, READMEs):

- **NEVER use:** "therapy", "AI therapist", "treat(ment)", "cure", "diagnose",
  "assess", "screen", "monitor your depression/anxiety", "digital CBT for
  [condition]", "stops panic attacks", or anything framing Cowch as a friend to
  confide in *instead of* people. **Cowch is 18+.**
- **ALWAYS prefer:** "wellbeing companion / support / space", "built by a real
  therapist", "CBT- and ACT-**informed** exercises", "reflect / notice / a calmer
  moment", and keep **"not a replacement for therapy"** + crisis routing visible.

If a task would require crossing this line, STOP and leave a note instead.

---

## How to work

1. One task (or a small related batch) per `claude/*` branch; let the auto-merge
   workflow ship it. Allow a minute or two for merge + Vercel deploy.
2. If you change anything served/precached (in `public/`), **bump `CACHE_NAME`
   and `BUILD_DATE` in `public/sw.js`** (see CLAUDE.md).
3. Verify by reading the actual shipped file. There's no test suite.
4. Tick a task here (`[x]`) in the same commit that completes it, so the list
   stays the source of truth.
5. Docs at repo root / in `docs/` are **not** served — safe to edit freely.

---

## P0 — Protective. Do this FIRST.

- [ ] **1. Claims audit of all live copy.** Scan `public/app.html`,
  `public/about.html`, `public/privacy.html`, `public/terms.html`,
  `public/vision.html`, `public/manifest.json`, `public/assets/js/share.js`
  (share text), the OG/Twitter meta tags in `index.html`/`app.html`, and the
  `og-image.src.svg` copy — against the guardrail above. Fix any wording that
  treats Cowch as therapy/treatment/diagnosis. Keep "not a replacement for
  therapy" and crisis routing prominent. **Acceptance:** a short report of what
  was found + changed (add it as `docs/claims-audit.md`), and zero banned terms
  used as claims in shipped copy. Bump `sw.js` if you change served files.

---

## P1 — Surrey pilot enablement (the beachhead)

- [ ] **2. "For universities" pilot page.** Create a clean, on-brand standalone
  page `public/for-universities.html` (do NOT add it to the main app nav — it's a
  link Mandy shares directly). Content = the copy-ready one-pager in
  `docs/marketing-strategy.md` → **Appendix A**, lightly styled to match the
  site (warm palette, the cow brand). Make it printable (sensible print CSS).
  **Acceptance:** loads at `/for-universities.html`, reads as a credible pilot
  pitch, obeys the guardrail (it already does — keep it that way), links to
  `cowch.app` and `mailto:contact@thoughtsonlifeandlove.com`.

- [ ] **3. One-page privacy / data-flow statement (the DPIA-killer).** Create
  `public/privacy-for-institutions.html` — a single page a university wellbeing
  team can clear quickly: plain-English data-flow (journals/chat stay **on the
  student's device**; the university processes **no** student data; messages go
  to the AI provider only to generate a reply, not stored long-term), pitched as
  "why endorsing Cowch needs no heavy DPIA". Mirror `public/privacy.html` facts;
  keep it to one screen. **Acceptance:** loads, accurate to the real architecture
  (don't overclaim), links back to the full `privacy.html`.

- [ ] **4. QR code + printable card for Mandy's campus talks.** Generate a
  scannable QR to `https://cowch.app/?ref=surrey-talk` (a source tag so installs
  from talks are attributable). Save the QR as `public/qr/surrey-talk.png` (and
  the generator approach noted in a small `public/qr/README.md`). Build a simple
  printable A5/A6 "scan to try Cowch" card as `public/qr/talk-card.html` using the
  cow brand + one guardrail-safe line ("A calmer space in your pocket — built by a
  real therapist"). **Acceptance:** QR scans to the tagged URL; card prints
  cleanly. (If no QR tooling is available, encode via a well-known QR image
  approach or an SVG QR — just make it real and scannable.)

---

## P2 — Growth mechanics & polish

- [ ] **5. Warm invite landing for shared links.** A recipient from a shared link
  currently drops straight into the chat. Add a light, dismissible first-run
  welcome for `?ref=*` / first visits — "Someone thought Cowch might help you" →
  one tap into the app + the existing install nudge. Reuse `window.CowchInstall`.
  Keep it gentle and guardrail-safe. **Acceptance:** new visitors via a ref link
  see the warm welcome once; returning users don't.

- [ ] **6. Gentle one-time share nudge.** After a genuinely positive moment (e.g.
  completing an exercise or a good check-in), show a once-only, easily-dismissed
  "loving Cowch? share it with someone" prompt that calls
  `window.CowchShare.share()`. Store a `localStorage` flag so it never nags.
  **Acceptance:** fires at most once ever; never blocks the UI.

- [ ] **7. Fix the manifest screenshots 404.** `public/manifest.json` references
  `/screenshots/mobile-1.png` and `/screenshots/desktop-1.png` which don't exist.
  Capture/produce real screenshots of the app (home/chat + a domain page) at the
  declared sizes (375×812 narrow, 1280×800 wide) and save under
  `public/screenshots/`. If you can't run the app to screenshot it, generate
  honest brand-consistent mockups rather than leaving 404s — and note which.
  **Acceptance:** both URLs return 200; manifest validates.

---

## Manual — needs Tom or Mandy (NOT for the agent)

- [ ] **A. Enable Vercel Web Analytics** in the dashboard (Project → Analytics →
  Enable) — otherwise the cookieless analytics we shipped (page views +
  `pwa_installed` / `share` events) silently drop.
- [ ] **B. Prime social preview caches** after any OG change: run `cowch.app`
  through the Facebook / Twitter / LinkedIn debuggers (links in
  `docs/sharing-and-marketing.md`).
- [ ] **C. Mandy: warm seed** — blog post + email to the list (her words), soft
  and honest. This is the first channel; everything else leans on it.
- [ ] **D. Surrey: confirm the contact + a talk date** — the Centre for Wellbeing
  owner, and whether to run the ~50-student pilot via a talk / society / the
  wellbeing service. Loop in the School of Psychology for a pre/post measure.

---

## Pointers
- Full strategy & rationale: **`docs/marketing-strategy.md`** (incl. the Surrey
  plan and the copy-ready pilot one-pager in Appendix A).
- Share/install mechanics already live: **`docs/sharing-and-marketing.md`**.
- Future native app-store copy: **`docs/store-listing.md`**.
- Deploy/architecture rules: **`CLAUDE.md`**.
