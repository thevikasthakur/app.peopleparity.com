import { Injectable } from '@nestjs/common';

interface KeyboardMetrics {
  totalKeystrokes: number;
  uniqueKeys: number;
  productiveKeystrokes: number;
  keysPerMinute?: number;
  typingRhythm?: {
    consistent: boolean;
    stdDeviationMs: number;
  };
  keystrokeCodes?: number[];
  keystrokeTimestamps?: number[];
}

interface MouseMetrics {
  totalClicks: number;
  totalScrolls: number;
  distancePixels: number;
  movementPattern?: {
    smooth: boolean;
    avgSpeed: number;
  };
  mousePositions?: Array<{ x: number; y: number; timestamp: number }>;
  clickTimestamps?: number[];
  scrollTimestamps?: number[];
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
   * This matches the desktop metricsCollector.ts logic exactly
   */
  detectBotActivity(metrics: any): BotDetectionResult {
    console.log('[Bot Detection v3.0] detectBotActivity called - FULL DESKTOP PARITY');
    console.log('[Bot Detection] Metrics keys:', metrics ? Object.keys(metrics).join(', ') : 'no metrics');

    const result: BotDetectionResult = {
      keyboardBotDetected: false,
      mouseBotDetected: false,
      confidence: 0,
      reasons: []
    };

    if (!metrics) {
      console.log('[Bot Detection] No metrics provided');
      return result;
    }

    // Analyze keyboard patterns
    if (metrics.keyboard) {
      console.log('[Bot Detection] Analyzing keyboard...');
      console.log('[Bot Detection] Keyboard keys:', Object.keys(metrics.keyboard).join(', '));
      console.log('[Bot Detection] keystrokeCodes length:', metrics.keyboard.keystrokeCodes?.length || 0);

      const keyboardResult = this.analyzeKeyboardPattern(metrics.keyboard);
      result.keyboardBotDetected = keyboardResult.isBot;
      result.reasons.push(...keyboardResult.reasons);
      result.confidence = Math.max(result.confidence, keyboardResult.confidence);

      console.log('[Bot Detection] Keyboard result:', {
        isBot: keyboardResult.isBot,
        confidence: keyboardResult.confidence,
        reasonCount: keyboardResult.reasons.length
      });
    } else {
      console.log('[Bot Detection] No keyboard metrics');
    }

    // Analyze mouse patterns - FULL DESKTOP PARITY
    if (metrics.mouse) {
      console.log('[Bot Detection] Analyzing mouse...');
      console.log('[Bot Detection] Mouse positions length:', metrics.mouse.mousePositions?.length || 0);
      console.log('[Bot Detection] Click timestamps length:', metrics.mouse.clickTimestamps?.length || 0);

      const mouseResult = this.analyzeMousePatterns(
        metrics.mouse.mousePositions || [],
        metrics.mouse.clickTimestamps || [],
        metrics.mouse
      );
      result.mouseBotDetected = mouseResult.isBotLike;
      result.reasons.push(...mouseResult.reasons);
      result.confidence = Math.max(result.confidence, mouseResult.confidence);

      console.log('[Bot Detection] Mouse result:', {
        isBot: mouseResult.isBotLike,
        confidence: mouseResult.confidence,
        reasonCount: mouseResult.reasons.length
      });
    } else {
      console.log('[Bot Detection] No mouse metrics');
    }

    console.log('[Bot Detection] Final result:', {
      keyboardBot: result.keyboardBotDetected,
      mouseBot: result.mouseBotDetected,
      confidence: result.confidence,
      reasons: result.reasons
    });

    return result;
  }

