# Screenshot Sync Queue Troubleshooting Guide

## Problem
Staff member has screenshots stuck in the sync queue that aren't syncing.

## How Sync Actually Works

### Automatic Sync Process
1. **Every 30 seconds**: App checks for unsynced items in `sync_queue` table
2. **Filters**: Only items with `attempts < 5` are processed
3. **Order**: Sessions first → Screenshots → Activity Periods
4. **Batch Size**: Up to 200 items per sync cycle
5. **On Success**: Item removed from queue, entity marked as `isSynced = 1`
6. **On Failure**: `attempts` counter incremented, retried next cycle
7. **After 5 failures**: Item skipped in future syncs (stuck forever)

### Why Sync Might Be Paused

The sync will **NOT run** if:
- ❌ No internet connection (`isOnline = false`)
- ❌ Not logged in (no auth token)
- ❌ Using offline token
- ❌ App version is not supported (version error in last 5 minutes)

## Diagnostic Steps

### Step 1: Check Sync Queue Status

Have your staff member share the results of these queries:

```sql
-- Check total items in queue
SELECT COUNT(*) as total_items FROM sync_queue;

-- Check by type and attempt status
SELECT
  entityType,
  COUNT(*) as count,
  MIN(attempts) as min_attempts,
  MAX(attempts) as max_attempts,
  AVG(attempts) as avg_attempts
FROM sync_queue
GROUP BY entityType;

-- Check if items have attempts = 0 (never tried)
SELECT COUNT(*) as never_attempted
FROM sync_queue
WHERE attempts = 0;

-- Check stuck items (5+ attempts)
SELECT COUNT(*) as stuck_items
FROM sync_queue
WHERE attempts >= 5;
```

### Step 2: Check Network/Auth Status

Have them check in the app:
1. **Settings → About**: Is "Online Status" showing as connected?
2. **Settings → Account**: Are they logged in? (not "Offline Mode")
3. **Check logs**: Look for version errors or auth failures

### Step 3: Look at Recent Sync Logs

Check the app logs for these messages:
```
"Syncing X items with server..."
"Screenshot Y synced successfully"
"Failed to sync screenshot Z"
```

If you don't see "Syncing" messages, sync isn't running at all.

## Solutions

### Solution 1: Force Sync Restart

The app syncs every 30 seconds automatically. To trigger it immediately:

**Steps**:
1. **Close the desktop app completely**
2. **Wait 10 seconds**
3. **Restart the app**
4. **Wait 30-60 seconds** (first sync happens after 5 seconds, then every 30)
5. **Check logs** for "Syncing X items..." message

### Solution 2: Check Version Error

If app version is not supported, sync is blocked:

**Check**:
```sql
-- Check electron-store for version error
-- File location:
-- Windows: C:\Users\[User]\AppData\Roaming\People Parity\config.json
-- macOS: ~/Library/Application Support/People Parity/config.json

-- Look for "versionError" field
```

**Fix**:
- Update desktop app to latest version
- Or ask admin to mark current version as supported

### Solution 3: Reset Stuck Items (attempts >= 5)

If items have failed 5+ times, they're skipped:

```sql
-- Reset attempts to allow retry
UPDATE sync_queue SET attempts = 0, lastAttempt = NULL WHERE attempts >= 5;
```

Then restart the app.

### Solution 4: Re-login

Fresh auth token can fix many issues:

**Steps**:
1. Go to **Settings → Logout**
2. **Login** again
3. Wait for sync to resume

### Solution 5: Clear and Restart (If nothing works)

⚠️ **WARNING**: This marks everything as synced locally without actually syncing to server. Only use if:
- You're okay losing this data
- It's test data
- Data is corrupted beyond repair

```sql
-- Nuclear option: Clear queue and mark all as synced
DELETE FROM sync_queue;
UPDATE screenshots SET isSynced = 1 WHERE isSynced = 0;
UPDATE activity_periods SET isSynced = 1 WHERE isSynced = 0;
UPDATE sessions SET isSynced = 1 WHERE isSynced = 0;
```

## Manual Retry UI (Limited Availability)

⚠️ **Note**: The "Retry Sync" button in the UI only appears in certain conditions:
- It's not always visible for all unsynced items
- It's mainly for items that have already attempted and failed
- Items with `attempts = 0` (never tried) won't show this button

