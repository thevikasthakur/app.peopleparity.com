import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppVersion } from '../../entities/app-version.entity';
import { AppVersionController } from './app-version.controller';
import { AppVersionService } from './app-version.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppVersion])],
  controllers: [AppVersionController],
  providers: [AppVersionService],
  exports: [TypeOrmModule], // Export TypeOrmModule so guards can use the repository
})
export class AppVersionModule {}
