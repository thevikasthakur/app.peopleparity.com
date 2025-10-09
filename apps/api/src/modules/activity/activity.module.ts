import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { ActivityController, ActivitiesController } from './activity.controller';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { AppVersion } from '../../entities/app-version.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { BotDetectionService } from './bot-detection.service';
import { VersionCheckGuard } from '../../guards/version-check.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityPeriod, AppVersion]),
    SessionsModule, // Import SessionsModule to use SessionsService
  ],
  providers: [ActivityService, BotDetectionService, VersionCheckGuard],
  controllers: [ActivityController, ActivitiesController],
  exports: [ActivityService, BotDetectionService],
})
export class ActivityModule {}