/**
 * Spike Detector V2 - Improved bot detection with intelligent typing pattern analysis
 * 
 * This module tracks activity history and identifies bot-like behavior while
 * avoiding false positives from normal typing patterns like:
 * - Writing code or documentation (bursts of typing)
 * - Using navigation keys (arrow keys, home, end, etc.)
 * - Editing text (backspace, delete held down)
 * - Copy-paste operations
 */

export interface ActivityDataV2 {
  keyHits: number;
  productiveKeyHits: number;  // Actual typing keys
  navigationKeyHits: number;   // Navigation/editing keys
  uniqueKeys: number;
  keySequencePattern?: string; // Pattern of key types (e.g., "typing", "navigation", "mixed")
  mouseClicks: number;
  mouseScrolls: number;
  mouseDistance: number;
  timestamp: Date;
  // Additional context
  hasTextPatterns?: boolean;   // Indicates normal text patterns detected
  hasCodingPatterns?: boolean; // Indicates coding patterns detected
  hasReadingPattern?: boolean; // Indicates reading/scrolling pattern
}

export interface SpikeDetectionResultV2 {
  isBot: boolean;
  hasSpike: boolean;
  spikeReason?: string;
  spikeScore: number; // 0-100, higher means more likely to be bot
  confidence: number; // 0-100, confidence in the detection
  details?: {
    keyboardSpike?: number;
    mouseSpike?: number;
    patternAnomaly?: string;
    typingPattern?: string;
  };
}

export class SpikeDetectorV2 {
  private activityHistory: ActivityDataV2[] = [];
  private readonly maxHistorySize = 20; // Keep last 20 periods
  private readonly minHistoryForDetection = 5; // Need more history for better accuracy
  
  // Adjusted thresholds for better accuracy
  private readonly spikeThreshold = 4.0; // Higher threshold to reduce false positives
  private readonly burstThreshold = 3.0; // Allow normal typing bursts
  private readonly mouseMovementThreshold = 6.0; // Much higher threshold for mouse movement
  private readonly scrollThreshold = 5.0; // Higher threshold for scroll detection
  
  // Typing pattern recognition
  private readonly normalTypingSpeed = 300; // 5 keys per second is normal fast typing
  private readonly burstTypingSpeed = 400; // Allow bursts up to 6.6 keys per second
  private readonly sustainedHighSpeed = 500; // Sustained >8 keys per second is suspicious
  
  // Mouse pattern recognition
  private readonly normalScrollSpeed = 30; // Normal scrolling up to 30 scrolls per minute
  private readonly normalMouseDistance = 50000; // Normal mouse movement up to 50k pixels per minute
  private readonly readingMouseDistance = 10000; // Minimal mouse movement during reading
  
  /**
   * Add new activity data and check for spikes
   */
  addActivity(data: ActivityDataV2): SpikeDetectionResultV2 {
    // Analyze activity patterns
    data = this.analyzeActivityPatterns(data);
    
    // Add to history
    this.activityHistory.push(data);
    
    // Maintain max history size
    if (this.activityHistory.length > this.maxHistorySize) {
      this.activityHistory.shift();
    }
    
    // Need minimum history to detect spikes
    if (this.activityHistory.length < this.minHistoryForDetection) {
      return {
        isBot: false,
        hasSpike: false,
        spikeScore: 0,
        confidence: 0
      };
    }
    
    return this.detectSpikesV2(data);
  }
  
