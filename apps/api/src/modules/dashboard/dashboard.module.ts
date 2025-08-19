import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { Session } from '../../entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityPeriod, Session])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}