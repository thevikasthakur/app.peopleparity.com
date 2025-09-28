/**
 * Calculate weighted average of activity scores by discarding worst periods
 * @param scores Array of activity scores
 * @param thresholds Object containing thresholds for different discard levels
 * @returns Weighted average score
 */
export declare function calculateWeightedActivityScore(scores: number[], thresholds?: {
    high: number;
    medium: number;
}): number;
/**
 * Calculate weighted average for screenshot (10-minute window)
 * Uses thresholds: >8 periods = best 8, >4 periods = discard worst 1, <=4 = simple avg
 */
export declare function calculateScreenshotScore(activityScores: number[]): number;
/**
 * Calculate weighted average for hourly activity
 * Uses thresholds: >48 periods = best 48, >24 periods = discard worst 6, <=24 = simple avg
 */
export declare function calculateHourlyScore(activityScores: number[]): number;
/**
 * Calculate average of top 80% of activity scores
 * Excludes the lowest 20% of scores to filter out brief inactive periods
 * @param scores Array of activity scores
 * @returns Average of top 80% scores
 */
export declare function calculateTop80Average(scores: number[], source?: string): number;
//# sourceMappingURL=activityScoreCalculator.d.ts.map