import { Injectable } from '@nestjs/common';

interface KeyboardMetrics {
  totalKeystrokes: number;
  uniqueKeys: number;
  productiveKeystrokes: number;
  typingRhythm?: {
    consistent: boolean;
    stdDeviationMs: number;
  };
  keystrokeCodes?: number[]; // Raw key codes from desktop
  keystrokeTimestamps?: number[]; // Raw timestamps from desktop
}

interface MouseMetrics {
  totalClicks: number;
  totalScrolls: number;
  distancePixels: number;
  movementPattern?: {
    smooth: boolean;
    avgSpeed: number;
  };
  mousePositions?: Array<{ x: number; y: number; timestamp: number }>; // Raw positions
  clickTimestamps?: number[]; // Raw click times
  scrollTimestamps?: number[]; // Raw scroll times
}

interface BotDetectionResult {
  keyboardBotDetected: boolean;
  mouseBotDetected: boolean;
  confidence: number;
  reasons: string[];
}

@Injectable()
export class BotDetectionService {
  /**
   * Analyze activity metrics to detect potential bot behavior
   */
  detectBotActivity(metrics: any): BotDetectionResult {
    const result: BotDetectionResult = {
      keyboardBotDetected: false,
      mouseBotDetected: false,
      confidence: 0,
      reasons: []
    };

    if (!metrics) {
      return result;
    }

    // Analyze keyboard patterns
    if (metrics.keyboard) {
      const keyboardResult = this.analyzeKeyboardPattern(metrics.keyboard);
      result.keyboardBotDetected = keyboardResult.isBot;
      result.reasons.push(...keyboardResult.reasons);
      result.confidence = Math.max(result.confidence, keyboardResult.confidence);
    }

    // Analyze mouse patterns
    if (metrics.mouse) {
      const mouseResult = this.analyzeMousePattern(metrics.mouse);
      result.mouseBotDetected = mouseResult.isBot;
      result.reasons.push(...mouseResult.reasons);
      result.confidence = Math.max(result.confidence, mouseResult.confidence);
    }

    return result;
  }

  /**
   * Analyze keyboard metrics for bot patterns
   */
  private analyzeKeyboardPattern(keyboard: KeyboardMetrics): {
    isBot: boolean;
    confidence: number;
    reasons: string[];
  } {
    const suspicionScores: number[] = [];
    const reasons: string[] = [];

    // NEW: Analyze raw keystroke codes if available
    if (keyboard.keystrokeCodes && keyboard.keystrokeCodes.length > 20) {
      const sequenceAnalysis = this.analyzeKeystrokeSequences(keyboard.keystrokeCodes);
      if (sequenceAnalysis.detected) {
        suspicionScores.push(sequenceAnalysis.confidence);
        reasons.push(sequenceAnalysis.reason);
      }
    }

    // NEW: Analyze timing patterns from raw timestamps
    if (keyboard.keystrokeTimestamps && keyboard.keystrokeTimestamps.length > 10) {
      const timingAnalysis = this.analyzeTimingPatterns(keyboard.keystrokeTimestamps);
      if (timingAnalysis.detected) {
        suspicionScores.push(timingAnalysis.confidence);
        reasons.push(timingAnalysis.reason);
      }
    }

    // Check 1: Extremely limited key variety (single key or very few unique keys)
    if (keyboard.totalKeystrokes > 20 && keyboard.uniqueKeys <= 2) {
      suspicionScores.push(0.9);
      reasons.push(`Only ${keyboard.uniqueKeys} unique keys used in ${keyboard.totalKeystrokes} keystrokes`);
    } else if (keyboard.totalKeystrokes > 10 && keyboard.uniqueKeys <= 3) {
      suspicionScores.push(0.7);
      reasons.push(`Low key variety: ${keyboard.uniqueKeys} unique keys in ${keyboard.totalKeystrokes} keystrokes`);
    }

    // Check 2: Unnaturally consistent typing rhythm
    if (keyboard.typingRhythm) {
      if (keyboard.typingRhythm.stdDeviationMs < 5) {
        suspicionScores.push(0.95);
        reasons.push(`Unnaturally consistent typing rhythm (std dev: ${keyboard.typingRhythm.stdDeviationMs}ms)`);
      } else if (keyboard.typingRhythm.stdDeviationMs < 20) {
        suspicionScores.push(0.7);
        reasons.push(`Very consistent typing rhythm (std dev: ${keyboard.typingRhythm.stdDeviationMs}ms)`);
      }
    }

    // Check 3: Ratio of productive to total keystrokes
    if (keyboard.totalKeystrokes > 0) {
      const productiveRatio = keyboard.productiveKeystrokes / keyboard.totalKeystrokes;

      // If all keystrokes are marked as productive (100%) it's suspicious
      if (productiveRatio === 1 && keyboard.totalKeystrokes > 50) {
        suspicionScores.push(0.6);
        reasons.push('100% productive keystrokes is unusual');
      }

      // If none are productive but there are many keystrokes, also suspicious
      if (productiveRatio === 0 && keyboard.totalKeystrokes > 20) {
        suspicionScores.push(0.7);
        reasons.push('No productive keystrokes despite activity');
      }
    }

    // Check 4: Repetitive pattern (same key pressed multiple times)
    if (keyboard.totalKeystrokes > 10 && keyboard.uniqueKeys === 1) {
      suspicionScores.push(0.95);
      reasons.push('Single key pressed repeatedly');
    }

    // Calculate final confidence
    const confidence = suspicionScores.length > 0
      ? Math.max(...suspicionScores)
      : 0;

    return {
      isBot: confidence >= 0.7,
      confidence,
      reasons
    };
  }

