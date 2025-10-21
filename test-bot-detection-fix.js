const { BotDetectionService } = require('./apps/api/dist/modules/activity/bot-detection.service');

// Test case 1: Real activity with phantom keys (like the reported issue)
const testCase1 = {
  keyboard: {
    totalKeystrokes: 600,
    uniqueKeys: 25,
    productiveKeystrokes: 450,
    keysPerMinute: 45,
    typingRhythm: {
      consistent: false,
      stdDeviationMs: 145825.69
    },
    // Simulating the exact pattern from the reported issue - normal typing followed by 19 phantom keys
    keystrokeCodes: [
      // Normal typing keys
      ...Array(100).fill(0).map(() => Math.floor(Math.random() * 100) + 1),
      // Then suddenly 19 consecutive phantom keys at the end (the bug!)
      ...Array(19).fill(57390)
    ]
  }
};

// Test case 2: Real bot activity (should still be detected)
const testCase2 = {
  keyboard: {
    totalKeystrokes: 500,
    uniqueKeys: 2,
    productiveKeystrokes: 500,
    keysPerMinute: 120,
    typingRhythm: {
      consistent: true,
      stdDeviationMs: 3
    },
    // Single key repeated (real bot pattern)
    keystrokeCodes: Array(500).fill(65) // 'A' key repeated 500 times
  }
};

// Test case 3: Normal typing (should not be flagged)
const testCase3 = {
  keyboard: {
    totalKeystrokes: 200,
    uniqueKeys: 30,
    productiveKeystrokes: 150,
    keysPerMinute: 55,
    typingRhythm: {
      consistent: false,
      stdDeviationMs: 250
    },
    // Normal varied typing
    keystrokeCodes: Array(200).fill(0).map(() => Math.floor(Math.random() * 100) + 1)
  }
};

console.log('Testing Bot Detection Service Fix...\n');

const service = new BotDetectionService();

console.log('Test Case 1: Real typing with phantom keys (reported issue)');
console.log('Expected: NOT flagged as bot (phantom keys should be filtered)');
const result1 = service.detectBotActivity(testCase1);
console.log(`Result: ${result1.keyboardBotDetected ? '❌ FLAGGED AS BOT' : '✅ NOT FLAGGED'}`);
console.log(`Confidence: ${result1.confidence}`);
console.log(`Reasons: ${result1.reasons.join(', ') || 'None'}`);
console.log('---\n');

console.log('Test Case 2: Real bot activity');
console.log('Expected: FLAGGED as bot');
const result2 = service.detectBotActivity(testCase2);
console.log(`Result: ${result2.keyboardBotDetected ? '✅ FLAGGED AS BOT' : '❌ NOT FLAGGED'}`);
console.log(`Confidence: ${result2.confidence}`);
console.log(`Reasons: ${result2.reasons.join(', ') || 'None'}`);
console.log('---\n');

console.log('Test Case 3: Normal typing');
console.log('Expected: NOT flagged as bot');
const result3 = service.detectBotActivity(testCase3);
console.log(`Result: ${result3.keyboardBotDetected ? '❌ FLAGGED AS BOT' : '✅ NOT FLAGGED'}`);
console.log(`Confidence: ${result3.confidence}`);
console.log(`Reasons: ${result3.reasons.join(', ') || 'None'}`);
console.log('---\n');

// Test the exact scenario from the database
console.log('Test Case 4: Exact scenario from screenshot fa94d759-5750-4dbd-80c6-080037f8de12');
const testCase4 = {
  keyboard: {
    totalKeystrokes: 700,
    uniqueKeys: 6, // As shown in the data
    productiveKeystrokes: 400,
    keysPerMinute: 15,
    typingRhythm: {
      consistent: true,
      avgIntervalMs: 6885.81,
      stdDeviationMs: 145825.69
    },
    // The exact pattern that was incorrectly flagged
    keystrokeCodes: [
      // Normal typing
      20, 35, 23, 49, 37, 57, 29, 57419, 57419, 42, 34, 24, 24, 32, 57, 42, 50, 24, 19, 49,
      49, 34, 29, 14, 42, 50, 24, 19, 49, 23, 49, 34, 57, 42, 2, 42, 28, 30, 17, 31, 57,
      // More normal keys...
      48, 23, 38, 38, 57, 23, 31, 57, 25, 18, 49, 32, 23, 49, 34, 57, 48, 18, 46, 30, 22,
      // Then the problematic phantom keys at the end
      ...Array(19).fill(57390)
    ]
  }
};

console.log('Expected: NOT flagged as bot (phantom keys 57390 should be filtered)');
const result4 = service.detectBotActivity(testCase4);
console.log(`Result: ${result4.keyboardBotDetected ? '❌ FLAGGED AS BOT' : '✅ NOT FLAGGED'}`);
console.log(`Confidence: ${result4.confidence}`);
console.log(`Reasons: ${result4.reasons.join(', ') || 'None'}`);
console.log('---\n');

const allPassed = !result1.keyboardBotDetected &&
                  result2.keyboardBotDetected &&
                  !result3.keyboardBotDetected &&
                  !result4.keyboardBotDetected;

console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed');