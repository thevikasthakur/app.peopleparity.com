import { Controller, Get, UseGuards, Request, Inject, Query, HttpException, HttpStatus } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ProductiveHoursService } from './productive-hours.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    @Inject(AnalyticsService) private readonly analyticsService: AnalyticsService,
    @Inject(ProductiveHoursService) private readonly productiveHoursService: ProductiveHoursService,
    @Inject(UsersService) private readonly usersService: UsersService,
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
  async getDailyProductiveHours(
    @Request() req,
    @Query('date') dateStr?: string,
    @Query('userId') targetUserId?: string
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    let userId = req.user.userId;

    if (targetUserId && targetUserId !== req.user.userId) {
      const currentUser = await this.usersService.findById(req.user.userId);

      if (currentUser.role === 'super_admin') {
        userId = targetUserId;
      } else if (currentUser.role === 'org_admin' && currentUser.organizationId) {
        const targetUser = await this.usersService.findById(targetUserId);
        if (targetUser?.organizationId === currentUser.organizationId) {
          userId = targetUserId;
        } else {
          throw new HttpException('Unauthorized to view this user\'s data', HttpStatus.FORBIDDEN);
        }
      } else {
        throw new HttpException('Unauthorized to view other users\' data', HttpStatus.FORBIDDEN);
      }
    }

    return this.productiveHoursService.getDailyProductiveHours(userId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('productive-hours/weekly')
  async getWeeklyProductiveHours(
    @Request() req,
    @Query('date') dateStr?: string,
    @Query('userId') targetUserId?: string
  ) {
    const date = dateStr ? new Date(dateStr) : new Date();
    let userId = req.user.userId;

    if (targetUserId && targetUserId !== req.user.userId) {
      const currentUser = await this.usersService.findById(req.user.userId);

      if (currentUser.role === 'super_admin') {
        userId = targetUserId;
      } else if (currentUser.role === 'org_admin' && currentUser.organizationId) {
        const targetUser = await this.usersService.findById(targetUserId);
        if (targetUser?.organizationId === currentUser.organizationId) {
          userId = targetUserId;
        } else {
          throw new HttpException('Unauthorized to view this user\'s data', HttpStatus.FORBIDDEN);
        }
      } else {
        throw new HttpException('Unauthorized to view other users\' data', HttpStatus.FORBIDDEN);
      }
    }

    return this.productiveHoursService.getWeeklyProductiveHours(userId, date);
  }
}