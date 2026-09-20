// Profile Compression API
// Uses Claude to extract therapeutic insights from conversation
// Called periodically to update the local therapy profile

import { gate, LIMITS, tooBig } from '../lib/request-gate.js';
import { checkTextField } from '../lib/text-field-guard.js';

export default async function handler(req, res) {
  // Same gate as api/chat.js, same rationale: a public, account-less endpoint
  // fronting a billed Anthropic key. One shared helper so the two can't drift.
  if (!(await gate(req, res, LIMITS.compress))) return;

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    // Must be a plain string, and capped — same reasoning as api/chat.js: a
    // non-string (e.g. a content-block array) is truthy and would otherwise
    // be forwarded straight into the Anthropic call.
    const promptError = checkTextField(prompt, 8000, 'Prompt');
    if (promptError) {
      return res.status(promptError.status).json({ error: promptError.error });
    }

    // Belt-and-braces serialised-size check, same as api/chat.js — the gate
    // already checked Content-Length, this checks what was actually parsed.
    if (tooBig(prompt, LIMITS.compress.maxBodyBytes)) {
      return res.status(413).json({ error: 'Request too large' });
    }

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
    const compressed = data.content[0].text;

    return res.status(200).json({ compressed });

  } catch (error) {
    console.error('Compress profile error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
