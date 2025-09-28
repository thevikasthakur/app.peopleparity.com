"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateWeightedActivityScore = calculateWeightedActivityScore;
exports.calculateScreenshotScore = calculateScreenshotScore;
exports.calculateHourlyScore = calculateHourlyScore;
exports.calculateTop80Average = calculateTop80Average;
/**
 * Calculate weighted average of activity scores by discarding worst periods
 * @param scores Array of activity scores
 * @param thresholds Object containing thresholds for different discard levels
 * @returns Weighted average score
 */
function calculateWeightedActivityScore(scores, thresholds = { high: 8, medium: 4 }) {
    if (!scores || scores.length === 0) {
        return 0;
    }
    // Sort scores in descending order (best to worst)
    const sortedScores = [...scores].sort((a, b) => b - a);
    const count = sortedScores.length;
    let scoresToAverage;
    if (count > thresholds.high) {
        // More than high threshold: take best scores, discarding worst 2
        scoresToAverage = sortedScores.slice(0, thresholds.high);
    }
    else if (count > thresholds.medium) {
        // Between medium and high: discard worst 1
        scoresToAverage = sortedScores.slice(0, -1);
    }
    else {
        // Medium threshold or less: take simple average
        scoresToAverage = sortedScores;
    }
    // Calculate average
    if (scoresToAverage.length === 0) {
        return 0;
    }
    const sum = scoresToAverage.reduce((acc, score) => acc + score, 0);
    return sum / scoresToAverage.length;
}
/**
 * Calculate weighted average for screenshot (10-minute window)
 * Uses thresholds: >8 periods = best 8, >4 periods = discard worst 1, <=4 = simple avg
 */
function calculateScreenshotScore(activityScores) {
    return calculateWeightedActivityScore(activityScores, { high: 8, medium: 4 });
}
/**
 * Calculate weighted average for hourly activity
 * Uses thresholds: >48 periods = best 48, >24 periods = discard worst 6, <=24 = simple avg
 */
function calculateHourlyScore(activityScores) {
    return calculateWeightedActivityScore(activityScores, { high: 48, medium: 24 });
}
/**
 * Calculate average of top 80% of activity scores
 * Excludes the lowest 20% of scores to filter out brief inactive periods
 * @param scores Array of activity scores
 * @returns Average of top 80% scores
 */
function calculateTop80Average(scores, source) {
    if (!scores || scores.length === 0) {
        return 0;
    }
    // Sort scores in descending order (best to worst)
    const sortedScores = [...scores].sort((a, b) => b - a);
    // Calculate how many scores to include (top 80%)
    const includeCount = Math.ceil(scores.length * 0.8);
    // Take top 80% of scores
    const topScores = sortedScores.slice(0, includeCount);
    // Calculate average of top scores
    const sum = topScores.reduce((acc, score) => acc + score, 0);
    const result = sum / topScores.length;
    return result;
}
//# sourceMappingURL=activityScoreCalculator.js.map