  /**
   * Analyze activity patterns to detect normal human behavior
   */
  private analyzeActivityPatterns(data: ActivityDataV2): ActivityDataV2 {
    // Calculate ratios
    const totalKeys = data.keyHits;
    const productiveRatio = totalKeys > 0 ? data.productiveKeyHits / totalKeys : 0;
    const navigationRatio = totalKeys > 0 ? data.navigationKeyHits / totalKeys : 0;
    const uniqueKeyRatio = totalKeys > 0 ? data.uniqueKeys / totalKeys : 0;
    
    // Detect patterns
    data.hasTextPatterns = false;
    data.hasCodingPatterns = false;
    data.keySequencePattern = 'unknown';
    
    // Normal text typing pattern: 
    // - High productive key ratio (>70%)
    // - Moderate unique key ratio (15-40%)
    // - Some navigation keys (5-20%)
    if (productiveRatio > 0.7 && uniqueKeyRatio > 0.15 && uniqueKeyRatio < 0.4 && navigationRatio < 0.2) {
      data.hasTextPatterns = true;
      data.keySequencePattern = 'typing';
    }
    
    // Coding pattern:
    // - Mixed productive and navigation keys
    // - Higher unique key ratio (many special characters)
    // - More navigation usage
    if (productiveRatio > 0.5 && uniqueKeyRatio > 0.2 && navigationRatio > 0.1 && navigationRatio < 0.4) {
      data.hasCodingPatterns = true;
      data.keySequencePattern = 'coding';
    }
    
    // Navigation/editing pattern:
    // - High navigation key ratio
    // - Low productive keys
    if (navigationRatio > 0.5) {
      data.keySequencePattern = 'navigation';
    }
    
    // Reading/scrolling pattern:
    // - Low keyboard activity
    // - Moderate scrolling
    // - Low to moderate mouse movement
    // - Few clicks (navigation clicks)
    if (totalKeys < 50 && 
        data.mouseScrolls > 0 && data.mouseScrolls < this.normalScrollSpeed &&
        data.mouseDistance < this.normalMouseDistance &&
        data.mouseClicks < 20) {
      data.hasReadingPattern = true;
      if (data.mouseDistance < this.readingMouseDistance) {
        data.keySequencePattern = 'reading';
      }
    }
    
    return data;
  }
  
