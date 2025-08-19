import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activity-periods')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getActivityPeriod(@Param('id') id: string) {
    return this.activityService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createActivityPeriod(@Body() createActivityDto: any, @Request() req) {
    try {
      // Remove only auto-generated timestamp fields, preserve the ID if provided
      const { createdAt, updatedAt, ...cleanDto } = createActivityDto;
      
      console.log('Received activity period with ID:', cleanDto.id, 'and sessionId:', cleanDto.sessionId);
      
      const period = await this.activityService.create({
        ...cleanDto,
        periodStart: new Date(cleanDto.periodStart),
        periodEnd: new Date(cleanDto.periodEnd),
        userId: req.user.userId,
      });
      return { success: true, period };
    } catch (error: any) {
      console.error('Error in activity controller:', error);
      
      // Return a more informative error for foreign key violations
      if (error.message?.includes('foreign key constraint')) {
        return {
          success: false,
          error: 'Session does not exist',
          message: `Session ${createActivityDto.sessionId} must be created before activity periods`,
          sessionId: createActivityDto.sessionId
        };
      }
      
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  async createMultipleActivityPeriods(@Body() periods: any[], @Request() req) {
    const results = await Promise.all(
      periods.map(period => {
        // Remove only auto-generated timestamp fields, preserve the ID if provided
        const { createdAt, updatedAt, ...cleanPeriod } = period;
        
        return this.activityService.create({
          ...cleanPeriod,
          periodStart: new Date(cleanPeriod.periodStart),
          periodEnd: new Date(cleanPeriod.periodEnd),
          userId: req.user.userId,
        });
      })
    );
    return { success: true, periods: results };
  }
}

@Controller('activities')
export class ActivitiesController {
  constructor(private activityService: ActivityService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createActivityMetrics(@Body() createActivityDto: any, @Request() req) {
    try {
      console.log('Received activity metrics:', createActivityDto.type, 'for period:', createActivityDto.activityPeriodId);
      
      // For now, just return success - we can store these metrics later if needed
      return { 
        success: true, 
        message: `${createActivityDto.type} metrics recorded` 
      };
    } catch (error: any) {
      console.error('Error in activities controller:', error);
      throw error;
    }
  }
}