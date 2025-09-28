/**
 * Spike Detector - Detects abnormal spikes in keyboard and mouse activity
 *
 * This module tracks activity history across periods and identifies
 * sudden spikes that indicate bot-like behavior.
 */
export interface ActivityData {
    keyHits: number;
    uniqueKeys: number;
    mouseClicks: number;
    mouseScrolls: number;
    mouseDistance: number;
    timestamp: Date;
}
export interface SpikeDetectionResult {
    isBot: boolean;
    hasSpike: boolean;
    spikeReason?: string;
    spikeScore: number;
    details?: {
        keyboardSpike?: number;
        mouseSpike?: number;
        patternAnomaly?: string;
    };
}
export declare class SpikeDetector {
    private activityHistory;
    private readonly maxHistorySize;
    private readonly spikeThreshold;
    private readonly minHistoryForDetection;
    /**
     * Add new activity data and check for spikes
     */
    addActivity(data: ActivityData): SpikeDetectionResult;
    /**
     * Detect spikes in the current activity compared to history
     */
    private detectSpikes;
    /**
     * Calculate statistics for a series of values
     */
    private calculateStats;
    /**
     * Calculate how many standard deviations a value is from the mean
     */
    private calculateSpikeMagnitude;
    /**
     * Detect pattern anomalies beyond simple spikes
     */
    private detectPatternAnomalies;
    /**
     * Reset history (useful when starting new session)
     */
    reset(): void;
    /**
     * Get current history size
     */
    getHistorySize(): number;
}
export declare function getGlobalSpikeDetector(): SpikeDetector;
export declare function resetGlobalSpikeDetector(): void;
//# sourceMappingURL=spikeDetector.d.ts.map