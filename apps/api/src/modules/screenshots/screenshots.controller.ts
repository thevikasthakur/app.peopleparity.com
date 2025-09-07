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
  Body,
  HttpException,
  HttpStatus,
  Inject
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScreenshotsService } from './screenshots.service';
import { SessionsService } from '../sessions/sessions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screenshot } from '../../entities/screenshot.entity';

@Controller('screenshots')
export class ScreenshotsController {
  constructor(
    private screenshotsService: ScreenshotsService,
    @Inject(SessionsService) private sessionsService: SessionsService,
    @InjectRepository(Screenshot) private screenshotsRepository: Repository<Screenshot>
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getScreenshots(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeDeviceInfo') includeDeviceInfo?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const includeDevice = includeDeviceInfo === 'true';
    
    return this.screenshotsService.findByUser(req.user.userId, start, end, includeDevice);
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
    
    // Get current session details to check device info
    const currentSession = await this.sessionsService.findById(body.sessionId);
    if (!currentSession) {
      throw new HttpException(`Session ${body.sessionId} not found`, HttpStatus.NOT_FOUND);
    }
    
    const currentDevice = currentSession.deviceInfo || 'unknown';
    const capturedAt = new Date(body.capturedAt);
    
    // Calculate 10-minute window boundaries
    const windowStart = new Date(capturedAt);
    windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 10) * 10);
    windowStart.setSeconds(0);
    windowStart.setMilliseconds(0);
    
    const windowEnd = new Date(windowStart);
    windowEnd.setMinutes(windowEnd.getMinutes() + 10);
    
    // Check for other screenshots in the same 10-minute window from the same user
    const existingScreenshots = await this.screenshotsRepository
      .createQueryBuilder('screenshot')
      .leftJoinAndSelect('screenshot.session', 'session')
      .where('screenshot.userId = :userId', { userId })
      .andWhere('screenshot.capturedAt >= :windowStart', { windowStart })
      .andWhere('screenshot.capturedAt < :windowEnd', { windowEnd })
      .andWhere('screenshot.isDeleted = :isDeleted', { isDeleted: false })
      .getMany();
    
    // Check if any existing screenshots are from different devices
    const differentDeviceScreenshots = existingScreenshots.filter(screenshot => {
      const existingDevice = screenshot.session?.deviceInfo || 'unknown';
      return existingDevice !== currentDevice && screenshot.sessionId !== body.sessionId;
    });
    
    if (differentDeviceScreenshots.length > 0) {
      // Concurrent session from different device detected!
      const conflictingDevice = differentDeviceScreenshots[0].session?.deviceInfo || 'unknown device';
      console.error(`🚫 CONCURRENT SESSION DETECTED: User ${userId} is tracking from multiple devices!`);
      console.error(`  Current device: ${currentDevice}`);
      console.error(`  Conflicting device: ${conflictingDevice}`);
      console.error(`  Window: ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);
      
      // Return error response that the desktop app can handle
      throw new HttpException({
        error: 'CONCURRENT_SESSION_DETECTED',
        message: `Another device (${conflictingDevice}) is already tracking time for your account in this time window.`,
        details: {
          currentDevice,
          conflictingDevice,
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
          sessionId: body.sessionId
        }
      }, HttpStatus.CONFLICT);
    }
    
    // Check for same device but different session (shouldn't happen normally)
    const sameDeviceDifferentSession = existingScreenshots.filter(screenshot => {
      const existingDevice = screenshot.session?.deviceInfo || 'unknown';
      return existingDevice === currentDevice && screenshot.sessionId !== body.sessionId;
    });
    
    if (sameDeviceDifferentSession.length > 0) {
      console.warn(`⚠️ Multiple sessions from same device detected for user ${userId}, but allowing screenshot`);
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