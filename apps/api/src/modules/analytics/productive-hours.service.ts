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
    // Set date range to UTC midnight
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log('Fetching productive hours for:', { userId, startOfDay, endOfDay });

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

    // Process each screenshot
    for (const screenshot of screenshots) {
      if (!screenshot.activityPeriods || screenshot.activityPeriods.length === 0) {
        continue;
      }

      // Calculate weighted average score for this screenshot
      const scores = screenshot.activityPeriods
        .map(period => period.activityScore || 0)
        .sort((a, b) => b - a); // Sort descending

      if (scores.length === 0) continue;

      // Weighted average calculation (same as desktop app)
      let weightedScore: number;
      if (scores.length === 1) {
        weightedScore = scores[0];
      } else if (scores.length === 2) {
        weightedScore = scores[0] * 0.7 + scores[1] * 0.3;
      } else {
        const topScore = scores[0];
        const secondScore = scores[1];
        const remainingAvg = scores.slice(2).reduce((a, b) => a + b, 0) / (scores.length - 2);
        weightedScore = topScore * 0.5 + secondScore * 0.3 + remainingAvg * 0.2;
      }

      // Convert to UI scale (0-10)
      const uiScore = weightedScore / 10;
      
      if (uiScore > 0) {
        allScores.push(uiScore);
      }

      // Apply validation rules (same as desktop app)
      // >= 4.0: Always valid (10 minutes)
      // 2.5-4.0: Valid only if within work hours or adjacent to high activity
      // < 2.5: Never valid
      if (uiScore >= 4.0) {
        validMinutes += 10; // Each screenshot represents 10 minutes
      } else if (uiScore >= 2.5 && uiScore < 4.0) {
        // Check work hours (9 AM - 7 PM in UTC)
        const capturedHour = new Date(screenshot.capturedAt).getUTCHours();
        const isWorkHours = capturedHour >= 9 && capturedHour < 19;
        
        if (isWorkHours) {
          validMinutes += 10;
        }
        // Could also check for adjacent high-activity screenshots here
      }
      // < 2.5: Don't count
    }

    const productiveHours = validMinutes / 60;

    // Calculate average activity score (top 80% average)
    const averageActivityScore = this.calculateTop80Average(allScores);

    return {
      productiveHours: Math.round(productiveHours * 100) / 100,
      averageActivityScore: Math.round(averageActivityScore * 10) / 10,
      totalScreenshots: screenshots.length,
      validScreenshots: Math.floor(validMinutes / 10),
      date: date.toISOString().split('T')[0],
    };
  }

  async getWeeklyProductiveHours(userId: string, date: Date) {
    // Get Monday of the week
    const dayOfWeek = date.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - daysToMonday);
    startOfWeek.setUTCHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);

    console.log('Fetching weekly hours from', startOfWeek, 'to', endOfWeek);

    // Get daily data for each day of the week
    const dailyData = [];
    let totalHours = 0;
    const allScores: number[] = [];

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
      if (dayData.averageActivityScore > 0) {
        allScores.push(dayData.averageActivityScore);
      }
    }

    const averageActivityScore = allScores.length > 0 
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length 
      : 0;

    return {
      productiveHours: Math.round(totalHours * 100) / 100,
      averageActivityScore: Math.round(averageActivityScore * 10) / 10,
      dailyData,
      weekStart: startOfWeek.toISOString().split('T')[0],
      weekEnd: endOfWeek.toISOString().split('T')[0],
    };
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
    return top80.reduce((sum, score) => sum + score, 0) / top80.length;
  }
}