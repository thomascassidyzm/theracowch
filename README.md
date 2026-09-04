# Cowch (theracowch)

A non-clinical wellbeing companion app — a plain static site plus a handful of
Vercel serverless functions. There is no build step, no bundler, and no
framework compile; the files served in production are the files in this repo.

## Stack

- Static HTML/CSS/vanilla JS (`public/`) — no framework build
- Tailwind referenced where used, but with **no Tailwind build step wired up**
  (`tailwindcss` is a dev dependency only)
- Vercel — static hosting + serverless functions (`api/`)
- `@upstash/redis` — the only datastore (NDA records, questionnaire reports,
  push subscriptions)
- `web-push` — server-side push notifications

No Clerk, Supabase, or Stripe — this project has no auth provider, no
separate database, and no payments integration.

## Running it

There's no local dev/build script (`npm test` is a placeholder). Work
directly on the files in `public/` (served verbatim) and `api/` (Vercel
functions), then deploy via Vercel.

## More detail

See **[`CLAUDE.md`](./CLAUDE.md)** for the fuller agent-facing rundown: where
the code lives, the PWA cache/service-worker rules, and the deploy flow.
