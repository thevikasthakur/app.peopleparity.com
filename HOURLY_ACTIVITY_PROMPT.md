# Hourly Activity Update Prompt Feature

## Overview
Implemented an hourly activity update prompt system that reminds users to update their activity details every hour during an active tracking session, with playful Indian manager-style messages.

## Features

### 1. Rotating Prompt Messages
**File**: `apps/desktop/src/main/data/hourlyPromptMessages.json`

A collection of 20 sarcastic, playful Indian manager-style messages that rotate randomly:
- "Arre bhai, one hour hogaya! Still working on the same thing or have you moved to WhatsApp groups by now? 😏"
- "Beta, it's been an hour. Are you actually working on this task or just 'researching' on YouTube? Time for update!"
- "Hello hello! One hour complete. Please to be updating your activity. We know you're multitasking between work and cricket scores 🏏"
- ...and 17 more!

### 2. Hourly Timer Implementation
**File**: `apps/desktop/src/main/services/activityTracker.ts`

Added to the ActivityTracker class:
- `hourlyPromptTimer`: Interval timer that checks every minute
- `lastHourlyPromptTime`: Tracks when the last prompt was shown
- `startHourlyPromptTimer()`: Starts the hourly check
- `getRandomPromptMessage()`: Loads and returns a random message from the JSON file

**Logic**:
- Timer starts when tracking begins
- Checks every minute if an hour has passed since session start
- Shows prompt at every hour mark (1 hour, 2 hours, 3 hours, etc.)
- Prevents duplicate prompts within the same hour

### 3. User Prompt Dialog
**File**: `apps/desktop/src/main/index.ts`

Event listener for `'hourly:prompt'` that shows a native Electron dialog:
- **Title**: "Activity Update Time! 📋"
- **Message**: Random message from the repository
- **Detail**: "Would you like to continue with the current activity or change it?"
- **Buttons**:
  - "Continue" (default) - No action, tracking continues
  - "Change Activity" - Stops session and opens activity modal

### 4. Activity Modal Integration
**Files**:
- `apps/desktop/src/main/index.ts` - Sends IPC event
- `apps/desktop/src/main/preload.ts` - Registers IPC channel
- `apps/desktop/src/renderer/pages/Dashboard.tsx` - Handles event

When user chooses "Change Activity":
1. Current session stops
2. Activity tracker stops tracking
3. IPC event `'show-start-tracking-modal'` is sent to renderer
4. Dashboard receives event and opens the "Start Tracking" modal
5. User selects new activity/task and starts fresh session

## User Flow

```
Session Active (1 hour passes)
       ↓
[Hourly Prompt Dialog]
"Arre bhai, one hour hogaya! Still working on the same thing?"
       ↓
   User Choice:
       ↓
   ┌───────┴───────┐
   ↓               ↓
Continue      Change Activity
   ↓               ↓
Continue      Stop Session → Open Modal → Select New Activity → Start New Session
Tracking
```

## Technical Implementation

### Event Flow
1. **ActivityTracker** emits `'hourly:prompt'` event with message
2. **Main Process** listens and shows dialog
3. User selects option:
   - **Continue**: Dialog closes, nothing happens
   - **Change**:
     - Calls `activityTracker.stopSession()`
     - Sends `'show-start-tracking-modal'` via `webContents.send()`
4. **Renderer** receives event and sets `showActivityModal(true)`
5. **ActivityModal** opens, user selects new activity

### Timer Mechanism
```typescript
// Check every minute
setInterval(() => {
  const hoursSinceStart = Math.floor(sessionDurationMs / (60 * 60 * 1000));
  const hoursSinceLastPrompt = timeSinceLastPrompt / (60 * 60 * 1000);

  if (hoursSinceStart >= 1 && hoursSinceLastPrompt >= 1) {
    emit('hourly:prompt', getRandomPromptMessage());
    lastHourlyPromptTime = now;
  }
}, 60 * 1000);
```

