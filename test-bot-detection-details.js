#!/usr/bin/env node

/**
 * Test to verify bot detection details/reasons are properly generated
 */

// Import the bot detection logic (simulated here for testing)
function simulateBotDetection(metrics) {
  const result = {
    keyboardBotDetected: false,
    mouseBotDetected: false,
    confidence: 0,
    reasons: []
  };

  // Keyboard detection logic (from backend)
  if (metrics.keyboard) {
    const kb = metrics.keyboard;

    // Check for limited key variety
    if (kb.totalKeystrokes > 20 && kb.uniqueKeys <= 2) {
      result.keyboardBotDetected = true;
      result.confidence = Math.max(result.confidence, 0.9);
      result.reasons.push(`Only ${kb.uniqueKeys} unique keys used in ${kb.totalKeystrokes} keystrokes`);
    }

    // Check typing rhythm
    if (kb.typingRhythm && kb.typingRhythm.stdDeviationMs < 10) {
      result.keyboardBotDetected = true;
      result.confidence = Math.max(result.confidence, 0.95);
      result.reasons.push(`Very consistent typing rhythm (std dev: ${kb.typingRhythm.stdDeviationMs}ms)`);
    }

    // Check productive keystroke ratio
    if (kb.totalKeystrokes > 50 && kb.productiveKeystrokes === kb.totalKeystrokes) {
      result.keyboardBotDetected = true;
      result.confidence = Math.max(result.confidence, 0.6);
      result.reasons.push('100% productive keystrokes is unusual');
    }
  }

  // Mouse detection logic
  if (metrics.mouse) {
    const m = metrics.mouse;

    if (m.movementPattern) {
      // Slow smooth movement (PyAutoGUI signature)
      if (m.movementPattern.smooth && m.movementPattern.avgSpeed > 0 && m.movementPattern.avgSpeed <= 3) {
        result.mouseBotDetected = true;
        result.confidence = Math.max(result.confidence, 0.95);
        result.reasons.push(`Unnaturally slow smooth movement: ${m.movementPattern.avgSpeed}px/s (bot-like)`);
      }
    }

    // Many clicks with minimal movement
    if (m.totalClicks > 20 && m.distancePixels < 100) {
      result.mouseBotDetected = true;
      result.confidence = Math.max(result.confidence, 0.8);
      result.reasons.push(`Many clicks (${m.totalClicks}) with minimal movement (${m.distancePixels}px)`);
    }
  }

  return result;
}

// Test case matching the example you provided
const testMetrics = {
  keyboard: {
    totalKeystrokes: 2025,
    uniqueKeys: 1,
    productiveKeystrokes: 2025,
    typingRhythm: {
      consistent: true,
      stdDeviationMs: 8.239323091344462
    }
  },
  mouse: {
    totalClicks: 15,
    totalScrolls: 5,
    distancePixels: 50,
    movementPattern: {
      smooth: true,
      avgSpeed: 2.5
    }
  }
};

console.log('Testing Bot Detection Details Generation');
console.log('=========================================\n');

console.log('Test Metrics (similar to screenshot e452b280-fdc6-44b9-8262-43e92e88774c):');
console.log(`- Keystrokes: ${testMetrics.keyboard.totalKeystrokes}`);
console.log(`- Unique Keys: ${testMetrics.keyboard.uniqueKeys}`);
console.log(`- Typing Rhythm Std Dev: ${testMetrics.keyboard.typingRhythm.stdDeviationMs}ms`);
console.log(`- Productive Keystrokes: ${testMetrics.keyboard.productiveKeystrokes}`);
console.log(`- Mouse Movement Speed: ${testMetrics.mouse.movementPattern.avgSpeed}px/s\n`);

const detectionResult = simulateBotDetection(testMetrics);

console.log('Bot Detection Results:');
console.log('----------------------');
console.log(`Keyboard Bot Detected: ${detectionResult.keyboardBotDetected}`);
console.log(`Mouse Bot Detected: ${detectionResult.mouseBotDetected}`);
console.log(`Confidence: ${(detectionResult.confidence * 100).toFixed(0)}%\n`);

console.log('Detailed Reasons (these should appear in admin app):');
console.log('----------------------------------------------------');
detectionResult.reasons.forEach((reason, idx) => {
  console.log(`${idx + 1}. ${reason}`);
});

console.log('\n✅ Expected Admin Display:');
console.log('The admin app should show these exact detailed reasons:');
console.log('- "Only 1 unique keys used in 2025 keystrokes"');
console.log('- "Very consistent typing rhythm (std dev: 8.239323091344462ms)"');
console.log('- "100% productive keystrokes is unusual"');
console.log('- "Unnaturally slow smooth movement: 2.5px/s (bot-like)"');

console.log('\n📝 Backend Changes Made:');
console.log('1. activity.service.ts now maps "reasons" to "details" field');
console.log('2. screenshots.service.ts checks both "details" and "reasons" fields');
console.log('3. Bot detection service generates detailed, descriptive reasons');

console.log('\n🔍 To Verify in Production:');
console.log('1. Check an activity period with bot detection');
console.log('2. Look for the "details" field in the API response');
console.log('3. Confirm admin app displays the detailed reasons');
console.log('4. Compare with the old detailed messages you mentioned');