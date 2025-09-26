import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { Session } from '../../entities/session.entity';
import { ProductiveHoursService } from '../analytics/productive-hours.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ActivityPeriod)
    private activityPeriodsRepository: Repository<ActivityPeriod>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @Inject(ProductiveHoursService)
    private productiveHoursService: ProductiveHoursService,
  ) {}

  async getStats(userId: string, date: Date = new Date()) {
    // Get productive hours for the specified date using the correct calculation
    const todayProductiveHours = await this.productiveHoursService.getDailyProductiveHours(userId, date);

    // Get week's productive hours for the week containing the specified date
    const weekProductiveHours = await this.productiveHoursService.getWeeklyProductiveHours(userId, date);

    // Get date range for activity periods (for client/command breakdown)
    const todayStart = new Date(date);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(date);
    todayEnd.setHours(23, 59, 59, 999);

    // Get week's date range (7 days ending on the specified date)
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // Fetch today's activity periods for client/command breakdown
    const todayPeriods = await this.activityPeriodsRepository.find({
      where: {
        userId,
        periodStart: Between(todayStart, todayEnd),
      },
    });

    // Fetch week's activity periods for client/command breakdown
    const weekPeriods = await this.activityPeriodsRepository.find({
      where: {
        userId,
        periodStart: Between(weekStart, todayEnd),
      },
    });

    // Calculate client/command breakdown from activity periods
    const todayBreakdown = this.calculateModeBreakdown(todayPeriods, todayProductiveHours.productiveHours);
    const weekBreakdown = this.calculateModeBreakdown(weekPeriods, weekProductiveHours.productiveHours);

    return {
      today: {
        clientHours: todayBreakdown.clientHours,
        commandHours: todayBreakdown.commandHours,
        totalHours: todayProductiveHours.productiveHours,
        averageActivityScore: todayProductiveHours.averageActivityScore,
        focusMinutes: Math.round(todayProductiveHours.productiveHours * 60 * 0.7),
        handsOnMinutes: Math.round(todayProductiveHours.productiveHours * 60 * 0.6),
        researchMinutes: Math.round(todayProductiveHours.productiveHours * 60 * 0.2),
        aiMinutes: Math.round(todayProductiveHours.productiveHours * 60 * 0.1),
      },
      week: {
        clientHours: weekBreakdown.clientHours,
        commandHours: weekBreakdown.commandHours,
        totalHours: weekProductiveHours.productiveHours,
        averageActivityScore: weekProductiveHours.averageActivityScore,
      },
    };
  }

  private calculateModeBreakdown(periods: ActivityPeriod[], totalProductiveHours: number) {
    // Calculate the proportion of client vs command time from activity periods
    let clientMinutes = 0;
    let commandMinutes = 0;

    for (const period of periods) {
      const duration = (new Date(period.periodEnd).getTime() - new Date(period.periodStart).getTime()) / 1000 / 60;

      if (period.mode === 'client_hours') {
        clientMinutes += duration;
      } else {
        commandMinutes += duration;
      }
    }

    const totalMinutes = clientMinutes + commandMinutes;

    // If no activity periods, default to all client hours
    if (totalMinutes === 0) {
      return {
        clientHours: totalProductiveHours,
        commandHours: 0,
      };
    }

    // Distribute productive hours proportionally based on activity period modes
    const clientRatio = clientMinutes / totalMinutes;
    const commandRatio = commandMinutes / totalMinutes;

    return {
      clientHours: Math.round(totalProductiveHours * clientRatio * 100) / 100,
      commandHours: Math.round(totalProductiveHours * commandRatio * 100) / 100,
    };
  }
}