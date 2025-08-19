import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityPeriod } from '../../entities/activity-period.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityPeriod)
    private activityPeriodsRepository: Repository<ActivityPeriod>,
  ) {}

  async create(createActivityDto: {
    id?: string;
    sessionId: string;
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    mode: 'client_hours' | 'command_hours';
    activityScore: number;
    isValid: boolean;
    classification?: string;
    metrics?: any;
  }) {
    console.log('Creating activity period with ID:', createActivityDto.id, 'for session:', createActivityDto.sessionId);
    
    try {
      const period = this.activityPeriodsRepository.create(createActivityDto);
      const savedPeriod = await this.activityPeriodsRepository.save(period);
      console.log('Activity period created successfully:', savedPeriod.id);
      return savedPeriod;
    } catch (error: any) {
      console.error('Error creating activity period:', error.message);
      if (error.message?.includes('foreign key constraint')) {
        console.error(`Session ${createActivityDto.sessionId} does not exist in database`);
      }
      throw error;
    }
  }

  async findById(id: string) {
    return this.activityPeriodsRepository.findOne({ where: { id } });
  }

  async findByUser(userId: string, startDate?: Date, endDate?: Date) {
    const query = this.activityPeriodsRepository
      .createQueryBuilder('period')
      .where('period.userId = :userId', { userId });

    if (startDate) {
      query.andWhere('period.periodStart >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('period.periodEnd <= :endDate', { endDate });
    }

    return query.getMany();
  }
}