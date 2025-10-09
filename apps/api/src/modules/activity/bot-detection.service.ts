import { Injectable } from '@nestjs/common';

interface KeyboardMetrics {
  totalKeystrokes: number;
  uniqueKeys: number;
  productiveKeystrokes: number;
  typingRhythm?: {
    consistent: boolean;
    stdDeviationMs: number;
  };
}

interface MouseMetrics {
  totalClicks: number;
  totalScrolls: number;
  distancePixels: number;
  movementPattern?: {
    smooth: boolean;
    avgSpeed: number;
  };
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
}