  /**
   * Analyze keyboard metrics for bot patterns
   * Matches desktop metricsCollector.ts exactly
   */
  private analyzeKeyboardPattern(keyboard: KeyboardMetrics): {
    isBot: boolean;
    confidence: number;
    reasons: string[];
  } {
    const suspicionScores: number[] = [];
    const reasons: string[] = [];

    // CRITICAL FIX: If keysPerMinute is 0, ignore keystrokeCodes (phantom/cached data)
    if (keyboard.keysPerMinute !== undefined && keyboard.keysPerMinute === 0) {
      return { isBot: false, confidence: 0, reasons: [] };
    }

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

      if (productiveRatio === 1 && keyboard.totalKeystrokes > 50) {
        suspicionScores.push(0.6);
        reasons.push('100% productive keystrokes is unusual');
      }

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
   * Analyze mouse movement patterns for bot detection with advanced trajectory analysis
   * Matches desktop metricsCollector.ts analyzeMousePatterns exactly
   */
  private analyzeMousePatterns(
    positions: Array<{ x: number; y: number; timestamp: number }>,
    clicks: number[],
    mouseMetrics: MouseMetrics
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
      const correctionCheck = this.detectMicroCorrections(positions, clicks);
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

      // 6. PyAutoGUI-specific Pattern Detection
      const pyAutoGUICheck = this.detectPyAutoGUIPatterns(positions);
      if (pyAutoGUICheck.detected) {
        reasons.push(pyAutoGUICheck.reason);
        confidence += pyAutoGUICheck.confidence;
      }
    }

    // 7. Click Pattern Analysis
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

    // 8. Zero movement with clicks/scrolls (physically impossible)
    if ((mouseMetrics.totalClicks > 20 || mouseMetrics.totalScrolls > 30) && mouseMetrics.distancePixels === 0) {
      reasons.push(`${mouseMetrics.totalClicks} clicks and ${mouseMetrics.totalScrolls} scrolls but zero mouse movement - impossible`);
      confidence += 0.95;
    }

    // 9. Superhuman speed check
    if (mouseMetrics.movementPattern && mouseMetrics.movementPattern.avgSpeed > 10000) {
      reasons.push(`Superhuman mouse speed: ${mouseMetrics.movementPattern.avgSpeed}px/s (impossible for humans)`);
      confidence += 0.9;
    }

    return {
      isBotLike: confidence > 0.7,
      confidence: Math.min(confidence, 1),
      reasons
    };
  }

  /**
   * Detect linear/robotic paths with near-zero curvature
   * Matches desktop metricsCollector.ts detectLinearPaths exactly
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
    if (straightLineRatio > 0.9) {
      return {
        detected: true,
        confidence: 0.35,
        reason: `Robotic linear paths detected (${(straightLineRatio * 100).toFixed(0)}% perfectly straight segments)`
      };
    }

    if (perfectAngleRatio > 0.75 && positions.length > 50) {
      return {
        detected: true,
        confidence: 0.4,
        reason: `High 45°/90° angle frequency (${(perfectAngleRatio * 100).toFixed(0)}% perfect angles)`
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Detect constant velocity/acceleration (humans speed up and slow down)
   * Matches desktop metricsCollector.ts detectConstantVelocity exactly
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
      const timeDiff = positions[i + 1]?.timestamp - positions[i]?.timestamp;
      if (timeDiff && timeDiff > 0) {
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
   * Matches desktop metricsCollector.ts detectLowPathEntropy exactly
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
   * Matches desktop metricsCollector.ts detectMicroCorrections exactly
   */
  private detectMicroCorrections(
    positions: Array<{ x: number; y: number; timestamp: number }>,
    clickTimestamps: number[]
  ): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    if (positions.length < 20 || clickTimestamps.length < 3) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Find movements near clicks (target approach behavior)
    let targetApproaches = 0;
    let perfectStops = 0;

