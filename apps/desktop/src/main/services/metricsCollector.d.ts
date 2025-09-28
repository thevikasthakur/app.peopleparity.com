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
        keystrokeIntervals: number[];
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
        clickIntervals: number[];
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
export declare class MetricsCollector {
    private keystrokeTimestamps;
    private clickTimestamps;
    private mousePositions;
    private productiveKeys;
    private navigationKeys;
    private readonly BOT_INTERVAL_THRESHOLD;
    private readonly CONSISTENT_INTERVAL_THRESHOLD;
    private readonly REPETITIVE_PATTERN_THRESHOLD;
    constructor();
    private initializeKeyCategories;
    /**
     * Analyze keystroke patterns for bot detection
     */
    analyzeKeystrokePatterns(timestamps: number[]): {
        isBotLike: boolean;
        confidence: number;
        reasons: string[];
    };
    /**
     * Analyze mouse movement patterns for bot detection
     */
    analyzeMousePatterns(positions: Array<{
        x: number;
        y: number;
        timestamp: number;
    }>, clicks: number[]): {
        isBotLike: boolean;
        confidence: number;
        reasons: string[];
    };
    /**
     * Calculate comprehensive activity score with detailed breakdown
     * Using PeopleParity-style weighted scoring without consistency bonus
     */
    calculateDetailedScore(keyboardMetrics: any, mouseMetrics: any, botDetection: any, timeMetrics: any): {
        components: any;
        bonus: {
            mouseActivityBonus: number;
            description: string;
        };
        penalties: any;
        formula: string;
        rawScore: number;
        finalScore: number;
    };
    /**
     * Classify activity based on score and patterns
     */
    classifyActivity(score: number, metrics: any): {
        category: 'highly_active' | 'active' | 'moderate' | 'low' | 'idle';
        confidence: number;
        tags: string[];
    };
    /**
     * Generate complete metrics breakdown
     */
    generateMetricsBreakdown(rawMetrics: any, periodDuration: number): DetailedActivityMetrics;
    private calculateAvgInterval;
    private calculateStdDeviation;
    private getLastIntervals;
    private calculateAvgMouseSpeed;
    private calculateMaxMouseSpeed;
    recordKeystroke(keycode: number, timestamp: number): void;
    recordClick(timestamp: number): void;
    recordMousePosition(x: number, y: number, timestamp: number): void;
    reset(): void;
    /**
     * Simplified scoring method for direct use with raw metrics
     */
    calculateSimpleScore(keystrokes: number, uniqueKeystrokes: number, mouseClicks: number, mouseScrolls: number, mouseDistance: number, periodDuration: number): {
        components: any;
        bonus: {
            mouseActivityBonus: number;
            description: string;
        };
        penalties: any;
        formula: string;
        rawScore: number;
        finalScore: number;
    };
    /**
     * Detect suspicious patterns in activity
     */
    private detectSuspiciousPatterns;
}
//# sourceMappingURL=metricsCollector.d.ts.map