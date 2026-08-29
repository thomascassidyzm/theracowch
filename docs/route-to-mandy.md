# The route to Mandy — live

*29 August 2026. What was built, what Mandy will see, what she can't see, and the three
calls that are yours. Everything below is on `main` and deployed to cowch.app unless it
says otherwise.*

---

## The shape of it, in one paragraph

A person finishes "What are you like, anyway?" on their phone. At the bottom of their
results there is now a panel that asks whether they'd like to send those results to
Mandy. If they tap it, they're told in plain words what would go and what wouldn't, they
type a name for her to put to it, and they tap send. That POST is the only route by which
anything from a questionnaire has ever left a device. It lands in the same Upstash store
the signed NDAs use, and Mandy opens one URL on her phone to read the lot as cards. If
nobody taps the button, nothing goes anywhere — there is no beacon, nothing default-on,
nothing in the background.

## What's live now

**Five things landed, in this order.**

**1. Thirty-nine pages of telemetry that was dead now works.** The scout's headline
finding was that `exercise_engaged` and the four `imagine_guide_*` events had been
written, guarded and never fired — the 32 exercise pages and 7 IMAGINE pages never loaded
the analytics script, so the tracking function didn't exist there and every call
evaporated. They load it now. No new events and no new properties: it finishes
instrumentation we'd already paid for. This also closes the standing worklist item.

**2. An attribution hole nobody had spotted is closed.** The consent script that went in
on 27 August captures the first-touch `?ref=` / `?utm_source=` label — but that block sat
*below* the "already consented, bail out" early return. So a `?ref=mandy` arrival only
ever got recorded for people who had **not** yet agreed. Everyone returning, and everyone
who reached a questionnaire through the app, silently lost the label. Since that label is
the only thing telling us a result came from Mandy's audience, it now runs before the
early return.

**3. The "room of 100" wording was already fixed — I checked rather than redid it.** The
uncommitted audit at the repo root flagged six places where the population framing was
applied to all six axes, when Sensitivity and Risk appetite have no comparison
population. All six were already fixed on `main` on 6 August, by the commit that made the
framing conditional on each axis's own scale. I checked each one line by line, filed the
audit under `docs/wording-audit-what-are-you-like.md` with a resolution table, and the
report page inherits the same rule. **One thing in it is genuinely open and not fixed by
that commit:** whether "Sensitivity", as this questionnaire reframes it, still earns the
population norms it borrows from neuroticism. That's a question about the instrument, not
the copy.

**4. `api/questionnaire-share.js` — the receiving end.** The NDA endpoint's pattern on the
same provisioned store. It refuses anything without an explicit `consented: true`, stamps
the timestamp server-side so a device with a wrong clock can't steer the ordering, and
goes through the existing Origin lock and per-IP rate limit. The record is assembled
field by named field — never by spreading whatever the client posted — so the raw
per-moment answers, the free-text notes from the honest exit, and the wellness wheel
harvest have nowhere to land even if a client sends them.

**5. `api/questionnaire-report.js` — the page Mandy opens.** Same shared-secret shape as
the NDA export, with the one difference that is the whole point: it returns an HTML page,
not JSON. One card per person, newest first: the name they gave, when it arrived, which
variant, how many moments they answered, the source label, and the six axes drawn as
bars. Population axes read "roughly 58–79 of 100"; Sensitivity and Risk appetite read as
a 0–10 dial marked "own scale, not a percentile". One honest line at the top says what it
is — self-reported, an indication and not a measurement, not a clinical instrument. Raw
JSON is still there behind `&format=json` for you.

## What Mandy will see, and what she won't

**She will see:** who sent it (the name they typed), when, which variant of the
questionnaire, how many moments they answered, whether they came via her link, the six
scored axes with confidence, and the one-line write-up for each axis — the same sentences
they read on their own screen. And their email, if they chose to give one.

**She will not see:** anybody who didn't tap the button. Anything anyone typed. Their
individual answers moment by moment. Their wellness wheel. Any behavioural record of what
they did in Cowch afterwards — that doesn't exist anywhere in the system, on purpose, and
the scout's Part 2 is the honest account of why no dashboard will ever produce it. A
tester cohort is not a population, and Vercel's analytics is cookieless by design.

## The one thing standing between here and Mandy having it

**`QSHARE_EXPORT_TOKEN` is not set, and only you can set it.** It's a new Vercel env var —
deliberately not the NDA token, so it's separately revocable — and until it exists the
report endpoint answers **503**. That's the correct fail-closed behaviour, not a bug:
no token, no door. Set it to any long random string, then the URL is
`https://cowch.app/api/questionnaire-report?token=<that string>`.

I have not sent Mandy anything, and the token is nowhere in the repo, in this document,
or in my report. Handing her a live link with real people's results on it is your call.

## Three calls that are yours — each answerable in a word

**1. The payload.** I send the six scored axes and the sentences, and deliberately not
the raw per-moment answers, not the free-text notes, and not the wheel harvest. That's
the taste-safe default and it follows the scout's firm recommendation on the wheel. But
Mandy may well say the raw answers are the clinically interesting part — a scored axis is
a summary, the answers are the evidence. If she wants them, it's one field in two files.
**Keep as is, or add the answers?**

**2. Identity.** A nameless card helps her with nothing, so a name is required and the
person types whatever they'd want her to see; email is optional. You may want it
anonymous instead, or the email required so she can actually reply. **Name required as
built, anonymous, or email required too?**

**3. Retention.** The NDA precedent sets no expiry at all — those records live forever. I
did not silently inherit that: shared results carry a **12-month TTL**, long enough for
her to look back over a year of her own referrals and short enough that this never
quietly becomes a permanent database of people's personality results. Expired ids are
pruned from the index on read. **12 months, or a different window?**

## The honest gaps

- **I could not test the live round trip end to end.** Verifying that a share actually
  writes a record needs the report token, which only you can set, and posting a real
  result would put test data in front of Mandy. Both endpoints were checked for the
  behaviour that can be checked from outside: the report endpoint answers correctly with
  no token, and the page's rendering was exercised offline against a real band shape,
  including an axis with a missing dial value, with escaping verified. The first real
  share will be the shakedown.
- **No Upstash credentials on this machine** — same gap the scout reported. I read the
  code; I did not read the store.
- **The exercise and IMAGINE events are now wired, but no event has been observed
  arriving.** That needs one look at the Vercel dashboard by someone logged in.

## What was deliberately not touched

The questionnaire's substance, its scoring, the wheel, the app's consent architecture,
and the claims line. The share copy stays the non-clinical side of it: Mandy looks at
these to see how people are getting on with Cowch, it is not a clinical assessment, and
sending it is not booking an appointment or asking for a reply.
