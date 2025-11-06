// Live test script for Mandy's AI voice using Claude API
// Run: ANTHROPIC_API_KEY=your_key node test-mandy-voice-live.js

const fs = require('fs');
const path = require('path');

// Check for API key
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("❌ Error: ANTHROPIC_API_KEY environment variable not set");
  console.log("\nRun with: ANTHROPIC_API_KEY=your_key node test-mandy-voice-live.js\n");
  process.exit(1);
}

// Test queries
const testQueries = [
  {
    name: "Anxiety Query",
    message: "I've been feeling really anxious lately, like there's a knot in my stomach all the time. I can't seem to relax.",
    expectedPattern: "anxiety",
    checkFor: ["Thanks for", "It sounds", "curious", "wonder"]
  },
  {
    name: "Perfectionism Query",
    message: "I constantly put pressure on myself and feel like nothing I do is ever good enough. I'm exhausted but can't stop pushing.",
    expectedPattern: "perfectionism",
    checkFor: ["Thanks for", "perfectionism", "pressure"]
  },
  {
    name: "Relationship Query",
    message: "My relationship is falling apart. We just keep arguing and I don't know how to fix it.",
    expectedPattern: "relationships",
    checkFor: ["Thanks for", "It sounds", "examples"]
  }
];

// Load enhanced prompts
function loadEnhancedPrompts() {
  const promptPath = path.join(__dirname, 'public', 'imagine-framework-prompts.txt');
  return fs.readFileSync(promptPath, 'utf-8');
}

// Call Claude API
async function testMandyResponse(systemPrompt, userMessage) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ANTHROPIC_API_KEY,
        'Anthropic-Version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: [
          {
            type: 'text',
            text: systemPrompt + "\n\nRespond authentically as Mandy Kloppers would - combining professional expertise with genuine compassion and practical guidance. Keep responses to 2-3 sentences maximum.",
            cache_control: { type: 'ephemeral' }
          }
        ],
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error.message);
    return null;
  }
}

// Analyze response quality
function analyzeResponse(response, expectedElements) {
  const analysis = {
    length: response.length,
    sentenceCount: (response.match(/[.!?]+/g) || []).length,
    hasMandy Phrases: false,
    matchedElements: [],
    warmth: false,
    professional: false,
    concise: response.length < 500 // 2-3 sentences should be < 500 chars
  };

  // Check for expected elements
  expectedElements.forEach(element => {
    if (response.toLowerCase().includes(element.toLowerCase())) {
      analysis.matchedElements.push(element);
    }
  });

  // Check for Mandy phrases
  const mandyPhrases = ["thanks for", "it sounds", "i wonder", "i am curious", "what are your thoughts"];
  analysis.hasMandyPhrases = mandyPhrases.some(phrase =>
    response.toLowerCase().includes(phrase)
  );

  // Check for warmth indicators
  const warmthIndicators = ["😊", "🙂", "oooh", "that's great", "thanks for"];
  analysis.warmth = warmthIndicators.some(indicator =>
    response.toLowerCase().includes(indicator.toLowerCase())
  );

  // Check professional language
  analysis.professional = !response.includes("I can't") &&
                          !response.includes("I don't know") &&
                          response.length > 50; // Not too short

  return analysis;
}

// Main test execution
async function runTests() {
  console.log("========================================");
  console.log("MANDY AI VOICE - LIVE API TEST");
  console.log("========================================\n");

  const systemPrompt = loadEnhancedPrompts();
  console.log("✅ Loaded enhanced system prompt");
  console.log(`   Length: ${systemPrompt.length} characters\n`);

  console.log("Running tests with Claude API...\n");
  console.log("========================================\n");

  for (const query of testQueries) {
    console.log(`TEST: ${query.name}`);
    console.log(`Query: "${query.message}"`);
    console.log(`Expected pattern: ${query.expectedPattern}\n`);

    const response = await testMandyResponse(systemPrompt, query.message);

    if (!response) {
      console.log("❌ Failed to get response\n");
      continue;
    }

    console.log("RESPONSE:");
    console.log("─".repeat(60));
    console.log(response);
    console.log("─".repeat(60));

    const analysis = analyzeResponse(response, query.checkFor);

    console.log("\nANALYSIS:");
    console.log(`  Length: ${analysis.length} characters`);
    console.log(`  Sentences: ${analysis.sentenceCount}`);
    console.log(`  ${analysis.hasMandyPhrases ? "✅" : "❌"} Uses Mandy's signature phrases`);
    console.log(`  ${analysis.concise ? "✅" : "⚠️"} Concise (2-3 sentences)`);
    console.log(`  ${analysis.warmth ? "✅" : "⚠️"} Warm tone`);
    console.log(`  ${analysis.professional ? "✅" : "⚠️"} Professional boundaries`);

    if (analysis.matchedElements.length > 0) {
      console.log(`  ✅ Matched expected elements: ${analysis.matchedElements.join(", ")}`);
    } else {
      console.log(`  ⚠️  No expected elements matched`);
    }

    const score = (
      (analysis.hasMandyPhrases ? 25 : 0) +
      (analysis.concise ? 25 : 0) +
      (analysis.warmth ? 25 : 0) +
      (analysis.professional ? 25 : 0)
    );

    console.log(`\n  SCORE: ${score}/100`);

    if (score >= 75) {
      console.log("  ✅ EXCELLENT - Sounds like Mandy!");
    } else if (score >= 50) {
      console.log("  ⚠️  GOOD - Close to Mandy's style");
    } else {
      console.log("  ❌ NEEDS IMPROVEMENT");
    }

    console.log("\n" + "=".repeat(60) + "\n");
  }

  console.log("========================================");
  console.log("TEST COMPLETE");
  console.log("========================================\n");
}

// Run tests
runTests().catch(error => {
  console.error("Test execution failed:", error);
  process.exit(1);
});
