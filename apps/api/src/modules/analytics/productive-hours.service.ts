import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Screenshot } from '../../entities/screenshot.entity';
import { ActivityPeriod } from '../../entities/activity-period.entity';

@Injectable()
export class ProductiveHoursService {
  constructor(
    @InjectRepository(Screenshot)
    private screenshotRepository: Repository<Screenshot>,
    @InjectRepository(ActivityPeriod)
    private activityPeriodRepository: Repository<ActivityPeriod>,
  ) {}

  async getDailyProductiveHours(userId: string, date: Date) {
    try {
      if (!userId) {
        console.error('❌ No userId provided to getDailyProductiveHours');
        throw new Error('userId is required');
      }

      // Set date range to UTC midnight
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      console.log('📊 Fetching daily productive hours for:', {
        userId,
        date: date.toISOString(),
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString()
      });

    // Fetch all screenshots for the day with their activity periods
    const screenshots = await this.screenshotRepository.find({
      where: {
        userId,
        capturedAt: Between(startOfDay, endOfDay),
      },
      relations: ['activityPeriods'],
      order: {
        capturedAt: 'ASC',
      },
    });

    console.log(`Found ${screenshots.length} screenshots for the day`);

    let validMinutes = 0;
    const allScores: number[] = [];

    // Build array of screenshot scores for neighbor checking
    const screenshotScores: Array<{
      screenshot: Screenshot;
      weightedScore: number;
      uiScore: number;
    }> = [];

    // First pass: calculate scores for all screenshots
    for (const screenshot of screenshots) {
      if (!screenshot.activityPeriods || screenshot.activityPeriods.length === 0) {
        continue;
      }

      // Calculate weighted average score for this screenshot
      const scores = screenshot.activityPeriods
        .map(period => period.activityScore || 0)
        .sort((a, b) => b - a); // Sort descending

      if (scores.length === 0) continue;

      // Match frontend's calculateScreenshotScore logic:
      // >8 periods: take best 8, >4 periods: discard worst 1, <=4: simple avg
      let scoresToAverage: number[];
      if (scores.length > 8) {
        scoresToAverage = scores.slice(0, 8); // Take best 8
      } else if (scores.length > 4) {
        scoresToAverage = scores.slice(0, -1); // Discard worst 1
      } else {
        scoresToAverage = scores; // Take all
      }

      // Calculate simple average of selected scores (DB scale 0-100)
      const weightedScore = scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length;

      // Convert to UI scale (0-10)
      const uiScore = weightedScore / 10;

      if (uiScore > 0) {
        allScores.push(uiScore);
      }

      screenshotScores.push({
        screenshot,
        weightedScore,
        uiScore
      });
    }

    // Second pass: apply validation rules with neighbor checking
    for (let i = 0; i < screenshotScores.length; i++) {
      const current = screenshotScores[i];
      const prev = i > 0 ? screenshotScores[i - 1] : null;
      const next = i < screenshotScores.length - 1 ? screenshotScores[i + 1] : null;

      let isValid = false;

      // Rule 1: Valid if score >= 4.0 (40 on DB scale)
      if (current.weightedScore >= 40) {
        isValid = true;
        console.log(`Screenshot ${i}: Score ${current.uiScore.toFixed(1)} >= 4.0 -> VALID`);
      }
      // Rule 2 & 3: Critical (2.5-4.0) has two possible validation paths
      else if (current.weightedScore >= 25 && current.weightedScore < 40) {
        // Rule 2: Check if previous or next screenshot has score >= 4.0
        if ((prev && prev.weightedScore >= 40) || (next && next.weightedScore >= 40)) {
          isValid = true;
          const neighborInfo = prev && prev.weightedScore >= 40
            ? `prev=${prev.uiScore.toFixed(1)}`
            : `next=${next?.uiScore.toFixed(1)}`;
          console.log(`Screenshot ${i}: Critical score ${current.uiScore.toFixed(1)} with neighbor >= 4.0 (${neighborInfo}) -> VALID`);
        }
        // Rule 3: Check hourly average condition
        else {
          // Get the hour of this screenshot
          const screenshotTime = new Date(current.screenshot.capturedAt);
          const hourStart = new Date(screenshotTime);
          hourStart.setMinutes(0, 0, 0);
          const hourEnd = new Date(hourStart);
          hourEnd.setHours(hourEnd.getHours() + 1);

          // Find all screenshots in this hour
          const hourScreenshots = screenshotScores.filter(s => {
            const time = new Date(s.screenshot.capturedAt).getTime();
            return time >= hourStart.getTime() && time < hourEnd.getTime();
          });

          // Check if hour has 6+ screenshots
          if (hourScreenshots.length >= 6) {
            // Collect all activity period scores for the hour
            const hourPeriodScores: number[] = [];
            for (const hs of hourScreenshots) {
              const periodScores = hs.screenshot.activityPeriods
                ?.map(p => p.activityScore || 0) || [];
              hourPeriodScores.push(...periodScores);
            }

            // Calculate top 80% average
            if (hourPeriodScores.length > 0) {
              const avgScore = this.calculateTop80Average(hourPeriodScores.map(s => s / 10));

              // Check if average >= 4.0 (40 on DB scale)
              if (avgScore >= 4.0) {
                isValid = true;
                console.log(`Screenshot ${i}: Critical score ${current.uiScore.toFixed(1)} with hourly avg ${avgScore.toFixed(1)} >= 4.0 (${hourScreenshots.length} screenshots in hour) -> VALID`);
              } else {
                console.log(`Screenshot ${i}: Critical score ${current.uiScore.toFixed(1)} with hourly avg ${avgScore.toFixed(1)} < 4.0 -> INVALID`);
              }
            }
          } else {
            console.log(`Screenshot ${i}: Critical score ${current.uiScore.toFixed(1)} with only ${hourScreenshots.length} screenshots in hour (< 6 required) -> INVALID`);
          }
        }
      }
      // Rule 4: Inactive (< 2.5) is never valid
      else {
        console.log(`Screenshot ${i}: Score ${current.uiScore.toFixed(1)} < 2.5 -> INVALID`);
      }

      if (isValid) {
        validMinutes += 10; // Each screenshot represents 10 minutes
      }
    }

    const productiveHours = validMinutes / 60;

    // Calculate average activity score (top 80% average)
    const averageActivityScore = this.calculateTop80Average(allScores);

    // Also calculate simple average for comparison
    const simpleAverage = allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

    // Calculate activity level label
    const activityLevel = this.getActivityLevel(averageActivityScore);

    return {
      productiveHours: Math.round(productiveHours * 100) / 100,
      averageActivityScore: Math.round(averageActivityScore * 10) / 10,
      activityLevel,
      totalScreenshots: screenshots.length,
      validScreenshots: Math.floor(validMinutes / 10),
      date: date.toISOString().split('T')[0],
    };
    } catch (error) {
      console.error('❌ Error in getDailyProductiveHours:', error);
      throw error;
    }
  }

