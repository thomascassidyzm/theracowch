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
   volume. **Corrected 2026-09-20 (rev 2):** an earlier draft of this paragraph justified the
   numbers by "the existing 1:8 chat:compress ratio". That is the ratio of the PER-IP limits;
   these daily ceilings are 3,000:1,000, which is 3:1. The 3:1 shape is the intended one — a
   day's compression traffic is bounded by conversation length rather than by message count,
   so it does not scale down as steeply as the per-request ratio suggests. Also stated plainly
   because the earlier wording blurred it: these are REQUEST counters, not monetary accounting.
   They bound how many calls can be made, not how much those calls cost; a long conversation
   costs more than a short one and this ceiling cannot see the difference. A normal day should come nowhere
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
   execution/XSS framing: the endpoint returns JSON, and no path renders a signature retrieved
   from the STORE, so no SVG/HTML-execution path is demonstrated.
   **Corrected 2026-09-20 (rev 2):** the supporting sentence originally said "nothing in this
   repo renders a stored signature". `public/nda.html:436` does render a signature into a PDF —
   but the one it renders is the signature captured LOCALLY in that same page, never a value
   read back from Redis. The conclusion is unchanged and the refutation stands; the sentence
   supporting it was too broad.
   FIXED as part of item 1 above (200KB signature cap, 100-char `ndaVersion` cap). Export pagination
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
    entirely, removing one outbound network call and a dependency on a third-party site's
    uptime per request.
    **Corrected 2026-09-20 (rev 2): the claim that behaviour was unchanged is false.** A
    cross-family cold-verify (Astra) ran a pre/post probe with a failing fetch and got **3
    fallback quotes before, 30 curated quotes after**. The old code's catch block returned a
    separate, shorter fallback array whenever the sitemap fetch threw; with the fetch gone,
    that branch is unreachable and every caller now gets the full curated set. The change is
    still right — the new behaviour is strictly better and the old fallback existed only to
    survive a request that bought nothing — but it is a behaviour CHANGE, not an equivalence,
    and the original write-up should not have claimed the output was byte-identical.

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

---

## Rev 2 — 2026-09-20, after a cross-family cold-verify

A GPT-6 (Astra) cold-verify pass was run against this document and the live repo, given the
published evidence only and never this repo's brief or the original worker's reasoning: **13
claims verified, 5 refuted, 3 unknown.** Three of the refutations were real defects in code
that was, by then, LIVE IN PRODUCTION — see the landing note below. They are fixed here.

**The landing note, because the original was wrong through no fault of the worker.** Rev 1
reported "not merged, not deployed". In fact `.github/workflows/auto-merge-to-main.yml` on
`origin/main` triggers on `cs/**` as well as `claude/**`, so the worker branch was auto-merged
to `main` as `32cac49` and Vercel deployed it. Any worker branch pushed in this repo merges and
deploys. That is the repo's own rule and it is not a defect — but a landing line that says
"not merged" in a repo that auto-merges is a false record, and the estate now knows it.

**D1 — the signature size cap was bypassable by type confusion.** `api/nda-sign.js` validated
`String(signatureDataUrl)` but stored the ORIGINAL value, so an array whose first element
carried the `data:image/` prefix coerced to a short, valid-looking string while the stored
value was arbitrarily large; the cold-verify probe got 300,043 bytes through. Fixed: the
signature must be a string before anything measures it, the cap now measures the value that is
actually stored, and a non-string `ndaVersion` is refused rather than coerced.
Proof: `test/nda-sign-type-confusion.test.mjs` — three cases, all observed failing on the
pre-fix code (each reached the Redis write) and passing after.

**D2 — the SSRF fix only covered NEW subscriptions.** `/api/push/subscribe` validated the
destination host, but `api/push/send.js` read whatever was already in Redis and posted to it
unchecked, so any hostile row written before the allowlist landed was still a live blind-SSRF
path. Fixed: one exported `skipReason(rec)` in `send.js` now runs the SAME
`isAllowedPushEndpoint` helper the subscribe path uses — one function, two call sites, so they
cannot drift — immediately before the send. A disallowed destination is COUNTED (`blocked` in
the cron's response) and logged, **not deleted**: deleting an attacker's row would be right,
but deleting a real subscriber's row because a genuine push-service host was missing from the
allowlist would silently kill their reminders forever, so a human looks first.
Proof: `test/push-send-endpoint-guard.test.mjs` — observed failing before `skipReason` existed,
passing after.
**Honest gap: the stored-record population is UNAUDITED.** The cold-verify could not inspect
live Redis — local credentials were empty and Vercel supplied no usable pair — so nobody knows
whether any hostile subscription rows actually exist. No hunt for live credentials was made.
The send-time check is what makes that safe regardless of what is in there.

**D3 — two write-ups that did not match the code**, corrected in place above: the daily-ceiling
justification (the 1:8 ratio belongs to the per-IP limits; the ceilings are 3:1, and they count
requests rather than money), and the blog-quotes equivalence claim (3 fallback quotes before,
30 curated after — a better behaviour, but a change).

**Test coverage the first pass claimed but did not have.** Added
`test/global-daily-cap-exhaustion.test.mjs`, which drives the ceiling to exhaustion and asserts
it refuses with 429 and keeps refusing. This required a small test seam — `checkGlobalDailyLimit`
now takes an optional Redis client, defaulting to the module-level one, so exhaustion can be
driven without a live Redis. The existing test only proved the function fails closed when Redis
is ABSENT, which is the easy half; a spend ceiling nobody has watched refuse is a ceiling nobody
should trust. Observed failing on the pre-seam code, passing after.
