# Sharing & marketing — the PWA word-of-mouth path

This is the **install-from-a-link** path (no app store). For the eventual native
App Store / Play listings, see [`store-listing.md`](./store-listing.md).

## What shipped (the share → install loop)

1. **Two share entry points**, both routed through `assets/js/share.js` →
   `window.CowchShare.share()`: a prominent **"Share" pill** in the Your Space
   (YOU) tab header, and a **"Share Cowch with a friend"** button in Settings.
   On phones either opens the native share sheet (Messages, WhatsApp, etc.); on
   desktop they copy `https://cowch.app/` and show a toast.
2. **Link preview cards** — Open Graph + Twitter Card tags on `index.html` and
   `app.html`, with a 1200×630 image at `/og-image.png` (source:
   `og-image.src.svg` at repo root; regenerate with
   `rsvg-convert -w 1200 -h 630 og-image.src.svg -o public/og-image.png`).
   Now a pasted `cowch.app` link renders a warm card instead of a bare URL.
3. **The loop closes by itself:** a recipient taps the link → lands in the app →
   sends a first message to Mandy → the existing install banner slides in
   (`markEngagement` in `chat-script.js`). The install guide is already
   platform-aware (iOS walkthrough, Android native prompt, desktop).

### After deploying, prime the preview caches once
Social platforms cache OG data aggressively. Run each link through its debugger
once so the new card is fetched (and to confirm it renders):
- Facebook/WhatsApp/Instagram: https://developers.facebook.com/tools/debug/
- Twitter/X: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/
- iMessage/Slack: just paste the link in a chat to yourself.
To force a refresh after a future image change, bump the URL (`/og-image.png?v=2`).

## Positioning — what to lead with

- **A real, accredited therapist.** Mandy is built on Mandy Kloppers (BABCP-
  accredited CBT, 20+ yrs, `thoughtsonlifeandlove.com`). Most "AI wellness" apps
  can't claim a named, credentialed human behind the voice. This is the trust
  story — lead with the human, not the AI.
- **Private by design.** On-device journal; chats go to the model provider only
  to generate a reply; not sold, not used to train AI. Genuinely differentiating
  in mental-health post-BetterHelp. Say it plainly.
- **No download, no app store.** "Tap a link, it's on your home screen." Frame
  the PWA install as a *feature* (instant, private, nothing to approve), not a
  workaround.
- **Free and always there.** A warm companion between sessions / when things feel
  too much, with one-tap crisis routing — never a replacement for therapy
  (keep this disclaimer visible; it's also a trust signal).

## Channels — the engine is Mandy's own audience

Without app-store discovery, growth = word-of-mouth + Mandy's existing reach.
In rough priority:

1. **Mandy's blog & social** (`thoughtsonlifeandlove.com`) — the warmest
   audience. A post / pinned link / email to her list is the single biggest
   lever. The OG card now makes those links look right.
2. **In-app share loop** (shipped) — every happy user is a distributor. Consider
   a gentle, occasional "loving Cowch? share it with someone" nudge (see Next).
3. **Therapist / coach referrals** — practitioners recommending it to clients as
   between-session support. A simple "for practitioners" one-pager could help.
4. **Organic social** (Reels/TikTok on the IMAGINE exercises, the cow character)
   — low cost, on-brand, shareable.

## Measurement (now wired — one dashboard step to finish)

Cookieless **Vercel Web Analytics** is now in the app (`assets/js/analytics.js`
+ the snippet in `app.html`). It tracks page views automatically, plus two
custom events: `pwa_installed` (the recipient installs — the goal of the loop)
and `share` (with `channel: native | copy`). Privacy disclosure updated in
`privacy.html` §9.

**To turn it on:** enable Web Analytics for the project in the Vercel dashboard
(Project → Analytics → Enable Web Analytics). Until then the insights script
404s harmlessly and events are silently dropped. Custom events may require a
paid Vercel plan; page views work on the free tier. If you'd rather use
Plausible, swap the snippet — `window.cowchTrack` stays the same.

## Next moves (not yet built — for discussion)

- **A warm invite landing.** A recipient currently drops straight into the chat.
  A light "someone thought Cowch might help you" landing → one tap into the app
  could convert cold recipients better.
- **A gentle one-time share nudge** after a positive moment (e.g. a completed
  exercise or a good check-in), in addition to the two always-available entry
  points (YOU-tab pill + Settings) that shipped.
- **Real screenshots.** `manifest.json` references `/screenshots/mobile-1.png`
  and `/desktop-1.png` that don't exist yet (they 404). Capturing real ones
  enriches the Android install prompt and any future store listing.
