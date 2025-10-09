import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreenshotsService } from './screenshots.service';
import { ScreenshotsController } from './screenshots.controller';
import { Screenshot } from '../../entities/screenshot.entity';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { AppVersion } from '../../entities/app-version.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { VersionCheckGuard } from '../../guards/version-check.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Screenshot, ActivityPeriod, AppVersion]),
    SessionsModule,
    UsersModule
  ],
  providers: [ScreenshotsService, VersionCheckGuard],
  controllers: [ScreenshotsController],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}