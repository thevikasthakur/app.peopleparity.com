const Database = require('better-sqlite3');
const path = require('path');

// Open the database
const dbPath = path.join(process.env.HOME, 'Library/Application Support/Electron/local_tracking.db');
const db = new Database(dbPath);

// Test date with data
const testDate = new Date('2025-09-20');
const startOfDay = new Date(testDate);
startOfDay.setUTCHours(0, 0, 0, 0);
const endOfDay = new Date(testDate);
endOfDay.setUTCHours(23, 59, 59, 999);

console.log('Testing date:', testDate.toISOString());
console.log('UTC range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());

// Get user ID
const user = db.prepare('SELECT id FROM users LIMIT 1').get();
if (!user) {
  console.error('No user found');
  process.exit(1);
}

console.log('\n=== PRODUCTIVE HOURS CALCULATION (getDateStats logic) ===');

// Get all screenshots for the date
const screenshots = db.prepare(`
  SELECT s.id, s.capturedAt, s.mode
  FROM screenshots s
  WHERE s.userId = ?
    AND s.capturedAt >= ?
    AND s.capturedAt <= ?
  ORDER BY s.capturedAt ASC
`).all(user.id, startOfDay.getTime(), endOfDay.getTime());

console.log('Total screenshots found:', screenshots.length);

// Calculate productive hours using getDateStats logic
let validCountForProductiveHours = 0;
const screenshotScores = [];

for (const screenshot of screenshots) {
  const periods = db.prepare(`
    SELECT activityScore
    FROM activity_periods
    WHERE screenshotId = ?
    ORDER BY activityScore DESC
  `).all(screenshot.id);

  if (periods.length === 0) continue;

  // Simple weighted average (approximation)
  const avgScore = periods.reduce((sum, p) => sum + p.activityScore, 0) / periods.length;
  screenshotScores.push({
    id: screenshot.id,
    capturedAt: screenshot.capturedAt,
    weightedScore: avgScore,
    mode: screenshot.mode
  });
}

// Apply validation rules
for (let i = 0; i < screenshotScores.length; i++) {
  const current = screenshotScores[i];
  const prev = i > 0 ? screenshotScores[i - 1] : null;
  const next = i < screenshotScores.length - 1 ? screenshotScores[i + 1] : null;

  let isValid = false;

  // Rule 1: Valid if score >= 40 (4.0 on UI scale)
  if (current.weightedScore >= 40) {
    isValid = true;
  }
  // Rule 2: Critical (25-40) with good neighbor
  else if (current.weightedScore >= 25 && current.weightedScore < 40) {
    if ((prev && prev.weightedScore >= 40) || (next && next.weightedScore >= 40)) {
      isValid = true;
    }
  }

  if (isValid) {
    validCountForProductiveHours++;
  }
}

const productiveHours = (validCountForProductiveHours * 10) / 60;
console.log('Valid screenshots:', validCountForProductiveHours);
console.log('Productive hours:', productiveHours.toFixed(2));

console.log('\n=== SESSION CALCULATIONS (getSessionsForDate logic) ===');

// Get all sessions for the date
const sessions = db.prepare(`
  SELECT
    s.id,
    s.startTime,
    s.endTime,
    s.mode,
    s.isActive,
    s.task,
    s.projectId
  FROM sessions s
  WHERE s.userId = ?
    AND s.startTime >= ?
    AND s.startTime < ?
  ORDER BY s.startTime DESC
`).all(user.id, startOfDay.getTime(), endOfDay.getTime());

console.log('Sessions found:', sessions.length);

let totalSessionMinutes = 0;
let totalSessionMinutesOld = 0;

for (const session of sessions) {
  const sessionScreenshots = db.prepare(`
    SELECT id
    FROM screenshots
    WHERE sessionId = ?
    ORDER BY capturedAt
  `).all(session.id);

  // OLD LOGIC (activity score >= 2.5)
  let validOld = 0;
  for (const ss of sessionScreenshots) {
    const periods = db.prepare(`
      SELECT activityScore FROM activity_periods WHERE screenshotId = ?
    `).all(ss.id);

    if (periods.length > 0) {
      const avgScore = periods.reduce((sum, p) => sum + p.activityScore, 0) / periods.length;
      if (avgScore >= 25) { // 2.5 on UI scale
        validOld++;
      }
    }
  }

  // NEW LOGIC (same as productive hours)
  const sessionScores = [];
  for (const ss of sessionScreenshots) {
    const periods = db.prepare(`
      SELECT activityScore FROM activity_periods WHERE screenshotId = ?
      ORDER BY activityScore DESC
    `).all(ss.id);

    if (periods.length > 0) {
      const avgScore = periods.reduce((sum, p) => sum + p.activityScore, 0) / periods.length;
      sessionScores.push({
        id: ss.id,
        weightedScore: avgScore
      });
    }
  }

  // Apply same validation as productive hours
  let validNew = 0;
  for (let i = 0; i < sessionScores.length; i++) {
    const current = sessionScores[i];
    const prev = i > 0 ? sessionScores[i - 1] : null;
    const next = i < sessionScores.length - 1 ? sessionScores[i + 1] : null;

    let isValid = false;
    if (current.weightedScore >= 40) {
      isValid = true;
    } else if (current.weightedScore >= 25 && current.weightedScore < 40) {
      if ((prev && prev.weightedScore >= 40) || (next && next.weightedScore >= 40)) {
        isValid = true;
      }
    }

    if (isValid) {
      validNew++;
    }
  }

  const oldMinutes = validOld * 10;
  const newMinutes = validNew * 10;

  console.log(`\nSession ${session.id.substring(0, 8)}...`);
  console.log(`  Task: ${session.task || 'No task'}`);
  console.log(`  Screenshots: ${sessionScreenshots.length}`);
  console.log(`  OLD logic: ${validOld} valid -> ${oldMinutes} minutes`);
  console.log(`  NEW logic: ${validNew} valid -> ${newMinutes} minutes`);

  totalSessionMinutesOld += oldMinutes;
  totalSessionMinutes += newMinutes;
}

console.log('\n=== SUMMARY ===');
console.log('Productive Hours (Today\'s Hustle):', productiveHours.toFixed(2), 'hours');
console.log('Session Total OLD (would show in Earlier Today):', (totalSessionMinutesOld / 60).toFixed(2), 'hours');
console.log('Session Total NEW (with fix):', (totalSessionMinutes / 60).toFixed(2), 'hours');
console.log('\nDiscrepancy OLD:', Math.abs(productiveHours - totalSessionMinutesOld / 60).toFixed(2), 'hours');
console.log('Discrepancy NEW:', Math.abs(productiveHours - totalSessionMinutes / 60).toFixed(2), 'hours');

db.close();