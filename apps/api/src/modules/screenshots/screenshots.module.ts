import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreenshotsService } from './screenshots.service';
import { ScreenshotsController } from './screenshots.controller';
import { Screenshot } from '../../entities/screenshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Screenshot])],
  providers: [ScreenshotsService],
  controllers: [ScreenshotsController],
  exports: [ScreenshotsService],
})
export class ScreenshotsModule {}