  /**
   * Analyze mouse metrics for bot patterns
   */
  private analyzeMousePattern(mouse: MouseMetrics): {
    isBot: boolean;
    confidence: number;
    reasons: string[];
  } {
    const suspicionScores: number[] = [];
    const reasons: string[] = [];

    // NEW: Analyze raw mouse positions if available
    if (mouse.mousePositions && mouse.mousePositions.length > 20) {
      const movementAnalysis = this.analyzeMouseMovementPatterns(mouse.mousePositions);
      if (movementAnalysis.detected) {
        suspicionScores.push(movementAnalysis.confidence);
        reasons.push(movementAnalysis.reason);
      }
    }

    // Check 1: Unnatural movement patterns
    if (mouse.movementPattern) {
      // Check for extremely slow, smooth movement (PyAutoGUI signature)
      // Human movement typically has avgSpeed > 5px/s when moving
      // Bot movement tends to be very slow and perfectly smooth (1-3 px/s)
      if (mouse.movementPattern.smooth &&
          mouse.movementPattern.avgSpeed > 0 &&
          mouse.movementPattern.avgSpeed <= 3) {
        suspicionScores.push(0.95);
        reasons.push(`Unnaturally slow smooth movement: ${mouse.movementPattern.avgSpeed}px/s (bot-like)`);
      }

      // Check for moderately slow smooth movement (still suspicious)
      if (mouse.movementPattern.smooth &&
          mouse.movementPattern.avgSpeed > 3 &&
          mouse.movementPattern.avgSpeed <= 10) {
        suspicionScores.push(0.75);
        reasons.push(`Very slow smooth movement: ${mouse.movementPattern.avgSpeed}px/s (potentially automated)`);
      }

      // Perfect straight lines or geometric patterns with high speed
      if (!mouse.movementPattern.smooth && mouse.movementPattern.avgSpeed > 10000) {
        suspicionScores.push(0.8);
        reasons.push(`Unnatural mouse movement: ${mouse.movementPattern.avgSpeed}px/s`);
      }

      // Too consistent speed (bot-like) - no movement at all
      if (mouse.movementPattern.smooth && mouse.movementPattern.avgSpeed === 0) {
        suspicionScores.push(0.7);
        reasons.push('No mouse movement despite clicks');
      }
    }

    // Check 2: Large distance with low average speed suggests automated movement
    if (mouse.distancePixels > 500 && mouse.movementPattern &&
        mouse.movementPattern.avgSpeed > 0 && mouse.movementPattern.avgSpeed <= 5) {
      suspicionScores.push(0.9);
      reasons.push(`Large distance (${mouse.distancePixels}px) with very low speed (${mouse.movementPattern.avgSpeed}px/s) - automated pattern`);
    }

    // Check 3: Click patterns with minimal movement
    if (mouse.totalClicks > 20 && mouse.distancePixels < 100) {
      suspicionScores.push(0.8);
      reasons.push(`Many clicks (${mouse.totalClicks}) with minimal movement (${mouse.distancePixels}px)`);
    }

    // Check 4: Moderate clicks with low movement speed (PyAutoGUI pattern)
    if (mouse.totalClicks >= 5 && mouse.movementPattern &&
        mouse.movementPattern.avgSpeed > 0 && mouse.movementPattern.avgSpeed <= 2) {
      suspicionScores.push(0.85);
      reasons.push(`Clicks with extremely slow movement speed (${mouse.movementPattern.avgSpeed}px/s)`);
    }

    // Check 5: Scroll patterns
    if (mouse.totalScrolls > 50 && mouse.totalClicks === 0) {
      suspicionScores.push(0.6);
      reasons.push('Excessive scrolling without any clicks');
    }

    // Check 6: Scrolling with slow movement (PyAutoGUI pattern)
    if (mouse.totalScrolls >= 10 && mouse.movementPattern &&
        mouse.movementPattern.avgSpeed > 0 && mouse.movementPattern.avgSpeed <= 3) {
      suspicionScores.push(0.85);
      reasons.push(`Scrolling with extremely slow movement speed (${mouse.movementPattern.avgSpeed}px/s)`);
    }

    // Check 7: Zero movement with activity
    if ((mouse.totalClicks > 0 || mouse.totalScrolls > 0) && mouse.distancePixels === 0) {
      suspicionScores.push(0.9);
      reasons.push('Activity detected but zero mouse movement');
    }

    // Calculate final confidence
    const confidence = suspicionScores.length > 0
      ? Math.max(...suspicionScores)
      : 0;

    return {
      isBot: confidence >= 0.7,
      confidence,
      reasons
    };
  }

