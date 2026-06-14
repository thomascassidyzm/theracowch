# CLAUDE.md

## Start here (every session)

Read **[`WORKLIST.md`](./WORKLIST.md)** (repo root) — the shared, multi-agent "what's
next" for this repo (directions / things to build / areas to think through). Before
starting anything substantial, **claim your item there** (`[ ]`→`[~] @you MM-DD`, a
one-line commit) so parallel agents don't double-grab it; the full protocol is in its
header. It sits on top of the deploy rail below.

> ⚠️ **Hard rail — the claims line.** Cowch is a **non-clinical wellbeing product**.
> Never frame it (in copy, the app, meta tags, or the chat prompt) as therapy / a
> therapist / treatment / diagnosis / "CBT for [a condition]". Use "wellbeing
> companion, built on a real therapist's approach, CBT/ACT-informed, *not* a
> replacement for therapy", with crisis routing to humans; 18+. The chat system
> prompt lives in **`lib/prompt-base.js`** (bundled — edit there, not a public file).
> Why: `docs/marketing-strategy.md` §3 + `docs/claims-audit.md`.

## What this project actually is

A **plain static site** plus a handful of **Vercel serverless functions**.
There is **no build step, no bundler, and no framework compile** — the files
that ship are the files in the repo. Edit them directly.

> Note: there is no Vue/Vite/TypeScript build here despite what older notes may
> have said. `package.json` has no `build` script; there is no `src/`, no
> `*.vue`, no `vite.config`, and no `tsconfig`. If you "fix" something by
> creating Vue components or a `src/` tree, **nothing will change on the live
> site** — those files are never built or served.

## Where the code lives (and what gets served)

- **`public/` is the web root.** Vercel serves it verbatim (it's the default
  output directory when there's no build). A change only reaches users if it
  lands in `public/` (or `api/`).
  - `public/app.html` — the entire app. One large hand-written HTML file with
    inline `<script>`/`<style>`. The home/chat UI lives here.
  - `public/assets/js/*.js` — plain browser JS (`app.js`, `activity-log.js`,
    `pwa-install.js`, `therapy-profile.js`). No modules build; loaded by tag.
  - `public/assets/css/`, `public/assets/*.js` — styles and helper scripts.
  - `public/index.html` redirects to `/app.html`. Other top-level pages:
    `about.html`, `privacy.html`, `terms.html`, `accessibility.html`,
    `vision.html`, `offline.html`.
  - `public/sw.js` — the PWA service worker. `public/manifest.json` — PWA
    manifest.
- **`api/` — Vercel serverless functions** (`chat.js`, `courses.js`,
  `compress-profile.js`, `blog-quotes.js`, `api/push/*`). Node, deployed by
  Vercel as functions at `/api/...`.
- The root `index.html` is **not** the served entry (Vercel serves `public/`).
  Don't edit it expecting a visible change.

There is no test suite (`npm test` is a placeholder) and nothing to compile —
verify changes by reading the file you actually ship and, where possible,
loading the page.

## Stack

- Static HTML/CSS/vanilla JS (no framework build)
- Tailwind is referenced where used, but there is **no Tailwind build step** —
  don't rely on regenerating a compiled stylesheet.
- Vercel (static hosting + serverless functions)
- Clerk (auth), Supabase (database), Stripe (payments), Upstash Redis,
  web-push (server-side deps in `package.json`)

## The PWA cache — why a deployed change may not appear on a device

The app installs a service worker (`public/sw.js`) that caches under a
**manually bumped** `CACHE_NAME` (e.g. `cowch-wellness-v120`). Two rules:

1. **Bump `CACHE_NAME` (and `BUILD_DATE`) in `public/sw.js` whenever you change
   precached assets or want a clean cache.** Forgetting this is a common reason
   a real deploy doesn't show up.
2. A new service worker intentionally does **not** auto-activate. It waits until
   the user taps the "new version available" banner or force-quits the app —
   this is deliberate so the user controls when they update. **Do not change
   this to auto-skip-waiting.** It means *you* won't see your own change on an
   installed PWA until you tap update / force-quit / use Settings → clear cache.

To confirm which build a device is running, check the version stamp in Settings
against `CACHE_NAME`/`BUILD_DATE` in `public/sw.js`.

## Deployment

Claude Code works on a `claude/*` branch and pushes it. The
`.github/workflows/auto-merge-to-main.yml` workflow merges `claude/*` branches
into `main`; Vercel auto-deploys `main` to production. The workflow is
serialized (a `concurrency` group) and retries its push, so parallel sessions
don't race-drop each other — but a **genuine merge conflict fails the workflow
loudly** and must be resolved by hand (the branch's changes won't reach `main`
until then). After pushing, allow a minute or two for the merge + Vercel deploy.
