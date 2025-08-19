import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { ActivityController, ActivitiesController } from './activity.controller';
import { ActivityPeriod } from '../../entities/activity-period.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityPeriod])],
  providers: [ActivityService],
  controllers: [ActivityController, ActivitiesController],
  exports: [ActivityService],
})
export class ActivityModule {}