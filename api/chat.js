// Cache for IMAGINE framework prompts (2 hour TTL)
let promptsCache = null;
let cacheExpiry = 0;

async function getImagineFrameworkPrompts() {
  const now = Date.now();
  
  // Return cached prompts if still valid
  if (promptsCache && now < cacheExpiry) {
    return promptsCache;
  }
  
  try {
    // Fetch IMAGINE framework training data from theracowch.com hidden page
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://theracowch.com';
    const response = await fetch(`${baseUrl}/imagine-framework-prompts.txt`);
    if (!response.ok) {
      throw new Error('Failed to fetch IMAGINE framework prompts');
    }
    
    const trainingData = await response.text();
    promptsCache = trainingData.trim();
    cacheExpiry = now + (2 * 60 * 60 * 1000); // Cache for 2 hours
    
    return promptsCache;
  } catch (error) {
    console.error('Error fetching IMAGINE framework prompts:', error);
    // Return basic fallback prompts with authentic Mandy voice
    return `You are Mandy Kloppers, a qualified therapist with BA in Psychology and Sociology, Post-Graduate CBT degree, and over two decades of therapeutic experience. You specialize in CBT combined with psycho-dynamic counseling.

MANDY'S AUTHENTIC COACHING PHILOSOPHY:
"I believe every person has the answers within them - my role is to help you uncover those insights and build practical tools for your wellbeing journey. We're in this together."

Key principles:
- Collaborative, not prescriptive
- Curious questioning over giving advice  
- Pattern recognition and gentle reframing
- Practical, actionable steps
- Warm but professional boundaries
- Strengths-based approach

MANDY'S LANGUAGE PATTERNS:
Common phrases:
- "I'm curious about..."
- "I wonder if..."
- "What would it be like if..."
- "That sounds [feeling word]..."
- "I notice you said..."
- "Help me understand..."
- "What would feel true for you?"
- "Let's explore that together"

Questioning style:
- Open-ended, not leading
- Curious, not interrogating
- Exploring meaning, not just facts
- Often asks about feelings and sensations
- Helps client discover their own insights

Reframing techniques:
- Strength-spotting in difficulties
- Exploring protective functions of behaviors
- Shifting from problems to preferences
- Moving from external to internal authority
- Finding evidence of existing resources

TONE & REGISTER:
- Warm but professional
- Conversational, not clinical
- Genuinely curious, not performatively supportive
- Comfortable with pause and reflection
- Doesn't rush to solve or fix
- Validates feelings while introducing new perspectives
- Uses everyday language, not therapy jargon
- Balances support with gentle challenge

IMAGINE FRAMEWORK - 7 DOMAINS:
I - Introspection & self-awareness
M - Motivation & drive patterns  
A - Anxiety & emotional regulation
G - Goals & purpose alignment
I - Identity & self-worth patterns
N - Nurturing relationships & boundaries
E - Energy & vitality management

Approach: Use Mandy's authentic coaching style to help people discover their own wisdom and strength. Focus on collaborative exploration rather than prescriptive advice.`;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversationHistory, currentPattern, sessionPhase } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get IMAGINE framework prompts from URL (with caching)
    const imagineFrameworkPrompts = await getImagineFrameworkPrompts();
    
    // Build system prompt with fetched training data
    let systemPrompt = imagineFrameworkPrompts;
    
    // Add current session context
    if (currentPattern) {
      systemPrompt += `\n\nCurrent therapeutic focus: ${currentPattern}`;
    }
    if (sessionPhase) {
      systemPrompt += `\nSession phase: ${sessionPhase}`;
    }
    
    systemPrompt += `\n\nRespond authentically as Mandy Kloppers would - combining professional expertise with genuine compassion and practical guidance. Keep responses to 2-3 sentences maximum and use collaborative tone.`;

    // Prepare conversation messages
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (last 6 messages to prevent context overflow)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-6);
      recentHistory.forEach(msg => {
        if (msg.sender === 'user') {
          messages.push({ role: 'user', content: msg.text });
        } else if (msg.sender === 'ai_mandy') {
          messages.push({ role: 'assistant', content: msg.text });
        }
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Claude API with prompt caching
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ANTHROPIC_API_KEY,
        'Anthropic-Version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' }  // Cache this for 5 minutes
          }
        ],
        messages: messages.slice(1) // Remove system message since we're using system array format
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API Error:', errorData);
      return res.status(500).json({ 
        error: 'AI service temporarily unavailable',
        fallback: "I'm experiencing a technical moment, but I'm still here with you. Sometimes we all need to pause and regroup - that's perfectly normal. What's one thing you're feeling right now that we can explore together?"
      });
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    // Enhanced pattern recognition based on Mandy's therapeutic specialties
    let detectedPattern = 'general';
    const lowerMessage = message.toLowerCase();
    
    // Anxiety patterns (social, health, generalized)
    if (lowerMessage.includes('anxious') || lowerMessage.includes('worry') || lowerMessage.includes('nervous') || 
        lowerMessage.includes('panic') || lowerMessage.includes('scared') || lowerMessage.includes('fear')) {
      detectedPattern = 'anxiety';
    } 
    // Depression and low self-esteem patterns
    else if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down') ||
             lowerMessage.includes('worthless') || lowerMessage.includes('useless') || lowerMessage.includes('low self')) {
      detectedPattern = 'depression';
    }
    // Relationship issues
    else if (lowerMessage.includes('relationship') || lowerMessage.includes('partner') || lowerMessage.includes('husband') ||
             lowerMessage.includes('wife') || lowerMessage.includes('boyfriend') || lowerMessage.includes('girlfriend') ||
             lowerMessage.includes('family') || lowerMessage.includes('friend')) {
      detectedPattern = 'relationships';
    }
    // Childhood trauma indicators
    else if (lowerMessage.includes('childhood') || lowerMessage.includes('parent') || lowerMessage.includes('trauma') ||
             lowerMessage.includes('abuse') || lowerMessage.includes('past')) {
      detectedPattern = 'trauma';
    }
    // Perfectionism and thought patterns
    else if (lowerMessage.includes('perfect') || lowerMessage.includes('mistake') || lowerMessage.includes('failure') ||
             lowerMessage.includes('should') || lowerMessage.includes('must')) {
      detectedPattern = 'perfectionism';
    }

    return res.status(200).json({
      response: aiResponse,
      pattern: detectedPattern,
      timestamp: new Date().toISOString(),
      sessionPhase: sessionPhase || 'exploring'
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      fallback: "I'm having a technical moment, but I want you to know that reaching out shows real courage. We will work as a team to explore whatever is troubling you - even when technology has its hiccups."
    });
  }
}