  /**
   * Analyze multiple periods for consistent patterns (cross-period analysis)
   */
  analyzePeriodConsistency(periods: any[]): {
    isSuspicious: boolean;
    confidence: number;
    reasons: string[];
  } {
    if (periods.length < 3) {
      return { isSuspicious: false, confidence: 0, reasons: [] };
    }

    const suspicionScores: number[] = [];
    const reasons: string[] = [];

    // Check 1: Identical activity scores across multiple periods
    const scores = periods.map(p => p.activityScore).filter(s => s != null);
    if (scores.length >= 5) {
      const uniqueScores = new Set(scores);

      if (uniqueScores.size === 1) {
        suspicionScores.push(0.95);
        reasons.push(`All ${scores.length} periods have identical score: ${scores[0]}`);
      } else if (uniqueScores.size <= 2) {
        suspicionScores.push(0.7);
        reasons.push(`Only ${uniqueScores.size} unique scores across ${scores.length} periods`);
      }
    }

    // Check 2: Identical metrics across periods
    const metricsStrings = periods
      .filter(p => p.metrics)
      .map(p => JSON.stringify(p.metrics));

    if (metricsStrings.length >= 3) {
      const uniqueMetrics = new Set(metricsStrings);

      if (uniqueMetrics.size === 1) {
        suspicionScores.push(0.9);
        reasons.push('Identical metrics across all periods');
      }
    }

    // Check 3: Regular timing intervals (bot-like precision)
    if (periods.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < periods.length; i++) {
        const interval = new Date(periods[i].periodEnd).getTime() -
                        new Date(periods[i-1].periodEnd).getTime();
        intervals.push(interval);
      }

      // Check if all intervals are exactly the same (suspicious)
      const uniqueIntervals = new Set(intervals);
      if (uniqueIntervals.size === 1) {
        suspicionScores.push(0.7);
        reasons.push('Perfectly regular time intervals between activities');
      }
    }

    const confidence = suspicionScores.length > 0
      ? Math.max(...suspicionScores)
      : 0;

