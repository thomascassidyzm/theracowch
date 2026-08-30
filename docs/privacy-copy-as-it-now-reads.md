# The questionnaire privacy copy, as it now reads

Branch `privacy/mandy-feed-disclosure`. Not merged. Production still says the untrue thing.

## What was untrue

Both "What are you like, anyway?" pages said **"Everything you tap stays on this device"**, and
both results screens said **"Nothing is sent anywhere for that to work."** Since the 29 Aug
Mandy-feed work, the six scored results go out with every chat message. Both sentences are live
on cowch.app right now.

The second one is the interesting one. It is technically defensible — no separate call is made,
the results ride the chat request that was already going — and false in the sense any reader
takes it. It is gone.

---

## The copy, verbatim

### Questionnaire intro — both pages, in the callout above the start button

> This isn't a test and it isn't a diagnosis — it's a mirror, and a playful one. Every answer you
> tap, and anything you type, stays on this device and goes nowhere else; only the six results at
> the end travel — they ride along with each message you send Mandy, so she knows a little about
> who she's talking to. Don't want that? Turn it off here and she'll never see them.
>
> ☑ **Share my six results with Mandy**

The ranked page reads "Every order you put things in" instead of "Every answer you tap".

### Results screen — both pages, "Talking it through"

> These are directions to move in, not labels to wear. If something here landed — or landed wrong
> — that's worth a conversation, and Mandy already has these: the six results above go with each
> message you send her, so she has a little background instead of starting from nothing. Your
> individual answers, and anything you typed, stay on this device and are never part of that. You
> can stop the results being sent whenever you like — the switch is in Settings, under "What
> Mandy knows".
>
> She's told to hold it lightly — something to listen with, not to read back at you or use to
> tell you what you're like. If it ever disagrees with what you're actually saying, she should
> believe you.

### /questionnaires/ — the page lede over all four cards

> Four short self-reflections to help you notice patterns. Your answers stay on this device.
> "What are you like, anyway?" also passes its six results to Mandy when you chat, so she knows
> a little about who she's talking to — you can switch that off.

### The consent modal (shown on every questionnaire)

> Your answers are kept on this device and are not sent anywhere. If you finish "What are you
> like, anyway?", its six results go with your messages to Mandy — you can switch that off.

### Settings → What Mandy knows

> ☑ Share my "What are you like, anyway?" results with Mandy. Just the six results — never your
> answers, and never anything you typed.

### privacy.html §4, new bullet

> **Your questionnaire results.** If you have finished "What are you like, anyway?", the six
> scored results it gives you are included in that same request, so Mandy has some background
> about you. Your individual answers, and anything you typed into it, are never included. You can
> turn this off in the app under Settings → "What Mandy knows", or on the questionnaire itself;
> with it off, nothing from the questionnaire leaves your device. Results from the other
> questionnaires are not sent at all.

Policy date moved to 30 August 2026.

### privacy-for-institutions.html — the DPIA-killer, the page a university reviewer opens

In the data-flow diagram, the AI-provider node:

> When a student messages Mandy, that message + recent context is sent over TLS purely to
> generate a reply. "Recent context" includes the six scored results of the optional "What are
> you like, anyway?" questionnaire, if the student has finished it — scores only, never their
> individual answers or free text, and switchable off in Settings. Not stored long-term by us;
> not used to train AI models (per provider contract).

The on-device node now ends "…unless the student exports them, with one exception, shown next."
The Q&A row "Does the institution process student data via Cowch?" now ends "…their content
stays on their device, apart from what is sent to the AI provider to answer a message."

---

## How the switch works

One key, `cowch-share-wayl-with-mandy`, values `on` / `off`, **absent means on** — an opt-out,
because the companion knowing something is the point of taking it.

Two places to flip it, both writing the same key and both reflecting each other:

1. **On the questionnaire**, in the intro callout, right beside the sentence that explains it.
2. **In the app**, Settings → "What Mandy knows".

Enforced in exactly one place: `getQuestionnaireResult()` in
`public/assets/js/therapy-profile.js` returns `null` when the key says `off`. Everything
downstream already handles `null` — `chat-script.js` guards with `if (context.questionnaire)`,
and `api/chat.js` gets `buildQuestionnaireContext(undefined) → null` and simply omits the
block. So switching it off leaves a person in exactly the state of someone who never took the
questionnaire: the companion works normally.

Private-browsing / storage-blocked falls back to **on**, matching the unset default.

---

## The sweep — everywhere else that makes an on-device claim

Checked every on-device claim in `public/`, not just the two pages someone had already found.

**Corrected:** the two questionnaire intros, the two results screens, the `/questionnaires/`
lede, the consent modal, `privacy.html`, `privacy-for-institutions.html`, and a header comment
in `therapy-profile.js` that claimed "all data stays on-device" one line under "sends compressed
context to API".

**Checked and true, left alone:**

- **The wheel build** (`build-your-wheel.html`, `wellness-wheel.js`, key `cowch-wheel-build`) —
  "no endpoint, no account, no upload" holds. Nothing outside that file reads the key.
- **The Positive Data Log** in the self-doubt exercise (`cowch_positive_data_log`) — "It stays on
  this device, just for you" holds. Read by nothing that sends.
- **Analytics** — `privacy.html` §7 is accurate; the analytics script sends only a channel label
  and visit timing.

---

## Gap

I could not verify this on a deployed preview. There is no Vercel CLI and no Vercel token on this
box, and the two obvious preview hostnames for the branch both 404, so I could not find the
preview URL to load the pages on. The copy above is read straight from the files that ship;
HTML tag balance and JS syntax are checked. **Nothing is verified in a browser.**
