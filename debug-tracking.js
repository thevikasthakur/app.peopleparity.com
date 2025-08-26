#!/usr/bin/env node

/**
 * Debug script to test the tracking system
 */

const { DatabaseService } = require('./apps/desktop/dist/main/services/databaseService');
const { LocalDatabase } = require('./apps/desktop/dist/main/services/localDatabase');

async function debugTracking() {
  console.log('=== Debugging Time Tracker ===\n');
  
  // Initialize services
  const db = new DatabaseService();
  await db.initialize();
  
  const localDb = new LocalDatabase();
  
  // Check current user
  const currentUser = db.getCurrentUser();
  console.log('Current User:', currentUser ? currentUser.email : 'None');
  
  // Check active session
  const activeSession = db.getActiveSession();
  console.log('Active Session:', activeSession ? activeSession.id : 'None');
  
  if (activeSession) {
    console.log('  Mode:', activeSession.mode);
    console.log('  Start Time:', new Date(activeSession.startTime));
    console.log('  Project:', activeSession.projectId || 'None');
  }
  
  // Check recent activity periods
  console.log('\n=== Recent Activity Periods ===');
  const recentPeriods = localDb.getRecentActivityPeriods(activeSession?.id || '', 10);
  console.log(`Found ${recentPeriods.length} recent periods`);
  
  recentPeriods.forEach((period, i) => {
    console.log(`\nPeriod ${i + 1}:`);
    console.log('  ID:', period.id);
    console.log('  Start:', new Date(period.periodStart));
    console.log('  End:', new Date(period.periodEnd));
    console.log('  Score:', period.activityScore);
    console.log('  Screenshot ID:', period.screenshotId || 'None');
    console.log('  Has Metrics:', period.metricsBreakdown ? 'Yes' : 'No');
  });
  
  // Check screenshots
  console.log('\n=== Recent Screenshots ===');
  const todayScreenshots = await db.getTodayScreenshots();
  console.log(`Found ${todayScreenshots.length} screenshots today`);
  
  todayScreenshots.forEach((screenshot, i) => {
    console.log(`\nScreenshot ${i + 1}:`);
    console.log('  ID:', screenshot.id);
    console.log('  Time:', screenshot.timestamp);
    console.log('  Has URL:', !!screenshot.fullUrl);
    console.log('  Has Thumbnail:', !!screenshot.thumbnailUrl);
    console.log('  Activity Score:', screenshot.activityScore);
  });
  
  // Check sync queue
  console.log('\n=== Sync Queue ===');
  const unsyncedItems = localDb.getUnsyncedItems(10);
  console.log(`Found ${unsyncedItems.length} unsynced items`);
  
  const itemsByType = {};
  unsyncedItems.forEach(item => {
    itemsByType[item.entityType] = (itemsByType[item.entityType] || 0) + 1;
  });
  
  Object.entries(itemsByType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} items`);
  });
  
  // Check database sizes
  console.log('\n=== Database Info ===');
  const dbInfo = db.getDatabaseInfo();
  console.log('Database Path:', dbInfo.path);
  console.log('Database Size:', dbInfo.sizeInMB);
  
  // Check if window manager has current window
  console.log('\n=== Current Window Info ===');
  const now = new Date();
  const currentMinute = now.getMinutes();
  const windowStartMinute = Math.floor(currentMinute / 10) * 10;
  const windowEndMinute = windowStartMinute + 10;
  
  console.log(`Current time: ${now.toISOString()}`);
  console.log(`Current window: :${windowStartMinute.toString().padStart(2, '0')} - :${windowEndMinute.toString().padStart(2, '0')}`);
  console.log(`Next window completion in: ${(windowEndMinute - currentMinute)} minutes`);
  
  process.exit(0);
}

debugTracking().catch(console.error);