    return {
      isSuspicious: confidence >= 0.7,
      confidence,
      reasons
    };
  }

  /**
   * Analyze keystroke sequences for repetitive patterns
   */
  private analyzeKeystrokeSequences(keystrokeCodes: number[]): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (keystrokeCodes.length < 50) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // CRITICAL: Check for single-key repetitions (bot signature)
    const keyFrequency = new Map<number, number>();
    for (const key of keystrokeCodes) {
      keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1);
    }

    // Find most frequent key
    let maxFrequency = 0;
    let mostFrequentKey = 0;
    for (const [key, freq] of keyFrequency.entries()) {
      if (freq > maxFrequency) {
        maxFrequency = freq;
        mostFrequentKey = key;
      }
    }

    // Check for massive single-key repetitions (like 61008 repeated 100+ times)
    const repetitionRatio = maxFrequency / keystrokeCodes.length;
    if (repetitionRatio > 0.4 && maxFrequency > 50) {
      // 40% of keystrokes are the same key - DEFINITE BOT
      return {
        detected: true,
        confidence: 0.95,
        reason: `Bot detected: Key ${mostFrequentKey} pressed ${maxFrequency} times (${(repetitionRatio * 100).toFixed(0)}% of all keystrokes)`
      };
    }

    // Check for consecutive repetitions of the same key
    let maxConsecutive = 0;
    let currentConsecutive = 1;
    let consecutiveKey = 0;
    for (let i = 1; i < keystrokeCodes.length; i++) {
      if (keystrokeCodes[i] === keystrokeCodes[i - 1]) {
        currentConsecutive++;
        if (currentConsecutive > maxConsecutive) {
          maxConsecutive = currentConsecutive;
          consecutiveKey = keystrokeCodes[i];
        }
      } else {
        currentConsecutive = 1;
      }
    }

    if (maxConsecutive >= 8) {
      // Same key pressed 8+ times in a row - BOT BEHAVIOR
      return {
        detected: true,
        confidence: 0.9,
        reason: `Bot detected: Key ${consecutiveKey} pressed ${maxConsecutive} times consecutively`
      };
    }

    // Check for different sequence lengths
    const sequenceLengths = [10, 15, 20, 30, 40];
    let highestConfidence = 0;
    let mostSuspiciousPattern = '';

    for (const sequenceLength of sequenceLengths) {
      if (keystrokeCodes.length < sequenceLength) continue;

      const sequences = new Map<string, number>();

      // Extract sequences
      for (let i = 0; i <= keystrokeCodes.length - sequenceLength; i++) {
        const sequence = keystrokeCodes.slice(i, i + sequenceLength).join(',');
        sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
      }

      // Find most common sequence
      let maxRepetitions = 0;
      let mostCommonSequence = '';
      for (const [seq, count] of sequences.entries()) {
        if (count > maxRepetitions) {
          maxRepetitions = count;
          mostCommonSequence = seq;
        }
      }

      // Check if it's just presentation keys (arrows, space, enter)
      const keyArray = mostCommonSequence.split(',').map(k => parseInt(k));
      const isPresentationKeys = keyArray.every(key =>
        key === 32 || // Space
        key === 13 || // Enter
        (key >= 37 && key <= 40) // Arrow keys
      );

      if (isPresentationKeys) continue; // Skip presentation navigation

      // Higher thresholds to avoid false positives
      if (maxRepetitions >= 10 && sequenceLength >= 30) {
        const confidence = 0.7;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          mostSuspiciousPattern = `Identical ${sequenceLength}-key sequence repeated ${maxRepetitions} times`;
        }
      } else if (maxRepetitions >= 15 && sequenceLength >= 20) {
        const confidence = 0.6;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          mostSuspiciousPattern = `Identical ${sequenceLength}-key sequence repeated ${maxRepetitions} times`;
        }
      }
    }

    if (highestConfidence > 0) {
      return {
        detected: true,
        confidence: highestConfidence,
        reason: mostSuspiciousPattern
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Analyze timing patterns in keystrokes
   */
  private analyzeTimingPatterns(timestamps: number[]): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (timestamps.length < 10) {
      return { detected: false, confidence: 0, reason: '' };
    }

    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    // Calculate statistics
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDeviation = Math.sqrt(variance);

    // Check for unnaturally consistent timing
    if (stdDeviation < 10 && intervals.length > 50) {
      return {
        detected: true,
        confidence: 0.8,
        reason: `Unnaturally consistent typing rhythm (std dev: ${stdDeviation.toFixed(2)}ms)`
      };
    }

    if (stdDeviation < 20 && intervals.length > 100) {
      return {
        detected: true,
        confidence: 0.6,
        reason: `Very consistent typing rhythm (std dev: ${stdDeviation.toFixed(2)}ms)`
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Analyze mouse movement patterns for bot detection
   */
  private analyzeMouseMovementPatterns(
    positions: Array<{ x: number; y: number; timestamp: number }>
  ): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (!positions || positions.length < 20) {
      return { detected: false, confidence: 0, reason: '' };
    }

    let perfectAngles = 0;
    let straightLines = 0;

    // Analyze movement patterns
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

      const degrees = (angleDiff * 180) / Math.PI;

      // Check for perfect angles (45° or 90°)
      if (Math.abs(degrees - 45) < 2 || Math.abs(degrees - 90) < 2) {
        perfectAngles++;
      }

      // Check for straight lines
      if (degrees < 2) {
        straightLines++;
      }
    }

    const perfectAngleRatio = perfectAngles / (positions.length - 2);
    const straightLineRatio = straightLines / (positions.length - 2);

    // Higher thresholds for presentations
    if (perfectAngleRatio > 0.8 && positions.length > 50) {
      return {
        detected: true,
        confidence: 0.7,
        reason: `High 45°/90° angle frequency (${(perfectAngleRatio * 100).toFixed(0)}% perfect angles)`
      };
    }

    if (straightLineRatio > 0.9) {
      return {
        detected: true,
        confidence: 0.6,
        reason: `Mostly straight line movements (${(straightLineRatio * 100).toFixed(0)}%)`
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }
}