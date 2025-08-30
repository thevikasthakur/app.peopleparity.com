#!/usr/bin/env node

/**
 * Test script to verify that detailed activity metrics are being collected and stored
 */

const { MetricsCollector } = require('./apps/desktop/dist/main/services/metricsCollector');

// Create a metrics collector instance
const collector = new MetricsCollector();

// Simulate some keyboard activity
console.log('Simulating keyboard activity...');
for (let i = 0; i < 100; i++) {
  collector.recordKeystroke(65 + (i % 26), Date.now() + i * 50); // Simulate typing at 50ms intervals
}

// Simulate some mouse activity
console.log('Simulating mouse activity...');
for (let i = 0; i < 50; i++) {
  collector.recordClick(Date.now() + i * 200); // Simulate clicks at 200ms intervals
  collector.recordMousePosition(100 + i * 10, 200 + i * 5, Date.now() + i * 100);
}

// Generate metrics breakdown
const metrics = collector.generateMetricsBreakdown(
  {
    keyHits: 100,
    productiveKeyHits: 80,
    navigationKeyHits: 20,
    uniqueKeys: new Set([...Array(26).keys()].map(i => 65 + i)),
    productiveUniqueKeys: new Set([...Array(20).keys()].map(i => 65 + i)),
    mouseClicks: 50,
    rightClicks: 5,
    doubleClicks: 10,
    mouseScrolls: 30,
    mouseDistance: 5000,
    activeSeconds: 55
  },
  60 // 60 second period
);

// Display the results
console.log('\n=== Detailed Activity Metrics ===\n');

console.log('Keyboard Metrics:');
console.log('  Total Keystrokes:', metrics.keyboard.totalKeystrokes);
console.log('  Productive Keystrokes:', metrics.keyboard.productiveKeystrokes);
console.log('  Unique Keys:', metrics.keyboard.uniqueKeys);
console.log('  Keys Per Minute:', metrics.keyboard.keysPerMinute.toFixed(1));
console.log('  Typing Rhythm:', metrics.keyboard.typingRhythm);

console.log('\nMouse Metrics:');
console.log('  Total Clicks:', metrics.mouse.totalClicks);
console.log('  Distance (pixels):', metrics.mouse.distancePixels);
console.log('  Distance Per Minute:', metrics.mouse.distancePerMinute.toFixed(1));

console.log('\nBot Detection:');
console.log('  Keyboard Bot Detected:', metrics.botDetection.keyboardBotDetected);
console.log('  Mouse Bot Detected:', metrics.botDetection.mouseBotDetected);
console.log('  Confidence:', (metrics.botDetection.confidence * 100).toFixed(1) + '%');
if (metrics.botDetection.details.length > 0) {
  console.log('  Details:', metrics.botDetection.details.join(', '));
}

console.log('\nScore Calculation:');
console.log('  Components:', metrics.scoreCalculation.components);
console.log('  Penalties:', metrics.scoreCalculation.penalties);
console.log('  Formula:', metrics.scoreCalculation.formula);
console.log('  Final Score:', metrics.scoreCalculation.finalScore);

console.log('\nClassification:');
console.log('  Category:', metrics.classification.category);
console.log('  Confidence:', (metrics.classification.confidence * 100).toFixed(1) + '%');
console.log('  Tags:', metrics.classification.tags.join(', '));

console.log('\nMetadata:');
console.log('  Version:', metrics.metadata.version);
console.log('  Calculation Time:', metrics.metadata.calculationTimeMs + 'ms');

// Show JSON size
const jsonSize = JSON.stringify(metrics).length;
console.log('\nJSON Size:', jsonSize, 'bytes');

console.log('\n✅ Metrics collection test completed successfully!');