  /**
   * Improved spike detection with context awareness
   */
  private detectSpikesV2(currentData: ActivityDataV2): SpikeDetectionResultV2 {
    // Get historical data (excluding current)
    const history = this.activityHistory.slice(0, -1);
    
    // Focus on productive keys for spike detection (ignore navigation)
    const productiveKeyStats = this.calculateStats(history.map(h => h.productiveKeyHits));
    const mouseClickStats = this.calculateStats(history.map(h => h.mouseClicks));
    const mouseDistanceStats = this.calculateStats(history.map(h => h.mouseDistance));
    const uniqueKeyStats = this.calculateStats(history.map(h => h.uniqueKeys));
    
    // Calculate spikes based on productive keys only
    const keyboardSpike = this.calculateSpikeMagnitude(currentData.productiveKeyHits, productiveKeyStats);
    const mouseClickSpike = this.calculateSpikeMagnitude(currentData.mouseClicks, mouseClickStats);
    const mouseDistanceSpike = this.calculateSpikeMagnitude(currentData.mouseDistance, mouseDistanceStats);
    
    // Initialize scoring
    let spikeScore = 0;
    let confidence = 50; // Start with medium confidence
    let spikeReasons: string[] = [];
    const details: any = {};
    
    // Context-aware keyboard spike detection
    if (keyboardSpike > this.spikeThreshold) {
      // Check if it's a normal typing burst
      if (currentData.hasTextPatterns || currentData.hasCodingPatterns) {
        // Reduce penalty for normal typing patterns
        if (keyboardSpike < 6 && currentData.productiveKeyHits < this.burstTypingSpeed) {
          // Normal typing burst, minimal penalty
          spikeScore += Math.min(10, keyboardSpike * 2);
          confidence -= 10; // Less confident it's a bot
          details.typingPattern = 'Normal typing burst detected';
        } else {
          // Still suspicious even with patterns
          spikeScore += Math.min(30, keyboardSpike * 7);
          spikeReasons.push(`High keyboard activity: ${keyboardSpike.toFixed(1)}σ`);
        }
      } else {
        // No normal patterns detected, more suspicious
        spikeScore += Math.min(40, keyboardSpike * 10);
        spikeReasons.push(`Keyboard spike without normal patterns: ${keyboardSpike.toFixed(1)}σ`);
        confidence += 10;
      }
      details.keyboardSpike = keyboardSpike;
    }
    
    // Mouse click spike detection - be more lenient for reading/scrolling
    if (mouseClickSpike > this.spikeThreshold) {
      // Check if it's reading pattern with navigation clicks
      if (currentData.hasReadingPattern && currentData.mouseClicks < 30) {
        // Normal navigation clicks during reading, minimal penalty
        spikeScore += Math.min(5, mouseClickSpike * 1);
        details.mousePattern = 'Normal navigation clicks during reading';
      } else {
        spikeScore += Math.min(40, mouseClickSpike * 10);
        spikeReasons.push(`Mouse click spike: ${mouseClickSpike.toFixed(1)}σ`);
        details.mouseClickSpike = mouseClickSpike;
        confidence += 5;
      }
    }
    
    // Mouse movement spike detection - very lenient for normal activities
    if (mouseDistanceSpike > this.mouseMovementThreshold) {
      // Only penalize if it's truly excessive
      if (currentData.mouseDistance > 100000) { // >100k pixels is suspicious
        spikeScore += Math.min(20, mouseDistanceSpike * 3);
        spikeReasons.push(`Excessive mouse movement: ${mouseDistanceSpike.toFixed(1)}σ`);
        details.mouseDistanceSpike = mouseDistanceSpike;
        confidence += 3;
      } else if (!currentData.hasReadingPattern) {
        // Small penalty only if not reading
        spikeScore += Math.min(10, mouseDistanceSpike * 2);
        details.mouseMovementNote = 'Slightly elevated mouse movement';
      }
    }
    
    // Scroll spike detection - very lenient for reading
    const scrollStats = this.calculateStats(history.map(h => h.mouseScrolls));
    const scrollSpike = this.calculateSpikeMagnitude(currentData.mouseScrolls, scrollStats);
    if (scrollSpike > this.scrollThreshold) {
      // Check if it's normal scrolling during reading
      if (currentData.hasReadingPattern || currentData.mouseScrolls < this.normalScrollSpeed) {
        // Normal scrolling behavior, no penalty
        details.scrollPattern = 'Normal scrolling for reading/browsing';
      } else if (currentData.mouseScrolls > 50) {
        // Excessive scrolling
        spikeScore += Math.min(15, scrollSpike * 3);
        spikeReasons.push(`Excessive scrolling: ${scrollSpike.toFixed(1)}σ`);
        details.scrollSpike = scrollSpike;
        confidence += 2;
      }
    }
    
    // Pattern anomalies with context
    const patternAnomalies = this.detectPatternAnomaliesV2(currentData, history);
    if (patternAnomalies.isAnomalous) {
      spikeScore += patternAnomalies.score;
      spikeReasons.push(patternAnomalies.reason);
      details.patternAnomaly = patternAnomalies.reason;
      confidence += patternAnomalies.confidence;
    }
    
    // Bot pattern checks with improved logic
    
    // Check 1: Repetitive keys without navigation (more strict)
    if (currentData.productiveKeyHits > 300 && currentData.uniqueKeys < 3 && currentData.navigationKeyHits < 10) {
      spikeScore += 40;
      spikeReasons.push('Highly repetitive key pattern without editing');
      details.repetitiveKeys = true;
      confidence += 20;
    }
    
    // Check 2: Sudden activity after inactivity (but allow if it has normal patterns)
    const recentInactivity = history.slice(-3).every(h => h.productiveKeyHits < 10 && h.mouseClicks < 5);
    const suddenHighActivity = currentData.productiveKeyHits > 200 || currentData.mouseClicks > 50;
    if (recentInactivity && suddenHighActivity && !currentData.hasTextPatterns && !currentData.hasCodingPatterns) {
      spikeScore += 20;
      spikeReasons.push('Sudden unexplained activity burst');
      details.suddenBurst = true;
      confidence += 10;
    }
    
    // Check 3: Superhuman sustained speeds (adjusted thresholds)
    if (currentData.productiveKeyHits > this.sustainedHighSpeed) {
      // But check if it might be paste operation or IDE auto-complete
      if (currentData.uniqueKeys < 5) {
        // Likely paste or auto-complete, reduce penalty
        spikeScore += 15;
        spikeReasons.push('Possible paste/auto-complete detected');
        confidence -= 5;
      } else {
        spikeScore += 35;
        spikeReasons.push('Superhuman typing speed');
        details.impossibleSpeed = true;
        confidence += 15;
      }
    }
    
    // Check 4: Impossible mouse clicking - adjusted for normal use
    if (currentData.mouseClicks > 100) {
      spikeScore += 35;
      spikeReasons.push('Superhuman clicking speed');
      details.impossibleClicking = true;
      confidence += 20;
    }
    
    // Check 5: Reading/scrolling pattern bonus - reduce penalties
    if (currentData.hasReadingPattern) {
      // Reading is a valid activity, reduce any penalties
      spikeScore = Math.max(0, spikeScore - 15);
      confidence = Math.max(0, confidence - 20);
      details.activityType = 'Reading/browsing detected - penalties reduced';
    }
    
    // Adjust confidence based on activity patterns
    if (currentData.hasTextPatterns || currentData.hasCodingPatterns || currentData.hasReadingPattern) {
      confidence = Math.max(0, confidence - 15); // Reduce confidence if normal patterns detected
    }
    
    // Final scoring with higher thresholds
    const isBot = spikeScore >= 60 && confidence >= 60; // Need both high score AND confidence
    const hasSpike = spikeScore >= 40; // Higher threshold for spike detection
    
    // Ensure confidence is within bounds
    confidence = Math.max(0, Math.min(100, confidence));
    
    return {
      isBot,
      hasSpike,
      spikeReason: spikeReasons.join('; '),
      spikeScore: Math.min(100, spikeScore),
      confidence,
      details: Object.keys(details).length > 0 ? details : undefined
    };
  }
  