**Don't rely on the manual retry button** - it's better to let automatic sync handle it or use the database solutions above.

## Common Causes & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Items in queue, `attempts = 0` | Sync not running | Check internet, auth, version error |
| Items with `attempts = 1-4` | Sync failing, retrying | Check server errors in logs |
| Items with `attempts >= 5` | Failed permanently | Reset attempts with SQL |
| No items in queue but not synced | Never added to queue | Database corruption, need investigation |
| "Syncing..." in logs but nothing happens | Session/screenshot dependency issue | Check if parent session exists |

## Database File Location

To run SQL queries, you need the database file:

**Windows**:
```
C:\Users\[Username]\AppData\Roaming\People Parity\local.db
```

**macOS**:
```
~/Library/Application Support/People Parity/local.db
```

**Linux**:
```
~/.config/People Parity/local.db
```

## How to Run SQL Commands

### Using SQLite Browser (GUI - Easiest)
1. Download from https://sqlitebrowser.org/
2. Open → Select the `local.db` file
3. Go to "Execute SQL" tab
4. Paste query → Click "Run"

### Using Command Line
```bash
# Windows (in PowerShell)
cd "$env:APPDATA\People Parity"
sqlite3 local.db

# macOS
cd ~/Library/Application\ Support/People\ Parity/
sqlite3 local.db

# Then run queries:
SELECT COUNT(*) FROM sync_queue;
.exit
```

## Verify Items Are in Queue

Before trying to fix sync, verify items are actually in the queue:

```sql
-- Find unsynced screenshots
SELECT s.id, s.capturedAt, s.isSynced,
       sq.id as queue_id, sq.attempts
FROM screenshots s
LEFT JOIN sync_queue sq ON sq.entityId = s.id AND sq.entityType = 'screenshot'
WHERE s.isSynced = 0
ORDER BY s.capturedAt DESC
LIMIT 20;
```

**If `queue_id` is NULL**: Screenshot is not in queue (bug - shouldn't happen)
**If `queue_id` exists**: Screenshot is in queue

### If Not in Queue (Bug)

This shouldn't happen, but if screenshots are `isSynced = 0` but not in queue:

```sql
-- Manually add to queue (advanced - ask developer)
INSERT INTO sync_queue (id, entityType, entityId, operation, data, attempts, lastAttempt, createdAt)
SELECT
  hex(randomblob(16)),
  'screenshot',
  s.id,
  'create',
  json_object(
    'id', s.id,
    'userId', s.userId,
    'sessionId', s.sessionId,
    'url', s.url,
    'thumbnailUrl', s.thumbnailUrl,
    'capturedAt', s.capturedAt,
    'mode', s.mode,
    'notes', s.notes
  ),
  0,
  NULL,
  unixepoch() * 1000
FROM screenshots s
WHERE s.isSynced = 0
  AND NOT EXISTS (SELECT 1 FROM sync_queue WHERE entityId = s.id AND entityType = 'screenshot');
```

## Monitoring Sync Progress

After applying a fix, monitor sync progress:

```sql
-- Run this every 30 seconds to see if count is decreasing
SELECT entityType, COUNT(*) as remaining
FROM sync_queue
WHERE attempts < 5
GROUP BY entityType;
```

If the count decreases, sync is working!

## When to Escalate

Contact technical support if:
- Sync queue doesn't decrease after 5 minutes
- All diagnostic queries show `attempts = 0` but sync logs show no activity
- Version error persists even after updating app
- Items keep failing with same error after retry
- Queue grows faster than it's processed

## Quick Reference Commands

```sql
-- See queue status
SELECT entityType, COUNT(*), AVG(attempts) FROM sync_queue GROUP BY entityType;

-- Reset failed items
UPDATE sync_queue SET attempts = 0 WHERE attempts >= 5;

-- Clear screenshot queue (doesn't sync them!)
DELETE FROM sync_queue WHERE entityType = 'screenshot';

-- Nuclear option (mark all as synced without syncing)
DELETE FROM sync_queue;
UPDATE screenshots SET isSynced = 1;
UPDATE activity_periods SET isSynced = 1;
```

---

**Important**: Always backup the database before running DELETE or UPDATE commands!

```bash
# Backup command (run before SQL changes)
cp local.db local.db.backup
```
