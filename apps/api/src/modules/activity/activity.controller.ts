import { Controller, Post, Get, Body, Param, UseGuards, Request, Inject } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activity-periods')
export class ActivityController {
  constructor(
    @Inject(ActivityService) private readonly activityService: ActivityService
  ) {}

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
      
      // Map metricsBreakdown to metrics field for the entity
      const { metricsBreakdown, ...restDto } = cleanDto;
      
      const period = await this.activityService.create({
        ...restDto,
        periodStart: new Date(restDto.periodStart),
        periodEnd: new Date(restDto.periodEnd),
        userId: req.user.userId,
        screenshotId: restDto.screenshotId, // Make sure screenshotId is passed through
        metrics: metricsBreakdown || restDto.metrics, // Use metricsBreakdown if provided, fallback to metrics
      });
      return { success: true, period };
    } catch (error: any) {
      console.error('Error in activity controller:', error);
      
      // Handle concurrent session detection
      if (error.message?.includes('CONCURRENT_SESSION_DETECTED')) {
        return {
          success: false,
          error: 'CONCURRENT_SESSION_DETECTED',
          message: 'Another session is already active in this time window. Stopping current session.',
          details: error.message
        };
      }
      
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
        
        // Map metricsBreakdown to metrics field for the entity
        const { metricsBreakdown, ...restPeriod } = cleanPeriod;
        
        return this.activityService.create({
          ...restPeriod,
          periodStart: new Date(restPeriod.periodStart),
          periodEnd: new Date(restPeriod.periodEnd),
          userId: req.user.userId,
          screenshotId: restPeriod.screenshotId, // Make sure screenshotId is passed through
          metrics: metricsBreakdown || restPeriod.metrics, // Use metricsBreakdown if provided, fallback to metrics
        });
      })
    );
    return { success: true, periods: results };
  }
}

@Controller('activities')
export class ActivitiesController {
  constructor(
    @Inject(ActivityService) private readonly activityService: ActivityService
  ) {}

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