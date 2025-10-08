# Bot Detection Enhancements

## Overview
Enhanced bot detection mechanisms to prevent automated activity simulation tools (like PyAutoGUI-based bots) from fooling the time tracker.

## Bot Analysis: test.py

The analyzed bot has two modes:

### Coder Mode
- **Method**: Character-by-character typing using `pyautogui.press(char)`
- **Timing**: Random delays between 150-500ms (0.15-0.5 seconds)
- **Behavior**:
  - Reads code from a file
  - Types each character individually with consistent random delays
  - Occasionally scrolls (30% chance) with 1-3s pauses
  - Can loop infinitely or a specified number of times

### Reviewer Mode
- **Method**: Simulates code review by pressing arrow down repeatedly
- **Timing**: Random delays between 800-2000ms (0.8-2.0 seconds)
- **Behavior**:
  - Presses down arrow to move line-by-line
  - Scrolls down every 15-25 lines
  - Occasionally scrolls up (5% chance) to simulate re-reading
  - Random "analysis" pauses (10% chance, 3-5 seconds)
  - Switches tabs or returns to top at end of file

## Detection Mechanisms Implemented

### Keyboard Bot Detection

#### 1. PyAutoGUI Pattern Detection (`metricsCollector.ts`)

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Detection Method**: `detectPyAutoGuiPattern()`

**Signature**:
- 70%+ of keystroke intervals fall within 150-500ms range
- Less than 10% of intervals are below 100ms (PyAutoGUI processing minimum)
- Consistent random delays that cluster in the bot's configured range

**Confidence**: 0.45 (45%) when detected

**Example Log**:
```
PyAutoGUI bot pattern detected (75% intervals in 150-500ms, avg: 325ms)
```

#### 2. Character-by-Character Typing Detection (`metricsCollector.ts`)

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Detection Method**: `detectCharacterByCharacterTyping()`

**Signature**:
- Less than 5% "burst typing" (natural human behavior)
- Humans naturally press multiple keys in quick succession
- Bots maintain consistent spacing between ALL keystrokes
- Requires 50+ keystrokes for reliable detection

**Confidence**: 0.35 (35%) when detected

**Example Log**:
```
Character-by-character bot detected (2.1% burst typing, expected >20%)
```

#### 3. Repeating Sequence Detection (`metricsCollector.ts`)

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Detection Method**: `detectRepeatingSequences()`

**Signature**:
- Identical 20-key sequences repeated 3+ times
- Catches bots typing from the same file repeatedly
- Analyzes actual key codes, not just timing

**Confidence**: 0.40 (40%) when detected

**Example Log**:
```
Identical 20-key sequence repeated 4 times (bot typing from file)
```

#### 4. Reviewer Bot Detection (`spikeDetectorV2.ts`)

**Location**: `apps/desktop/src/main/utils/spikeDetectorV2.ts`

**Detection Method**: `detectReviewerBot()`

**Signature**:
- 85%+ navigation keys (arrow keys) with <10% productive typing
- Only 1-3 unique keys pressed but 30+ total keystrokes
- Sustained high navigation ratio across multiple periods
- Repetitive down arrow with minimal diversity

**Confidence**: 25-30% (25-30 points added to spike score)

**Example Logs**:
```
Reviewer bot pattern (92% navigation keys, sustained pattern)
Repetitive navigation bot (45 keys, only 2 unique, 95% navigation)
```

### Mouse Bot Detection (Advanced Trajectory Analysis)

#### 5. Linear/Robotic Path Detection (`metricsCollector.ts`)

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Detection Method**: `detectLinearPaths()`

**Signature**:
- 80%+ perfectly straight line segments (near-zero curvature)
- 60%+ movements at perfect 45° or 90° angles
- Humans naturally move in curves, bots move in straight lines

**Confidence**: 0.35-0.40 (35-40%) when detected

**Example Logs**:
```
Robotic linear paths detected (85% perfectly straight segments)
Unnatural 45°/90° angle dominance (67% perfect angles)
```

#### 6. Constant Velocity/Acceleration Detection (`metricsCollector.ts`)

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Detection Method**: `detectConstantVelocity()`

