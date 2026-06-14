# /qr — campus talk QR codes

Files here power the printable "scan to try Cowch" card for in-person talks.

- **`talk-card.html`** — the printable card (open it live at `cowch.app/qr/talk-card.html`, hit *Print / Save PDF*). Also fine to project on a slide.
- **`cowch-surrey-talk.svg` / `.png`** — the QR itself (SVG for print/card, PNG 1024px for slides/posters). Encodes **`https://cowch.app/?utm_source=surrey-talk`** so installs from the talk attribute both natively in Vercel Web Analytics *and* in our telemetry `source` property.

## Make a version for another talk / university

Pick a new `utm_source` (e.g. `bristol-talk`, `freshers-fair`) and regenerate — no repo dependency needed:

```bash
URL="https://cowch.app/?utm_source=bristol-talk"
npx --yes qrcode -e H -t svg -o public/qr/cowch-bristol-talk.svg "$URL"
npx --yes qrcode -e H -w 1024   -o public/qr/cowch-bristol-talk.png "$URL"
```

Then copy `talk-card.html` to a new file and point its `<img src>` at the new SVG (and tweak the heading if you like). Keep error level **H** (robust scanning) and the dark-on-white QR (don't recolour the modules — contrast is what makes it scan).

Keep the card inside the claims line: *wellbeing companion, not therapy, 18+, crisis line shown.*
