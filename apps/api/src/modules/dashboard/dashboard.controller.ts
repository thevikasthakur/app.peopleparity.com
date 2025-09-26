import { Controller, Get, UseGuards, Request, Inject, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly dashboardService: DashboardService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req, @Query('date') dateStr?: string, @Query('userId') userId?: string) {
    if (!this.dashboardService) {
      console.error('DashboardService is not injected properly');
      throw new Error('Service initialization error');
    }
    const date = dateStr ? new Date(dateStr) : new Date();
    // Use the provided userId if specified (for admins viewing team members), otherwise use logged-in user's ID
    const targetUserId = userId || req.user.userId;
    return this.dashboardService.getStats(targetUserId, date);
  }
}