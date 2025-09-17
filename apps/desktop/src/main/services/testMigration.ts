#!/usr/bin/env node

/**
 * Test script to verify database migrations work correctly
 * This creates a database with old schema and tests the migration
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { DatabaseMigrator } from './migrations';

function createOldSchemaDatabase(dbPath: string) {
  console.log('\n📝 Creating database with OLD schema...');
  
  // Delete existing test database if it exists
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Deleted existing test database');
  }
  
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Create old schema (as it might exist on other PCs)
  
  // Sessions table (same as new)
  db.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      projectId TEXT,
      projectName TEXT,
      mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
      startTime INTEGER NOT NULL,
      endTime INTEGER,
      isActive INTEGER DEFAULT 1,
      task TEXT,
      isSynced INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL
    )
  `);
  
  // Old screenshots table (with s3Url, activityPeriodIds, aggregatedScore)
  db.exec(`
    CREATE TABLE screenshots (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      sessionId TEXT NOT NULL,
      localPath TEXT NOT NULL,
      thumbnailPath TEXT,
      s3Url TEXT,  -- Old column name
      capturedAt INTEGER NOT NULL,
      activityPeriodIds TEXT,  -- Old column that should be removed
      aggregatedScore REAL,  -- Old column that should be removed
      mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
      notes TEXT,
      isDeleted INTEGER DEFAULT 0,
      isSynced INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(id)
    )
  `);
  
  // Old activity_periods table (without screenshotId and metricsBreakdown)
  db.exec(`
    CREATE TABLE activity_periods (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      userId TEXT NOT NULL,
      periodStart INTEGER NOT NULL,
      periodEnd INTEGER NOT NULL,
      mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
      notes TEXT,
      activityScore REAL DEFAULT 0,
      isValid INTEGER DEFAULT 1,
      classification TEXT,
      isSynced INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(id)
    )
  `);
  
  // Old screenshot_periods table (should be dropped)
  db.exec(`
    CREATE TABLE screenshot_periods (
      id TEXT PRIMARY KEY,
      screenshotId TEXT NOT NULL,
      periodId TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    )
  `);
  
  // Insert some test data
  const now = Date.now();
  
  // Insert a session
  db.prepare(`
    INSERT INTO sessions (id, userId, projectId, projectName, mode, startTime, isActive, task, isSynced, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('test-session-1', 'test-user', 'test-project', 'Test Project', 'command_hours', now - 3600000, 0, 'Test Task', 0, now - 3600000);
  
  // Insert screenshots with old schema
  db.prepare(`
    INSERT INTO screenshots (id, userId, sessionId, localPath, s3Url, capturedAt, activityPeriodIds, aggregatedScore, mode, notes, isDeleted, isSynced, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('test-screenshot-1', 'test-user', 'test-session-1', '/path/to/screenshot1.jpg', 'https://s3.example.com/screenshot1.jpg', now - 1800000, 'period1,period2', 0.85, 'command_hours', 'Test note', 0, 1, now - 1800000);
  
  db.prepare(`
    INSERT INTO screenshots (id, userId, sessionId, localPath, s3Url, capturedAt, activityPeriodIds, aggregatedScore, mode, notes, isDeleted, isSynced, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('test-screenshot-2', 'test-user', 'test-session-1', '/path/to/screenshot2.jpg', null, now - 900000, null, null, 'command_hours', null, 0, 0, now - 900000);
  
  // Insert activity periods without screenshotId
  db.prepare(`
    INSERT INTO activity_periods (id, sessionId, userId, periodStart, periodEnd, mode, notes, activityScore, isValid, classification, isSynced, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('test-period-1', 'test-session-1', 'test-user', now - 3000000, now - 2700000, 'command_hours', 'Period 1', 0.9, 1, 'productive', 0, now - 3000000);
  
  // Insert screenshot_periods
  db.prepare(`
    INSERT INTO screenshot_periods (id, screenshotId, periodId, createdAt)
    VALUES (?, ?, ?, ?)
  `).run('sp-1', 'test-screenshot-1', 'test-period-1', now);
  
  console.log('✅ Old schema database created with test data');
  
  return db;
}

function verifyMigration(db: Database.Database) {
  console.log('\n🔍 Verifying migration results...');
  
  // Check migrations table
  const migrations = db.prepare('SELECT * FROM migrations ORDER BY version').all();
  console.log(`✅ Migrations applied: ${migrations.length}`);
  
  // Check screenshots table structure
  const screenshotColumns = db.prepare("PRAGMA table_info(screenshots)").all() as any[];
  const screenshotColumnNames = screenshotColumns.map(col => col.name);
  
  console.log('\n📸 Screenshots table columns:', screenshotColumnNames.join(', '));
  
  // Verify old columns are removed and new columns exist
  const hasOldColumns = screenshotColumnNames.includes('activityPeriodIds') || 
                       screenshotColumnNames.includes('aggregatedScore') || 
                       screenshotColumnNames.includes('s3Url');
  const hasNewColumns = screenshotColumnNames.includes('url') && 
                       screenshotColumnNames.includes('thumbnailUrl');
  
  if (hasOldColumns) {
    console.error('❌ Old columns still exist in screenshots table!');
  } else {
    console.log('✅ Old columns removed from screenshots table');
  }
  
  if (!hasNewColumns) {
    console.error('❌ New columns missing from screenshots table!');
  } else {
    console.log('✅ New columns added to screenshots table');
  }
  
  // Check activity_periods table structure
  const activityColumns = db.prepare("PRAGMA table_info(activity_periods)").all() as any[];
  const activityColumnNames = activityColumns.map(col => col.name);
  
  console.log('\n📊 Activity periods table columns:', activityColumnNames.join(', '));
  
  const hasScreenshotId = activityColumnNames.includes('screenshotId');
  const hasMetricsBreakdown = activityColumnNames.includes('metricsBreakdown');
  
  if (!hasScreenshotId) {
    console.error('❌ screenshotId column missing from activity_periods!');
  } else {
    console.log('✅ screenshotId column added to activity_periods');
  }
  
  if (!hasMetricsBreakdown) {
    console.error('❌ metricsBreakdown column missing from activity_periods!');
  } else {
    console.log('✅ metricsBreakdown column added to activity_periods');
  }
  
  // Check that screenshot_periods table is dropped
  const screenshotPeriodsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='screenshot_periods'").get();
  if (screenshotPeriodsExists) {
    console.error('❌ screenshot_periods table still exists!');
  } else {
    console.log('✅ screenshot_periods table dropped');
  }
  
  // Check data migration
  const screenshots = db.prepare('SELECT * FROM screenshots').all() as any[];
  console.log(`\n📷 Screenshots after migration: ${screenshots.length}`);
  
  for (const screenshot of screenshots) {
    console.log(`  - ID: ${screenshot.id}`);
    console.log(`    URL: ${screenshot.url || 'null'} (was s3Url: ${screenshot.s3Url || 'null'})`);
    console.log(`    Has old columns: ${screenshot.activityPeriodIds !== undefined || screenshot.aggregatedScore !== undefined}`);
  }
  
  // Check foreign keys are enabled
  const foreignKeysEnabled = db.pragma('foreign_keys');
  console.log(`\n🔐 Foreign keys enabled: ${foreignKeysEnabled ? 'Yes' : 'No'}`);
}

// Main test execution
function runTest() {
  const testDbPath = path.join(process.cwd(), 'test_migration.db');
  
  try {
    // Step 1: Create database with old schema
    const db = createOldSchemaDatabase(testDbPath);
    
    // Step 2: Run migrations
    console.log('\n🚀 Running migrations...');
    const migrator = new DatabaseMigrator(db);
    migrator.runMigrations();
    
    // Step 3: Verify migration results
    verifyMigration(db);
    
    // Clean up
    db.close();
    fs.unlinkSync(testDbPath);
    console.log('\n✅ Test completed successfully! Test database cleaned up.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest();