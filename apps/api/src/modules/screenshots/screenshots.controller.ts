import { 
  Controller, 
  Post,
  Get,
  Query,
  UseGuards, 
  UseInterceptors,
  UploadedFile,
  Request,
  Body 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScreenshotsService } from './screenshots.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('screenshots')
export class ScreenshotsController {
  constructor(private screenshotsService: ScreenshotsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getScreenshots(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.screenshotsService.findByUser(req.user.userId, start, end);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('screenshot'))
  async uploadScreenshot(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { 
      capturedAt: string; 
      sessionId: string; // Required
      mode?: 'client_hours' | 'command_hours'; 
      userId?: string;
      aggregatedScore?: string;
      activityPeriodIds?: string;
      notes?: string;
    },
    @Request() req,
  ) {
    // Use userId from body if provided (for sync), otherwise use authenticated user
    const userId = body.userId || req.user.userId;
    
    const { fullUrl, thumbnailUrl } = await this.screenshotsService.uploadToS3(file, userId);
    
    // Parse activity period IDs if provided
    const activityPeriodIds = body.activityPeriodIds ? JSON.parse(body.activityPeriodIds) : null;
    
    const screenshot = await this.screenshotsService.create({
      userId,
      sessionId: body.sessionId,
      url: fullUrl,
      thumbnailUrl,
      capturedAt: new Date(body.capturedAt),
      mode: body.mode || 'client_hours',
      aggregatedScore: body.aggregatedScore ? parseFloat(body.aggregatedScore) : 0,
      activityPeriodIds,
      notes: body.notes || '',
    });

    return { success: true, url: fullUrl, thumbnailUrl, screenshot };
  }
}