"use strict";
/**
 * Spike Detector - Detects abnormal spikes in keyboard and mouse activity
 *
 * This module tracks activity history across periods and identifies
 * sudden spikes that indicate bot-like behavior.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpikeDetector = void 0;
exports.getGlobalSpikeDetector = getGlobalSpikeDetector;
exports.resetGlobalSpikeDetector = resetGlobalSpikeDetector;
class SpikeDetector {
    constructor() {
        this.activityHistory = [];
        this.maxHistorySize = 20; // Keep last 20 periods (about 20 minutes)
        this.spikeThreshold = 3.0; // Standard deviations for spike detection
        this.minHistoryForDetection = 3; // Need at least 3 periods to detect spikes
    }
    /**
     * Add new activity data and check for spikes
     */
    addActivity(data) {
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
                spikeScore: 0
            };
        }
        return this.detectSpikes(data);
    }
    /**
     * Detect spikes in the current activity compared to history
     */
    detectSpikes(currentData) {
        // Get historical data (excluding current)
        const history = this.activityHistory.slice(0, -1);
        // Calculate statistics for each metric
        const keyboardStats = this.calculateStats(history.map(h => h.keyHits));
        const mouseClickStats = this.calculateStats(history.map(h => h.mouseClicks));
        const mouseDistanceStats = this.calculateStats(history.map(h => h.mouseDistance));
        const uniqueKeyStats = this.calculateStats(history.map(h => h.uniqueKeys));
        // Check for spikes
        const keyboardSpike = this.calculateSpikeMagnitude(currentData.keyHits, keyboardStats);
        const mouseClickSpike = this.calculateSpikeMagnitude(currentData.mouseClicks, mouseClickStats);
        const mouseDistanceSpike = this.calculateSpikeMagnitude(currentData.mouseDistance, mouseDistanceStats);
        // Check for pattern anomalies
        const patternAnomalies = this.detectPatternAnomalies(currentData, history);
        // Calculate overall spike score
        let spikeScore = 0;
        let spikeReasons = [];
        const details = {};
        // Keyboard spike detection
        if (keyboardSpike > this.spikeThreshold) {
            spikeScore += Math.min(40, keyboardSpike * 10);
            spikeReasons.push(`Keyboard spike: ${keyboardSpike.toFixed(1)}σ`);
            details.keyboardSpike = keyboardSpike;
        }
        // Mouse click spike detection
        if (mouseClickSpike > this.spikeThreshold) {
            spikeScore += Math.min(40, mouseClickSpike * 10);
            spikeReasons.push(`Mouse click spike: ${mouseClickSpike.toFixed(1)}σ`);
            details.mouseClickSpike = mouseClickSpike;
        }
        // Mouse movement spike detection
        if (mouseDistanceSpike > this.spikeThreshold) {
            spikeScore += Math.min(30, mouseDistanceSpike * 8);
            spikeReasons.push(`Mouse movement spike: ${mouseDistanceSpike.toFixed(1)}σ`);
            details.mouseDistanceSpike = mouseDistanceSpike;
        }
        // Pattern anomalies
        if (patternAnomalies.isAnomalous) {
            spikeScore += patternAnomalies.score;
            spikeReasons.push(patternAnomalies.reason);
            details.patternAnomaly = patternAnomalies.reason;
        }
        // Additional checks for bot patterns
        // Check 1: Extremely high keyboard activity with low diversity
        if (currentData.keyHits > 500 && currentData.uniqueKeys < 5) {
            spikeScore += 30;
            spikeReasons.push('Repetitive key pattern');
            details.repetitiveKeys = true;
        }
        // Check 2: Sudden activity after inactivity
        const recentInactivity = history.slice(-3).every(h => h.keyHits < 10 && h.mouseClicks < 5);
        const suddenHighActivity = currentData.keyHits > 200 || currentData.mouseClicks > 50;
        if (recentInactivity && suddenHighActivity) {
            spikeScore += 25;
            spikeReasons.push('Sudden activity burst after inactivity');
            details.suddenBurst = true;
        }
        // Check 3: Impossible human speeds
        if (currentData.keyHits > 600) { // >10 keys per second sustained
            spikeScore += 40;
            spikeReasons.push('Superhuman typing speed');
            details.impossibleSpeed = true;
        }
        if (currentData.mouseClicks > 100) { // >1.6 clicks per second sustained
            spikeScore += 35;
            spikeReasons.push('Superhuman clicking speed');
            details.impossibleClicking = true;
        }
        // Determine if it's bot activity
        const isBot = spikeScore >= 50; // 50+ score indicates likely bot
        const hasSpike = spikeScore >= 30; // 30+ indicates significant spike
        return {
            isBot,
            hasSpike,
            spikeReason: spikeReasons.join('; '),
            spikeScore: Math.min(100, spikeScore),
            details: Object.keys(details).length > 0 ? details : undefined
        };
    }
    /**
     * Calculate statistics for a series of values
     */
    calculateStats(values) {
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
    calculateSpikeMagnitude(value, stats) {
        if (stats.stdDev === 0) {
            // If no variance in history, check if current value is significantly different
            return value > stats.mean * 2 ? 5 : 0;
        }
        return Math.abs(value - stats.mean) / stats.stdDev;
    }
    /**
     * Detect pattern anomalies beyond simple spikes
     */
    detectPatternAnomalies(current, history) {
        // Check for perfect patterns (bot signature)
        const recentKeyHits = history.slice(-5).map(h => h.keyHits);
        const allSameKeyHits = recentKeyHits.length >= 5 &&
            recentKeyHits.every(k => k === current.keyHits && k > 50);
        if (allSameKeyHits) {
            return {
                isAnomalous: true,
                score: 40,
                reason: 'Perfectly consistent activity pattern'
            };
        }
        // Check for oscillating patterns (another bot signature)
        if (history.length >= 4) {
            const last4 = history.slice(-4).map(h => h.keyHits);
            const isOscillating = Math.abs(last4[0] - last4[2]) < 5 &&
                Math.abs(last4[1] - last4[3]) < 5 &&
                Math.abs(last4[0] - last4[1]) > 50;
            if (isOscillating && Math.abs(current.keyHits - last4[0]) < 5) {
                return {
                    isAnomalous: true,
                    score: 35,
                    reason: 'Oscillating activity pattern'
                };
            }
        }
        // Check for zero variance in unique keys (repetitive bot)
        const recentUniqueKeys = history.slice(-5).map(h => h.uniqueKeys);
        const allSameUniqueKeys = recentUniqueKeys.length >= 5 &&
            recentUniqueKeys.every(u => u === current.uniqueKeys && u < 5 && current.keyHits > 100);
        if (allSameUniqueKeys) {
            return {
                isAnomalous: true,
                score: 45,
                reason: 'No keyboard diversity despite high activity'
            };
        }
        return {
            isAnomalous: false,
            score: 0,
            reason: ''
        };
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
    getHistorySize() {
        return this.activityHistory.length;
    }
}
exports.SpikeDetector = SpikeDetector;
// Singleton instance for global spike detection
let globalSpikeDetector = null;
function getGlobalSpikeDetector() {
    if (!globalSpikeDetector) {
        globalSpikeDetector = new SpikeDetector();
    }
    return globalSpikeDetector;
}
function resetGlobalSpikeDetector() {
    if (globalSpikeDetector) {
        globalSpikeDetector.reset();
    }
}
//# sourceMappingURL=spikeDetector.js.map