**Signature**:
- Coefficient of variation < 0.15 (humans typically > 0.3)
- 80%+ zero acceleration (flat speed profile)
- Humans naturally speed up and slow down, bots maintain constant speed

**Confidence**: 0.30-0.35 (30-35%) when detected

**Example Logs**:
```
Constant velocity profile (CV: 0.12, expected >0.3 for humans)
Flat acceleration profile (85% zero acceleration)
```

#### 7. Low Path Entropy Detection (`metricsCollector.ts`)

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Detection Method**: `detectLowPathEntropy()`

**Signature**:
- Repetitive micro-wiggles with identical amplitude (std dev < 1.5px)
- 60%+ periodic back-and-forth pattern (sine-wave jitter)
- Some bots add fake "humanization" jitter that's too perfect

**Confidence**: 0.40 (40%) when detected

**Example Logs**:
```
Sine-wave jitter pattern (amplitude σ: 1.2px, 68% periodic)
```

#### 8. Micro-Correction Detection (`metricsCollector.ts`)

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Detection Method**: `detectMicroCorrections()`

**Signature**:
- 70%+ pixel-perfect stops at click targets
- No direction changes when approaching targets
- Humans overshoot/undershoot and correct, bots don't

**Confidence**: 0.35 (35%) when detected

**Example Logs**:
```
No micro-corrections to targets (7/9 pixel-perfect stops)
```

#### 9. Unrealistic DPI Hops Detection (`metricsCollector.ts`)

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Detection Method**: `detectUnrealisticDPIHops()`

**Signature**:
- Large pixel jumps (>200px) in very short time (<5ms)
- Teleportation movements (>500px in <2ms)
- 10%+ impossible movements based on typical mouse DPI

**Confidence**: 0.40 (40%) when detected

**Example Logs**:
```
Unrealistic DPI hops detected (15 impossible movements, 12% of total)
```

## How Detection Works

### Multi-Layer Approach

1. **Keyboard Pattern Analysis** (metricsCollector.ts)
   - Analyzes keystroke timing patterns
   - Detects PyAutoGUI signatures
   - Identifies character-by-character typing
   - Finds repeating sequences

2. **Mouse Trajectory Analysis** (metricsCollector.ts)
   - Analyzes movement paths and curvature
   - Detects constant velocity profiles
   - Identifies artificial jitter patterns
   - Checks for micro-corrections
   - Validates DPI-realistic movements

3. **Spike Detection** (spikeDetectorV2.ts)
   - Tracks activity over time
   - Detects reviewer bot patterns
   - Identifies sudden anomalies
   - Analyzes cross-period consistency

4. **Confidence Scoring**
   - Each detection adds to confidence score
   - Multiple detections compound confidence
   - Bot flagged when confidence > 70%
   - Activity score set to 0 when confidence ≥ 60%

### Example Detection Flow

**Coder Bot Detection**:
```
1. MetricsCollector analyzes keystroke intervals
2. detectPyAutoGuiPattern() finds 75% in 150-500ms range → +45% confidence
3. detectCharacterByCharacterTyping() finds 2% burst typing → +35% confidence
4. Total confidence: 80% → BOT DETECTED ✓
5. Activity score set to 0
```

**Reviewer Bot Detection**:
```
1. SpikeDetectorV2 analyzes activity pattern
2. detectReviewerBot() finds 92% navigation keys → +40 spike points, +25% confidence
3. Sustained pattern over 5+ periods → Confirmed bot
4. Total spike score: 85, confidence: 75% → BOT DETECTED ✓
5. Activity marked as invalid
```

**Mouse Bot Detection**:
```
1. MetricsCollector analyzes mouse movement trajectory
2. detectLinearPaths() finds 85% straight segments → +40% confidence
3. detectConstantVelocity() finds CV: 0.12 → +35% confidence
4. detectMicroCorrections() finds 8/10 perfect stops → +35% confidence
5. Total confidence: 110% (capped at 100%) → BOT DETECTED ✓
6. Activity score set to 0
```

## Thresholds and Constants