    for (const clickTime of clickTimestamps) {
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
   * Matches desktop metricsCollector.ts detectUnrealisticDPIHops exactly
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
   * Detect PyAutoGUI-specific patterns
   * Matches desktop metricsCollector.ts detectPyAutoGUIPatterns exactly
   */
  private detectPyAutoGUIPatterns(
    positions: Array<{ x: number; y: number; timestamp: number }>
  ): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    const suspicionScores: number[] = [];
    const reasons: string[] = [];

    // Pattern 1: Very slow, smooth movement (PyAutoGUI signature)
    if (positions.length > 10) {
      const speeds: number[] = [];
      for (let i = 1; i < positions.length; i++) {
        const dist = Math.sqrt(
          Math.pow(positions[i].x - positions[i - 1].x, 2) +
          Math.pow(positions[i].y - positions[i - 1].y, 2)
        );
        const time = positions[i].timestamp - positions[i - 1].timestamp;
        if (time > 0 && dist > 0) {
          speeds.push(dist / time);
        }
      }

      if (speeds.length > 5) {
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const slowMovements = speeds.filter(s => s > 0.001 && s < 0.003).length; // 1-3 px/ms is PyAutoGUI range
        const slowRatio = slowMovements / speeds.length;

        // PyAutoGUI moves very slowly and smoothly
        if (slowRatio > 0.6 && avgSpeed < 0.005) {
          suspicionScores.push(0.85);
          reasons.push(`PyAutoGUI-like slow movement (${(slowRatio * 100).toFixed(0)}% at 1-3px/ms, avg: ${(avgSpeed * 1000).toFixed(2)}px/s)`);
        }
      }
    }

    // Pattern 2: Delays between actions match PyAutoGUI sleep patterns
    if (positions.length > 20) {
      const delays: number[] = [];
      for (let i = 1; i < positions.length; i++) {
        const delay = positions[i].timestamp - positions[i - 1].timestamp;
        if (delay > 50) { // Only consider significant delays
          delays.push(delay);
        }
      }

      if (delays.length > 5) {
        // Check for clustering around typical PyAutoGUI delays (150-500ms, 1000-3000ms)
        const typicalDelays = delays.filter(d =>
          (d >= 150 && d <= 500) || (d >= 1000 && d <= 3000)
        ).length;

        const typicalRatio = typicalDelays / delays.length;
        if (typicalRatio > 0.7) {
          suspicionScores.push(0.8);
          reasons.push(`PyAutoGUI timing pattern (${(typicalRatio * 100).toFixed(0)}% delays in 150-500ms or 1-3s ranges)`);
        }
      }
    }

    // Pattern 3: Movement with perfect angles combined with slow speed
    if (positions.length > 15) {
      let angleMovements = 0;
      let slowAngleMovements = 0;

      for (let i = 2; i < positions.length; i++) {
        const dist2 = Math.sqrt(
          Math.pow(positions[i].x - positions[i - 1].x, 2) +
          Math.pow(positions[i].y - positions[i - 1].y, 2)
        );

        // Check angle between movements
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

        // Check for perfect angles
        if (Math.abs(degrees - 45) < 2 || Math.abs(degrees - 90) < 2 || degrees < 2) {
          angleMovements++;

          // Check if movement is also slow (PyAutoGUI signature)
          const time = positions[i].timestamp - positions[i - 1].timestamp;
          const speed = time > 0 ? dist2 / time : 0;
          if (speed < 0.005) { // < 5px/ms
            slowAngleMovements++;
          }
        }
      }

      const angleRatio = angleMovements / (positions.length - 2);
      const slowAngleRatio = slowAngleMovements / Math.max(angleMovements, 1);

      // PyAutoGUI often produces perfect angles with slow movement
      if (angleRatio > 0.5 && slowAngleRatio > 0.7) {
        suspicionScores.push(0.9);
        reasons.push(`PyAutoGUI angle pattern (${(angleRatio * 100).toFixed(0)}% perfect angles, ${(slowAngleRatio * 100).toFixed(0)}% with slow movement)`);
      }
    }

    const maxConfidence = suspicionScores.length > 0 ? Math.max(...suspicionScores) : 0;

    if (maxConfidence > 0) {
      return {
        detected: true,
        confidence: maxConfidence,
        reason: reasons.join('; ')
      };
    }

    return { detected: false, confidence: 0, reason: '' };
  }

  /**
   * Analyze keystroke sequences for repetitive patterns
   * Matches desktop/API original logic with sanitization
   */
  private analyzeKeystrokeSequences(keystrokeCodes: number[]): {
    detected: boolean;
    confidence: number;
    reason: string;
  } {
    console.log(`[Bot Detection] analyzeKeystrokeSequences called with ${keystrokeCodes?.length || 0} codes`);

    // SANITIZATION: Remove navigation and modifier keys that can cause false positives
    const keysToFilter = new Set([
      42, 54, 29, 56, // Modifiers
      14, 57, 28, 15, 1, // Editing keys
    ]);

    const isPhantomOrNavigationKey = (code: number): boolean => {
      if (code >= 3600 && code <= 3700) return true;
      if (code >= 60999 && code <= 61009) return true;
      if (code >= 57000 && code <= 58000) return true;
      if (code > 10000) return true;
      return false;
    };

    const phantomKeyCounts = new Map<number, number>();
    const sanitizedCodes = keystrokeCodes.filter(code => {
      if (keysToFilter.has(code)) return false;
      if (isPhantomOrNavigationKey(code)) {
        if (code >= 10000) {
          phantomKeyCounts.set(code, (phantomKeyCounts.get(code) || 0) + 1);
        }
        return false;
      }
      return true;
    });

    if (phantomKeyCounts.size > 0) {
      const phantomInfo = Array.from(phantomKeyCounts.entries())
        .map(([key, count]) => `${key}(${count}x)`)
        .join(', ');
      console.log(`[Bot Detection] ⚠️ Detected phantom key codes: ${phantomInfo}`);
    }

    console.log(`[Bot Detection] Filtered ${keystrokeCodes.length - sanitizedCodes.length} keys, ${sanitizedCodes.length} remaining`);

    if (sanitizedCodes.length < 50) {
      return { detected: false, confidence: 0, reason: '' };
    }

    // Check for single-key repetitions
    const keyFrequency = new Map<number, number>();
    for (const key of sanitizedCodes) {
      keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1);
    }

