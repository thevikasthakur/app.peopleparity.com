import { Controller, Post, Body, UseGuards, Req, Inject, Get, Query } from '@nestjs/common';
import { AdminManualTimeService } from './admin-manual-time.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

export interface CreateManualTimeDto {
  userId: string;
  taskName: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
}

@Controller('admin/manual-time')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminManualTimeController {
  constructor(
    @Inject(AdminManualTimeService) private readonly adminManualTimeService: AdminManualTimeService
  ) {}

  @Post()
  async createManualTime(
    @Body() createManualTimeDto: CreateManualTimeDto,
    @Req() req: any
  ) {
    return this.adminManualTimeService.createManualTimeEntry(
      createManualTimeDto,
      req.user
    );
  }

  @Get('bot-detection-report')
  async getBotDetectionReport(
    @Query('userId') userId: string,
    @Query('date') date: string,
    @Req() req: any
  ) {
    return this.adminManualTimeService.getBotDetectionReport(userId, date);
  }
}