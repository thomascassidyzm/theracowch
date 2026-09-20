// Validates a Web Push subscription.endpoint at SUBSCRIBE time, so
// api/push/send.js never hands webpush.sendNotification an attacker-chosen
// destination (a blind SSRF: the server would POST the encrypted payload to
// whatever URL it was given). See docs/security-audit-2026-09-20.md item 2.
//
// A too-tight list silently kills reminders for a whole browser vendor, which
// is worse than the risk it guards against — so this stays generous and only
// rejects endpoints that are not HTTPS or not on a real push-service host.
// Known push services, one entry per vendor:
//   Chrome / Edge / Android / Samsung Internet — fcm.googleapis.com
//   Firefox                                    — updates.push.services.mozilla.com
//   Safari / iOS 16.4+                         — web.push.apple.com
//   Legacy Edge (WNS)                          — *.notify.windows.com
const ALLOWED_HOSTS = new Set([
    'fcm.googleapis.com',
    'android.googleapis.com', // legacy GCM endpoint, still seen on old subscriptions
    'updates.push.services.mozilla.com',
    'web.push.apple.com'
]);

const ALLOWED_SUFFIXES = [
    '.push.services.mozilla.com',
    '.notify.windows.com'
];

export function isAllowedPushEndpoint(endpoint) {
    let url;
    try {
        url = new URL(endpoint);
    } catch (_) {
        return false;
    }
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) return true;
    return ALLOWED_SUFFIXES.some(suffix => host.endsWith(suffix));
}