### Cleanup
All timers are properly cleared when tracking stops:
```typescript
if (this.hourlyPromptTimer) {
  clearInterval(this.hourlyPromptTimer);
  this.hourlyPromptTimer = null;
}
```

## Testing

### Test Scenarios

1. **Happy Path - Continue**
   - Start tracking
   - Wait 1 hour (or adjust timer for testing)
   - Verify prompt appears
   - Click "Continue"
   - Verify tracking continues
   - Wait another hour
   - Verify prompt appears again

2. **Happy Path - Change**
   - Start tracking
   - Wait 1 hour
   - Verify prompt appears
   - Click "Change Activity"
   - Verify session stops
   - Verify "Start Tracking" modal opens
   - Select new activity
   - Verify new session starts

3. **Edge Cases**
   - Start tracking at 2:59 PM → Verify prompt at 3:59 PM
   - Stop and restart tracking → Verify timer resets
   - Multiple prompts → Verify only one per hour
   - Message file missing → Verify fallback message works

### Manual Testing Commands

For faster testing, temporarily modify the timer:
```typescript
// In startHourlyPromptTimer(), change:
}, 60 * 1000); // 1 minute check
// To:
}, 5 * 1000); // 5 second check for testing

// And change hour threshold:
if (hoursSinceStart >= 1 && hoursSinceLastPrompt >= 1) {
// To:
if (hoursSinceStart >= 0.001 && hoursSinceLastPrompt >= 0.001) { // ~3.6 seconds
```

## Message Guidelines

When adding new messages to `hourlyPromptMessages.json`:

### Style Guidelines
- ✅ Playful, non-offensive sarcasm
- ✅ Indian English colloquialisms ("ji", "na", "kindly", "do the needful")
- ✅ Mixing Hindi/English ("Arre", "yaar", "beta")
- ✅ Light workplace humor (meetings, chai breaks, multitasking)
- ✅ Emojis for tone (😊, 😅, 😏, ☕, 📱, 🏏)
- ❌ Offensive stereotypes
- ❌ Too aggressive or demanding
- ❌ Work shaming

### Examples of Good Messages
- "One hour hogaya! Time for update. Don't worry, we won't judge if you were actually in a 'meeting' all this time 😉"
- "Hourly check-in time! We're not micromanaging, just... well, actually we are. Please update your activity! 😅"

### Examples to Avoid
- ❌ Too aggressive: "UPDATE NOW OR ELSE!"
- ❌ Work shaming: "You haven't done anything productive, have you?"
- ❌ Stereotypical: Messages that mock accents or culture negatively

## Future Enhancements

1. **Customizable Timer**: Let users set interval (30 min, 1 hour, 2 hours)
2. **Notification Instead of Dialog**: Less intrusive, appears in system tray
3. **Snooze Option**: "Remind me in 15 minutes"
4. **Message Themes**: Let users choose tone (formal, casual, funny)
5. **Analytics**: Track how often users change vs continue
6. **Smart Timing**: Avoid prompts during screen recording or presentations

## Files Modified

1. ✅ `apps/desktop/src/main/data/hourlyPromptMessages.json` (new)
2. ✅ `apps/desktop/src/main/services/activityTracker.ts`
3. ✅ `apps/desktop/src/main/index.ts`
4. ✅ `apps/desktop/src/main/preload.ts`
5. ✅ `apps/desktop/src/renderer/pages/Dashboard.tsx`

## Summary

The hourly activity prompt feature is now fully implemented with:
- ✅ 20 rotating Indian manager-style messages
- ✅ Hourly timer that triggers every hour
- ✅ Native dialog with Continue/Change options
- ✅ Seamless integration with existing activity modal
- ✅ Proper cleanup and event handling
- ✅ All IPC channels registered

Users will now be gently (and humorously) reminded to update their activity every hour! 😊
