/**
 * Enhanced Metrics Collector
 * Collects detailed activity metrics with bot detection and score calculation
 */

export interface DetailedActivityMetrics {
  keyboard: {
    totalKeystrokes: number;
    productiveKeystrokes: number;
    navigationKeystrokes: number;
    uniqueKeys: number;
    productiveUniqueKeys: number;
    keysPerMinute: number;
    typingRhythm: {
      consistent: boolean;
      avgIntervalMs: number;
      stdDeviationMs: number;
    };
    keystrokeIntervals: number[]; // Store last 100 intervals for analysis
  };
  mouse: {
    totalClicks: number;
    leftClicks: number;
    rightClicks: number;
    doubleClicks: number;
    totalScrolls: number;
    distancePixels: number;
    distancePerMinute: number;
    movementPattern: {
      smooth: boolean;
      avgSpeed: number;
      maxSpeed: number;
    };
    clickIntervals: number[]; // Store last 50 click intervals
  };
  botDetection: {
    keyboardBotDetected: boolean;
    mouseBotDetected: boolean;
    repetitivePatterns: number;
    suspiciousIntervals: number;
    penaltyApplied: number;
    confidence: number;
    details: string[];
  };
  timeMetrics: {
    periodDurationSeconds: number;
    activeSeconds: number;
    idleSeconds: number;
    activityPercentage: number;
  };
  scoreCalculation: {
    components: {
      keyboardScore: number;
      mouseScore: number;
      consistencyScore: number;
      activityTimeScore: number;
    };
    penalties: {
      botPenalty: number;
      idlePenalty: number;
      suspiciousActivityPenalty: number;
    };
    formula: string;
    rawScore: number;
    finalScore: number;
  };
  classification: {
    category: 'highly_active' | 'active' | 'moderate' | 'low' | 'idle';
    confidence: number;
    tags: string[];
  };
  metadata: {
    version: string;
    calculatedAt: string;
    calculationTimeMs: number;
  };
}

export class MetricsCollector {
  private keystrokeTimestamps: number[] = [];
  private keystrokeCodes: number[] = []; // Track actual key codes for pattern detection
  private keyHoldDurations: number[] = []; // Track key-hold durations for bot detection
  private clickTimestamps: number[] = [];
  private mousePositions: Array<{ x: number; y: number; timestamp: number }> = [];
  private productiveKeys: Set<number> = new Set();
  private navigationKeys: Set<number> = new Set();
  
  // Bot detection thresholds
  private readonly BOT_INTERVAL_THRESHOLD = 10; // ms - too fast to be human
  private readonly CONSISTENT_INTERVAL_THRESHOLD = 5; // ms - variance too low
  private readonly REPETITIVE_PATTERN_THRESHOLD = 10; // number of identical sequences

  // PyAutoGUI bot detection (for tools like the test bot)
  private readonly PYAUTOGUI_MIN_INTERVAL = 100; // PyAutoGUI has minimum ~100ms delay
  private readonly PYAUTOGUI_PATTERN_RANGE_MIN = 150; // Bot uses 150-500ms delays
  private readonly PYAUTOGUI_PATTERN_RANGE_MAX = 500;
  private readonly CHARACTER_BY_CHAR_THRESHOLD = 0.8; // 80% single-char sequences indicates bot
  
  constructor() {
    this.initializeKeyCategories();
  }
  
  private initializeKeyCategories() {
    // Initialize productive and navigation key sets based on your key codes
    // This should match the key categorization in ActivityTrackerV2
  }
  
  /**
   * Analyze keystroke patterns for bot detection
   */
  analyzeKeystrokePatterns(timestamps: number[]): {
    isBotLike: boolean;
    confidence: number;
    reasons: string[];
  } {
    if (timestamps.length < 10) {
      return { isBotLike: false, confidence: 0.5, reasons: ['Insufficient data'] };
    }

    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    // Check for superhuman speed
    const tooFastCount = intervals.filter(i => i < this.BOT_INTERVAL_THRESHOLD).length;
    const superhumanSpeed = tooFastCount > intervals.length * 0.3;

    // Check for unnaturally consistent intervals
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDeviation = Math.sqrt(variance);
    const unnaturallyConsistent = stdDeviation < this.CONSISTENT_INTERVAL_THRESHOLD;

    // Check for repetitive patterns
    const patternMap = new Map<string, number>();
    for (let i = 0; i < intervals.length - 3; i++) {
      const pattern = intervals.slice(i, i + 4).join(',');
      patternMap.set(pattern, (patternMap.get(pattern) || 0) + 1);
    }
    const repetitivePatterns = Array.from(patternMap.values()).filter(c => c > 3).length;

    // NEW: Detect PyAutoGUI-style bots (character-by-character with 150-500ms delays)
    const pyAutoGuiPattern = this.detectPyAutoGuiPattern(intervals);

    // NEW: Detect character-by-character typing pattern
    const charByCharPattern = this.detectCharacterByCharacterTyping(intervals);

    const reasons: string[] = [];
    let confidence = 0;

    if (superhumanSpeed) {
      reasons.push(`Superhuman typing speed detected (${tooFastCount} intervals < ${this.BOT_INTERVAL_THRESHOLD}ms)`);
      confidence += 0.4;
    }

    if (unnaturallyConsistent) {
      reasons.push(`Unnaturally consistent typing rhythm (std dev: ${stdDeviation.toFixed(2)}ms)`);
      confidence += 0.3;
    }

    if (repetitivePatterns > this.REPETITIVE_PATTERN_THRESHOLD) {
      reasons.push(`${repetitivePatterns} repetitive keystroke patterns detected`);
      confidence += 0.3;
    }

    // PyAutoGUI detection
    if (pyAutoGuiPattern.detected) {
      reasons.push(pyAutoGuiPattern.reason);
      confidence += pyAutoGuiPattern.confidence;
    }

    // Character-by-character detection
    if (charByCharPattern.detected) {
      reasons.push(charByCharPattern.reason);
      confidence += charByCharPattern.confidence;
    }

    // Repeating sequence detection
    const repeatingSeqPattern = this.detectRepeatingSequences(intervals);
    if (repeatingSeqPattern.detected) {
      reasons.push(repeatingSeqPattern.reason);
      confidence += repeatingSeqPattern.confidence;
    }

    // NEW: Advanced rhythm-based detection
    const tooRegularPattern = this.detectTooRegularIntervals(intervals, timestamps);
    if (tooRegularPattern.detected) {
      reasons.push(tooRegularPattern.reason);
      confidence += tooRegularPattern.confidence;
    }

    const lowVariancePattern = this.detectLowIKTVariance(intervals);
    if (lowVariancePattern.detected) {
      reasons.push(lowVariancePattern.reason);
      confidence += lowVariancePattern.confidence;
    }

    const constantHoldPattern = this.detectConstantKeyHoldTimes();
    if (constantHoldPattern.detected) {
      reasons.push(constantHoldPattern.reason);
      confidence += constantHoldPattern.confidence;
    }

    return {
      isBotLike: confidence > 0.7, // Increased threshold for keyboard
      confidence: Math.min(confidence, 1),
      reasons
    };
  }

