# App-store listing scaffold

Reference copy for when Cowch is published as a native app on the Apple App Store and Google Play. Not user-facing. Update alongside any policy change in `/public/privacy.html` or `/public/terms.html`.

## Positioning

- **Category:** Health & Fitness (primary) / Lifestyle (secondary)
- **Not** Medical — medical category triggers extra review, and Cowch is explicitly not a medical device
- **Age rating:** 17+ (Apple) / Teen (Google) — mental-health themes
- **Not** rated for children. Minimum age in Terms is 18.

## Short description (≤ 170 chars)

> Cowch is a warm, private wellbeing companion. Journal, reflect and try CBT / ACT-based exercises with Mandy, an AI guide. Not a replacement for therapy.

## Long description (≤ 4000 chars)

Cowch is a gentle wellbeing companion. It offers:

- Mandy, an AI reflection partner trained on CBT, ACT and compassion-focused approaches
- The IMAGINE framework — seven domains for looking after your mind, body and relationships
- Tiny daily exercises: box breathing, 5-4-3-2-1 grounding, gratitude stars, tiny wins, and more
- A private, on-device journal for your own reflections
- "Need help now?" routing to crisis lines if you're struggling

Cowch is a wellbeing-support app. It does not replace clinical therapy, medical care, medication, or emergency services. If you are in crisis, call 999 (UK) or 911 (US), dial 988 (US) or NHS 111 option 2 (UK), or contact Samaritans 116 123 / SHOUT 85258.

Your chats and journal entries stay on your device. See our Privacy Policy and Terms of Use inside the app.

## Keywords (Apple, 100 chars)

`cbt, therapy, mental health, anxiety, journal, wellbeing, mindfulness, self-help, mood, grounding`

## Screenshots (to produce)

1. Home screen with "Need help now?" and "Choose what you need help with" cards
2. Chat with Mandy
3. IMAGINE framework overview
4. A single exercise (e.g. Box Breathing)
5. Privacy & Safety screen

## App Privacy (Apple "Privacy Nutrition Label")

Declare the following under **App Privacy → Data Collection**.

### Data linked to user: NONE

### Data not linked to user

- **Diagnostics** — Crash data, performance data (only via Apple's default crash reporting)
- **Identifiers** — Device ID, only if/when Apple's sign-in-to-device APIs require it
- **Usage Data** — App interactions, only if you later add analytics. **Today: not collected.**

### Data used to track: NONE

### Data the app does collect (details)

- **User Content → Other user content** — Chat messages and journal entries. Stored on-device. Transmitted to the AI model provider purely to generate replies. Not stored long-term on our servers. Not used for tracking, advertising, or training AI models (per provider contract).

## Google Play Data Safety form

Mirror the Apple declarations:

| Data type | Collected | Shared | Processed on-device | Purpose |
|-----------|-----------|--------|---------------------|---------|
| Messages | Yes (transient) | Yes (to AI provider) | Yes (primary) | App functionality |
| App activity | No | — | — | — |
| Personal info | No | — | — | — |
| Financial info | No | — | — | — |
| Health & fitness info | No | — | — | — |
| Location | No | — | — | — |

- Data is encrypted in transit.
- Users can request deletion (it's already on their device; "Clear conversation history" wipes it).
- Family-friendly policy: app rated 17+ / Teen — NOT listed in Designed for Families.

## Sensitive-category disclosures

- Apple review: mention in review notes that Cowch is a wellbeing-support app, not a medical device, and surfaces crisis resources up-front.
- Google Play: declare as "Not Health Services" (no medical claims). The Sensitive Permissions section does not apply.

## Support URLs to supply

- **Privacy Policy URL:** `https://cowch.app/privacy.html`
- **Terms of Use URL:** `https://cowch.app/terms.html`
- **Accessibility Statement URL:** `https://cowch.app/accessibility.html`
- **Support email:** `contact@thoughtsonlifeandlove.com`

## Version / change log entries

Each release note must:

- Mention any change that affects what data the app processes
- Mention any material change in Terms (and bump the first-launch consent gate's `CONSENT_KEY` in `public/app.html` so returning users re-confirm)

## What to check before each submission

- [ ] Privacy Policy page accessible and up to date
- [ ] Terms of Use page accessible and up to date
- [ ] Accessibility statement accessible and up to date
- [ ] Crisis resources current (phone numbers, short codes)
- [ ] Credentials of Mandy Kloppers current (titles / accreditation)
- [ ] First-launch consent gate shows and gates on a fresh install
- [ ] App does not claim to diagnose or treat
- [ ] Support email responds
