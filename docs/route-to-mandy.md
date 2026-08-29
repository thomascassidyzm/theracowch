# The route to Mandy — live

*29 August 2026. Rewritten after Tom's mid-run correction: Mandy is the AI companion inside
cowch.app, not a human reading a page. Everything below is on `main` and deployed to
cowch.app unless it says otherwise.*

---

## The shape of it, in one paragraph

Someone finishes "What are you like, anyway?" on their phone. Their results are already on
that device — the same origin the app runs on. So when they next chat, the app hands Mandy
the six scored results along with the message it was already sending, and she has a little
background instead of starting cold. **Nothing is sent anywhere, nothing is stored, and
there is no round trip.** That is now the only route: the opt-in "send a copy to the people
who build Cowch" panel was removed on 2026-08-29, along with its endpoint — redundant once
the on-device route existed, and a heavier ask than it looked. Nothing from a questionnaire
leaves a device except as background on a chat the person is already sending.

The cohort export (`api/questionnaire-report.js`, behind `QSHARE_EXPORT_TOKEN`) stays; it now
reads a closed set of the copies sent while the panel was live.

## What the correction changed, and what it revealed

I had built the report endpoint as an HTML page for a clinician on a phone. That was wrong,
and reversing it turned out to matter more than a format swap, because it changes *where the
data has to be*.

If the consumer is the companion inside the app, then **the results never need to leave the
device at all.** `api/chat.js` already receives an on-device `profile` object from
`therapy-profile.js` on every message. That is the seam. Sending a result to a server so
that the same device can fetch it back would be a round trip that buys nothing, needs a
token in the client, costs a store write and read per conversation, and weakens the privacy
posture for no gain. So the questionnaire result now rides along with the chat request that
was already going.

`api/questionnaire-report.js` still exists and now returns agent-shaped JSON as you asked.
But be clear about what it is for: **it is not how a person's results reach Mandy.** It reads
back the copies people have explicitly sent in — the cohort, for you and Mandy Kloppers to
look at. The per-person path is on-device and needs no endpoint.

## What's live

**One shared definition of what a band means.** `lib/questionnaire-context.js` turns scored
bands into plain-language labels a companion can actually say — "somewhat higher than most
people" — rather than numbers she would have to narrate. Both consumers use it, so a trait
can never be described one way in conversation and another way in the JSON.

**The room-of-100 rule is enforced in code, and it matters more now.** Four axes have a real
comparison population and get comparative labels. Sensitivity and risk appetite do not: they
get self-referential ones, and the block handed to the model carries an explicit instruction
never to describe them relative to other people. A model speaking from the labels is exactly
where an invented crowd would have done damage.

**The companion is told how to hold it.** This was the real design work. The base prompt
already forbids trait labels and clinical-sounding summaries, so handing Mandy a personality
profile without usage rules would cut straight across it and have her opening with "you're a
high-openness person" — wrong register for a non-clinical product, and a claim the
instrument cannot support. So the block says: background to listen with, not a script; don't
open with it, don't recite it, don't use it to explain them to themselves; low confidence
means the questionnaire genuinely doesn't know; and **if it contradicts what the person is
saying right now, believe the person.** It goes in the *uncached* per-user system block, so
the ~6k-token base prompt's cache is untouched and this costs no extra prefill.

**Nothing typed can travel.** The device reads named fields only, so `answers` (the
per-moment record) and `abstentions` (which carry free text) are never picked up; the server
rebuilds from named fields too. Belt and braces, deliberately.

**The copy on both results screens now says which Mandy.** This was the live problem the
correction created: the panel invited people to "send your results to Mandy" while the thing
they'd be talking to was *also* called Mandy. So the page's own panel now carries the truth —
the app hands her these when you chat, nothing is sent for that to work, she's told to hold
it lightly and to believe you over it — and the send is separated, retitled for who actually
receives it, and explicit that skipping it changes nothing.

**And the two things from before the correction still stand:** 39 exercise and IMAGINE pages
now load the analytics script, so `exercise_engaged` and the `imagine_guide_*` events fire
at last; and the `?ref=` attribution hole is closed — that capture sat below the "already
consented, bail out" early return, so the label was only ever recorded for people who hadn't
yet agreed.

## Three calls that are yours — each answerable in a word

**1. The send-a-copy panel — does it still earn its place?** With the companion getting
results on-device for free, the person no longer needs to send anything. What the send now
buys is *you* — it is the only per-person signal you have about testers, which was half the
original commission. I kept it and relabelled it honestly rather than deleting a shipped
feature on my own authority. **Keep, or cut it?**

**2. The payload.** Six scored axes and the sentences; deliberately not the raw per-moment
answers, not the free-text notes, not the wheel harvest. Now that the consumer is a model
rather than a clinician, the argument for the raw answers is weaker — she would be
interpreting evidence rather than reading a summary, which is exactly the diagnostic move
the prompt forbids. My read: **keep it as is.** But it is one field in two files if you
disagree.

**3. Retention.** The NDA precedent sets no expiry at all. I did not inherit that: sent
copies carry a **12-month TTL**, and expired ids are pruned from the index on read.
**12 months, or a different window?**

## Needs you

**`QSHARE_EXPORT_TOKEN` in Vercel** — a new env var, deliberately not the NDA one so it is
separately revocable. Until you set it the report endpoint answers **503**, which is correct
fail-closed behaviour and not a bug. Note this now gates only the cohort read; the
per-person path to the companion does not touch it and works without any token. The token is
in neither the repo, this document, nor my report.

## The honest gaps

- **I have not watched Mandy actually speak with this context in front of her.** The block
  she receives was rendered and read end to end offline, and it is exercised on every chat
  message, but whether the usage rules hold in practice — whether she stays off the labels
  and lets it shape her listening instead — needs one real conversation by someone who has
  done the questionnaire. That is the shakedown, and it is worth doing before this goes near
  anyone new.
- **No Upstash credentials on this machine.** I read the code; I have not read the store.
- **The exercise and IMAGINE events are wired but none has been observed arriving.** That
  needs one look at the Vercel dashboard by someone logged in.
- **I sent Mandy nothing and used no real data.** The endpoints were probed only for the
  behaviour that can be checked from outside.
