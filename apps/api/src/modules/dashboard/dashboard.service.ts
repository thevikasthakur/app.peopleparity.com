import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { Session } from '../../entities/session.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(ActivityPeriod)
    private activityPeriodsRepository: Repository<ActivityPeriod>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
  ) {}

  async getStats(userId: string) {
    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get week's date range (last 7 days)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    // Fetch today's activity periods
    const todayPeriods = await this.activityPeriodsRepository.find({
      where: {
        userId,
        periodStart: Between(todayStart, todayEnd),
      },
    });

    // Fetch week's activity periods
    const weekPeriods = await this.activityPeriodsRepository.find({
      where: {
        userId,
        periodStart: Between(weekStart, todayEnd),
      },
    });

    // Calculate today's stats
    const todayStats = this.calculateStats(todayPeriods);
    
    // Calculate week's stats
    const weekStats = this.calculateStats(weekPeriods);

    return {
      today: {
        clientHours: todayStats.clientHours,
        commandHours: todayStats.commandHours,
        totalHours: todayStats.totalHours,
        focusMinutes: Math.round(todayStats.totalHours * 60 * 0.7),
        handsOnMinutes: Math.round(todayStats.totalHours * 60 * 0.6),
        researchMinutes: Math.round(todayStats.totalHours * 60 * 0.2),
        aiMinutes: Math.round(todayStats.totalHours * 60 * 0.1),
      },
      week: {
        clientHours: weekStats.clientHours,
        commandHours: weekStats.commandHours,
        totalHours: weekStats.totalHours,
      },
    };
  }

  private calculateStats(periods: ActivityPeriod[]) {
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

    return {
      clientHours: Math.round((clientMinutes / 60) * 100) / 100,
      commandHours: Math.round((commandMinutes / 60) * 100) / 100,
      totalHours: Math.round(((clientMinutes + commandMinutes) / 60) * 100) / 100,
    };
  }
}