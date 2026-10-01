// Profile Compression API
// Uses Claude to extract therapeutic insights from conversation
// Called periodically to update the local therapy profile

import { gate, spendGlobal, LIMITS, tooBig, readJsonBody } from '../lib/request-gate.js';

// The prompt is built HERE, not on the device. The endpoint used to take a
// free-form `prompt` string and forward it to Haiku verbatim, which made it a
// general-purpose Claude proxy (review #981). Now the client sends only the
// data the fixed template needs, and the reply must be the JSON it asks for.
const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 2000;
const MAX_PROFILE_CHARS = 8000;

export function buildCompressionPrompt(messages, profileJson) {
  return `You are updating a wellbeing profile for a wellness app user. Analyze these recent messages and update the profile.

CURRENT PROFILE:
${profileJson}

RECENT MESSAGES (since last compression):
${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}

Return ONLY valid JSON with these fields (keep values concise):
{
  "patterns": ["list", "of", "patterns"],
  "patternStrength": {"pattern": strength_1_to_5},
  "insights": ["max 5 key insights about this person"],
  "activeThemes": ["what they're currently working on"],
  "strengths": ["strengths you've noticed"],
  "respondsTo": ["approaches that work for them"],
  "lastSessionSummary": "One sentence about this session",
  "mood": "their current emotional state"
}

Focus on what is useful for supporting them. Be concise. Max 200 words total.`;
}

export function checkCompressionInput(body) {
  const { messages, profile } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return { status: 400, error: 'Messages required' };
  }
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return { status: 400, error: 'Profile required' };
  }
  const clean = [];
  for (const m of messages.slice(-MAX_MESSAGES)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return { status: 400, error: 'Invalid message' };
    }
    clean.push({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) });
  }
  let profileJson;
  try { profileJson = JSON.stringify(profile, null, 2); } catch (e) { return { status: 400, error: 'Invalid profile' }; }
  if (profileJson.length > MAX_PROFILE_CHARS) {
    return { status: 413, error: 'Profile too large' };
  }
  return { messages: clean, profileJson };
}

export default async function handler(req, res) {
  // Same gate as api/chat.js, same rationale: a public, account-less endpoint
  // fronting a billed Anthropic key. One shared helper so the two can't drift.
  if (!(await gate(req, res, LIMITS.compress))) return;
  const read = readJsonBody(req, res);
  if (!read.ok) return;
  const body = read.body;

  try {
    const input = checkCompressionInput(body);
    if (input.error) {
      return res.status(input.status).json({ error: input.error });
    }
    const prompt = buildCompressionPrompt(input.messages, input.profileJson);

    // Belt-and-braces serialised-size check, same as api/chat.js — the gate
    // already checked Content-Length, this checks what was actually parsed.
    if (tooBig(body, LIMITS.compress.maxBodyBytes)) {
      return res.status(413).json({ error: 'Request too large' });
    }

    // Spend a unit of the shared daily pool only for a request we will send.
    if (!(await spendGlobal(res, LIMITS.compress))) return;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('Compress profile: ANTHROPIC_API_KEY is not set in the environment');
      return res.status(500).json({ error: 'AI service not configured' });
    }

    // Use a smaller/faster model for compression (Haiku)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Compression API error (${response.status}):`, error);
      return res.status(500).json({ error: 'Compression failed' });
    }

    const data = await response.json();
    const textBlock = Array.isArray(data.content) ? data.content.find(b => b && b.type === 'text' && typeof b.text === 'string') : null;
    const compressed = textBlock ? textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '') : '';
    // Only the JSON the template asks for goes back; anything else is refused,
    // so the reply channel cannot carry arbitrary model output.
    let parsed = null;
    try { parsed = JSON.parse(compressed); } catch (e) { parsed = null; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return res.status(502).json({ error: 'Compression failed' });
    }

    return res.status(200).json({ compressed: JSON.stringify(parsed) });

  } catch (error) {
    console.error('Compress profile error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
