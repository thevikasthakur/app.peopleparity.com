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
      isBotLike: confidence > 0.7, // Increased threshold for keyboard
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
      
      // Much more lenient - only flag if >90% straight lines AND high speed
      if (straightLineCount > positions.length * 0.9 && speeds.some(s => s > 2000)) {
        reasons.push('Mouse movement in perfectly straight lines at high speed');
        confidence += 0.3;
      }
      
      // Check for instant teleportation (bot-like) - be more lenient
      const teleports = speeds.filter(s => s > 10000).length; // 10000 pixels/ms is truly impossible
      if (teleports > 2) { // Allow occasional spikes from screen switching
        reasons.push(`${teleports} instant mouse teleportations detected`);
        confidence += 0.4;
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
      
      // Much stricter - only flag truly robotic clicking
      if (clickStdDev < 2 && avgClickInterval < 100) { // Very consistent AND very fast
        reasons.push(`Unnaturally consistent fast clicking (std dev: ${clickStdDev.toFixed(2)}ms)`);
        confidence += 0.3;
      }
    }
    
    return {
      isBotLike: confidence > 0.7, // Increased threshold from 0.5 to 0.7 for mouse
      confidence: Math.min(confidence, 1),
      reasons
    };
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