// Test script for Mandy's AI voice
// Run: node test-mandy-voice.js

const fs = require('fs');
const path = require('path');

// Test queries representing different patterns
const testQueries = [
  {
    name: "Anxiety Query",
    message: "I've been feeling really anxious lately, like there's a knot in my stomach all the time. I can't seem to relax.",
    expectedPattern: "anxiety",
    expectedElements: [
      "Thanks for sharing",
      "It sounds",
      "I wonder" || "I am curious",
      "fight/flight" || "lion"
    ]
  },
  {
    name: "Perfectionism Query",
    message: "I constantly put pressure on myself and feel like nothing I do is ever good enough. I'm exhausted but can't stop pushing.",
    expectedPattern: "perfectionism",
    expectedElements: [
      "Thanks for",
      "perfectionism",
      "black and white",
      "What are your thoughts?"
    ]
  },
  {
    name: "Relationship Query",
    message: "My relationship is falling apart. We just keep arguing and I don't know how to fix it.",
    expectedPattern: "relationships",
    expectedElements: [
      "Thanks for",
      "It sounds",
      "examples"
    ]
  },
  {
    name: "General Stress Query",
    message: "Everything just feels overwhelming right now.",
    expectedPattern: "general",
    expectedElements: [
      "Thanks for" || "It sounds",
      "curious" || "wonder",
      "question"
    ]
  }
];

// Load the enhanced prompts
function loadEnhancedPrompts() {
  const promptPath = path.join(__dirname, 'public', 'imagine-framework-prompts.txt');
  try {
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error) {
    console.error('Error loading enhanced prompts:', error);
    return null;
  }
}

// Simulate AI response (for testing structure without API call)
function analyzePromptStructure(systemPrompt) {
  const analysis = {
    hasSignaturePhrases: false,
    hasResponsePattern: false,
    hasRealExamples: false,
    hasPerfectionismCycle: false,
    hasLionMetaphor: false,
    hasGroundingTechniques: false,
    hasPressureSensitivity: false,
    totalLength: systemPrompt.length
  };

  // Check for key Mandy elements
  analysis.hasSignaturePhrases = systemPrompt.includes("Thanks for sharing") &&
                                   systemPrompt.includes("I am curious");
  analysis.hasResponsePattern = systemPrompt.includes("MANDY'S RESPONSE PATTERN");
  analysis.hasRealExamples = systemPrompt.includes("REAL CONVERSATION EXAMPLES");
  analysis.hasPerfectionismCycle = systemPrompt.includes("THE PERFECTIONISM CYCLE");
  analysis.hasLionMetaphor = systemPrompt.includes("lion chasing you");
  analysis.hasGroundingTechniques = systemPrompt.includes("box breathing");
  analysis.hasPressureSensitivity = systemPrompt.includes("PRESSURE-SENSITIVE");

  return analysis;
}

// Test the prompt structure
console.log("========================================");
console.log("MANDY AI VOICE ENHANCEMENT TEST");
console.log("========================================\n");

const enhancedPrompts = loadEnhancedPrompts();

if (!enhancedPrompts) {
  console.error("❌ Failed to load enhanced prompts");
  process.exit(1);
}

console.log("✅ Enhanced prompts loaded successfully");
console.log(`   Length: ${enhancedPrompts.length} characters\n`);

// Analyze structure
console.log("STRUCTURAL ANALYSIS:");
console.log("========================================");
const analysis = analyzePromptStructure(enhancedPrompts);

Object.entries(analysis).forEach(([key, value]) => {
  const emoji = value ? "✅" : "❌";
  const label = key.replace(/([A-Z])/g, ' $1').trim();
  console.log(`${emoji} ${label}: ${value}`);
});

console.log("\n");

// Check for specific Mandy phrases
console.log("MANDY'S SIGNATURE PHRASES:");
console.log("========================================");
const mandyPhrases = [
  "Thanks for sharing",
  "I am curious as to why",
  "I wonder what",
  "It sounds like",
  "It sounds as if",
  "How does that sound?",
  "What are your thoughts?",
  "We will explore this together",
  "don't worry too much about it",
  "just do what you can"
];

mandyPhrases.forEach(phrase => {
  const found = enhancedPrompts.includes(phrase);
  const emoji = found ? "✅" : "❌";
  console.log(`${emoji} "${phrase}"`);
});

console.log("\n");

// Check for real session examples
console.log("REAL SESSION EXAMPLES:");
console.log("========================================");
const examples = [
  "oooh do you get samples",
  "very fast typist",
  "sorry for the typos",
  "lion chasing you 24/7",
  "perfectionism model is just a guide"
];

examples.forEach(example => {
  const found = enhancedPrompts.includes(example);
  const emoji = found ? "✅" : "❌";
  console.log(`${emoji} "${example}"`);
});

console.log("\n");

// Summary
console.log("SUMMARY:");
console.log("========================================");
const totalChecks = Object.keys(analysis).length + mandyPhrases.length + examples.length;
const passedChecks = Object.values(analysis).filter(v => v === true).length +
                     mandyPhrases.filter(p => enhancedPrompts.includes(p)).length +
                     examples.filter(e => enhancedPrompts.includes(e)).length;
const percentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`Score: ${passedChecks}/${totalChecks} checks passed (${percentage}%)`);

if (percentage >= 90) {
  console.log("✅ EXCELLENT - Training prompts are comprehensive!");
} else if (percentage >= 70) {
  console.log("⚠️  GOOD - Some elements could be enhanced");
} else {
  console.log("❌ NEEDS WORK - Missing key Mandy elements");
}

console.log("\n");

// Test query expectations
console.log("TEST QUERY SCENARIOS:");
console.log("========================================");
testQueries.forEach((query, index) => {
  console.log(`\n${index + 1}. ${query.name}`);
  console.log(`   Query: "${query.message}"`);
  console.log(`   Expected Pattern: ${query.expectedPattern}`);
  console.log(`   Expected Elements:`);
  query.expectedElements.forEach(element => {
    console.log(`   - ${element}`);
  });
});

console.log("\n");
console.log("========================================");
console.log("To test with live API, set ANTHROPIC_API_KEY");
console.log("and run: node test-mandy-voice-live.js");
console.log("========================================\n");
