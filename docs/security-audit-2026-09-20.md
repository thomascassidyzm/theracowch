# theracowch — security audit 2026-09-20

Astra (GPT-6) cold-read the server surface without seeing the repo; every claim below was
re-verified against the live code by tracing the actual path, not by reasoning about
plausibility. One line per finding: severity, claim, verdict + evidence, what was done, and
(for fixes) the test that proves it. All tests: `npm test` → `node --test "test/**/*.test.mjs"`,
20/20 passing. Each of the six tests below that touches pre-existing code was run against the
pre-fix version of that file (temporarily reverted, then restored byte-for-byte) and confirmed
to fail there and pass post-fix.

## Findings

1. **High — Anonymous writes allow persistent storage/cost abuse (nda-sign, push/subscribe).**
   CONFIRMED. `api/nda-sign.js` and `api/push/subscribe.js` had no rate limit at all, and
   `nda-sign.js`'s `signatureDataUrl` had no size cap beyond a `data:image/` prefix check
   (`api/nda-sign.js:51`, pre-fix). FIXED: both routes now go through
   `lib/request-gate.js`'s `checkRateLimit` (10/10min for nda-sign, 20/10min for
   push/subscribe — generous, since a real user does either a handful of times ever), and
   nda-sign caps `signatureDataUrl` at 200KB and `ndaVersion` at 100 chars.
   Proof: `test/nda-sign-size-cap.test.mjs` (oversized signature → 413, not stored).

2. **High — Attacker-controlled push destinations = stored SSRF (push/send → web-push).**
   CONFIRMED. `web-push`'s `sendNotification` POSTs the encrypted payload directly to
   `subscription.endpoint` with no destination validation of its own — that's what the
   library does with any HTTPS URL it's handed (verified against the library's documented
   behaviour; it is a thin wrapper over an HTTP request to the given endpoint). `api/push/subscribe.js`
   stored any `subscription.endpoint` verbatim. FIXED: new `lib/push-endpoint-allowlist.js`
   validates the endpoint is HTTPS and on a real push-service host (fcm.googleapis.com,
   android.googleapis.com, updates.push.services.mozilla.com + `*.push.services.mozilla.com`,
   web.push.apple.com, `*.notify.windows.com`) at subscribe time, before Redis is touched.
   Kept generous deliberately — a too-tight list silently kills reminders for a whole browser
   vendor, worse than the risk it guards against.
   Proof: `test/push-endpoint-allowlist.test.mjs` (unit tests on the allowlist) +
   `test/push-subscribe-endpoint.test.mjs` (handler rejects an attacker endpoint, 400, no write).

3. **High — Per-IP spend gate has no aggregate ceiling (chat, compress-profile).**
   CONFIRMED. `lib/request-gate.js`'s `checkRateLimit` was per-IP only; many distinct IPs (or
   preview-origin traffic) had no bound on total Anthropic spend. FIXED: new
   `checkGlobalDailyLimit(bucket, dailyLimit)` — one shared UTC-daily Redis counter per bucket,
   same fail-closed posture as the per-IP limiter, wired into `gate()` via a new `dailyLimit`
   option on `LIMITS`. Set to 3,000/day for chat and 1,000/day for compress. **Assumption
   documented in code** (`lib/request-gate.js`): this is an early-stage app, not yet at
   mass-market volume; these numbers are ~500x a genuinely busy single user's daily chat
   volume and track the existing 1:8 chat:compress ratio — a normal day should come nowhere
   near them, while a real spike (press mention, a class pointed at it) could plausibly
   approach one. If real traffic ever gets close, that's the signal to revisit, not evidence
   the number was wrong — a 429 here just says "try again tomorrow" and charges no one.
   Proof: `test/global-daily-cap.test.mjs` (fails closed with no Redis configured; `LIMITS`
   carries `dailyLimit` for both buckets).

