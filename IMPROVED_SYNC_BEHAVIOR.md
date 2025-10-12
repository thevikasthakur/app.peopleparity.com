# Improved Screenshot Sync Queue Behavior

## Problem Statement
The sync queue gets blocked when the first item fails, preventing all subsequent items from syncing. This causes a cascading backup of unsynced screenshots.

## Solution Implemented

### 1. Auto-Stop on Critical Errors ✅

**When sync encounters these critical errors, tracking stops automatically:**
- **401 Authentication Error**: Session expired
- **VERSION_NOT_SUPPORTED**: App version not allowed
- **SESSION_NOT_FOUND**: Parent session doesn't exist
- **Network Errors**: ENOTFOUND, ECONNREFUSED

**User Experience:**
1. Error dialog appears explaining the issue
2. Tracking stops automatically
3. User must fix the issue (login, update app, etc.) before continuing

### 2. Skip Failed Items After 3 Attempts ✅

**Items that fail 3 times are removed from queue:**
```javascript
if (item.attempts >= 3) {
  // Move to failed state
  // Remove from sync queue
  // Show in UI with manual retry option
  continue; // Skip to next item
}
```

**Benefits:**
- Queue doesn't get blocked by one problematic item
- Other items can continue syncing
- Failed items can be manually retried later

### 3. Pause After Consecutive Failures ✅

**If 3 items fail in a row, sync pauses temporarily:**
```javascript
if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
  // Show notification to user
  // Pause sync for this cycle
  // Will retry in 30 seconds
  break;
}
```

**Benefits:**
- Prevents flooding server with failing requests
- Gives time for network issues to resolve
- User is notified of the problem

## Implementation Details

### Files Modified

1. **apps/desktop/src/main/services/apiSyncService.ts**
   - Added `isCriticalError()` - Identifies errors that should stop tracking
   - Added `handleCriticalSyncError()` - Stops tracker and notifies user
   - Added `handlePermanentFailure()` - Removes failed items from queue
   - Added `notifyUserOfSyncIssue()` - Shows notifications
   - Modified sync loop to track consecutive failures

2. **apps/desktop/src/main/index.ts**
   - Added IPC handler `request-stop-tracking` for critical errors
   - Stops activity tracker when requested by sync service

### Error Flow

```
Sync Attempt
    ↓
Error Occurs
    ↓
Is Critical Error?
    ↓
┌───Yes──┴──No───┐
↓                ↓
Stop Tracking    Increment Attempts
Show Dialog          ↓
Clear Token      Attempts >= 3?
    END              ↓
              ┌──Yes─┴─No──┐
              ↓            ↓
         Remove from    Try Again
         Queue          Next Cycle
         Mark Failed
         Show in UI
             END
```

### Sync States

| State | Attempts | Action | UI Display |
|-------|----------|--------|------------|
| Pending | 0 | Try sync | "Syncing..." |
| Retrying | 1-2 | Retry next cycle | "Retrying..." |
| Failed | 3+ | Remove from queue | "Failed - Retry" button |
| Critical Error | Any | Stop tracking | Error dialog + stop |

## User Experience Improvements

### Before
- ❌ Sync silently fails
- ❌ Queue gets stuck forever
- ❌ User unaware of issues
- ❌ Tracking continues with no sync
- ❌ Manual database cleanup needed

### After
- ✅ User notified of sync issues
- ✅ Critical errors stop tracking
- ✅ Failed items skipped after 3 tries
- ✅ Queue continues processing
- ✅ Manual retry available in UI

## Testing the Implementation

### Test Scenario 1: Version Error
1. Mark app version as unsupported in admin
2. Start tracking
3. Wait for sync (30 seconds)
4. **Expected**: Dialog shows "App Version Not Supported", tracking stops

### Test Scenario 2: Failed Screenshot
1. Create a screenshot with invalid data
2. Let it fail 3 times
3. **Expected**: After 3 attempts, item removed from queue, other items sync

### Test Scenario 3: Network Error
1. Disconnect internet
2. Start tracking
3. Wait for sync
4. **Expected**: Network error dialog, tracking stops

### Test Scenario 4: Consecutive Failures
1. Create 3 bad items in queue
2. Start sync
3. **Expected**: After 3 consecutive failures, sync pauses with notification

## Configuration

### Thresholds (Can be adjusted)
```javascript
const MAX_ATTEMPTS = 3;           // Failed after 3 attempts
const MAX_CONSECUTIVE_FAILURES = 3; // Pause after 3 consecutive fails
const SYNC_INTERVAL = 30 * 1000;    // Sync every 30 seconds
```

## Future Enhancements

1. **Exponential Backoff**: Increase delay between retries
2. **Selective Retry**: UI to retry specific failed items
3. **Bulk Actions**: "Retry All Failed" button
4. **Error Categories**: Different handling for different error types
5. **Offline Queue**: Store items locally when offline, sync when online

## Quick Reference for Staff

### If Screenshots Not Syncing:

1. **Check for error dialogs** - App will show if critical error
2. **Check sync status** - Dashboard shows failed items
3. **After 3 failures** - Item removed from queue automatically
4. **Manual retry** - Click "Retry" on failed items in UI
5. **Last resort** - Clear version error from config.json

### Common Fixes:

| Problem | Solution |
|---------|----------|
| Auth expired | Logout and login |
| Version error | Update app or clear config.json |
| Network error | Check internet connection |
| Failed items | Will auto-skip after 3 attempts |

## Summary

The improved sync behavior ensures:
1. **No silent failures** - Users are always notified
2. **No queue blocking** - Failed items don't block others
3. **Automatic recovery** - System self-heals where possible
4. **User control** - Manual retry options available
5. **Smart stopping** - Critical errors stop tracking to prevent data loss

This implementation addresses the core issue of queue blocking while maintaining data integrity and user awareness.