import { Controller, Get, UseGuards, Request, Inject } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analyticsService: AnalyticsService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('leaderboard')
  async getLeaderboard(@Request() req) {
    if (!req.user.organizationId) {
      return { today: [], week: [] };
    }
    return this.analyticsService.getLeaderboard(req.user.organizationId);
  }
}