import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ActivityPeriod)
    private activityPeriodsRepository: Repository<ActivityPeriod>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async getLeaderboard(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    // Get today's leaderboard
    const todayData = await this.activityPeriodsRepository
      .createQueryBuilder('period')
      .select('period.userId', 'userId')
      .addSelect('user.name', 'userName')
      .addSelect('SUM(EXTRACT(EPOCH FROM (period.periodEnd - period.periodStart)) / 3600)', 'totalHours')
      .innerJoin('period.user', 'user')
      .where('user.organizationId = :organizationId', { organizationId })
      .andWhere('period.periodStart >= :today', { today })
      .andWhere('period.isValid = :isValid', { isValid: true })
      .groupBy('period.userId')
      .addGroupBy('user.name')
      .orderBy('totalHours', 'DESC')
      .getRawMany();

    // Get week's leaderboard
    const weekData = await this.activityPeriodsRepository
      .createQueryBuilder('period')
      .select('period.userId', 'userId')
      .addSelect('user.name', 'userName')
      .addSelect('SUM(EXTRACT(EPOCH FROM (period.periodEnd - period.periodStart)) / 3600)', 'totalHours')
      .innerJoin('period.user', 'user')
      .where('user.organizationId = :organizationId', { organizationId })
      .andWhere('period.periodStart >= :weekAgo', { weekAgo })
      .andWhere('period.isValid = :isValid', { isValid: true })
      .groupBy('period.userId')
      .addGroupBy('user.name')
      .orderBy('totalHours', 'DESC')
      .getRawMany();

    return {
      today: todayData.map((d, index) => ({
        ...d,
        totalHours: parseFloat(d.totalHours || 0),
        rank: index + 1,
      })),
      week: weekData.map((d, index) => ({
        ...d,
        totalHours: parseFloat(d.totalHours || 0),
        rank: index + 1,
      })),
    };
  }
}