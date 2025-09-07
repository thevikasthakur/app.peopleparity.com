import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { ActivityController, ActivitiesController } from './activity.controller';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityPeriod]),
    SessionsModule, // Import SessionsModule to use SessionsService
  ],
  providers: [ActivityService],
  controllers: [ActivityController, ActivitiesController],
  exports: [ActivityService],
})
export class ActivityModule {}