  /**
   * Detect too-regular intervals (e.g., every 1000±10ms or on exact 5/10/15s boundaries)
   */
  private detectTooRegularIntervals(intervals: number[], timestamps: number[]): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (intervals.length < 20) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Check for clustering around specific intervals (e.g., 1000±10ms)
    const commonIntervals = [100, 250, 500, 1000, 2000, 5000]; // Common bot intervals

    for (const targetInterval of commonIntervals) {
      const tolerance = targetInterval * 0.01; // 1% tolerance
      const matchingCount = intervals.filter(i =>
        Math.abs(i - targetInterval) < tolerance
      ).length;

      const matchRatio = matchingCount / intervals.length;

      // If >60% of intervals cluster tightly around a specific value
      if (matchRatio > 0.6 && intervals.length > 30) {
        return {
          detected: true,
          confidence: 0.4,
          reason: `Too-regular intervals (${(matchRatio * 100).toFixed(0)}% at ${targetInterval}±${tolerance.toFixed(0)}ms)`
        };
      }
    }

    // Check for events on exact second boundaries (5s, 10s, 15s, etc.)
    if (timestamps.length > 20) {
      let boundaryEvents = 0;

      for (const ts of timestamps) {
        const msIntoSecond = ts % 1000;
        const secondsPart = Math.floor(ts / 1000) % 60;

        // Check if event happens very close to a 5-second boundary
        if (msIntoSecond < 50 || msIntoSecond > 950) {
          if (secondsPart % 5 === 0) {
            boundaryEvents++;
          }
        }
      }

      const boundaryRatio = boundaryEvents / timestamps.length;

      // If >40% of events happen on 5-second boundaries
      if (boundaryRatio > 0.4) {
        return {
          detected: true,
          confidence: 0.35,
          reason: `Events on exact time boundaries (${(boundaryRatio * 100).toFixed(0)}% on 5s/10s/15s marks)`
        };
      }
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect low inter-keystroke timing (IKT) variance across long spans
   * Humans have wide, skewed distribution; bots cluster tightly
   */
  private detectLowIKTVariance(intervals: number[]): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (intervals.length < 50) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Calculate IKT statistics
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

    // Calculate skewness (humans have right-skewed distribution)
    let skewness = 0;
    if (stdDev > 0) {
      const skewSum = intervals.reduce((sum, i) => sum + Math.pow((i - mean) / stdDev, 3), 0);
      skewness = skewSum / intervals.length;
    }

    // Humans typically have:
    // - High CV (>0.4) - wide variation in typing speed
    // - Positive skewness (>0.5) - occasional long pauses

    // Bots typically have:
    // - Low CV (<0.2) - very consistent timing
    // - Low skewness (near 0) - symmetrical distribution

    if (coefficientOfVariation < 0.2 && Math.abs(skewness) < 0.3 && intervals.length > 100) {
      return {
        detected: true,
        confidence: 0.4,
        reason: `Low IKT variance (CV: ${coefficientOfVariation.toFixed(3)}, skew: ${skewness.toFixed(2)}, expected CV>0.4, skew>0.5 for humans)`
      };
    }

    // Additional check: Look for "too perfect" distribution
    // Count how many intervals fall within ±10% of the mean
    const nearMeanCount = intervals.filter(i =>
      Math.abs(i - mean) < mean * 0.1
    ).length;
    const nearMeanRatio = nearMeanCount / intervals.length;

    // If >70% of intervals are within ±10% of mean, it's too consistent
    if (nearMeanRatio > 0.7 && intervals.length > 50) {
      return {
        detected: true,
        confidence: 0.35,
        reason: `Too-tight IKT clustering (${(nearMeanRatio * 100).toFixed(0)}% within ±10% of mean ${mean.toFixed(0)}ms)`
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect constant key-hold times (nearly identical down→up durations)
   * Humans vary key-hold times; bots often have very consistent hold durations
   */
  private detectConstantKeyHoldTimes(): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (this.keyHoldDurations.length < 20) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Calculate hold time statistics
    const mean = this.keyHoldDurations.reduce((a, b) => a + b, 0) / this.keyHoldDurations.length;
    const variance = this.keyHoldDurations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / this.keyHoldDurations.length;
    const stdDev = Math.sqrt(variance);

    // Check for unnaturally low variance
    // Humans typically have stdDev > 20ms for key-hold times
    // Bots often have stdDev < 10ms
    if (stdDev < 10 && this.keyHoldDurations.length > 30 && mean > 0) {
      return {
        detected: true,
        confidence: 0.4,
        reason: `Constant key-hold times (σ: ${stdDev.toFixed(1)}ms, mean: ${mean.toFixed(0)}ms, expected σ>20ms for humans)`
      };
    }

    // Check for clustering around specific durations (e.g., exactly 100ms)
    const commonDurations = [50, 75, 100, 150, 200]; // Common bot durations

    for (const targetDuration of commonDurations) {
      const tolerance = 10; // ±10ms
      const matchingCount = this.keyHoldDurations.filter(d =>
        Math.abs(d - targetDuration) < tolerance
      ).length;

      const matchRatio = matchingCount / this.keyHoldDurations.length;

      // If >70% of hold times cluster around a specific value
      if (matchRatio > 0.7 && this.keyHoldDurations.length > 25) {
        return {
          detected: true,
          confidence: 0.35,
          reason: `Key-hold clustering (${(matchRatio * 100).toFixed(0)}% at ${targetDuration}±${tolerance}ms)`
        };
      }
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect PyAutoGUI-style typing patterns (character-by-character with random delays)
   */
  private detectPyAutoGuiPattern(intervals: number[]): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (intervals.length < 20) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // PyAutoGUI has a characteristic pattern:
    // 1. Most intervals fall within 150-500ms range (random.uniform(0.15, 0.5))
    // 2. Minimum interval is usually >= 100ms (PyAutoGUI processing time)
    // 3. Very few intervals outside this range

    const inRangeCount = intervals.filter(i =>
      i >= this.PYAUTOGUI_PATTERN_RANGE_MIN &&
      i <= this.PYAUTOGUI_PATTERN_RANGE_MAX
    ).length;

    const belowMinCount = intervals.filter(i => i < this.PYAUTOGUI_MIN_INTERVAL).length;
    const inRangeRatio = inRangeCount / intervals.length;

    // PyAutoGUI signature: >70% of intervals in 150-500ms range and <10% below 100ms
    if (inRangeRatio > 0.7 && belowMinCount < intervals.length * 0.1) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      return {
        detected: true,
        confidence: 0.45,
        reason: `PyAutoGUI bot pattern detected (${(inRangeRatio * 100).toFixed(0)}% intervals in 150-500ms, avg: ${avgInterval.toFixed(0)}ms)`
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect character-by-character typing (bot signature)
   * Humans naturally press multiple keys in quick succession, bots often don't
   */
  private detectCharacterByCharacterTyping(intervals: number[]): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (intervals.length < 20) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Look for consistent spacing between ALL keystrokes
    // Humans have bursts of fast typing followed by pauses
    // Bots maintain consistent spacing throughout

    // Count "natural bursts" (2+ keys pressed within 100ms of each other)
    let burstCount = 0;
    for (let i = 0; i < intervals.length - 1; i++) {
      if (intervals[i] < 100 && intervals[i + 1] < 100) {
        burstCount++;
      }
    }

    const burstRatio = burstCount / intervals.length;

    // Humans typically have 20%+ burst typing, bots have nearly none
    if (burstRatio < 0.05 && intervals.length > 50) {
      return {
        detected: true,
        confidence: 0.35,
        reason: `Character-by-character bot detected (${(burstRatio * 100).toFixed(1)}% burst typing, expected >20%)`
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect repeating key sequences (bot typing from same file repeatedly)
   */
  private detectRepeatingSequences(intervals: number[]): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (this.keystrokeCodes.length < 50) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Look for exact sequence repetitions in the key codes
    // Bot typing from file will have identical sequences
    const sequenceLength = 20; // Check for 20-key sequences
    const sequences = new Map<string, number>();

    // Extract sequences from keystroke codes
    for (let i = 0; i <= this.keystrokeCodes.length - sequenceLength; i++) {
      const sequence = this.keystrokeCodes.slice(i, i + sequenceLength).join(',');
      sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
    }

    // Find the most common sequence
    let maxRepetitions = 0;
    for (const count of sequences.values()) {
      if (count > maxRepetitions) {
        maxRepetitions = count;
      }
    }

    // If same 20-key sequence appears 3+ times, it's likely a bot
    if (maxRepetitions >= 3) {
      return {
        detected: true,
        confidence: 0.4,
        reason: `Identical ${sequenceLength}-key sequence repeated ${maxRepetitions} times (bot typing from file)`
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Analyze mouse movement patterns for bot detection with advanced trajectory analysis
   */
  analyzeMousePatterns(
    positions: Array<{ x: number; y: number; timestamp: number }>,
    clicks: number[]
  ): {
    isBotLike: boolean;
    confidence: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let confidence = 0;

    // Need sufficient data for trajectory analysis
    if (positions.length > 20) {
      // 1. Linear/Robotic Path Detection
      const linearityCheck = this.detectLinearPaths(positions);
      if (linearityCheck.detected) {
        reasons.push(linearityCheck.reason);
        confidence += linearityCheck.confidence;
      }

      // 2. Constant Velocity/Acceleration Detection
      const velocityCheck = this.detectConstantVelocity(positions);
      if (velocityCheck.detected) {
        reasons.push(velocityCheck.reason);
        confidence += velocityCheck.confidence;
      }

      // 3. Low Path Entropy Detection (repetitive micro-wiggles)
      const entropyCheck = this.detectLowPathEntropy(positions);
      if (entropyCheck.detected) {
        reasons.push(entropyCheck.reason);
        confidence += entropyCheck.confidence;
      }

      // 4. Micro-Correction Detection (humans overshoot/undershoot)
      const correctionCheck = this.detectMicroCorrections(positions);
      if (correctionCheck.detected) {
        reasons.push(correctionCheck.reason);
        confidence += correctionCheck.confidence;
      }

      // 5. Unrealistic DPI Hops Detection
      const dpiCheck = this.detectUnrealisticDPIHops(positions);
      if (dpiCheck.detected) {
        reasons.push(dpiCheck.reason);
        confidence += dpiCheck.confidence;
      }
    }

    // 6. Click Pattern Analysis
    if (clicks.length > 5) {
      const clickIntervals: number[] = [];
      for (let i = 1; i < clicks.length; i++) {
        clickIntervals.push(clicks[i] - clicks[i - 1]);
      }

      const avgClickInterval = clickIntervals.reduce((a, b) => a + b, 0) / clickIntervals.length;
      const clickVariance = clickIntervals.reduce((sum, i) => sum + Math.pow(i - avgClickInterval, 2), 0) / clickIntervals.length;
      const clickStdDev = Math.sqrt(clickVariance);

      // Much stricter - only flag truly robotic clicking
      if (clickStdDev < 2 && avgClickInterval < 100) {
        reasons.push(`Unnaturally consistent fast clicking (std dev: ${clickStdDev.toFixed(2)}ms)`);
        confidence += 0.3;
      }
    }

    return {
      isBotLike: confidence > 0.7,
      confidence: Math.min(confidence, 1),
      reasons
    };
  }

  /**
   * Detect linear/robotic paths with near-zero curvature
   */
  private detectLinearPaths(positions: Array<{ x: number; y: number; timestamp: number }>): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (positions.length < 10) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Calculate curvature at each point
    const curvatures: number[] = [];
    let perfectAngles = 0; // Count of 45°/90° angles

    for (let i = 2; i < positions.length; i++) {
      const angle1 = Math.atan2(
        positions[i - 1].y - positions[i - 2].y,
        positions[i - 1].x - positions[i - 2].x
      );
      const angle2 = Math.atan2(
        positions[i].y - positions[i - 1].y,
        positions[i].x - positions[i - 1].x
      );

      let angleDiff = Math.abs(angle1 - angle2);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      curvatures.push(angleDiff);

      // Check for perfect 45° or 90° angles (bot signature)
      const degrees = (angleDiff * 180) / Math.PI;
      if (Math.abs(degrees - 45) < 2 || Math.abs(degrees - 90) < 2 || degrees < 2) {
        perfectAngles++;
      }
    }

    // Calculate curvature statistics
    const straightLineRatio = curvatures.filter(c => c < 0.01).length / curvatures.length;
    const perfectAngleRatio = perfectAngles / curvatures.length;

    // Bot signature: Very low curvature (straight lines) or many perfect angles
    if (straightLineRatio > 0.8) {
      return {
        detected: true,
        confidence: 0.4,
        reason: `Robotic linear paths detected (${(straightLineRatio * 100).toFixed(0)}% perfectly straight segments)`
      };
    }

    if (perfectAngleRatio > 0.6) {
      return {
        detected: true,
        confidence: 0.35,
        reason: `Unnatural 45°/90° angle dominance (${(perfectAngleRatio * 100).toFixed(0)}% perfect angles)`
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect constant velocity/acceleration (humans speed up and slow down)
   */
  private detectConstantVelocity(positions: Array<{ x: number; y: number; timestamp: number }>): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (positions.length < 15) {
      return { detected: false, confidence: 0, reason: '' };
    }

    const velocities: number[] = [];
    const accelerations: number[] = [];

    // Calculate velocities
    for (let i = 1; i < positions.length; i++) {
      const distance = Math.sqrt(
        Math.pow(positions[i].x - positions[i - 1].x, 2) +
        Math.pow(positions[i].y - positions[i - 1].y, 2)
      );
      const time = positions[i].timestamp - positions[i - 1].timestamp;
      if (time > 0) {
        velocities.push(distance / time);
      }
    }

    // Calculate accelerations
    for (let i = 1; i < velocities.length; i++) {
      const timeDiff = positions[i + 1].timestamp - positions[i].timestamp;
      if (timeDiff > 0) {
        accelerations.push((velocities[i] - velocities[i - 1]) / timeDiff);
      }
    }

    if (velocities.length < 10) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Calculate velocity variance
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const velocityVariance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    const velocityStdDev = Math.sqrt(velocityVariance);
    const coefficientOfVariation = avgVelocity > 0 ? velocityStdDev / avgVelocity : 0;

    // Humans have high velocity variation (speed up/slow down)
    // Bots maintain constant velocity (low coefficient of variation)
    if (coefficientOfVariation < 0.15 && velocities.length > 20 && avgVelocity > 0.1) {
      return {
        detected: true,
        confidence: 0.35,
        reason: `Constant velocity profile (CV: ${coefficientOfVariation.toFixed(3)}, expected >0.3 for humans)`
      };
    }

    // Check for flat acceleration (no speed changes)
    if (accelerations.length > 10) {
      const zeroAccelCount = accelerations.filter(a => Math.abs(a) < 0.001).length;
      const flatAccelRatio = zeroAccelCount / accelerations.length;

      if (flatAccelRatio > 0.8) {
        return {
          detected: true,
          confidence: 0.3,
          reason: `Flat acceleration profile (${(flatAccelRatio * 100).toFixed(0)}% zero acceleration)`
        };
      }
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect low path entropy (repetitive micro-wiggles with identical patterns)
   */
  private detectLowPathEntropy(positions: Array<{ x: number; y: number; timestamp: number }>): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (positions.length < 30) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Analyze micro-movements (small displacement patterns)
    const microMovements: Array<{ dx: number; dy: number; dist: number }> = [];

    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i].x - positions[i - 1].x;
      const dy = positions[i].y - positions[i - 1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only analyze small movements (micro-wiggles)
      if (dist > 0 && dist < 50) {
        microMovements.push({ dx, dy, dist });
      }
    }

    if (microMovements.length < 10) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Check for repetitive patterns (sine-wave jitter signature)
    const amplitudes = microMovements.map(m => m.dist);
    const avgAmplitude = amplitudes.reduce((a, b) => a + b, 0) / amplitudes.length;
    const amplitudeVariance = amplitudes.reduce((sum, a) => sum + Math.pow(a - avgAmplitude, 2), 0) / amplitudes.length;
    const amplitudeStdDev = Math.sqrt(amplitudeVariance);

    // Bot jitter has identical amplitude (low std dev)
    if (amplitudeStdDev < 1.5 && microMovements.length > 20 && avgAmplitude > 0) {
      // Check for periodic patterns
      let periodicCount = 0;
      for (let i = 2; i < microMovements.length; i++) {
        const angle1 = Math.atan2(microMovements[i - 1].dy, microMovements[i - 1].dx);
        const angle2 = Math.atan2(microMovements[i].dy, microMovements[i].dx);
        const angleDiff = Math.abs(angle1 - angle2);

        // Check for alternating directions (sine-wave pattern)
        if (angleDiff > Math.PI * 0.9) { // ~180 degrees (back and forth)
          periodicCount++;
        }
      }

      const periodicRatio = periodicCount / (microMovements.length - 2);

      if (periodicRatio > 0.6) {
        return {
          detected: true,
          confidence: 0.4,
          reason: `Sine-wave jitter pattern (amplitude σ: ${amplitudeStdDev.toFixed(2)}px, ${(periodicRatio * 100).toFixed(0)}% periodic)`
        };
      }
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect lack of micro-corrections (humans overshoot/undershoot targets)
   */
  private detectMicroCorrections(positions: Array<{ x: number; y: number; timestamp: number }>): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (positions.length < 20 || this.clickTimestamps.length < 3) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Find movements near clicks (target approach behavior)
    let targetApproaches = 0;
    let perfectStops = 0;

    for (const clickTime of this.clickTimestamps) {
      // Find position near this click
      const clickIdx = positions.findIndex(p => Math.abs(p.timestamp - clickTime) < 50);

      if (clickIdx > 5 && clickIdx < positions.length - 2) {
        // Analyze the 5 positions before the click
        const approachPositions = positions.slice(clickIdx - 5, clickIdx);

        // Calculate direction changes in last 5 movements
        let directionChanges = 0;
        for (let i = 2; i < approachPositions.length; i++) {
          const angle1 = Math.atan2(
            approachPositions[i - 1].y - approachPositions[i - 2].y,
            approachPositions[i - 1].x - approachPositions[i - 2].x
          );
          const angle2 = Math.atan2(
            approachPositions[i].y - approachPositions[i - 1].y,
            approachPositions[i].x - approachPositions[i - 1].x
          );

          const angleDiff = Math.abs(angle1 - angle2);
          if (angleDiff > 0.3) { // ~17 degrees change
            directionChanges++;
          }
        }

        targetApproaches++;

        // Humans typically make 1-2 corrections when approaching a target
        // Bots go in a straight line with 0 corrections
        if (directionChanges === 0) {
          perfectStops++;
        }
      }
    }

    if (targetApproaches > 0) {
      const perfectStopRatio = perfectStops / targetApproaches;

      // >70% perfect stops = bot
      if (perfectStopRatio > 0.7 && targetApproaches >= 3) {
        return {
          detected: true,
          confidence: 0.35,
          reason: `No micro-corrections to targets (${perfectStops}/${targetApproaches} pixel-perfect stops)`
        };
      }
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect unrealistic DPI hops (large pixel jumps with millisecond spacing)
   */
  private detectUnrealisticDPIHops(positions: Array<{ x: number; y: number; timestamp: number }>): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (positions.length < 10) {
      return { detected: false, confidence: 0, reason: '' };
    }

    let unrealisticHops = 0;

    for (let i = 1; i < positions.length; i++) {
      const distance = Math.sqrt(
        Math.pow(positions[i].x - positions[i - 1].x, 2) +
        Math.pow(positions[i].y - positions[i - 1].y, 2)
      );
      const timeDiff = positions[i].timestamp - positions[i - 1].timestamp;

      // Large jump (>200 pixels) in very short time (<5ms)
      // Most mice at 1000 DPI can't move this fast
      if (distance > 200 && timeDiff < 5 && timeDiff > 0) {
        unrealisticHops++;
      }

      // Check for teleportation (>500px instant jump)
      if (distance > 500 && timeDiff < 2) {
        unrealisticHops += 2; // Weight teleportation more heavily
      }
    }

    const hopRatio = unrealisticHops / (positions.length - 1);

    if (hopRatio > 0.1) { // >10% unrealistic hops
      return {
        detected: true,
        confidence: 0.4,
        reason: `Unrealistic DPI hops detected (${unrealisticHops} impossible movements, ${(hopRatio * 100).toFixed(0)}% of total)`
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }
  
  /**
   * Calculate comprehensive activity score with detailed breakdown
   * Using PeopleParity-style weighted scoring without consistency bonus
   */
  calculateDetailedScore(
    keyboardMetrics: any,
    mouseMetrics: any,
    botDetection: any,
    timeMetrics: any
  ): {
    components: any;
    bonus: {
      mouseActivityBonus: number;
      description: string;
    };
    penalties: any;
    formula: string;
    rawScore: number;
    finalScore: number;
  } {
    // Calculate per-minute metrics (PeopleParity approach)
    const minutesPassed = timeMetrics.periodDurationSeconds / 60;
    const keyHitsPerMin = keyboardMetrics.totalKeystrokes / minutesPassed;
    const uniqueKeysPerMin = keyboardMetrics.uniqueKeys / minutesPassed;
    const clicksPerMin = mouseMetrics.totalClicks / minutesPassed;
    const scrollsPerMin = mouseMetrics.totalScrolls / minutesPassed;
    const mouseDistancePerMin = mouseMetrics.distancePixels / minutesPassed;
    
    // Score components (0-10 scale each) - Updated thresholds for higher scores
    const components = {
      // Key hits: Progressive scoring to allow max 9.0 from keyboard alone
      // LIBERALIZED: Thresholds reduced by 15% for easier scoring
      // 0-25.5: linear (0-5), 26-51: slower growth (5-7), 52-85: diminishing (7-8.5), 85+: caps at 9.0
      keyHits: keyHitsPerMin <= 25.5 
        ? (keyHitsPerMin / 25.5) * 5
        : keyHitsPerMin <= 51
        ? 5 + ((keyHitsPerMin - 25.5) / 25.5) * 2
        : keyHitsPerMin <= 85
        ? 7 + ((keyHitsPerMin - 51) / 34) * 1.5
        : Math.min(9, 8.5 + ((keyHitsPerMin - 85) / 85) * 0.5),
      
      // Key diversity: Progressive scoring for unique keys
      // LIBERALIZED: Thresholds reduced by 15% for easier scoring
      // 0-8.5: linear (0-5), 9-17: slower (5-7), 18-25.5: diminishing (7-8.5), 25.5+: caps at 9.0
      keyDiversity: uniqueKeysPerMin <= 8.5
        ? (uniqueKeysPerMin / 8.5) * 5
        : uniqueKeysPerMin <= 17
        ? 5 + ((uniqueKeysPerMin - 8.5) / 8.5) * 2
        : uniqueKeysPerMin <= 25.5
        ? 7 + ((uniqueKeysPerMin - 17) / 8.5) * 1.5
        : Math.min(9, 8.5 + ((uniqueKeysPerMin - 25.5) / 17) * 0.5),
      
      // Mouse clicks: Progressive scoring to help achieve 7.5 with mouse alone
      // LIBERALIZED: Thresholds reduced by 15% for easier scoring
      // 0-12.75: linear (0-5), 13-25.5: slower (5-6.5), 26-42.5: diminishing (6.5-7.5)
      mouseClicks: clicksPerMin <= 12.75
        ? (clicksPerMin / 12.75) * 5
        : clicksPerMin <= 25.5
        ? 5 + ((clicksPerMin - 12.75) / 12.75) * 1.5
        : Math.min(7.5, 6.5 + ((clicksPerMin - 25.5) / 17) * 1),
      
      // Mouse scrolls: Progressive scoring
      // LIBERALIZED: Thresholds reduced by 15% for easier scoring
      // 0-6.8: linear (0-5), 7-12.75: slower (5-6.5), 13.6+: caps at 7.5
      mouseScrolls: scrollsPerMin <= 6.8
        ? (scrollsPerMin / 6.8) * 5
        : scrollsPerMin <= 12.75
        ? 5 + ((scrollsPerMin - 6.8) / 5.95) * 1.5
        : Math.min(7.5, 6.5 + ((scrollsPerMin - 12.75) / 8.5) * 1),
      
      // Mouse movement: Progressive scoring based on distance
      // LIBERALIZED: Thresholds reduced by 15% for easier scoring
      // 0-1700: linear (0-5), 1701-3400: slower (5-6.5), 3401+: caps at 7.5
      mouseMovement: mouseDistancePerMin <= 1700
        ? (mouseDistancePerMin / 1700) * 5
        : mouseDistancePerMin <= 3400
        ? 5 + ((mouseDistancePerMin - 1700) / 1700) * 1.5
        : Math.min(7.5, 6.5 + ((mouseDistancePerMin - 3400) / 1700) * 1),
    };
    
    // Calculate penalties for suspicious behavior
    const penalties = {
      botPenalty: 0,
      idlePenalty: 0,
      suspiciousActivityPenalty: 0
    };
    
    // Bot penalty (scale to 0-10 range for proportional impact)
    if (botDetection.keyboardBotDetected) {
      penalties.botPenalty += 1.5; // Reduced from 25% to 1.5 points
    }
    if (botDetection.mouseBotDetected && botDetection.confidence > 0.7) {
      penalties.botPenalty += 1.0; // Further reduced and only apply if confident
    }
    
    // Idle penalty (scale to 0-10 range)
    const activityPercentage = timeMetrics.activityPercentage || 0;
    if (activityPercentage < 30) {
      penalties.idlePenalty = 2; // 2 point penalty for very low activity
    } else if (activityPercentage < 50) {
      penalties.idlePenalty = 1; // 1 point penalty for low activity
    }
    
    // Suspicious activity penalty
    if (botDetection.suspiciousIntervals > 10) {
      penalties.suspiciousActivityPenalty = 1;
    }
    
    // Calculate weighted average (PeopleParity-style scoring)
    // NO consistency bonus - pure activity-based scoring
    const weightedScore = 
      components.keyHits * 0.25 +           // 25% weight
      components.keyDiversity * 0.45 +       // 45% weight (MOST IMPORTANT)
      components.mouseClicks * 0.10 +       // 10% weight
      components.mouseScrolls * 0.10 +       // 10% weight
      components.mouseMovement * 0.10;      // 10% weight
    
    // Apply penalties
    const totalPenalties = penalties.botPenalty + penalties.idlePenalty + penalties.suspiciousActivityPenalty;
    
    // Scale to 0-100 and apply penalties for base score
    const baseScore = Math.max(0, Math.min(100, (weightedScore * 10) - totalPenalties));
    
    // Activity bonus (0-30 points) - Added ON TOP of base score
    // Now includes both mouse and keyboard bonuses
    let activityBonus = 0;
    let bonusDescription = 'No bonus';
    const totalMouseActivity = clicksPerMin + scrollsPerMin + (mouseDistancePerMin / 1000);
    const totalKeyboardActivity = keyHitsPerMin + (uniqueKeysPerMin * 2); // Weight diversity higher
    
    // Check for human-like typing patterns
    const hasHumanLikeTyping = 
      keyHitsPerMin > 10 && keyHitsPerMin < 200 && // Reasonable typing speed (10-200 keys/min)
      uniqueKeysPerMin > 3 && // Good key diversity
      true; // Simplified bot check for now
    
    // Priority 1: Keyboard bonus when mouse activity is low
    if (totalMouseActivity < 5 && hasHumanLikeTyping) {
      if (totalKeyboardActivity > 150) {
        activityBonus = 25; // Very high keyboard activity
        bonusDescription = 'Exceptional keyboard focus';
      } else if (totalKeyboardActivity > 100) {
        activityBonus = 20; // High keyboard activity
        bonusDescription = 'Strong keyboard activity';
      } else if (totalKeyboardActivity > 60) {
        activityBonus = 15; // Good keyboard activity
        bonusDescription = 'Good keyboard activity';
      } else if (totalKeyboardActivity > 30) {
        activityBonus = 10; // Moderate keyboard activity
        bonusDescription = 'Moderate keyboard activity';
      }
    }
    // Priority 2: Mouse bonus when keyboard activity is low (existing logic)
    else if (totalKeyboardActivity < 30 && (clicksPerMin > 0 || mouseDistancePerMin > 500)) {
      if (totalMouseActivity > 20) {
        activityBonus = 30; // Very high mouse activity
        bonusDescription = 'Exceptional mouse activity';
      } else if (totalMouseActivity > 15) {
        activityBonus = 25; // High mouse activity
        bonusDescription = 'High mouse activity';
      } else if (totalMouseActivity > 10) {
        activityBonus = 20; // Good mouse activity
        bonusDescription = 'Good mouse activity';
      } else if (totalMouseActivity > 5) {
        activityBonus = 15; // Moderate mouse activity
        bonusDescription = 'Moderate mouse activity';
      } else if (totalMouseActivity > 2) {
        activityBonus = 10; // Light mouse activity
        bonusDescription = 'Light mouse activity';
      }
    }
    // Priority 3: Balanced activity gets a small bonus
    else if (totalMouseActivity > 5 && totalKeyboardActivity > 30 && hasHumanLikeTyping) {
      activityBonus = 10;
      bonusDescription = 'Balanced activity';
    }
    
    // Add bonus on top of base score, but cap total at 100
    const rawScore = baseScore + activityBonus;
    const finalScore = Math.min(100, rawScore);
    
    // Debug logging for transparency
    console.log('PeopleParity Scoring:', {
      perMinute: {
        keyHits: keyHitsPerMin.toFixed(1),
        uniqueKeys: uniqueKeysPerMin.toFixed(1),
        clicks: clicksPerMin.toFixed(1),
        scrolls: scrollsPerMin.toFixed(1),
        distance: mouseDistancePerMin.toFixed(0) + 'px'
      },
      scores: {
        keyHits: components.keyHits.toFixed(1),
        keyDiversity: components.keyDiversity.toFixed(1),
        mouseClicks: components.mouseClicks.toFixed(1),
        mouseScrolls: components.mouseScrolls.toFixed(1),
        mouseMovement: components.mouseMovement.toFixed(1)
      },
      weights: '25% + 45% + 10% + 10% + 10%',
      weighted: weightedScore.toFixed(1),
      penalties: totalPenalties.toFixed(1),
      baseScore: baseScore.toFixed(0),
      activityBonus: activityBonus > 0 ? `+${activityBonus}` : '0',
      final: finalScore.toFixed(0)
    });
    
    const formula = activityBonus > 0 
      ? `(keyHits[${components.keyHits.toFixed(1)}]*0.25 + keyDiversity[${components.keyDiversity.toFixed(1)}]*0.45 + clicks[${components.mouseClicks.toFixed(1)}]*0.10 + scrolls[${components.mouseScrolls.toFixed(1)}]*0.10 + movement[${components.mouseMovement.toFixed(1)}]*0.10) * 10 - penalties[${totalPenalties.toFixed(1)}] + activityBonus[${activityBonus}]`
      : `(keyHits[${components.keyHits.toFixed(1)}]*0.25 + keyDiversity[${components.keyDiversity.toFixed(1)}]*0.45 + clicks[${components.mouseClicks.toFixed(1)}]*0.10 + scrolls[${components.mouseScrolls.toFixed(1)}]*0.10 + movement[${components.mouseMovement.toFixed(1)}]*0.10) * 10 - penalties[${totalPenalties.toFixed(1)}]`;
    
    return {
      components,
      bonus: {
        mouseActivityBonus: activityBonus,
        description: bonusDescription
      },
      penalties,
      formula,
      rawScore: Math.round(rawScore),
      finalScore: Math.round(finalScore)
    };
  }
  
  /**
   * Classify activity based on score and patterns
   */
  classifyActivity(score: number, metrics: any): {
    category: 'highly_active' | 'active' | 'moderate' | 'low' | 'idle';
    confidence: number;
    tags: string[];
  } {
    const tags: string[] = [];
    
    // Add relevant tags
    if (metrics.keyboard.productiveKeystrokes > 100) {
      tags.push('productive_typing');
    }
    if (metrics.mouse.distancePixels > 5000) {
      tags.push('active_mouse_usage');
    }
    if (metrics.botDetection.keyboardBotDetected || metrics.botDetection.mouseBotDetected) {
      tags.push('bot_activity_detected');
    }
    if (metrics.timeMetrics.activityPercentage > 80) {
      tags.push('highly_engaged');
    }
    if (metrics.keyboard.typingRhythm?.consistent) {
      tags.push('consistent_typing');
    }
    
    // Determine category
    let category: 'highly_active' | 'active' | 'moderate' | 'low' | 'idle';
    if (score >= 80) {
      category = 'highly_active';
    } else if (score >= 60) {
      category = 'active';
    } else if (score >= 40) {
      category = 'moderate';
    } else if (score >= 20) {
      category = 'low';
    } else {
      category = 'idle';
    }
    
    // Calculate confidence based on data quality
    let confidence = 0.5;
    if (metrics.keyboard.totalKeystrokes > 50) confidence += 0.2;
    if (metrics.mouse.totalClicks > 10) confidence += 0.15;
    if (metrics.timeMetrics.periodDurationSeconds >= 60) confidence += 0.15;
    
    return {
      category,
      confidence: Math.min(1, confidence),
      tags
    };
  }
  
  /**
   * Generate complete metrics breakdown
   */
  generateMetricsBreakdown(
    rawMetrics: any,
    periodDuration: number
  ): DetailedActivityMetrics {
    const startTime = Date.now();
    
    // Analyze patterns
    const keyboardBotAnalysis = this.analyzeKeystrokePatterns(this.keystrokeTimestamps);
    const mouseBotAnalysis = this.analyzeMousePatterns(this.mousePositions, this.clickTimestamps);
    
    // Calculate detailed metrics
    const keyboardMetrics = {
      totalKeystrokes: rawMetrics.keyHits || 0,
      productiveKeystrokes: rawMetrics.productiveKeyHits || 0,
      navigationKeystrokes: rawMetrics.navigationKeyHits || 0,
      uniqueKeys: rawMetrics.uniqueKeys?.size || 0,
      productiveUniqueKeys: rawMetrics.productiveUniqueKeys?.size || 0,
      keysPerMinute: ((rawMetrics.keyHits || 0) / (periodDuration / 60)),
      typingRhythm: {
        consistent: !keyboardBotAnalysis.isBotLike,
        avgIntervalMs: this.calculateAvgInterval(this.keystrokeTimestamps),
        stdDeviationMs: this.calculateStdDeviation(this.keystrokeTimestamps)
      },
      keystrokeIntervals: this.getLastIntervals(this.keystrokeTimestamps, 100)
    };
    
    const mouseMetrics = {
      totalClicks: rawMetrics.mouseClicks || 0,
      leftClicks: rawMetrics.mouseClicks || 0,
      rightClicks: rawMetrics.rightClicks || 0,
      doubleClicks: rawMetrics.doubleClicks || 0,
      totalScrolls: rawMetrics.mouseScrolls || 0,
      distancePixels: Math.round(rawMetrics.mouseDistance || 0),
      distancePerMinute: (rawMetrics.mouseDistance || 0) / (periodDuration / 60),
      movementPattern: {
        smooth: !mouseBotAnalysis.isBotLike,
        avgSpeed: this.calculateAvgMouseSpeed(),
        maxSpeed: this.calculateMaxMouseSpeed()
      },
      clickIntervals: this.getLastIntervals(this.clickTimestamps, 50)
    };
    
    const botDetection = {
      keyboardBotDetected: keyboardBotAnalysis.isBotLike,
      mouseBotDetected: mouseBotAnalysis.isBotLike,
      repetitivePatterns: 0, // Will be calculated based on patterns
      suspiciousIntervals: keyboardBotAnalysis.reasons.length + mouseBotAnalysis.reasons.length,
      penaltyApplied: (keyboardBotAnalysis.isBotLike ? 0.25 : 0) + (mouseBotAnalysis.isBotLike ? 0.25 : 0),
      confidence: (keyboardBotAnalysis.confidence + mouseBotAnalysis.confidence) / 2,
      details: [...keyboardBotAnalysis.reasons, ...mouseBotAnalysis.reasons]
    };
    
    const timeMetrics = {
      periodDurationSeconds: periodDuration,
      activeSeconds: rawMetrics.activeSeconds || 0,
      idleSeconds: periodDuration - (rawMetrics.activeSeconds || 0),
      activityPercentage: ((rawMetrics.activeSeconds || 0) / periodDuration) * 100
    };
    
    const scoreCalculation = this.calculateDetailedScore(
      keyboardMetrics,
      mouseMetrics,
      botDetection,
      timeMetrics
    );
    
    const classification = this.classifyActivity(
      scoreCalculation.finalScore,
      {
        keyboard: keyboardMetrics,
        mouse: mouseMetrics,
        botDetection,
        timeMetrics
      }
    );
    
    return {
      keyboard: keyboardMetrics,
      mouse: mouseMetrics,
      botDetection,
      timeMetrics,
      scoreCalculation,
      classification,
      metadata: {
        version: '1.0',
        calculatedAt: new Date().toISOString(),
        calculationTimeMs: Date.now() - startTime
      }
    };
  }
  
  // Helper methods
  private calculateAvgInterval(timestamps: number[]): number {
    if (timestamps.length < 2) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }
  
  private calculateStdDeviation(timestamps: number[]): number {
    if (timestamps.length < 2) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / intervals.length;
    return Math.sqrt(variance);
  }
  
  private getLastIntervals(timestamps: number[], limit: number): number[] {
    const intervals: number[] = [];
    for (let i = Math.max(1, timestamps.length - limit); i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }
    return intervals;
  }
  
  private calculateAvgMouseSpeed(): number {
    if (this.mousePositions.length < 2) return 0;
    let totalSpeed = 0;
    let count = 0;
    
    for (let i = 1; i < this.mousePositions.length; i++) {
      const distance = Math.sqrt(
        Math.pow(this.mousePositions[i].x - this.mousePositions[i - 1].x, 2) +
        Math.pow(this.mousePositions[i].y - this.mousePositions[i - 1].y, 2)
      );
      const time = this.mousePositions[i].timestamp - this.mousePositions[i - 1].timestamp;
      if (time > 0) {
        totalSpeed += distance / time;
        count++;
      }
    }
    
    return count > 0 ? totalSpeed / count : 0;
  }
  
  private calculateMaxMouseSpeed(): number {
    if (this.mousePositions.length < 2) return 0;
    let maxSpeed = 0;
    
    for (let i = 1; i < this.mousePositions.length; i++) {
      const distance = Math.sqrt(
        Math.pow(this.mousePositions[i].x - this.mousePositions[i - 1].x, 2) +
        Math.pow(this.mousePositions[i].y - this.mousePositions[i - 1].y, 2)
      );
      const time = this.mousePositions[i].timestamp - this.mousePositions[i - 1].timestamp;
      if (time > 0) {
        maxSpeed = Math.max(maxSpeed, distance / time);
      }
    }
    
    return maxSpeed;
  }
  
  // Methods to track events
  recordKeystroke(keycode: number, timestamp: number) {
    this.keystrokeTimestamps.push(timestamp);
    this.keystrokeCodes.push(keycode);
    // Keep only last 1000 keystrokes for memory efficiency
    if (this.keystrokeTimestamps.length > 1000) {
      this.keystrokeTimestamps.shift();
      this.keystrokeCodes.shift();
    }
  }

  recordKeyHold(keycode: number, duration: number) {
    this.keyHoldDurations.push(duration);
    // Keep only last 500 hold durations for memory efficiency
    if (this.keyHoldDurations.length > 500) {
      this.keyHoldDurations.shift();
    }
  }
  
  recordClick(timestamp: number) {
    this.clickTimestamps.push(timestamp);
    // Keep only last 500 clicks
    if (this.clickTimestamps.length > 500) {
      this.clickTimestamps.shift();
    }
  }
  
  recordMousePosition(x: number, y: number, timestamp: number) {
    this.mousePositions.push({ x, y, timestamp });
    // Keep only last 500 positions
    if (this.mousePositions.length > 500) {
      this.mousePositions.shift();
    }
  }
  
  reset() {
    this.keystrokeTimestamps = [];
    this.keystrokeCodes = [];
    this.keyHoldDurations = [];
    this.clickTimestamps = [];
    this.mousePositions = [];
  }
  
  /**
   * Simplified scoring method for direct use with raw metrics
   */
  calculateSimpleScore(
    keystrokes: number,
    uniqueKeystrokes: number, 
    mouseClicks: number,
    mouseScrolls: number,
    mouseDistance: number,
    periodDuration: number
  ): {
    components: any;
    bonus: {
      mouseActivityBonus: number;
      description: string;
    };
    penalties: any;
    formula: string;
    rawScore: number;
    finalScore: number;
  } {
    const durationMinutes = periodDuration / (60 * 1000);
    
    // Normalize per minute for consistent scoring (following PeopleParity approach)
    const keyHitsPerMin = keystrokes / durationMinutes;
    const uniqueKeysPerMin = uniqueKeystrokes / durationMinutes;
    const clicksPerMin = mouseClicks / durationMinutes;
    const scrollsPerMin = mouseScrolls / durationMinutes;
    const mouseDistancePerMin = mouseDistance / durationMinutes;

    // Score components (0-10 scale each) - Based on PeopleParity algorithm
    const components = {
      // Key hits: 0-60 per minute maps to 0-10 (25% weight)
      keyHits: Math.min(10, (keyHitsPerMin / 60) * 10),
      
      // Key diversity: 0-15 unique keys per minute maps to 0-10 (45% weight - MOST IMPORTANT)
      keyDiversity: Math.min(10, (uniqueKeysPerMin / 15) * 10),
      
      // Mouse clicks: 0-20 per minute maps to 0-10 (10% weight)
      mouseClicks: Math.min(10, (clicksPerMin / 20) * 10),
      
      // Mouse scrolls: 0-10 per minute maps to 0-10 (10% weight)
      mouseScrolls: Math.min(10, (scrollsPerMin / 10) * 10),
      
      // Mouse movement: 0-3000 pixels per minute maps to 0-10 (10% weight)
      mouseMovement: Math.min(10, (mouseDistancePerMin / 3000) * 10)
    };

    // Penalties for suspicious behavior
    const penalties = {
      lowKeyboardDiversity: 0,
      noMouseActivity: 0,
      suspiciousBehavior: 0
    };

    // Apply penalties for bot-like behavior
    if (keyHitsPerMin > 10 && uniqueKeysPerMin < 3) {
      penalties.lowKeyboardDiversity = 0.5; // Likely repetitive/bot behavior
    }

    if (clicksPerMin === 0 && mouseDistancePerMin < 100) {
      penalties.noMouseActivity = 0.3; // No mouse interaction
    }

    // Check for suspicious patterns
    const patterns = this.detectSuspiciousPatterns(keystrokes, uniqueKeystrokes, mouseClicks);
    if (patterns.isSuspicious) {
      penalties.suspiciousBehavior = patterns.penaltyScore / 10; // Scale down penalty to 0-10 range
    }

    // Calculate weighted average (PeopleParity-style scoring)
    // NO consistency bonus - pure activity-based scoring
    const weightedScore = 
      components.keyHits * 0.25 +           // 25% weight
      components.keyDiversity * 0.45 +       // 45% weight (MOST IMPORTANT)
      components.mouseClicks * 0.10 +       // 10% weight
      components.mouseScrolls * 0.10 +       // 10% weight
      components.mouseMovement * 0.10;      // 10% weight

    // Apply penalties
    const totalPenalties = Object.values(penalties).reduce((sum, p) => sum + p, 0);
    
    // Scale to 0-100 and apply penalties for base score
    const baseScore = Math.max(0, Math.min(100, (weightedScore * 10) - (totalPenalties * 10)));
    
    // Activity bonus (0-30 points) - Added ON TOP of base score
    // Now includes both mouse and keyboard bonuses
    let activityBonus = 0;
    let bonusDescription = 'No bonus';
    const totalMouseActivity = clicksPerMin + scrollsPerMin + (mouseDistancePerMin / 1000);
    const totalKeyboardActivity = keyHitsPerMin + (uniqueKeysPerMin * 2); // Weight diversity higher
    
    // Check for human-like typing patterns
    const hasHumanLikeTyping = 
      keyHitsPerMin > 10 && keyHitsPerMin < 200 && // Reasonable typing speed (10-200 keys/min)
      uniqueKeysPerMin > 3 && // Good key diversity
      true; // Simplified bot check for now
    
    // Priority 1: Keyboard bonus when mouse activity is low
    if (totalMouseActivity < 5 && hasHumanLikeTyping) {
      if (totalKeyboardActivity > 150) {
        activityBonus = 25; // Very high keyboard activity
        bonusDescription = 'Exceptional keyboard focus';
      } else if (totalKeyboardActivity > 100) {
        activityBonus = 20; // High keyboard activity
        bonusDescription = 'Strong keyboard activity';
      } else if (totalKeyboardActivity > 60) {
        activityBonus = 15; // Good keyboard activity
        bonusDescription = 'Good keyboard activity';
      } else if (totalKeyboardActivity > 30) {
        activityBonus = 10; // Moderate keyboard activity
        bonusDescription = 'Moderate keyboard activity';
      }
    }
    // Priority 2: Mouse bonus when keyboard activity is low (existing logic)
    else if (totalKeyboardActivity < 30 && (clicksPerMin > 0 || mouseDistancePerMin > 500)) {
      if (totalMouseActivity > 20) {
        activityBonus = 30; // Very high mouse activity
        bonusDescription = 'Exceptional mouse activity';
      } else if (totalMouseActivity > 15) {
        activityBonus = 25; // High mouse activity
        bonusDescription = 'High mouse activity';
      } else if (totalMouseActivity > 10) {
        activityBonus = 20; // Good mouse activity
        bonusDescription = 'Good mouse activity';
      } else if (totalMouseActivity > 5) {
        activityBonus = 15; // Moderate mouse activity
        bonusDescription = 'Moderate mouse activity';
      } else if (totalMouseActivity > 2) {
        activityBonus = 10; // Light mouse activity
        bonusDescription = 'Light mouse activity';
      }
    }
    // Priority 3: Balanced activity gets a small bonus
    else if (totalMouseActivity > 5 && totalKeyboardActivity > 30 && hasHumanLikeTyping) {
      activityBonus = 10;
      bonusDescription = 'Balanced activity';
    }
    
    // Add bonus on top of base score, but cap total at 100
    const rawScore = baseScore + activityBonus;
    const finalScore = Math.min(100, rawScore);

    const formula = activityBonus > 0
      ? `(key_hits * 0.25 + key_diversity * 0.45 + clicks * 0.10 + scrolls * 0.10 + movement * 0.10) * 10 - penalties(${totalPenalties.toFixed(1)}) + activityBonus(${activityBonus})`
      : `(key_hits * 0.25 + key_diversity * 0.45 + clicks * 0.10 + scrolls * 0.10 + movement * 0.10) * 10 - penalties(${totalPenalties.toFixed(1)})`;

    return {
      components,
      bonus: {
        mouseActivityBonus: activityBonus,
        description: bonusDescription
      },
      penalties,
      formula,
      rawScore: Math.round(rawScore),
      finalScore: Math.round(finalScore)
    };
  }
  
  /**
   * Detect suspicious patterns in activity
   */
  private detectSuspiciousPatterns(
    keystrokes: number,
    uniqueKeystrokes: number,
    mouseClicks: number
  ): { isSuspicious: boolean; penaltyScore: number } {
    let penaltyScore = 0;
    
    // Check for repetitive keystrokes
    if (keystrokes > 100 && uniqueKeystrokes < 5) {
      penaltyScore += 5; // Very repetitive
    } else if (keystrokes > 50 && uniqueKeystrokes < 10) {
      penaltyScore += 2; // Somewhat repetitive
    }
    
    // Check for unusual ratios
    if (keystrokes > 0 && uniqueKeystrokes === 0) {
      penaltyScore += 10; // All same key
    }
    
    // Check for bot-like click patterns
    if (mouseClicks > 100) {
      penaltyScore += 3; // Excessive clicking
    }
    
    return {
      isSuspicious: penaltyScore > 0,
      penaltyScore
    };
  }
}