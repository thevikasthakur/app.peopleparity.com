import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { ProductiveHoursService } from './productive-hours.service';
import { AnalyticsController } from './analytics.controller';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { Screenshot } from '../../entities/screenshot.entity';
import { User } from '../../entities/user.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityPeriod, Screenshot, User]),
    UsersModule
  ],
  providers: [AnalyticsService, ProductiveHoursService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, ProductiveHoursService],
})
export class AnalyticsModule {}