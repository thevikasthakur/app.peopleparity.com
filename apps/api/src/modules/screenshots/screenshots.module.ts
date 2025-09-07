import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreenshotsService } from './screenshots.service';
import { ScreenshotsController } from './screenshots.controller';
import { Screenshot } from '../../entities/screenshot.entity';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Screenshot]),
    SessionsModule // Import SessionsModule to use SessionsService
  ],
  providers: [ScreenshotsService],
  controllers: [ScreenshotsController],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}