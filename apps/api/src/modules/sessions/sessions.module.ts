import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { Session } from '../../entities/session.entity';
import { AppVersion } from '../../entities/app-version.entity';
import { VersionCheckGuard } from '../../guards/version-check.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Session, AppVersion])],
  providers: [SessionsService, VersionCheckGuard],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}