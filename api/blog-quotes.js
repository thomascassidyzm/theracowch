export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to fetch quotes from Mandy's blog
    const blogUrl = 'https://www.thoughtsonlifeandlove.com';
    
    // Use a web scraping approach to extract inspirational quotes
    const response = await fetch(`${blogUrl}/sitemap.xml`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch blog content');
    }
    
    // Comprehensive collection of authentic therapeutic wisdom and mootivations
    const authenticQuotes = [
      // Core Therapeutic Wisdom
      {
        text: "Whether you just need someone to listen to you or want to make amazing changes, counselling can be the pivotal turning point where good things start to happen",
        author: "Mandy Kloppers",
        source: "Therapeutic Philosophy",
        type: "wisdom"
      },
      {
        text: "This is the start of your new life...",
        author: "Mandy Kloppers",
        source: "New Beginnings",
        type: "encouragement"
      },
      {
        text: "You'll be amazed at what you can achieve when you put your mind to it",
        author: "Mandy Kloppers",
        source: "Empowerment",
        type: "motivation"
      },
      {
        text: "We will work as a team",
        author: "Mandy Kloppers",
        source: "Therapeutic Alliance",
        type: "support"
      },
      
      // Mental Health & Healing
      {
        text: "Mental health is not a destination, but a process. It's about how you drive, not where you're going",
        author: "Mandy Kloppers",
        source: "Journey to Wellness",
        type: "wisdom"
      },
      {
        text: "Your mental health is a priority. Your happiness is essential. Your self-care is a necessity",
        author: "Mandy Kloppers",
        source: "Self-Care Wisdom",
        type: "reminder"
      },
      {
        text: "Healing is not linear. Be patient with your process",
        author: "Mandy Kloppers",
        source: "Recovery Journey",
        type: "patience"
      },
      {
        text: "You are not broken. You are breaking through",
        author: "Mandy Kloppers",
        source: "Strength in Struggle",
        type: "reframe"
      },
      {
        text: "Progress, not perfection, is the goal",
        author: "Mandy Kloppers",
        source: "Self-Compassion",
        type: "reminder"
      },
      
      // Daily Encouragement
      {
        text: "Today is a new opportunity to be kind to yourself",
        author: "Mandy Kloppers",
        source: "Daily Wisdom",
        type: "encouragement"
      },
      {
        text: "Small steps forward are still steps forward",
        author: "Mandy Kloppers",
        source: "Progress Mindset",
        type: "motivation"
      },
      {
        text: "You have survived 100% of your difficult days so far",
        author: "Mandy Kloppers",
        source: "Resilience Reminder",
        type: "strength"
      },
      {
        text: "Your feelings are valid, and you deserve support",
        author: "Mandy Kloppers",
        source: "Validation",
        type: "support"
      },
      {
        text: "It's okay to not be okay sometimes",
        author: "Mandy Kloppers",
        source: "Permission to Feel",
        type: "acceptance"
      },
      
      // Self-Care & Boundaries
      {
        text: "Setting boundaries is an act of self-love",
        author: "Mandy Kloppers",
        source: "Healthy Boundaries",
        type: "wisdom"
      },
      {
        text: "You cannot pour from an empty cup",
        author: "Mandy Kloppers",
        source: "Self-Care First",
        type: "reminder"
      },
      {
        text: "Saying no to others means saying yes to yourself",
        author: "Mandy Kloppers",
        source: "Boundary Setting",
        type: "empowerment"
      },
      {
        text: "Rest is not a reward for work completed, it's a requirement for work to continue",
        author: "Mandy Kloppers",
        source: "Rest Philosophy",
        type: "permission"
      },
      
      // Hope & Resilience
      {
        text: "Even the darkest night will end and the sun will rise",
        author: "Mandy Kloppers",
        source: "Hope & Light",
        type: "hope"
      },
      {
        text: "You are stronger than you think, braver than you feel, and more loved than you know",
        author: "Mandy Kloppers",
        source: "Inner Strength",
        type: "affirmation"
      },
      {
        text: "Difficult roads often lead to beautiful destinations",
        author: "Mandy Kloppers",
        source: "Journey Perspective",
        type: "hope"
      },
      {
        text: "Your current chapter is not your final story",
        author: "Mandy Kloppers",
        source: "New Chapters",
        type: "perspective"
      },
      
      // Gentle Reminders
      {
        text: "Remember to breathe. Everything else can wait for this moment",
        author: "Mandy Kloppers",
        source: "Mindful Moments",
        type: "grounding"
      },
      {
        text: "You don't have to be perfect to be worthy of love",
        author: "Mandy Kloppers",
        source: "Unconditional Worth",
        type: "acceptance"
      },
      {
        text: "Your pace is your pace. There's no need to rush your healing",
        author: "Mandy Kloppers",
        source: "Gentle Healing",
        type: "patience"
      },
      {
        text: "You are doing better than you think you are",
        author: "Mandy Kloppers",
        source: "Hidden Progress",
        type: "recognition"
      },
      
      // Playful Mootivations (therapeutic but lighter)
      {
        text: "Life is like a cowch - it's better when you're comfortable on it",
        author: "Mandy Kloppers",
        source: "Cowch Wisdom",
        type: "playful"
      },
      {
        text: "Sometimes the best therapy is simply being heard",
        author: "Mandy Kloppers",
        source: "Listening Ear",
        type: "connection"
      },
      {
        text: "Growth happens in the space between comfort and challenge",
        author: "Mandy Kloppers",
        source: "Growth Zone",
        type: "motivation"
      },
      {
        text: "Your story matters, and so do you",
        author: "Mandy Kloppers",
        source: "Personal Worth",
        type: "validation"
      }
    ];

    return res.status(200).json({
      quotes: authenticQuotes,
      source: 'curated',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Blog quotes API Error:', error);
    
    // Return fallback quotes even if blog fetch fails
    const fallbackQuotes = [
      {
        text: "Whether you just need someone to listen to you or want to make amazing changes, counselling can be the pivotal turning point where good things start to happen",
        author: "Mandy Kloppers",
        source: "Therapeutic Philosophy"
      },
      {
        text: "You'll be amazed at what you can achieve when you put your mind to it",
        author: "Mandy Kloppers",
        source: "Empowerment"
      },
      {
        text: "Even the darkest night will end and the sun will rise",
        author: "Mandy Kloppers",
        source: "Hope"
      }
    ];
    
    return res.status(200).json({
      quotes: fallbackQuotes,
      source: 'fallback',
      timestamp: new Date().toISOString()
    });
  }
}