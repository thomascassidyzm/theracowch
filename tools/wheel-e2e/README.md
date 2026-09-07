# Wheel end-to-end harness

Drives the real flow — the "What are you like, anyway?" results page → the wheel build →
`api/wheel.js` — in a headless phone-sized browser, and asserts the thing that matters:
**what the person types is what is stored, byte for byte.**

There is no build step and no test runner in this repo; this is three plain node scripts.

## Running it

1. A stub for `@upstash/redis` (the real client needs a live store). Create it in the
   worktree's untracked `node_modules`:

   ```
   mkdir -p node_modules/@upstash/redis
   ```
   with a `package.json` (`{"name":"@upstash/redis","type":"module","exports":"./index.js"}`)
   and an `index.js` exporting a `Redis` class backed by a `Map`, plus the `_store` Map —
   `get/set/del/incr/expire/sadd/srem/smembers` is the whole surface used.

2. `KV_REST_API_URL=http://stub KV_REST_API_TOKEN=stub node tools/wheel-e2e/server.mjs`
   — serves `public/` on :4599, routes `/api/wheel` to the real handler, and exposes
   `/__store` so a test can see exactly what reached storage.

3. `node tools/wheel-e2e/e2e.mjs` and `node tools/wheel-e2e/e2e2.mjs`. They need Playwright;
   point the import at any checkout that has it.

**Restart the server between runs** — the stub store is in memory and a leftover record makes
the "exactly one record" assertions lie.

## What each one covers

`e2e.mjs` — the handoff link on the ranked results page; landing straight in the build with
`?from=wayl`; the three statements plus the own-words door; a deliberately messy sentence
(leading spaces, no capital, an emoji) surviving verbatim to the server; "that's enough"
finishing on two spokes; the wheel quoting the words back; a wiped local copy being restored
from the server; delete removing the server record and the id.

`e2e2.mjs` — the single-choice variant handing off too; an empty own-words box being refused
rather than silently filled with one of our sentences; an over-long line being refused on its
own spoke with the reason, text untouched; going offline mid-wheel saying so plainly and the
spoke reaching the server on the next save.

The harness rewrites the browser's `Origin` to `https://cowch.app` because the real lock never
allows localhost. The lock itself is checked with a curl carrying a hostile origin.
