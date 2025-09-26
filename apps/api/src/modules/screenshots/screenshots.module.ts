import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreenshotsService } from './screenshots.service';
import { ScreenshotsController } from './screenshots.controller';
import { Screenshot } from '../../entities/screenshot.entity';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Screenshot, ActivityPeriod]),
    SessionsModule,
    UsersModule
  ],
  providers: [ScreenshotsService],
  controllers: [ScreenshotsController],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}