4. **Medium — Unset CRON_SECRET exposes /api/push/send.** CONFIRMED as a real prior
   vulnerability, but **already fixed before this session** in commit `085239e` (2026-09-20,
   same day): the guard used to be `if (cronSecret) { ...check... }`, which skipped the bearer
   check entirely when the env var was absent — and it was in fact absent from Vercel
   production at the time. That commit flipped it to fail closed (503 when unset) and added
   `test/push-send-guard.test.mjs`, which still passes. **No further action taken here** beyond
   verifying the fix holds. Astra's secondary suggestion ("enforce GET") was not applied: the
   bearer-secret check already gates every method equally, so a non-GET request with the wrong
   or missing secret is refused the same as a GET one — there's no described exploit path left
   to close by adding a method check.
   ⚠️ **Needs Tom**: the commit message asserts `CRON_SECRET` is now set in Vercel production —
   this audit cannot see Vercel env vars and could not independently confirm it. If it is not
   actually set, `/api/push/send` now refuses every request (fails closed, per design) and
   reminder pushes silently stop rather than being insecure — confirm the var is set.

5. **Medium — One malformed subscription can abort reminder dispatch (push/send).** CONFIRMED.
   `matchSlot()` ran `time.split(':')` on whatever the client sent (e.g. `{on: true, time: 1}`
   from a malformed/legacy client write), which threw and — because it was outside any
   try/catch in the dispatch loop — aborted the *entire* cron run, silently dropping every
   remaining subscriber in `Set` iteration order after the bad one. FIXED: `matchSlot` now
   requires a bounded `HH:MM` string (`^([01]\d|2[0-3]):[0-5]\d$`) and skips (not throws) a
   malformed slot.
   Proof: `test/push-send-matchslot.test.mjs` (non-string and out-of-range times don't throw
   and don't match; a well-formed time still matches).

6. **Medium — Non-string AI inputs bypass field limits (chat, compress-profile).** CONFIRMED,
   with the specific mechanism verified rather than assumed: `chat.js`'s length check was
   `typeof message === 'string' && message.length > 4000` — a non-string (e.g. an
   Anthropic-compatible array of content blocks) is truthy, so `!message` doesn't reject it,
   the length check is skipped because `typeof` fails the `&&`, and the array is then pushed
   verbatim into `messages` at `messages.push({ role: 'user', content: message })` (pre-fix
   `api/chat.js:596`) — which Anthropic's Messages API accepts as valid `content`, so this
   *would* have reached the billed call, and only failed afterwards at
   `message.toLowerCase()` (pre-fix line 683). The size check also excluded `message` itself
   from the serialised-size fallback. `compress-profile.js` had no non-string guard at all.
   FIXED: new shared `lib/text-field-guard.js` (`checkTextField`) requires a string and caps
   length in both handlers; `message` is now included in `chat.js`'s `tooBig` check; a
   matching `tooBig` check was added to `compress-profile.js` (it previously had none).
   Proof: `test/chat-message-type.test.mjs` (unit tests on the shared guard: non-string → 400,
   over-length → 413, valid → pass).

7. **Medium — NDA signatures amplify storage/export exhaustion.** CONFIRMED for the unbounded
   field (no size limit on `signatureDataUrl`, no cap on `ndaVersion`); REFUTED for the
   execution/XSS framing — the endpoint returns JSON and nothing in this repo renders a stored
   signature as an image or markup, so no SVG/HTML-execution path is demonstrated. FIXED as
   part of item 1 above (200KB signature cap, 100-char `ndaVersion` cap). Export pagination
   (the other half of Astra's suggested fix) was **not** added — it's a genuine improvement but
   a larger, un-scoped change (pagination touches the shape of the export response that
   Mandy/Tom's tooling reads); noted here rather than made unilaterally.

9. **Low — NDA exports lack explicit no-store.** CONFIRMED. `api/questionnaire-report.js`
   already sets `Cache-Control: no-store, max-age=0`; `api/nda-export.js` set nothing, so the
   project-wide `public, max-age=0, must-revalidate` default (`vercel.json`) applied to a
   response carrying personal data. FIXED: same header added to `nda-export.js`, set
   unconditionally at the top of the handler so it's present on every response including the
   405/503/401 error paths.
   Proof: `test/nda-export-cache-header.test.mjs` (405 response still carries `no-store`).

14. **Tidy-up — dead fetch in blog-quotes.js.** CONFIRMED and fixed. The handler fetched
    `https://www.thoughtsonlifeandlove.com/sitemap.xml`, discarded the response, and returned a
    hardcoded quotes array regardless — the fetch result was never used, and a failed fetch
    just fell through to the same catch block with the same fallback quotes. Removed the fetch
    entirely; behaviour is unchanged (same quotes returned), one fewer outbound network call
    and dependency on a third-party site's uptime per request. No test added — this is a pure
    dead-code removal with no branching behaviour to prove; verified by reading the diff (the
    returned JSON shape and content are byte-identical to before).

## Verified but out of scope to fix (recorded per the brief)

- **8 — Export secrets in URLs / non-constant-time comparison.** CONFIRMED as described
  (`req.query.token !== expected` is a plain string comparison; the token rides in the URL).
  REFUTED: no authentication *bypass* is shown — both export handlers fail closed with no
  token configured, and a wrong token is rejected. Recorded, not fixed — reworking auth
  transport (header vs query) is a genuine design change, not a small patch.
- **10 — Client-controlled context can redirect model behaviour (prompt injection via
  profile/history/questionnaire).** CONFIRMED as a real property of any LLM system prompt built
  from user-influenced context; REFUTED that it grants any capability beyond redirecting the
  reply — no tool access, no secrets in context, no other user's data reachable. This is a
  product/prompt-design question (and prompt text is explicitly out of scope for this pass),
  not a small code fix.
- **11 — Push subscription changes rely on possession of the endpoint.** CONFIRMED — anyone
  who has a victim's `subscription.endpoint` can rewrite their prefs or unsubscribe them via
  `/api/push/subscribe` / `/api/push/unsubscribe`; no enumeration path is shown, so this
  requires already having the specific endpoint value. Recorded — a real fix needs a
  per-install credential, which is new surface, not a scoped patch.
- **12 — Raw exception messages in error responses.** CONFIRMED — several handlers (`nda-sign`,
  `nda-export`, `questionnaire-report`, `push/subscribe`, `push/unsubscribe`, `push/send`,
  `courses`) return `err.message` in `detail`. Not fixed here: swapping to generic errors with
  server-side-only detail touches every handler's error path uniformly and is a broader change
  than this pass's scope; flagged for a dedicated small PR.
- **13 — Limiter reliability / proxy trust.** CONFIRMED in part: `INCR` and the first-hit
  `EXPIRE` in `checkRateLimit` (and the new `checkGlobalDailyLimit`) are two separate Redis
  calls, so a crash between them could in principle strand a permanent counter key (in
  practice: Upstash's REST calls are short single HTTP round-trips, so the window for that is
  small, and the existing code already accepted this trade-off — the audit does not judge it
  new to this pass). REFUTED as stated: `x-forwarded-for` trust and IP-spoofing exploitability
  depend on how Vercel's edge sets that header for external requests, which this audit —
  reading only the pasted/repo code — cannot establish either way. Not fixed: this is
  infrastructure-trust verification, not a code change.

## Tom fork — recorded, not deleted

- **`api/courses.js` deletion candidate.** Reads `public/vfs/courses/` (the SSi course-pipeline
  VFS format: `seed_pairs.json`, `lego_pairs.json`, `baskets_deduplicated.json`, `course.json`)
  and looks unrelated to the wellbeing app. **Evidence gathered, not deleted, per scope**:
  `grep -rn "api/courses\|vfs/courses" public/*.html public/app.html public/assets/js/*.js`
  returns zero hits — nothing in the client (`public/`) calls this endpoint or references its
  path. Only `api/courses.js` itself mentions `vfs/courses` (in its own comments/code). Its own
  git history (`git log -- api/courses.js`) shows one commit, "Add course manifest API and
  update dashboard to display courses" — but no dashboard page in the current repo calls it.
  This reads as orphaned, but deletion is Tom's call per the brief.

## Needs Tom

- **CRON_SECRET** (item 4): confirm it is actually set in Vercel production. The fail-closed
  guard already landed (commit `085239e`, this session inherited it) — if the var is missing,
  push reminders silently stop rather than being insecure, which is the intended trade-off, but
  worth confirming it's not *unintentionally* stopped.
- **`api/courses.js`** (Tom fork above): delete or keep — evidence above, decision is yours.
- **Item 8** (export token transport): worth a small follow-up (Authorization header +
  constant-time comparison + rotated tokens) if/when there's appetite for a dedicated pass.
- **Item 11** (push subscription possession-based auth): worth a follow-up if push reminders
  become a higher-value target; needs a per-install credential, which is new surface.
- **Item 12** (raw `err.message` in responses): worth a dedicated small PR across all the
  listed handlers, uniformly, rather than piecemeal.
