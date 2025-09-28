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
    productiveKeyHits: number;
    navigationKeyHits: number;
    uniqueKeys: number;
    keySequencePattern?: string;
    mouseClicks: number;
    mouseScrolls: number;
    mouseDistance: number;
    timestamp: Date;
    hasTextPatterns?: boolean;
    hasCodingPatterns?: boolean;
    hasReadingPattern?: boolean;
}
export interface SpikeDetectionResultV2 {
    isBot: boolean;
    hasSpike: boolean;
    spikeReason?: string;
    spikeScore: number;
    confidence: number;
    details?: {
        keyboardSpike?: number;
        mouseSpike?: number;
        patternAnomaly?: string;
        typingPattern?: string;
    };
}
export declare class SpikeDetectorV2 {
    private activityHistory;
    private readonly maxHistorySize;
    private readonly minHistoryForDetection;
    private readonly spikeThreshold;
    private readonly burstThreshold;
    private readonly mouseMovementThreshold;
    private readonly scrollThreshold;
    private readonly normalTypingSpeed;
    private readonly burstTypingSpeed;
    private readonly sustainedHighSpeed;
    private readonly normalScrollSpeed;
    private readonly normalMouseDistance;
    private readonly readingMouseDistance;
    /**
     * Add new activity data and check for spikes
     */
    addActivity(data: ActivityDataV2): SpikeDetectionResultV2;
    /**
     * Analyze activity patterns to detect normal human behavior
     */
    private analyzeActivityPatterns;
    /**
     * Improved spike detection with context awareness
     */
    private detectSpikesV2;
    /**
     * Improved pattern anomaly detection
     */
    private detectPatternAnomaliesV2;
    /**
     * Calculate statistics for a series of values
     */
    private calculateStats;
    /**
     * Calculate how many standard deviations a value is from the mean
     */
    private calculateSpikeMagnitude;
    /**
     * Reset history (useful when starting new session)
     */
    reset(): void;
    /**
     * Get current history size
     */
    getHistorySize(): number;
    /**
     * Get detection confidence for last detection
     */
    getLastConfidence(): number;
}
export declare function getGlobalSpikeDetectorV2(): SpikeDetectorV2;
export declare function resetGlobalSpikeDetectorV2(): void;
//# sourceMappingURL=spikeDetectorV2.d.ts.map