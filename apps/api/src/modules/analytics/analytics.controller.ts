import { Controller, Get, UseGuards, Request, Inject, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ProductiveHoursService } from './productive-hours.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analyticsService: AnalyticsService,
    @Inject(ProductiveHoursService) private readonly productiveHoursService: ProductiveHoursService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('leaderboard')
  async getLeaderboard(@Request() req) {
    if (!req.user.organizationId) {
      return { today: [], week: [] };
    }
    return this.analyticsService.getLeaderboard(req.user.organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('productive-hours/daily')
  async getDailyProductiveHours(@Request() req, @Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.productiveHoursService.getDailyProductiveHours(req.user.userId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('productive-hours/weekly')
  async getWeeklyProductiveHours(@Request() req, @Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.productiveHoursService.getWeeklyProductiveHours(req.user.userId, date);
  }
}