  /**
   * Improved pattern anomaly detection
   */
  private detectPatternAnomaliesV2(current: ActivityDataV2, history: ActivityDataV2[]): {
    isAnomalous: boolean;
    score: number;
    confidence: number;
    reason: string;
  } {
    // Check for perfect patterns (bot signature)
    const recentProductiveKeys = history.slice(-5).map(h => h.productiveKeyHits);
    const allSameKeyHits = recentProductiveKeys.length >= 5 && 
      recentProductiveKeys.every(k => k === current.productiveKeyHits && k > 50) &&
      !current.hasTextPatterns; // Exclude if normal patterns detected
    
    if (allSameKeyHits) {
      return {
        isAnomalous: true,
        score: 35,
        confidence: 25,
        reason: 'Perfectly consistent activity (bot pattern)'
      };
    }
    
    // Check for oscillating patterns
    if (history.length >= 4) {
      const last4 = history.slice(-4).map(h => h.productiveKeyHits);
      const isOscillating = 
        Math.abs(last4[0] - last4[2]) < 5 &&
        Math.abs(last4[1] - last4[3]) < 5 &&
        Math.abs(last4[0] - last4[1]) > 50 &&
        !current.hasCodingPatterns; // Coding can have oscillating patterns
      
      if (isOscillating && Math.abs(current.productiveKeyHits - last4[0]) < 5) {
        return {
          isAnomalous: true,
          score: 30,
          confidence: 20,
          reason: 'Oscillating activity pattern'
        };
      }
    }
    
    // Check for no keyboard diversity (but allow if mostly navigation)
    const recentUniqueKeys = history.slice(-5).map(h => h.uniqueKeys);
    const allLowDiversity = recentUniqueKeys.length >= 5 &&
      recentUniqueKeys.every(u => u < 3) &&
      current.uniqueKeys < 3 &&
      current.productiveKeyHits > 100 &&
      current.keySequencePattern !== 'navigation'; // Navigation naturally has low diversity
    
    if (allLowDiversity) {
      return {
        isAnomalous: true,
        score: 40,
        confidence: 30,
        reason: 'No keyboard diversity in high activity'
      };
    }
    
    return {
      isAnomalous: false,
      score: 0,
      confidence: 0,
      reason: ''
    };
  }
  
  /**
   * Calculate statistics for a series of values
   */
  private calculateStats(values: number[]): { mean: number; stdDev: number; max: number } {
    if (values.length === 0) {
      return { mean: 0, stdDev: 0, max: 0 };
    }
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const max = Math.max(...values);
    
    return { mean, stdDev, max };
  }
  
  /**
   * Calculate how many standard deviations a value is from the mean
   */
  private calculateSpikeMagnitude(value: number, stats: { mean: number; stdDev: number }): number {
    if (stats.stdDev === 0) {
      // If no variance in history, check if current value is significantly different
      return value > stats.mean * 3 ? 5 : 0; // More lenient
    }
    
    return Math.abs(value - stats.mean) / stats.stdDev;
  }
  
  /**
   * Reset history (useful when starting new session)
   */
  reset() {
    this.activityHistory = [];
  }
  
  /**
   * Get current history size
   */
  getHistorySize(): number {
    return this.activityHistory.length;
  }
  
  /**
   * Get detection confidence for last detection
   */
  getLastConfidence(): number {
    if (this.activityHistory.length === 0) return 0;
    // Return confidence from last detection
    return 50; // Placeholder
  }
}

// Singleton instance for global spike detection
let globalSpikeDetectorV2: SpikeDetectorV2 | null = null;

export function getGlobalSpikeDetectorV2(): SpikeDetectorV2 {
  if (!globalSpikeDetectorV2) {
    globalSpikeDetectorV2 = new SpikeDetectorV2();
  }
  return globalSpikeDetectorV2;
}

export function resetGlobalSpikeDetectorV2() {
  if (globalSpikeDetectorV2) {
    globalSpikeDetectorV2.reset();
  }
}