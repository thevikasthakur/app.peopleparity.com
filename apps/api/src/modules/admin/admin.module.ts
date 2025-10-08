import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminManualTimeController } from './admin-manual-time.controller';
import { AdminManualTimeService } from './admin-manual-time.service';
import { AdminGuard } from '../auth/admin.guard';
import { Session } from '../../entities/session.entity';
import { Screenshot } from '../../entities/screenshot.entity';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Screenshot, ActivityPeriod, User])
  ],
  controllers: [AdminManualTimeController],
  providers: [AdminManualTimeService, AdminGuard],
})
export class AdminModule {}