const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// Open the database
const dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'time-tracker', 'local.db');
console.log('Opening database at:', dbPath);
const db = new Database(dbPath, { readonly: true });

// Get the current user
const user = db.prepare('SELECT id, email FROM users ORDER BY createdAt DESC LIMIT 1').get();
console.log('User:', user);

// Test date: Sep 7, 2025
const testDate = new Date('2025-09-07');
const startOfDay = new Date(testDate);
startOfDay.setUTCHours(0, 0, 0, 0);
const endOfDay = new Date(testDate);
endOfDay.setUTCHours(23, 59, 59, 999);

console.log('\n=== Testing Sep 7, 2025 ===');
console.log('Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

// Get all screenshots for Sep 7
const screenshots = db.prepare(`
  SELECT s.id, s.capturedAt, s.mode
  FROM screenshots s
  WHERE s.userId = ? 
    AND s.capturedAt >= ?
    AND s.capturedAt <= ?
  ORDER BY s.capturedAt ASC
`).all(user.id, startOfDay.getTime(), endOfDay.getTime());

console.log('\nTotal screenshots on Sep 7:', screenshots.length);

// Analyze each screenshot
let validCount = 0;
let criticalValidByNeighbor = 0;
let criticalValidByHourly = 0;
let criticalInvalid = 0;
let highValid = 0;
let lowInvalid = 0;

for (let i = 0; i < screenshots.length; i++) {
  const screenshot = screenshots[i];
  
  // Get activity periods for this screenshot
  const periods = db.prepare(`
    SELECT activityScore
    FROM activity_periods
    WHERE screenshotId = ?
    ORDER BY activityScore DESC
  `).all(screenshot.id);
  
  if (periods.length === 0) continue;
  
  // Calculate weighted score (simplified version)
  const scores = periods.map(p => p.activityScore);
  let weightedScore;
  
  if (scores.length > 8) {
    // Take best 8
    const best8 = scores.slice(0, 8);
    weightedScore = best8.reduce((a, b) => a + b, 0) / best8.length;
  } else if (scores.length > 4) {
    // Discard worst 1
    const withoutWorst = scores.slice(0, -1);
    weightedScore = withoutWorst.reduce((a, b) => a + b, 0) / withoutWorst.length;
  } else {
    // Simple average
    weightedScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  }
  
  const uiScore = weightedScore / 10;
  const time = new Date(screenshot.capturedAt);
  
  // Get neighbor scores
  const prevScore = i > 0 ? null : null; // Simplified for now
  const nextScore = i < screenshots.length - 1 ? null : null; // Simplified for now
  
  // Determine validation
  let isValid = false;
  let reason = '';
  
  if (weightedScore >= 40) {
    isValid = true;
    reason = `High (${uiScore.toFixed(1)})`;
    highValid++;
  } else if (weightedScore >= 25 && weightedScore < 40) {
    // This is where the bug might be - let's see how many fall into this category
    reason = `Critical (${uiScore.toFixed(1)})`;
    
    // For now, let's just count them as invalid to see the distribution
    criticalInvalid++;
  } else {
    reason = `Low (${uiScore.toFixed(1)})`;
    lowInvalid++;
  }
  
  if (isValid) validCount++;
  
  // Log first 10 for inspection
  if (i < 10) {
    console.log(`  ${i+1}. ${time.toLocaleTimeString()} - ${reason} - ${isValid ? 'VALID' : 'INVALID'}`);
  }
}

console.log('\n=== Summary ===');
console.log('High (>= 4.0):', highValid);
console.log('Critical (2.5-4.0):', criticalInvalid);
console.log('Low (< 2.5):', lowInvalid);
console.log('Total valid:', validCount);
console.log('Productive hours:', (validCount * 10 / 60).toFixed(2), 'hours');

// Check what the current implementation returns
const currentHours = db.prepare(`
  SELECT SUM(
    CASE 
      WHEN mode = 'client_hours' THEN 10.0 / 60.0
      ELSE 0
    END
  ) as clientHours,
  SUM(
    CASE 
      WHEN mode = 'command_hours' THEN 10.0 / 60.0
      ELSE 0
    END
  ) as commandHours
  FROM (
    SELECT DISTINCT s.id, s.mode
    FROM screenshots s
    INNER JOIN activity_periods ap ON ap.screenshotId = s.id
    WHERE s.userId = ?
      AND s.capturedAt >= ?
      AND s.capturedAt <= ?
      AND ap.screenshotId IS NOT NULL
  )
`).get(user.id, startOfDay.getTime(), endOfDay.getTime());

console.log('\nCurrent DB calculation:');
console.log('Client hours:', currentHours.clientHours?.toFixed(2) || '0.00');
console.log('Command hours:', currentHours.commandHours?.toFixed(2) || '0.00');
console.log('Total hours:', ((currentHours.clientHours || 0) + (currentHours.commandHours || 0)).toFixed(2));

db.close();