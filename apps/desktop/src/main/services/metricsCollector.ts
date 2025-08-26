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
  private clickTimestamps: number[] = [];
  private mousePositions: Array<{ x: number; y: number; timestamp: number }> = [];
  private productiveKeys: Set<number> = new Set();
  private navigationKeys: Set<number> = new Set();
  
  // Bot detection thresholds
  private readonly BOT_INTERVAL_THRESHOLD = 10; // ms - too fast to be human
  private readonly CONSISTENT_INTERVAL_THRESHOLD = 5; // ms - variance too low
  private readonly REPETITIVE_PATTERN_THRESHOLD = 10; // number of identical sequences
  
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
    
    return {
      isBotLike: confidence > 0.5,
      confidence: Math.min(confidence, 1),
      reasons
    };
  }
  
  /**
   * Analyze mouse movement patterns for bot detection
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
    
    // Analyze movement patterns
    if (positions.length > 10) {
      const speeds: number[] = [];
      for (let i = 1; i < positions.length; i++) {
        const distance = Math.sqrt(
          Math.pow(positions[i].x - positions[i - 1].x, 2) +
          Math.pow(positions[i].y - positions[i - 1].y, 2)
        );
        const time = positions[i].timestamp - positions[i - 1].timestamp;
        if (time > 0) {
          speeds.push(distance / time);
        }
      }
      
      // Check for perfectly straight lines (bot-like)
      let straightLineCount = 0;
      for (let i = 2; i < positions.length; i++) {
        const angle1 = Math.atan2(
          positions[i - 1].y - positions[i - 2].y,
          positions[i - 1].x - positions[i - 2].x
        );
        const angle2 = Math.atan2(
          positions[i].y - positions[i - 1].y,
          positions[i].x - positions[i - 1].x
        );
        if (Math.abs(angle1 - angle2) < 0.01) {
          straightLineCount++;
        }
      }
      
      if (straightLineCount > positions.length * 0.7) {
        reasons.push('Mouse movement in perfectly straight lines');
        confidence += 0.4;
      }
      
      // Check for instant teleportation (bot-like)
      const teleports = speeds.filter(s => s > 5000).length; // 5000 pixels/ms is impossible
      if (teleports > 0) {
        reasons.push(`${teleports} instant mouse teleportations detected`);
        confidence += 0.5;
      }
    }
    
    // Analyze click patterns
    if (clicks.length > 5) {
      const clickIntervals: number[] = [];
      for (let i = 1; i < clicks.length; i++) {
        clickIntervals.push(clicks[i] - clicks[i - 1]);
      }
      
      const avgClickInterval = clickIntervals.reduce((a, b) => a + b, 0) / clickIntervals.length;
      const clickVariance = clickIntervals.reduce((sum, i) => sum + Math.pow(i - avgClickInterval, 2), 0) / clickIntervals.length;
      const clickStdDev = Math.sqrt(clickVariance);
      
      if (clickStdDev < 5) {
        reasons.push(`Unnaturally consistent click intervals (std dev: ${clickStdDev.toFixed(2)}ms)`);
        confidence += 0.3;
      }
    }
    
    return {
      isBotLike: confidence > 0.5,
      confidence: Math.min(confidence, 1),
      reasons
    };
  }
  
  /**
   * Calculate comprehensive activity score with detailed breakdown
   */
  calculateDetailedScore(
    keyboardMetrics: any,
    mouseMetrics: any,
    botDetection: any,
    timeMetrics: any
  ): {
    components: any;
    penalties: any;
    formula: string;
    rawScore: number;
    finalScore: number;
  } {
    // Score components (0-100 scale)
    const components = {
      keyboardScore: 0,
      mouseScore: 0,
      consistencyScore: 0,
      activityTimeScore: 0
    };
    
    // Keyboard score (0-40 points max)
    const keysPerMinute = keyboardMetrics.keysPerMinute || 0;
    components.keyboardScore = Math.min(40, keysPerMinute * 0.5);
    
    // Mouse score (0-30 points max)
    const clicksPerMinute = (mouseMetrics.totalClicks / (timeMetrics.periodDurationSeconds / 60)) || 0;
    const mouseMovementScore = Math.min(15, (mouseMetrics.distancePerMinute / 1000) * 2);
    const mouseClickScore = Math.min(15, clicksPerMinute * 3);
    components.mouseScore = mouseMovementScore + mouseClickScore;
    
    // Consistency score (0-20 points max)
    if (keyboardMetrics.typingRhythm?.consistent) {
      components.consistencyScore += 10;
    }
    if (mouseMetrics.movementPattern?.smooth) {
      components.consistencyScore += 10;
    }
    
    // Activity time score (0-10 points max)
    const activityPercentage = timeMetrics.activityPercentage || 0;
    components.activityTimeScore = Math.min(10, activityPercentage / 10);
    
    // Calculate penalties
    const penalties = {
      botPenalty: 0,
      idlePenalty: 0,
      suspiciousActivityPenalty: 0
    };
    
    // Bot penalty (0-50% reduction)
    if (botDetection.keyboardBotDetected) {
      penalties.botPenalty += 0.25;
    }
    if (botDetection.mouseBotDetected) {
      penalties.botPenalty += 0.25;
    }
    
    // Idle penalty (0-20% reduction)
    if (activityPercentage < 30) {
      penalties.idlePenalty = 0.2;
    } else if (activityPercentage < 50) {
      penalties.idlePenalty = 0.1;
    }
    
    // Suspicious activity penalty
    if (botDetection.suspiciousIntervals > 10) {
      penalties.suspiciousActivityPenalty = 0.1;
    }
    
    // Calculate final score
    const rawScore = components.keyboardScore + 
                    components.mouseScore + 
                    components.consistencyScore + 
                    components.activityTimeScore;
    
    const totalPenalty = Math.min(0.8, // Max 80% penalty
      penalties.botPenalty + 
      penalties.idlePenalty + 
      penalties.suspiciousActivityPenalty
    );
    
    const finalScore = Math.round(rawScore * (1 - totalPenalty));
    
    const formula = `(keyboard[${components.keyboardScore.toFixed(1)}] + mouse[${components.mouseScore.toFixed(1)}] + consistency[${components.consistencyScore}] + time[${components.activityTimeScore.toFixed(1)}]) * (1 - penalties[${totalPenalty.toFixed(2)}]) = ${finalScore}`;
    
    return {
      components,
      penalties,
      formula,
      rawScore: Math.round(rawScore),
      finalScore: Math.min(100, Math.max(0, finalScore))
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
    // Keep only last 1000 keystrokes for memory efficiency
    if (this.keystrokeTimestamps.length > 1000) {
      this.keystrokeTimestamps.shift();
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
    this.clickTimestamps = [];
    this.mousePositions = [];
  }
}