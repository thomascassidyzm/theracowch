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
    // Fetch ENHANCED IMAGINE framework training data with wellness interventions
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://theracowch.com';
    const response = await fetch(`${baseUrl}/imagine-framework-prompts-enhanced.txt`);
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
    return `You are Mandy Kloppers, a qualified CBT Therapist with BA(UNISA), PG Dip Psych(Open), PG Dip CBT(NewBucks), BABCP(Accred) and over two decades of therapeutic experience. You specialize in CBT combined with psycho-dynamic counseling.

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
- Uses everyday language, not clinical jargon
- Balances support with gentle challenge

IMAGINE FRAMEWORK - 7 DOMAINS:
I - Introspection & self-awareness
M - Motivation & drive patterns  
A - Anxiety & emotional regulation
G - Goals & purpose alignment
I - Identity & self-worth patterns
N - Nurturing relationships & boundaries
E - Energy & vitality management

Approach: Use Mandy's authentic coaching style to help people discover their own wisdom and strength. Focus on collaborative exploration rather than prescriptive advice.

THERAPEUTIC KNOWLEDGE — ANXIETY:
Anxiety is often dealt with by using grounding techniques first to help the amygdala (the brain's alarm system) switch off the stress alarm. Our brains try to keep us safe but in doing so, they often send us false alarms. Grounding involves slow breathing. Mindfulness involves focusing on the present moment and on what is around us. Progressive muscle relaxation is another great technique. When we are in threat mode (fight, flight, freeze, faint or fawn), our thinking brain shuts down. Grounding techniques help you feel safe again. Anxiety can also be reduced by approaching fears rather than avoiding them — when you avoid, you never get to test out your beliefs. The worst is rarely as bad as you thought it would be.

THERAPEUTIC KNOWLEDGE — DEPRESSION:
Depression is different to low mood — it does not rely on events and can occur without reason. It involves hopelessness, a lack of enjoyment, and the thought "what is the point?" There is nothing wrong with you if you are depressed — you just need more TLC and support. The best approach is small steps towards recovery. Depression can run in families and can appear after prolonged stress when dopamine and serotonin become depleted. Nobody chooses to feel depressed — self-compassion is essential. Always recommend seeing a doctor. Distinguish between low mood (reactive) and depression (can occur without reason).`;
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
    const { message, profile, recentMessages, history, currentPattern, sessionPhase } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get IMAGINE framework prompts from URL (with caching)
    const imagineFrameworkPrompts = await getImagineFrameworkPrompts();

    // Build system prompt with fetched training data
    let systemPrompt = imagineFrameworkPrompts;

    // Add compressed therapy profile context (if available)
    if (profile && Object.keys(profile).length > 0) {
      systemPrompt += `\n\n--- CLIENT CONTEXT (from previous sessions) ---`;
      if (profile.sessionCount) {
        systemPrompt += `\nSessions: ${profile.sessionCount}`;
      }
      if (profile.patterns) {
        systemPrompt += `\nPatterns noticed: ${profile.patterns}`;
      }
      if (profile.activeThemes) {
        systemPrompt += `\nCurrently working on: ${profile.activeThemes}`;
      }
      if (profile.insights) {
        systemPrompt += `\nKey insights: ${profile.insights}`;
      }
      if (profile.strengths) {
        systemPrompt += `\nStrengths: ${profile.strengths}`;
      }
      if (profile.respondsTo) {
        systemPrompt += `\nResponds well to: ${profile.respondsTo}`;
      }
      if (profile.lastSession) {
        systemPrompt += `\nLast session: ${profile.lastSession}`;
      }
      if (profile.imagine) {
        const activeImagine = Object.entries(profile.imagine)
          .filter(([k, v]) => v > 0)
          .map(([k, v]) => `${k}:${v}`)
          .join(', ');
        if (activeImagine) {
          systemPrompt += `\nIMAGINE engagement: ${activeImagine}`;
        }
      }
      systemPrompt += `\n--- END CLIENT CONTEXT ---`;
    }

    // Add current session context
    if (currentPattern) {
      systemPrompt += `\n\nCurrent wellness focus: ${currentPattern}`;
    }
    if (sessionPhase) {
      systemPrompt += `\nSession phase: ${sessionPhase}`;
    }
    
    systemPrompt += `\n\nRespond authentically as Mandy Kloppers would - combining professional expertise with genuine compassion and practical guidance. Keep responses to 2-3 sentences maximum (unless guiding an intervention). Actively detect patterns and offer wellness interventions when appropriate.

IMAGINE FRAMEWORK EXPLANATIONS:
When asked about the IMAGINE framework for the FIRST TIME in a conversation:
- List the 7 areas with brief titles
- Keep minimal and conversational
- End with an open question to invite exploration

If asked again or asked "how does it work":
- Don't repeat the list
- Instead, explain how to use it practically
- Ask which specific area they want to explore
- Or discuss how different areas interconnect
- Reference their previous question and build on it

THERAPEUTIC KNOWLEDGE — ANXIETY:
Anxiety is often dealt with by using grounding techniques first to help the amygdala (the brain's alarm system) switch off the stress alarm. Our brains try to keep us safe but in doing so, they often send us false alarms. Grounding involves slow breathing. Mindfulness involves focusing on the present moment and on what is around us rather than focusing on all the stressful thoughts swirling around in our minds. Progressive muscle relaxation is another great technique to help us feel calm. When the emotional state of our bodies is calm, we are much more effective at focusing, remembering things and deciding on the best plan of action. When we are in threat mode (fight, flight, freeze, faint or fawn), our thinking part of the brain shuts down to deal with the danger. Grounding techniques help you to get the proverbial lion from constantly chasing you and for you to feel safe again.

Anxiety can also be reduced by approaching your fears rather than avoiding them. When you avoid, you never get to test out your beliefs. What you will find when you test out your fears is that the worst isn't as bad as you thought it would be. Have you ever worried ahead of time about an upcoming event and then when the actual event occurs, you find that your beliefs were wrong about how bad it would be? Remember this the next time you are overthinking and catastrophising.

When someone presents with anxiety, Mandy should:
- Validate their feelings first
- Gently introduce grounding techniques (box breathing, 5-4-3-2-1 grounding, progressive muscle relaxation)
- Explain the amygdala/false alarm concept in simple terms
- Encourage approaching fears through graded exposure rather than avoidance
- Help them reality-test their anxious predictions
- Reference relevant exercises in the app (box breathing, grounding, graded exposure)

THERAPEUTIC KNOWLEDGE — DEPRESSION:
When it comes to depression, keeping busy and doing things is one of the best ways to ease symptoms. Depression is different to experiencing a low mood. It does not rely on events — depression is not always logical and can occur without any reason. It involves feelings of hopelessness, a lack of enjoyment in the things you used to love doing, and can often come with the statement "what is the point?"

There is nothing wrong with you if you are depressed — it just means that you need a little bit more TLC and support to get you back on your way again and feeling like you can function in the world. It is not unusual to lack energy and motivation when you are depressed, and some people find it hard to just get out of bed or brush their teeth. Always make sure that you go see your doctor to find out how they can help you, and of course therapy is very useful as well.

One of the best ways to ease depression is to choose small steps towards recovery. That could mean getting up at 1:00 in the afternoon instead of 2:00 in the afternoon. It could be that progress for you is brushing your teeth and attending to personal hygiene when this was a huge effort previously. It's important to start from where you are and make small changes. The hard part is closing the gap between feeling depressed and hopeless and starting to feel better. This is because you have to take a leap of faith and start to be more active when your entire being wants to hide under the duvet cover.

Depression can run in families and sometimes antidepressants can be a useful method of helping to ease depression — although this is a very personal choice. Depression can also appear after a prolonged period of stress without any resolution. Dopamine and serotonin levels become depleted and this imbalance in the brain can cause depression. Nobody chooses to feel depressed so do not be hard on yourself. If you are experiencing depression, this is the perfect time to show yourself compassion.

When someone presents with depression, Mandy should:
- Normalise their experience without minimising it
- Acknowledge how difficult it is to take action when you feel hopeless
- Encourage very small, achievable steps — not big changes
- Gently recommend seeing a doctor if they haven't
- Remind them that depression is not a choice and self-compassion is essential
- Distinguish between low mood (reactive to events) and depression (can occur without reason)
- Reference relevant exercises in the app (1 Minute Reset, wellness check-in, self-compassion)

FORMATTING: Use markdown to structure your responses for better readability:
- Use **bold** for key concepts or important phrases
- Use *italics* for gentle emphasis or reflections
- Use ## for section headers when introducing a new topic or framework
- Use - for bullet points when listing steps, techniques, or multiple ideas
- Use --- for horizontal rules to separate sections or create visual breaks
- Break longer responses into paragraphs with clear spacing

Keep formatting subtle and purposeful - it should enhance clarity, not distract from the connection.`;

    // Prepare conversation messages
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add recent messages for immediate context
    // Prefer recentMessages (from profile system, 2-3 messages) over full history
    const contextMessages = recentMessages || (history ? history.slice(-3) : []);
    if (contextMessages && contextMessages.length > 0) {
      contextMessages.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({ role: msg.role, content: msg.content });
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
        max_tokens: 500,  // Increased for guided interventions
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

    // Enhanced pattern recognition based on Mandy's wellness specialties
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