  async getWeeklyProductiveHours(userId: string, date: Date) {
    try {
      if (!userId) {
        console.error('❌ No userId provided to getWeeklyProductiveHours');
        throw new Error('userId is required');
      }

      // Get Monday of the week
      const dayOfWeek = date.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - daysToMonday);
      startOfWeek.setUTCHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setUTCHours(23, 59, 59, 999);

      console.log('📊 Fetching weekly productive hours for:', {
        userId,
        date: date.toISOString(),
        startOfWeek: startOfWeek.toISOString(),
        endOfWeek: endOfWeek.toISOString()
      });

    // Fetch all screenshots for the week to calculate proper average
    const screenshots = await this.screenshotRepository.find({
      where: {
        userId,
        capturedAt: Between(startOfWeek, endOfWeek),
      },
      relations: ['activityPeriods'],
      order: {
        capturedAt: 'ASC',
      },
    });

    console.log(`Found ${screenshots.length} screenshots for the week`);

    // Collect all individual screenshot scores for the week
    const allWeeklyScores: number[] = [];

    // Process each screenshot to get its weighted score
    for (const screenshot of screenshots) {
      if (!screenshot.activityPeriods || screenshot.activityPeriods.length === 0) {
        continue;
      }

      const scores = screenshot.activityPeriods
        .map(period => period.activityScore || 0)
        .sort((a, b) => b - a);

      if (scores.length === 0) continue;

      // Match frontend's calculateScreenshotScore logic:
      // >8 periods: take best 8, >4 periods: discard worst 1, <=4: simple avg
      let scoresToAverage: number[];
      if (scores.length > 8) {
        scoresToAverage = scores.slice(0, 8); // Take best 8
      } else if (scores.length > 4) {
        scoresToAverage = scores.slice(0, -1); // Discard worst 1
      } else {
        scoresToAverage = scores; // Take all
      }

      // Calculate simple average of selected scores
      const weightedScore = scoresToAverage.reduce((a, b) => a + b, 0) / scoresToAverage.length;

      // Convert to UI scale (0-10)
      const uiScore = weightedScore / 10;

      if (uiScore > 0) {
        allWeeklyScores.push(uiScore);
      }
    }

    // Get daily data for each day of the week
    const dailyData = [];
    let totalHours = 0;

    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);

      const dayData = await this.getDailyProductiveHours(userId, currentDate);
      dailyData.push({
        date: currentDate.toISOString().split('T')[0],
        hours: dayData.productiveHours,
        averageActivityScore: dayData.averageActivityScore,
      });

      totalHours += dayData.productiveHours;
    }

    // Use top 80% average of all weekly screenshot scores
    const averageActivityScore = this.calculateTop80Average(allWeeklyScores);

    // Calculate activity level label
    const activityLevel = this.getActivityLevel(averageActivityScore);

    return {
      productiveHours: Math.round(totalHours * 100) / 100,
      averageActivityScore: Math.round(averageActivityScore * 10) / 10,
      activityLevel,
      dailyData,
      weekStart: startOfWeek.toISOString().split('T')[0],
      weekEnd: endOfWeek.toISOString().split('T')[0],
    };
    } catch (error) {
      console.error('❌ Error in getWeeklyProductiveHours:', error);
      throw error;
    }
  }

  private calculateTop80Average(scores: number[]): number {
    if (scores.length === 0) return 0;
    if (scores.length === 1) return scores[0];

    // Sort scores descending
    const sorted = [...scores].sort((a, b) => b - a);

    // Take top 80% of scores
    const count = Math.max(1, Math.ceil(scores.length * 0.8));
    const top80 = sorted.slice(0, count);

    // Calculate average
    const result = top80.reduce((sum, score) => sum + score, 0) / top80.length;

    console.log(`📊 [Top80% Calculation]:`, {
      totalScores: scores.length,
      top80Count: count,
      excluded: scores.length - count,
      allScores: sorted.slice(0, 5).map(s => Math.round(s * 10) / 10),
      top80Scores: top80.slice(0, 5).map(s => Math.round(s * 10) / 10),
      result: Math.round(result * 10) / 10
    });

    return result;
  }

  private getActivityLevel(score: number): string {
    if (score >= 8.5) return 'Good';
    if (score >= 7.0) return 'Fair';
    if (score >= 5.5) return 'Low';
    if (score >= 4.0) return 'Poor';
    if (score >= 2.5) return 'Critical';
    return 'Inactive';
  }
}