# NDA e-signature flow

## What it is
`/nda.html` — a page psychologists/doctors open, read the NDA, and sign
(typed name + org + email + drawn signature). The signed record is stored
server-side; there's no login system.

## The link Mandy sends
Send `https://cowch.app/nda.html?ref=<tag>` where `<tag>` is anything that
identifies who/what this is for (e.g. `jane-smith-surrey` or
`meeting-2026-08-01`). The `ref` is stored with the signature so we know
which meeting/person it belongs to. No `ref` is required — plain
`/nda.html` also works. (The repo doesn't enable clean URLs — every other
page here is linked with its `.html` too, so this matches convention.)

## Storage
Upstash Redis — the same store already provisioned for push notifications
(`api/push/*`). No new service to provision; `api/nda-sign.js` and
`api/nda-export.js` read whichever env pair is already set:
`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` or the legacy
`KV_REST_API_URL`/`KV_REST_API_TOKEN`.

Each signature is stored as `cowch:nda:<uuid>` with: ref, NDA version,
full name, organisation, email, signature image (data URL), server-side
timestamp, user agent, and IP — the standard e-signature evidence bundle.

## What the owner must provision
One env var in Vercel: **`NDA_EXPORT_TOKEN`** — any long random string.
Without it, the export endpoint refuses to serve records (503).

## Pulling signed records
```
GET https://cowch.app/api/nda-export?token=<NDA_EXPORT_TOKEN>
GET https://cowch.app/api/nda-export?token=<NDA_EXPORT_TOKEN>&id=<uuid>
```
Returns JSON. There's no email notification mechanism in this repo yet, so
this endpoint is the record — check it after Mandy sends a link.

## Replacing the placeholder legal text
Edit `public/assets/js/nda-text.js` only — swap `NDA_BODY_HTML`, bump
`NDA_VERSION`, and set `NDA_IS_DRAFT = false` once approved wording is in
place. Nothing else needs to change.
