// Profile Compression API
// Uses Claude to extract therapeutic insights from conversation
// Called periodically to update the local therapy profile

export default async function handler(req, res) {
  // Origin lock + CORS — same rationale as api/chat.js: a public, account-less
  // endpoint fronting a billed Anthropic key, locked to theracowch.com.
  const origin = req.headers.origin;
  const allowedOrigins = ['https://theracowch.com', 'https://www.theracowch.com'];
  let originOk = !origin || allowedOrigins.includes(origin);
  if (origin && !originOk) {
    try { originOk = new URL(origin).hostname.endsWith('.vercel.app'); } catch (_e) { originOk = false; }
  }
  res.setHeader('Access-Control-Allow-Origin', originOk && origin ? origin : allowedOrigins[0]);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (origin && !originOk) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    // Cap input size so a single call can't balloon the Anthropic bill.
    if (typeof prompt === 'string' && prompt.length > 8000) {
      return res.status(413).json({ error: 'Prompt too long' });
    }

    // Use a smaller/faster model for compression (Haiku equivalent)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY,
        'Anthropic-Version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Compression API error:', error);
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
