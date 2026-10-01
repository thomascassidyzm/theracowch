// Shared-secret check for the two internal export endpoints (nda-export,
// questionnaire-report). Review #981, finding 8.
//
// The token may arrive as `Authorization: Bearer <token>` (preferred: it stays
// out of request logs, browser history and Referer) or, for existing
// bookmarks, as `?token=`. It is compared in constant time, and every attempt
// costs a unit of a small per-IP limit so the secret cannot be guessed at
// speed.
import crypto from 'crypto';
import { checkRateLimit } from './request-gate.js';

function presented(req) {
    const auth = (req.headers && req.headers.authorization) || '';
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (m) return m[1].trim();
    const q = req.query && req.query.token;
    return typeof q === 'string' ? q : '';
}

export function tokenMatches(given, expected) {
    const a = crypto.createHash('sha256').update(String(given)).digest();
    const b = crypto.createHash('sha256').update(String(expected)).digest();
    return crypto.timingSafeEqual(a, b) && given.length > 0;
}

// Returns true if the caller may proceed; otherwise the response is sent.
export async function requireExportToken(req, res, { bucket, expected, envName }) {
    if (!expected) {
        res.status(503).json({ error: `Not configured: ${envName} missing.` });
        return false;
    }
    const rl = await checkRateLimit(req, { bucket, limit: 20, windowSeconds: 600 });
    if (!rl.ok) {
        res.setHeader('Retry-After', String(rl.retryAfter));
        res.status(rl.status).json({ error: rl.status === 429 ? 'Too many requests — give it a minute.' : 'Service temporarily unavailable' });
        return false;
    }
    if (!tokenMatches(presented(req), expected)) {
        res.status(401).json({ error: 'Invalid or missing token' });
        return false;
    }
    return true;
}
