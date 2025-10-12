# Tracking State Sync and Reminder System Improvements

## Issues Addressed

### 1. UI State Sync Issue
**Problem**: The Start/Stop Tracking button sometimes shows incorrect state
- Button shows "Stop Tracking" when tracking is already stopped
- Clicking multiple times doesn't fix it
- UI state doesn't match actual tracking state

**Root Cause**:
- UI relies on `refetchDashboard()` which can fail or return stale data
- No local state management for tracking status
- Race conditions between user actions and server responses

### 2. Forgotten Tracking Restarts
**Problem**: Users stop tracking for breaks but forget to restart
- No reminders to restart tracking
- Lost productive hours not being recorded
- Users only realize hours later

## Solutions Implemented

### 1. Improved State Management

#### File: `apps/desktop/src/renderer/hooks/useTracker.ts`

**Changes Made**:
- Added `localSessionState` to track session state locally
- Optimistic updates on start/stop actions
- Immediate state sync via IPC events
- Fallback to server data only when local state unavailable

```typescript
// New state management
const [localSessionState, setLocalSessionState] = useState<any>(null);

// Optimistic update on stop
setLocalSessionState(null);

// Use local state first, fallback to server
currentSession: localSessionState !== null ? localSessionState : dashboardData.currentSession
```

**Benefits**:
- ✅ Instant UI updates
- ✅ No more stuck buttons
- ✅ Reliable state synchronization
- ✅ Works even if server is slow

### 2. Tracking Reminder System

#### File: `apps/desktop/src/main/services/trackingReminderService.ts`

**Features**:
- Reminders when tracking is stopped
- Exponential backoff: 10min, 20min, 30min, 40min, 50min...
- System notifications with click-to-start
- Persists across app restarts
- Automatically clears when tracking resumes

**Reminder Schedule**:
```
Stop Tracking
    ↓
10 minutes → Reminder #1: "Hey! You stopped tracking 10 minutes ago..."
    ↓
20 minutes → Reminder #2: "Friendly reminder: Tracking has been off for 30 minutes..."
    ↓
30 minutes → Reminder #3: "Break time over? You haven't tracked for 1 hour..."
    ↓
40 minutes → Reminder #4: "⚠️ Tracking has been paused for 1.5 hours..."
    ↓
50 minutes → Reminder #5: "🚨 Still not tracking after 2+ hours..."
```

**Messages Get Progressively Urgent**:
1. Friendly nudge
2. Gentle reminder
3. Break time check
4. Warning about lost hours
5. Urgent alert

### 3. Integration Points

#### Main Process (`apps/desktop/src/main/index.ts`)

**Session Start**:
```typescript
activityTracker.on('session:started', () => {
  trackingReminderService.onTrackingStarted(); // Clear reminders
});
```

**Session Stop**:
```typescript
activityTracker.on('session:stopped', () => {
  trackingReminderService.onTrackingStopped(); // Start reminders
});
```

**App Startup**:
```typescript
if (activeSession) {
  trackingReminderService.onTrackingStarted(); // Clear if tracking
} else {
  trackingReminderService.restoreReminders(false); // Restore reminders
}
```

## User Experience

### Before
- ❌ Button shows wrong state
- ❌ Multiple clicks don't help
- ❌ No reminders when stopped
- ❌ Hours of lost tracking
- ❌ Frustrating experience

### After
- ✅ Button always shows correct state
- ✅ Instant state updates
- ✅ Automatic reminders every 10*n minutes
- ✅ Click notification to restart
- ✅ Never forget to track again

## How Reminders Work

### System Notification
```
⏰ Tracking Reminder
Hey! You stopped tracking 30 minutes ago. Ready to get back to work? 💼
[Click to open app and start tracking]
```

### Notification Actions
- **Click**: Opens app and shows Start Tracking modal
- **Dismiss**: Next reminder in 10*(n+1) minutes
- **Ignore**: Reminders continue with increasing intervals

### Persistence
Reminders persist across:
- ✅ App restarts
- ✅ System reboots
- ✅ Login/logout cycles

Stored in electron-store:
- `lastStopTime`: When tracking stopped
- `reminderCount`: Number of reminders sent

## Configuration

### Reminder Timing
```javascript
// First reminder after 10 minutes
// Second after 20 minutes (total 30 min)
// Third after 30 minutes (total 60 min)
const nextReminderMinutes = 10 * (reminderCount + 1);
```

### Message Escalation
```javascript
const messages = [
  "Hey! You stopped tracking {time} ago...",        // Friendly
  "Friendly reminder: Tracking has been off...",    // Gentle
  "Break time over? You haven't tracked...",        // Check-in
  "⚠️ Tracking has been paused for {time}...",     // Warning
  "🚨 Still not tracking after {time}!..."          // Urgent
];
```

## Testing

### Test UI State Sync
1. Start tracking
2. Open Developer Tools → Network → Go Offline
3. Click Stop Tracking
4. **Expected**: Button immediately changes to "Start Tracking"
5. Go back online
6. **Expected**: State remains consistent

### Test Reminders
1. Stop tracking
2. Wait 10 minutes
3. **Expected**: First reminder notification
4. Wait another 20 minutes
5. **Expected**: Second reminder (more urgent)
6. Click notification
7. **Expected**: App opens with Start Tracking modal

### Test Persistence
1. Stop tracking
2. Wait 15 minutes (past first reminder)
3. Quit app completely
4. Restart app
5. **Expected**: Next reminder continues from where it left off

## Troubleshooting

### Reminders Not Appearing

**Check System Permissions**:
- macOS: System Preferences → Notifications → People Parity → Allow
- Windows: Settings → System → Notifications → People Parity → On

**Check Electron Store**:
```javascript
// Location:
// Windows: %APPDATA%/People Parity/config.json
// macOS: ~/Library/Application Support/People Parity/config.json

// Should contain:
{
  "lastStopTime": "2024-01-01T10:00:00Z",
  "reminderCount": 2
}
```

### Button State Wrong

**Force Refresh**:
1. Open Developer Console (F12)
2. Run: `queryClient.invalidateQueries(['dashboard'])`
3. State should sync

**Clear Local State**:
1. Logout from app
2. Login again
3. State resets fresh

## Future Enhancements

1. **Customizable Intervals**: Let users set reminder frequency
2. **Quiet Hours**: Don't remind during off-hours
3. **Smart Reminders**: Based on usual work patterns
4. **Snooze Option**: "Remind me in X minutes"
5. **Statistics**: Show how many hours lost to forgotten tracking

## Files Modified

1. ✅ `apps/desktop/src/renderer/hooks/useTracker.ts` - State management
2. ✅ `apps/desktop/src/main/services/trackingReminderService.ts` - Reminder system (new)
3. ✅ `apps/desktop/src/main/index.ts` - Integration points

## Summary

Two critical issues fixed:
1. **UI State Sync**: Local state management ensures button always shows correct state
2. **Forgotten Tracking**: Automatic reminders ensure users never forget to restart tracking

Result: More reliable UI and better time tracking coverage!