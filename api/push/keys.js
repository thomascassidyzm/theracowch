// Returns the server's VAPID public key so the browser can encrypt
// subscription payloads. The matching VAPID_PRIVATE_KEY stays on the server
// and is used by /api/push/send to sign push messages.
//
// Set the VAPID env vars on Vercel (Project Settings → Environment Variables):
//   VAPID_PUBLIC_KEY   — generated once with `npx web-push generate-vapid-keys`
//   VAPID_PRIVATE_KEY  — generated at the same time, server-only
//   VAPID_SUBJECT      — mailto: URL identifying the app (e.g.
//                        mailto:contact@thoughtsonlifeandlove.com)

export default function handler(req, res) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
        res.status(503).json({ error: 'Push not configured: VAPID_PUBLIC_KEY missing.' });
        return;
    }
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json({ publicKey });
}
