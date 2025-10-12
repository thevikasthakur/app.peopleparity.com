# Clear Stuck Screenshot Sync Queue - Troubleshooting Guide

## Problem
Staff member has unsynced screenshots piled up in queue that are not syncing automatically.

## Understanding the Sync System

### How Sync Works
1. Screenshots are captured and saved locally to SQLite database
2. Each screenshot/activity period is added to the `sync_queue` table
3. Background sync process picks items from queue and uploads to server
4. On success: Item removed from queue, `isSynced` flag set to 1
5. On failure: `attempts` counter incremented, retried later
6. After 5 failed attempts: Item stays in queue but stops auto-retrying

### Common Causes of Stuck Queue
- ❌ Network connectivity issues during sync
- ❌ Session doesn't exist on server (session creation failed)
- ❌ Auth token expired
- ❌ Server returned errors (validation, permissions)
- ❌ Attempts exceeded 5 (auto-retry stopped)

## Solution 1: Manual Sync Retry (Recommended)

### Step-by-Step Instructions

Send these instructions to your staff member:

1. **Open the Desktop App**
   - Make sure you're logged in

2. **Go to Dashboard**
   - Click on the date with unsynced screenshots
   - You'll see screenshots with a "sync pending" indicator

3. **Retry Individual Screenshots**
   - Click on a screenshot with sync issues
   - Look for a "Retry Sync" button
   - Click it to manually retry

4. **Wait for Sync to Complete**
   - Watch for "synced" status
   - If it fails again, note the error message

### If Retry Button Doesn't Work

The sync might be failing due to underlying issues. Proceed to Solution 2.

## Solution 2: Clear Sync Queue via Database (Advanced)

⚠️ **Warning**: This requires access to the SQLite database file. Have technical staff or the user follow these steps.

### Locate the Database File

**Windows**:
```
C:\Users\[Username]\AppData\Roaming\People Parity\local.db
```

**macOS**:
```
/Users/[Username]/Library/Application Support/People Parity/local.db
```

**Linux**:
```
~/.config/People Parity/local.db
```

### Option A: Reset All Failed Items (Retry All)

This resets the attempt counter for all items, allowing auto-retry to work again.

```sql
-- Reset attempts for all queued items
UPDATE sync_queue SET attempts = 0, lastAttempt = NULL;
```

**How to run**:
1. Close the desktop app completely
2. Open the database with SQLite Browser or command line
3. Run the SQL command above
4. Close the database tool
5. Restart the desktop app
6. Wait for auto-sync to process the queue

### Option B: Clear Entire Queue (Nuclear Option)

⚠️ **DANGER**: This deletes all pending sync items. Screenshots/periods will be marked as "synced" locally but won't exist on the server.

**Only use if**:
- Items are corrupted and can't sync
- You're okay with losing this data
- This is test/development data

```sql
-- Clear the entire sync queue
DELETE FROM sync_queue;

-- Mark all screenshots as synced (WARNING: This is permanent!)
UPDATE screenshots SET isSynced = 1;

-- Mark all activity periods as synced (WARNING: This is permanent!)
UPDATE activity_periods SET isSynced = 1;
```

### Option C: Clear Only Screenshots (Preserve Activity Periods)

```sql
-- Remove screenshot items from queue
DELETE FROM sync_queue WHERE entityType = 'screenshot';

-- Mark screenshots as synced locally
UPDATE screenshots SET isSynced = 1 WHERE isSynced = 0;
```

### Option D: Selective Clearing (Remove Old Items Only)

Keep recent screenshots, remove old stuck ones (older than 7 days):

```sql
-- Find items older than 7 days
SELECT * FROM sync_queue
WHERE createdAt < (strftime('%s', 'now') - 7*24*60*60) * 1000;

-- Delete them
DELETE FROM sync_queue
WHERE createdAt < (strftime('%s', 'now') - 7*24*60*60) * 1000;
```

## Solution 3: Using SQLite Command Line

### Step 1: Install SQLite (if not installed)

**Windows**:
Download from https://www.sqlite.org/download.html

**macOS**:
```bash
brew install sqlite3
```

**Linux**:
```bash
sudo apt-get install sqlite3  # Ubuntu/Debian
sudo yum install sqlite        # CentOS/RHEL
```

### Step 2: Open Database

```bash
# Navigate to the app data directory
cd "C:\Users\[Username]\AppData\Roaming\People Parity"  # Windows
cd ~/Library/Application\ Support/People\ Parity/         # macOS

# Open the database
sqlite3 local.db
```

### Step 3: Inspect the Queue

