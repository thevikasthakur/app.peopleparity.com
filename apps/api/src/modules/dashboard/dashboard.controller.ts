import { Controller, Get, UseGuards, Request, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly dashboardService: DashboardService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req) {
    if (!this.dashboardService) {
      console.error('DashboardService is not injected properly');
      throw new Error('Service initialization error');
    }
    return this.dashboardService.getStats(req.user.userId);
  }
}