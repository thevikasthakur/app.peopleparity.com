import { 
  Controller, 
  Post,
  Get,
  Query,
  Param,
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
  @Get(':id')
  async getScreenshot(@Param('id') id: string) {
    return this.screenshotsService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('screenshot'))
  async uploadScreenshot(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { 
      id?: string; // Optional screenshot ID from desktop
      capturedAt: string; 
      sessionId: string; // Required
      mode?: 'client_hours' | 'command_hours'; 
      userId?: string;
      notes?: string;
    },
    @Request() req,
  ) {
    // Use userId from body if provided (for sync), otherwise use authenticated user
    const userId = body.userId || req.user.userId;
    
    // Check if screenshot already exists (to prevent duplicates)
    if (body.id) {
      const existing = await this.screenshotsService.findById(body.id);
      if (existing) {
        console.log(`Screenshot ${body.id} already exists, skipping upload`);
        return { success: true, url: existing.url, thumbnailUrl: existing.thumbnailUrl, screenshot: existing };
      }
    }
    
    const { fullUrl, thumbnailUrl } = await this.screenshotsService.uploadToS3(file, userId);
    
    try {
      const screenshot = await this.screenshotsService.create({
        id: body.id, // Use the ID from desktop if provided
        userId,
        sessionId: body.sessionId,
        url: fullUrl,
        thumbnailUrl,
        capturedAt: new Date(body.capturedAt),
        mode: body.mode || 'client_hours',
        notes: body.notes || '',
      });

      console.log(`Screenshot created successfully: ${screenshot.id} for session: ${body.sessionId}`);
      return { success: true, url: fullUrl, thumbnailUrl, screenshot };
    } catch (error) {
      console.error(`Failed to create screenshot in database:`, error);
      
      // If it's a foreign key constraint error, return a specific message
      if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
        throw new Error(`Session ${body.sessionId} does not exist. Please sync sessions first.`);
      }
      
      throw error;
    }
  }
}