    let maxFrequency = 0;
    let mostFrequentKey = 0;
    for (const [key, freq] of keyFrequency.entries()) {
      if (freq > maxFrequency) {
        maxFrequency = freq;
        mostFrequentKey = key;
      }
    }

    const uniqueKeyCount = keyFrequency.size;
    const repetitionRatio = maxFrequency / sanitizedCodes.length;

    console.log(`[Bot Detection] Most frequent key: ${mostFrequentKey}, count: ${maxFrequency}, unique keys: ${uniqueKeyCount}`);

    if (repetitionRatio > 0.4 && maxFrequency > 50 && uniqueKeyCount < 15) {
      return {
        detected: true,
        confidence: 0.95,
        reason: `Bot detected: Key ${mostFrequentKey} pressed ${maxFrequency} times (${(repetitionRatio * 100).toFixed(0)}% of all keystrokes) with only ${uniqueKeyCount} unique keys`
      };
    }

    // Check consecutive repetitions
    let maxConsecutive = 0;
    let currentConsecutive = 1;
    let consecutiveKey = 0;
    for (let i = 1; i < sanitizedCodes.length; i++) {
      if (sanitizedCodes[i] === sanitizedCodes[i - 1]) {
        currentConsecutive++;
        if (currentConsecutive > maxConsecutive) {
          maxConsecutive = currentConsecutive;
          consecutiveKey = sanitizedCodes[i];
        }
      } else {
        currentConsecutive = 1;
      }
    }

    if (maxConsecutive >= 10) {
      return {
        detected: true,
        confidence: 0.9,
        reason: `Bot detected: Key ${consecutiveKey} pressed ${maxConsecutive} times consecutively`
      };
    }

    // Check sequence patterns
    const sequenceLengths = [10, 15, 20, 30, 40];
    let highestConfidence = 0;
    let mostSuspiciousPattern = '';

    for (const sequenceLength of sequenceLengths) {
      if (sanitizedCodes.length < sequenceLength) continue;

      const sequences = new Map<string, number>();
      for (let i = 0; i <= sanitizedCodes.length - sequenceLength; i++) {
        const sequence = sanitizedCodes.slice(i, i + sequenceLength).join(',');
        sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
      }

      let maxRepetitions = 0;
      let mostCommonSequence = '';
      for (const [seq, count] of sequences.entries()) {
        if (count > maxRepetitions) {
          maxRepetitions = count;
          mostCommonSequence = seq;
        }
      }

      const keyArray = mostCommonSequence.split(',').map(k => parseInt(k));
      const isPresentationKeys = keyArray.every(key =>
        key === 32 || key === 13 || (key >= 37 && key <= 40)
      );

      if (isPresentationKeys) continue;

      if (maxRepetitions >= 10 && sequenceLength >= 30) {
        if (0.7 > highestConfidence) {
          highestConfidence = 0.7;
          mostSuspiciousPattern = `Identical ${sequenceLength}-key sequence repeated ${maxRepetitions} times`;
        }
      } else if (maxRepetitions >= 15 && sequenceLength >= 20) {
        if (0.6 > highestConfidence) {
          highestConfidence = 0.6;
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

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const stdDeviation = Math.sqrt(variance);

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

    // Check 3: Regular timing intervals
    if (periods.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < periods.length; i++) {
        const interval = new Date(periods[i].periodEnd).getTime() -
                        new Date(periods[i - 1].periodEnd).getTime();
        intervals.push(interval);
      }

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
