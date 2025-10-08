# Advanced Rhythm & Timing Detection

## Overview
Advanced bot detection based on timing patterns and keystroke/mouse rhythm analysis. These methods catch bots that try to appear human by adding randomness, but fail to replicate natural human timing variability.

## Detection Methods Implemented

### 1. Too-Regular Interval Detection

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Method**: `detectTooRegularIntervals()`

**What It Detects**:
- Keystrokes clustered at specific intervals (100ms, 250ms, 500ms, 1000ms, etc.)
- Events happening on exact 5/10/15-second boundaries
- Bot scripts with `setInterval()` or `sleep()` at fixed durations

**Signatures**:
- **60%+ intervals** cluster tightly (within 1%) around a specific value
- **40%+ events** occur at exact time boundaries (5s, 10s, 15s marks)

**Example Bot Pattern**:
```python
while True:
    type_character()
    time.sleep(1.0)  # Exactly 1 second every time
```

**Detection Log**:
```
Too-regular intervals (65% at 1000±10ms)
Events on exact time boundaries (45% on 5s/10s/15s marks)
```

**Confidence**: 35-40%

---

### 2. Low Inter-Keystroke Timing (IKT) Variance

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Method**: `detectLowIKTVariance()`

**What It Detects**:
- Unnaturally consistent typing rhythm across long spans
- Lack of natural human variation in typing speed
- Symmetrical distribution (bots) vs skewed distribution (humans)

**Human vs Bot Characteristics**:

| Metric | Humans | Bots |
|--------|--------|------|
| Coefficient of Variation | >0.4 (high variation) | <0.2 (low variation) |
| Skewness | >0.5 (right-skewed, occasional pauses) | ~0 (symmetrical) |
| Clustering | Spread out | 70%+ within ±10% of mean |

**Why This Works**:
- Humans naturally vary typing speed (fast bursts, slow thinking pauses)
- Human typing has a **right-skewed distribution** (occasional long pauses)
- Bots maintain near-constant intervals with symmetrical distribution

**Detection Logs**:
```
Low IKT variance (CV: 0.18, skew: 0.12, expected CV>0.4, skew>0.5 for humans)
Too-tight IKT clustering (72% within ±10% of mean 245ms)
```

**Confidence**: 35-40%

---

### 3. Constant Key-Hold Time Detection

**Location**: `apps/desktop/src/main/services/metricsCollector.ts`

**Method**: `detectConstantKeyHoldTimes()`

**What It Detects**:
- Nearly identical key down→up durations across many keys
- Bots that simulate keypresses with fixed hold times

**Human vs Bot Behavior**:

| Aspect | Humans | Bots |
|--------|--------|------|
| Hold Time Std Dev | >20ms (variable) | <10ms (constant) |
| Hold Clustering | Spread across range | 70%+ at exact duration (e.g., 100ms±10ms) |

**Example Bot Code**:
```python
def press_key(char):
    keyboard.press(char)
    time.sleep(0.1)  # Always exactly 100ms
    keyboard.release(char)
```

**Why Humans Vary**:
- Different keys held for different durations
- Typing speed varies with context
- Mistakes cause longer/shorter holds

**Detection Logs**:
```
Constant key-hold times (σ: 8.5ms, mean: 105ms, expected σ>20ms for humans)
Key-hold clustering (75% at 100±10ms)
```

**Confidence**: 35-40%

---

### 4. Idle Reset Pattern Detection

**Location**: `apps/desktop/src/main/utils/spikeDetectorV2.ts`

**Method**: `detectIdleResetPatterns()`

**What It Detects**:
- Bot activity starting at exact 30s/60s/90s intervals after idle
- Activity bursts at minute boundaries (0s or 30s marks)
- Scheduled bot tasks that run on timers

**Common Bot Patterns**:
```python
# Pattern 1: Idle timeout reset
while True:
    do_activity()
    time.sleep(60)  # Exactly 60 seconds idle

# Pattern 2: Scheduled bursts
schedule.every(30).seconds.do(type_something)
```

**Signatures**:
- **3+ idle periods** with durations matching 30s/60s/90s/120s (±1s tolerance)
- Idle duration **std dev < 2 seconds** (too consistent)
- **60%+ activity periods** start at 0s or 30s second marks

**Detection Logs**:
```
Idle resets at exact intervals (60s ±0.8s, 5 times)
Activity starts on exact boundaries (7/10 periods at 0s/30s marks)
```

**Confidence**: 20-25%

---

## Combined Detection Examples

### Example 1: Macro Recorder Bot

**Bot Behavior**:
- Types every character with exactly 150ms delay
- Holds each key for exactly 75ms
- Repeats every 60 seconds

**Detected By**:
1. **Too-Regular Intervals**: 98% at 150±1.5ms → +40% confidence
2. **Low IKT Variance**: CV: 0.01, skew: 0 → +40% confidence
3. **Constant Key-Hold**: σ: 2ms at 75ms → +40% confidence
4. **Idle Resets**: Exactly 60s idle, 4 times → +25% confidence

**Total**: 145% confidence (capped at 100%) → **BOT DETECTED**

---

### Example 2: Scheduled Script Bot

**Bot Behavior**:
- Runs task every 30 seconds
- Each task types 100 characters
- Random delays between 200-300ms

**Detected By**:
1. **Too-Regular Intervals**: 45% on 30s boundaries → +35% confidence
2. **Low IKT Variance**: 85% within ±10% of 250ms → +35% confidence
3. **Idle Resets**: 30s idle ±0.5s, 6 times → +25% confidence

**Total**: 95% confidence → **BOT DETECTED**

---

