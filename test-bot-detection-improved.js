const { Client } = require('pg');

// Database connection
const client = new Client({
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.wbqjfspfleboymnvkkte',
  password: 'FIr5FKZ3YqwRuxxv',
  database: 'postgres'
});

// Bot detection logic from the improved service
function analyzeKeystrokeSequences(keystrokeCodes) {
  if (!keystrokeCodes || keystrokeCodes.length < 50) {
    return { detected: false, confidence: 0, reason: '' };
  }

  // Check for single-key repetitions
  const keyFrequency = new Map();
  for (const key of keystrokeCodes) {
    keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1);
  }

  // Find most frequent key
  let maxFrequency = 0;
  let mostFrequentKey = 0;
  for (const [key, freq] of keyFrequency.entries()) {
    if (freq > maxFrequency) {
      maxFrequency = freq;
      mostFrequentKey = key;
    }
  }

  // Check for massive single-key repetitions
  const repetitionRatio = maxFrequency / keystrokeCodes.length;
  if (repetitionRatio > 0.4 && maxFrequency > 50) {
    return {
      detected: true,
      confidence: 0.95,
      reason: `Bot detected: Key ${mostFrequentKey} pressed ${maxFrequency} times (${(repetitionRatio * 100).toFixed(0)}% of all keystrokes)`
    };
  }

  // Check for consecutive repetitions
  let maxConsecutive = 0;
  let currentConsecutive = 1;
  let consecutiveKey = 0;
  for (let i = 1; i < keystrokeCodes.length; i++) {
    if (keystrokeCodes[i] === keystrokeCodes[i - 1]) {
      currentConsecutive++;
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive;
        consecutiveKey = keystrokeCodes[i];
      }
    } else {
      currentConsecutive = 1;
    }
  }

  if (maxConsecutive >= 8) {
    return {
      detected: true,
      confidence: 0.9,
      reason: `Bot detected: Key ${consecutiveKey} pressed ${maxConsecutive} times consecutively`
    };
  }

  return { detected: false, confidence: 0, reason: '' };
}

async function testBotDetection() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Get the bot test screenshot data
    const query = `
      SELECT
        ap.id,
        ap."screenshotId",
        ap.metrics->'keyboard'->'keystrokeCodes' as keystroke_codes,
        ap.metrics->'botDetection' as current_bot_detection
      FROM activity_periods ap
      WHERE ap."screenshotId" = '5b138143-1fab-4a48-8595-14d7a9ea5b07'
      LIMIT 1
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      console.log('No activity period found for this screenshot');
      return;
    }

    const activityPeriod = result.rows[0];
    const keystrokeCodes = activityPeriod.keystroke_codes;
    const currentDetection = activityPeriod.current_bot_detection;

    console.log('\n=== Current Bot Detection Status ===');
    console.log('Activity Period ID:', activityPeriod.id);
    console.log('Current Detection:', JSON.stringify(currentDetection, null, 2));

    if (keystrokeCodes && Array.isArray(keystrokeCodes)) {
      console.log('\n=== Keystroke Analysis ===');
      console.log('Total keystrokes:', keystrokeCodes.length);

      // Count frequency
      const frequency = {};
      for (const key of keystrokeCodes) {
        frequency[key] = (frequency[key] || 0) + 1;
      }

      // Show top 10 most frequent keys
      const sortedKeys = Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      console.log('\nTop 10 most frequent keys:');
      sortedKeys.forEach(([key, count]) => {
        const percentage = ((count / keystrokeCodes.length) * 100).toFixed(1);
        console.log(`  Key ${key}: ${count} times (${percentage}%)`);
      });

      // Run improved bot detection
      console.log('\n=== Improved Bot Detection Result ===');
      const detection = analyzeKeystrokeSequences(keystrokeCodes);
      console.log('Detection result:', JSON.stringify(detection, null, 2));

      if (detection.detected) {
        console.log('\n🚨 BOT ACTIVITY DETECTED! 🚨');
        console.log('Confidence:', (detection.confidence * 100).toFixed(0) + '%');
        console.log('Reason:', detection.reason);
      } else {
        console.log('\n✅ No bot activity detected');
      }
    } else {
      console.log('No keystroke codes available for analysis');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('\nDisconnected from database');
  }
}

testBotDetection();