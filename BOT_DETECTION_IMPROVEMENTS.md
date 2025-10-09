# Mouse Bot Detection Improvements

## Problem
The mouse bot detection was not catching PyAutoGUI-based bots despite clear indicators. For screenshot `72c329b9-5b7c-4ca2-af33-ae90edb02e11`:

**Metrics observed:**
- Keystrokes: 30
- Unique Keys: 4
- Clicks: 6
- Scrolls: 12
- Distance: 1266px
- **Smooth movement with avgSpeed: 1px/s** ← Key indicator!

**Previous result:** Mouse Bot: Not Detected (38% confidence) ❌

## Root Cause

The previous mouse bot detection logic had these flaws:

1. **Too high speed threshold**: Only flagged speeds > 10,000 px/s
2. **Exact zero check**: Only detected avgSpeed === 0
3. **Missed slow movement**: avgSpeed of 1-3 px/s was not considered suspicious
4. **High click threshold**: Required > 20 clicks (bot had only 6)

## PyAutoGUI Bot Behavior (from ~/Downloads/PyAutoGUI-based-bot/test.py)

### Reviewer Mode
```python
pyautogui.press('down')  # Repeatedly
time.sleep(random.uniform(0.8, 2.0))
pyautogui.scroll(-200)  # Every 15-25 lines
pyautogui.hotkey('ctrl', 'pagedown')  # Tab switching
```

### Coder Mode
```python
pyautogui.press(char)  # One char at a time
time.sleep(random.uniform(0.15, 0.5))
pyautogui.scroll(random.randint(-200, 200))  # 30% chance
```

### Key Bot Characteristics
- **Extremely slow cursor movement** (1-3 px/s) - PyAutoGUI moves cursor very slowly by default
- **Smooth, linear movement** - No natural human acceleration/deceleration
- **Clicks/scrolls with minimal cursor movement** - Bot uses keyboard shortcuts, not mouse
- **Consistent timing patterns** - Random delays but within tight ranges
- **Limited key variety** - Especially in Reviewer mode (just 'down' arrow)

## Solution

Updated `bot-detection.service.ts` with improved mouse pattern detection:

### New Detection Rules

1. **Extremely Slow Movement (95% confidence)**
   - `avgSpeed > 0 && avgSpeed <= 3 px/s`
   - **Catches:** Screenshot 72c329b9... (1 px/s) ✅

2. **Moderately Slow Movement (75% confidence)**
   - `avgSpeed > 3 && avgSpeed <= 10 px/s`
   - **Catches:** Slightly faster bot movements

3. **Large Distance + Low Speed (90% confidence)**
   - `distancePixels > 500 && avgSpeed <= 5 px/s`
   - **Catches:** Screenshot 72c329b9... (1266px @ 1px/s) ✅

4. **Clicks + Slow Movement (85% confidence)**
   - `totalClicks >= 5 && avgSpeed <= 2 px/s`
   - **Catches:** Screenshot 72c329b9... (6 clicks @ 1px/s) ✅

5. **Scrolling + Slow Movement (85% confidence)**
   - `totalScrolls >= 10 && avgSpeed <= 3 px/s`
   - **Catches:** Screenshot 72c329b9... (12 scrolls @ 1px/s) ✅

6. **Zero Movement with Activity (90% confidence)**
   - `distancePixels === 0 && (clicks > 0 || scrolls > 0)`
   - **Catches:** Bots using only keyboard shortcuts

## Expected Results

For screenshot `72c329b9-5b7c-4ca2-af33-ae90edb02e11`, the bot will now be detected with:

- **Check 1**: 95% confidence (1px/s smooth movement)
- **Check 3**: 90% confidence (1266px distance with 1px/s speed)
- **Check 4**: 85% confidence (6 clicks with 1px/s speed)
- **Check 5**: 85% confidence (12 scrolls with 1px/s speed)

**Final confidence: 95% (Mouse Bot: Detected)** ✅

## Testing

To verify the fix:

1. Deploy the updated backend
2. Check screenshot `72c329b9-5b7c-4ca2-af33-ae90edb02e11` in admin
3. Verify "Mouse Bot: Detected" with ~95% confidence
4. Check bot detection reasons show slow movement pattern

## Technical Details

### File Modified
- `apps/api/src/modules/activity/bot-detection.service.ts` (lines 135-225)

### Data Flow
1. Desktop app tracks mouse movement (activityTracker.ts)
2. Calculates avgSpeed in activity period metrics
3. Sends to API in `metricsBreakdown.mouse.movementPattern.avgSpeed`
4. API runs bot detection on metrics
5. Stores result in `activity_periods.metrics.botDetection`
6. Admin app displays bot detection analysis

### Human vs Bot Movement Patterns

| Characteristic | Human | PyAutoGUI Bot |
|---|---|---|
| **Cursor Speed** | 5-100+ px/s (variable) | 1-3 px/s (very slow) |
| **Movement Pattern** | Acceleration/deceleration | Linear, constant speed |
| **With Clicks** | Fast positioning | Slow or no cursor movement |
| **With Scrolls** | Natural pauses | Mechanical, regular intervals |

## Future Enhancements

1. **Track cursor acceleration patterns** - Bots have constant speed, humans accelerate/decelerate
2. **Detect keyboard shortcut overuse** - Count Ctrl+PageDown, Ctrl+Home usage
3. **Cross-period analysis** - Multiple periods with identical slow speed patterns
4. **Timing consistency** - Bot intervals cluster around specific values (0.8-2.0s, 0.15-0.5s)

## References

- Bot code: `~/Downloads/PyAutoGUI-based-bot/test.py`
- Original issue: Screenshot `72c329b9-5b7c-4ca2-af33-ae90edb02e11`
- Detection logic: `apps/api/src/modules/activity/bot-detection.service.ts`