### metricsCollector.ts
```typescript
BOT_INTERVAL_THRESHOLD = 10ms          // Superhuman speed
CONSISTENT_INTERVAL_THRESHOLD = 5ms    // Unnaturally consistent
PYAUTOGUI_MIN_INTERVAL = 100ms         // PyAutoGUI minimum
PYAUTOGUI_PATTERN_RANGE_MIN = 150ms    // Bot random delay min
PYAUTOGUI_PATTERN_RANGE_MAX = 500ms    // Bot random delay max
CHARACTER_BY_CHAR_THRESHOLD = 0.8      // 80% single-char = bot
```

### spikeDetectorV2.ts
```typescript
spikeThreshold = 4.0                   // Higher to reduce false positives
burstThreshold = 3.0                   // Allow normal typing bursts
reviewerBotArrowKeyRatio = 0.9         // 90%+ navigation = bot
reviewerBotScrollThreshold = 0.8       // 80% scroll correlation
```

## Bot Score Calculation

**Final Bot Decision**:
```typescript
isBot = (spikeScore >= 60 && confidence >= 60) ||
        (keyboardBotConfidence >= 0.7) ||
        (mouseBotConfidence >= 0.7)
```

**Activity Score Impact**:
- Bot detected with high confidence → Score = 0
- Bot suspected → Score reduced proportionally
- Spike detected → Score reduced by severity

## False Positive Prevention

### Legitimate Activities Protected

1. **Normal Typing Bursts**
   - Coding with IDE auto-complete
   - Fast typing with corrections
   - Copy-paste operations

2. **Reading/Scrolling**
   - Legitimate code review
   - Document reading
   - Web browsing

3. **Pattern Recognition**
   - hasTextPatterns: Normal prose writing
   - hasCodingPatterns: Programming activity
   - hasReadingPattern: Legitimate reading

### Safeguards
- High confidence thresholds (70%+)
- Multiple detection methods required
- Context-aware pattern analysis
- Historical consistency checks
- Activity pattern recognition

## Testing the Detection

To test if your app can detect the bot:

1. **Run the bot** in either Coder or Reviewer mode
2. **Start time tracking** in your app
3. **Wait 5-10 minutes** for detection to accumulate data
4. **Check logs** for bot detection messages:
   ```
   ⚠️ Bot activity detected via spike analysis (confidence: 85%): PyAutoGUI bot pattern detected
   🚫 Bot activity detected, setting score to 0
   ⚠️ Pattern bot detected: Character-by-character bot detected
   ```

## Future Improvements

Potential enhancements:

1. **Machine Learning**
   - Train model on legitimate vs bot activity
   - Adaptive thresholds based on user patterns
   - Anomaly detection using neural networks

2. **Additional Patterns**
   - Detect mouse teleportation (bot switching windows)
   - Analyze window focus patterns
   - Check for script process detection

3. **User Feedback Loop**
   - Allow users to flag false positives
   - Adjust thresholds based on feedback
   - Whitelist specific patterns

4. **Advanced Metrics**
   - Keyboard-to-mouse timing correlation
   - Natural pause patterns
   - Attention drift detection

## Summary

The enhanced bot detection system uses multiple layers of analysis to identify automated activity tools:

### Keyboard Bot Detection
- **PyAutoGUI signature detection** catches character-by-character typing with consistent random delays
- **Burst typing analysis** identifies lack of natural human typing patterns
- **Sequence repetition detection** catches bots typing from files repeatedly
- **Reviewer bot detection** identifies repetitive navigation key patterns

### Mouse Bot Detection (NEW)
- **Linear path detection** identifies robotic straight-line movements and perfect angles
- **Velocity analysis** detects constant speed profiles (bots don't speed up/slow down)
- **Path entropy analysis** catches artificial jitter patterns (sine-wave faker humanization)
- **Micro-correction detection** identifies pixel-perfect targeting (humans overshoot/undershoot)
- **DPI validation** detects impossible pixel jumps and teleportation movements

### Overall Detection
- **Cross-period analysis** ensures consistent bot-like behavior over time
- **Multi-signal fusion** combines keyboard and mouse evidence
- **Context-aware scoring** prevents false positives on legitimate activities

These mechanisms work together to achieve high confidence bot detection while minimizing false positives through context-aware pattern recognition and advanced trajectory analysis.