```sql
-- See how many items are in queue
SELECT entityType, COUNT(*) as count, AVG(attempts) as avg_attempts
FROM sync_queue
GROUP BY entityType;

-- See failed items (attempts >= 5)
SELECT * FROM sync_queue WHERE attempts >= 5 LIMIT 10;

-- See oldest items in queue
SELECT * FROM sync_queue ORDER BY createdAt LIMIT 10;
```

### Step 4: Clear Based on Findings

Choose one of the SQL commands from Solution 2 above.

### Step 5: Exit and Test

```sql
.exit
```

Then restart the desktop app.

## Solution 4: App Re-login (Simplest)

Sometimes a fresh auth token solves sync issues:

1. **Logout**:
   - Go to Settings > Logout

2. **Login Again**:
   - Enter credentials
   - Let the app sync from scratch

3. **Check Queue**:
   - Old items might start syncing with fresh token

## Solution 5: Fresh Start (Last Resort)

⚠️ **WARNING**: This deletes ALL local data. Only use if you don't care about unsynced data.

1. **Close the desktop app**
2. **Delete the database file**:
   - Windows: `C:\Users\[Username]\AppData\Roaming\People Parity\local.db`
   - macOS: `~/Library/Application Support/People Parity/local.db`
3. **Restart the app**
   - App will create fresh database
   - Login again
   - Start tracking from scratch

## Diagnostic Queries

Run these to understand what's stuck:

### Check Queue Status
```sql
-- Overview of sync queue
SELECT
  entityType,
  COUNT(*) as total_items,
  SUM(CASE WHEN attempts = 0 THEN 1 ELSE 0 END) as fresh_items,
  SUM(CASE WHEN attempts BETWEEN 1 AND 4 THEN 1 ELSE 0 END) as retrying_items,
  SUM(CASE WHEN attempts >= 5 THEN 1 ELSE 0 END) as failed_items,
  MAX(attempts) as max_attempts
FROM sync_queue
GROUP BY entityType;
```

### Check Unsynced Screenshots
```sql
-- Find unsynced screenshots
SELECT
  id,
  capturedAt,
  mode,
  isSynced,
  (SELECT COUNT(*) FROM sync_queue WHERE entityId = screenshots.id) as in_queue
FROM screenshots
WHERE isSynced = 0
ORDER BY capturedAt DESC
LIMIT 20;
```

### Check Unsynced Activity Periods
```sql
-- Find unsynced activity periods
SELECT
  id,
  periodStart,
  periodEnd,
  isSynced,
  (SELECT COUNT(*) FROM sync_queue WHERE entityId = activity_periods.id) as in_queue
FROM activity_periods
WHERE isSynced = 0
ORDER BY periodStart DESC
LIMIT 20;
```

### Find Orphaned Queue Items
```sql
-- Queue items for deleted screenshots
SELECT sq.*
FROM sync_queue sq
LEFT JOIN screenshots s ON sq.entityId = s.id
WHERE sq.entityType = 'screenshot' AND s.id IS NULL;

-- Delete orphaned items
DELETE FROM sync_queue
WHERE entityType = 'screenshot'
  AND entityId NOT IN (SELECT id FROM screenshots);
```

## Prevention Tips

### For Users
1. **Stay Connected**: Ensure stable internet during tracking
2. **Check Sync Status**: Periodically check dashboard for unsynced items
3. **Don't Force Quit**: Let app sync before closing
4. **Update Regularly**: Keep desktop app updated

### For Admins
1. **Monitor Sync Health**: Check for users with high unsynced counts
2. **Set Up Alerts**: Notify users when sync queue grows too large
3. **Regular Cleanup**: Remove very old failed items periodically
4. **Server Logs**: Check API logs for sync errors

## Quick Commands Summary

```sql
-- Safe: Reset attempts to allow retry
UPDATE sync_queue SET attempts = 0;

-- Medium Risk: Clear screenshot queue only
DELETE FROM sync_queue WHERE entityType = 'screenshot';

-- High Risk: Clear entire queue
DELETE FROM sync_queue;

-- Nuclear: Clear queue and mark everything synced
DELETE FROM sync_queue;
UPDATE screenshots SET isSynced = 1;
UPDATE activity_periods SET isSynced = 1;
```

## When to Contact Support

Contact support if:
- Queue keeps growing even after clearing
- Same items fail repeatedly with errors
- Sync works for some users but not others
- Error messages mention server or database issues
- After trying all solutions, queue is still stuck

## Need Help?

Provide this information when asking for help:
1. Operating System (Windows/Mac/Linux)
2. App version (from Settings → About)
3. Result of diagnostic queries above
4. Any error messages from app logs
5. Screenshot of the stuck sync items in dashboard

---

**Last Updated**: 2025
**Version**: 1.0
