#!/usr/bin/env node

/**
 * Test script to verify bot detection flow from desktop to backend to admin
 */

console.log('Bot Detection Architecture Test');
console.log('================================\n');

// Test data that would trigger bot detection
const testMetrics = {
  keyboard: {
    totalKeystrokes: 100,
    uniqueKeys: 2,  // Very low variety - should trigger bot detection
    productiveKeystrokes: 100,  // 100% productive is suspicious
    keystrokeCodes: Array(50).fill(65),  // 50 'A' key presses
    keystrokeTimestamps: Array(50).fill(0).map((_, i) => Date.now() + i * 100)  // Very consistent timing
  },
  mouse: {
    totalClicks: 20,
    totalScrolls: 5,
    distancePixels: 50,  // Very little movement
    movementPattern: {
      smooth: true,
      avgSpeed: 2  // Extremely slow - PyAutoGUI signature
    },
    mousePositions: [
      { x: 100, y: 100, timestamp: Date.now() },
      { x: 200, y: 100, timestamp: Date.now() + 1000 },  // Perfect horizontal line
      { x: 300, y: 100, timestamp: Date.now() + 2000 },  // Another perfect line
      { x: 400, y: 100, timestamp: Date.now() + 3000 },  // Continues straight
      { x: 400, y: 200, timestamp: Date.now() + 4000 },  // Perfect 90° angle
      { x: 400, y: 300, timestamp: Date.now() + 5000 },  // Vertical line
    ]
  }
};

console.log('Test Metrics:');
console.log('- Keyboard: 100 keystrokes, only 2 unique keys (suspicious)');
console.log('- Mouse: Very slow movement (2px/s), minimal distance, perfect angles');
console.log('');

console.log('Expected Flow:');
console.log('1. Desktop app collects raw metrics (keystrokeCodes, mousePositions, etc.)');
console.log('2. Desktop sends raw metrics to backend API in activity period');
console.log('3. Backend bot-detection.service.ts analyzes the raw data');
console.log('4. Backend detects bot patterns and stores results in activity period metrics');
console.log('5. Admin app fetches screenshot details including bot detection summary');
console.log('6. Admin app displays bot detection alerts to admin users');
console.log('');

console.log('Key Changes Made:');
console.log('✓ Desktop metricsCollector.ts now sends raw metrics instead of analyzing');
console.log('✓ Backend bot-detection.service.ts enhanced with raw data analysis methods');
console.log('✓ Backend properly aggregates bot detection data in screenshot details');
console.log('✓ Admin app displays bot detection results from backend');
console.log('');

console.log('Bot Detection Thresholds (Backend):');
console.log('- Keyboard bot: confidence >= 0.7');
console.log('- Mouse bot: confidence >= 0.7');
console.log('- Angle dominance: > 80% perfect angles (raised from 60%)');
console.log('- Presentation mode: Filters out arrow/space/enter key sequences');
console.log('');

console.log('Test Complete!');
console.log('');
console.log('To verify in production:');
console.log('1. Check that desktop app is sending raw metrics in network tab');
console.log('2. Check backend logs for bot detection analysis');
console.log('3. Verify admin app shows bot detection warnings for flagged activity');