### Example 3: "Humanized" Bot (with randomness)

**Bot Behavior**:
- Adds `random.uniform(0.1, 0.4)` to delays
- Varies key-hold times slightly
- Still follows fixed patterns

**Why It Still Gets Caught**:
1. **Distribution shape**: Even with randomness, bots create symmetrical distributions (skew ≈ 0)
2. **Clustering**: Random ranges are too tight (CV still <0.3)
3. **No natural pauses**: Humans have occasional long pauses (thinking), bots don't
4. **Perfect boundaries**: Even with jitter, activity aligns with scheduler

**Detected By**:
1. **Low IKT Variance**: CV: 0.25, skew: 0.1 → +35% confidence
2. **PyAutoGUI Pattern**: 72% in 100-400ms range → +45% confidence

**Total**: 80% confidence → **BOT DETECTED**

---

## Statistical Foundations

### Why Coefficient of Variation (CV) Works

**Formula**: `CV = σ / μ` (standard deviation / mean)

**Human Typing**:
- Fast bursts: 50-100ms intervals
- Slow thinking: 500-2000ms intervals
- Mean: ~250ms, σ: ~150ms
- **CV = 150/250 = 0.6** (high variation)

**Bot Typing**:
- Consistent: 200-300ms intervals
- Mean: ~250ms, σ: ~30ms
- **CV = 30/250 = 0.12** (low variation)

### Why Skewness Works

**Human Distribution** (right-skewed):
```
Frequency
    |
100 |██████
 80 |██████████
 60 |████████████
 40 |██████████████
 20 |████████████████████ (long tail →)
    +-------------------------
    0   200  400  600  800+ms
```
**Skewness**: 0.5-1.5 (positive, long right tail)

**Bot Distribution** (symmetrical):
```
Frequency
    |
100 |     ████
 80 |   ████████
 60 | ████████████
 40 |████████████████
 20 |████████████████
    +-------------------------
    0   200  400  600  800ms
```
**Skewness**: -0.2 to 0.2 (near zero)

---

## Thresholds Summary

### metricsCollector.ts
```typescript
// Too-Regular Intervals
REGULAR_INTERVAL_CLUSTER_THRESHOLD = 0.6    // 60%+ clustering
TIME_BOUNDARY_THRESHOLD = 0.4               // 40%+ on boundaries
INTERVAL_TOLERANCE = 0.01                   // 1% tolerance

// Low IKT Variance
IKT_CV_THRESHOLD = 0.2                      // CV < 0.2 = bot
IKT_SKEWNESS_THRESHOLD = 0.3                // |skew| < 0.3 = bot
IKT_CLUSTERING_THRESHOLD = 0.7              // 70%+ clustering

// Constant Key-Hold
KEY_HOLD_STDDEV_THRESHOLD = 10              // σ < 10ms = bot
KEY_HOLD_CLUSTERING_THRESHOLD = 0.7         // 70%+ clustering
```

### spikeDetectorV2.ts
```typescript
// Idle Reset Patterns
IDLE_INTERVAL_TOLERANCE = 1000              // ±1 second
IDLE_STDDEV_THRESHOLD = 2000                // σ < 2s = bot
BOUNDARY_START_THRESHOLD = 0.6              // 60%+ on boundaries
REQUIRED_IDLE_RESETS = 3                    // Need 3+ occurrences
```

---

## False Positive Prevention

### Legitimate Activities Protected

1. **Variable Typing Speed**
   - Fast coding followed by slow debugging
   - Writing prose vs editing
   - Different tasks = different rhythms

2. **Natural Pauses**
   - Thinking time creates right-skewed distribution
   - Context switches create variation
   - Humans are naturally inconsistent

3. **Different Contexts**
   - Copy-paste operations (instant bursts)
   - Form filling (consistent but high CV)
   - Code review (reading pattern, not flagged)

### Safeguards

- **High thresholds**: Require 60-70% clustering (not 50%)
- **Multiple signals**: Need 2-3 methods to confirm
- **Long observation**: Require 20-100+ events for statistical validity
- **Context awareness**: Combined with pattern detection

---

## Testing Examples

### Test 1: Detect Macro with Fixed Delays
```python
# This will be detected
while True:
    type_char()
    time.sleep(0.2)  # Always 200ms
```

**Expected Detection**:
- Too-regular intervals: 95%+ at 200ms → **DETECTED**
- Low IKT variance: CV < 0.05 → **DETECTED**

### Test 2: Detect Scheduled Task Bot
```python
# This will be detected
schedule.every(60).seconds.do(activity_burst)
```

**Expected Detection**:
- Idle resets: 60s ±0.5s, 4+ times → **DETECTED**
- Boundary events: 80%+ at 0s mark → **DETECTED**

### Test 3: Allow Human Typing
```
Real human typing intervals: [120, 85, 340, 95, 1200, 75, 110, 520, 90, ...]
- CV: 0.65 (high variation)
- Skewness: 1.2 (right-skewed)
- No clustering
```

**Expected**: **NOT DETECTED** ✓

---

## Summary

Advanced rhythm detection adds **4 new methods** that analyze timing patterns:

1. **Too-Regular Intervals** - Catches fixed-delay bots
2. **Low IKT Variance** - Catches "humanized" bots with tight randomness
3. **Constant Key-Hold Times** - Catches simulated keypresses
4. **Idle Reset Patterns** - Catches scheduled/timer-based bots

These methods use **statistical analysis** to distinguish human variability from bot consistency, even when bots add randomness to appear human.

**Key Insight**: Bots can add randomness, but they can't replicate the **distribution shape** of human behavior (high CV, positive skew, wide spread, no clustering).
