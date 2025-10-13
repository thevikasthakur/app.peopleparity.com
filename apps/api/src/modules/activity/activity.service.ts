import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { SessionsService } from '../sessions/sessions.service';
import { BotDetectionService } from './bot-detection.service';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityPeriod)
    private activityPeriodsRepository: Repository<ActivityPeriod>,
    @Inject(SessionsService) private readonly sessionsService: SessionsService,
    @Inject(BotDetectionService) private readonly botDetectionService: BotDetectionService,
  ) {
    console.log('[ACTIVITY SERVICE] Constructor - botDetectionService:', this.botDetectionService ? 'AVAILABLE' : 'NOT AVAILABLE');
  }

  async create(createActivityDto: {
    id?: string;
    sessionId: string;
    userId: string;
    screenshotId?: string; // Add screenshotId field
    periodStart: Date;
    periodEnd: Date;
    mode: 'client_hours' | 'command_hours';
    activityScore: number;
    isValid: boolean;
    classification?: string;
    metrics?: any; // This will store the detailed metrics breakdown
  }) {
    console.log('Creating activity period with ID:', createActivityDto.id, 'for session:', createActivityDto.sessionId);
    
    // Check for overlapping periods from different sessions in the same 10-minute window
    const windowStart = new Date(createActivityDto.periodStart);
    windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 10) * 10, 0, 0);
    const windowEnd = new Date(windowStart);
    windowEnd.setMinutes(windowEnd.getMinutes() + 10);
    
    console.log(`Checking for concurrent sessions in window ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);
    
    // First get existing activity periods in this time window from different sessions
    const existingPeriods = await this.activityPeriodsRepository
      .createQueryBuilder('period')
      .leftJoinAndSelect('period.session', 'session')
      .where('period.userId = :userId', { userId: createActivityDto.userId })
      .andWhere('period.sessionId != :sessionId', { sessionId: createActivityDto.sessionId })
      .andWhere('period.periodStart >= :windowStart', { windowStart })
      .andWhere('period.periodStart < :windowEnd', { windowEnd })
      .getMany();
    
    if (existingPeriods.length > 0) {
      // Get the current session to check device info
      const currentSession = await this.sessionsService.findById(createActivityDto.sessionId);
      const currentDevice = currentSession?.deviceInfo || 'unknown';
      
      // Check if any of the existing periods are from a DIFFERENT device
      const differentDeviceSessions = existingPeriods.filter(period => {
        const existingDevice = period.session?.deviceInfo || 'unknown';
        return existingDevice !== currentDevice;
      });
      
      if (differentDeviceSessions.length > 0) {
        // Concurrent session from DIFFERENT device detected - this is not allowed
        const existingSessionIds = [...new Set(differentDeviceSessions.map(p => p.sessionId))];
        console.error(`🚫 Concurrent session from DIFFERENT DEVICE detected! User ${createActivityDto.userId} already has activity from different device(s) in session(s): ${existingSessionIds.join(', ')}`);
        
        // Return error that will trigger session stop on the client
        throw new Error(`CONCURRENT_SESSION_DETECTED: Another device is already tracking in this time window. Sessions: ${existingSessionIds.join(', ')}`);
      } else {
        // Same device, multiple sessions - just log it, don't throw error
        console.log(`⚠️ Multiple sessions from SAME device detected for user ${createActivityDto.userId}, but allowing it`);
      }
    }
    
    // Analyze metrics for bot detection
    if (createActivityDto.metrics) {
      const metricsKeys = Object.keys(createActivityDto.metrics);
      console.log('[ACTIVITY SERVICE v2.0] Activity period includes detailed metrics:', metricsKeys.join(', '));
      console.log('[ACTIVITY SERVICE] Keyboard keystrokeCodes length:', createActivityDto.metrics.keyboard?.keystrokeCodes?.length || 0);

      // Run bot detection analysis with defensive check
      if (this.botDetectionService) {
        console.log('[ACTIVITY SERVICE] Bot detection service available, calling detectBotActivity...');
        try {
          const botDetectionResult = this.botDetectionService.detectBotActivity(createActivityDto.metrics);
          console.log('[ACTIVITY SERVICE] Bot detection result:', botDetectionResult);

          // Add bot detection results to metrics
          // Map 'reasons' to 'details' for admin app compatibility
          createActivityDto.metrics.botDetection = {
            ...botDetectionResult,
            details: botDetectionResult.reasons  // Admin app expects 'details' field
          };

          // Log if bot activity detected
          if (botDetectionResult.keyboardBotDetected || botDetectionResult.mouseBotDetected) {
            console.log('🤖 Bot activity detected in period:', createActivityDto.id);
            console.log('   Confidence:', botDetectionResult.confidence);
            console.log('   Reasons:', botDetectionResult.reasons);
          }
        } catch (error) {
          console.error('Error during bot detection:', error);
        }
      } else {
        console.warn('BotDetectionService not available - skipping bot detection analysis');
      }
    }
    
    try {
      // Apply 15% boost to activity score to make it easier for users to achieve higher scores
      // This boost is applied at the storage level, so it affects all downstream calculations
      const boostedScore = Math.min(100, createActivityDto.activityScore * 1.15);
      console.log(`[Activity Score Boost] Original: ${createActivityDto.activityScore}, Boosted (+15%): ${boostedScore}`);

      const period = this.activityPeriodsRepository.create({
        ...createActivityDto,
        activityScore: boostedScore  // Use boosted score
      });
      const savedPeriod = await this.activityPeriodsRepository.save(period);
      console.log('Activity period created successfully with boosted score:', savedPeriod.id);
      return savedPeriod;
    } catch (error: any) {
      console.error('Error creating activity period:', error.message);
      if (error.message?.includes('foreign key constraint')) {
        console.error(`Session ${createActivityDto.sessionId} does not exist in database`);
      }
      throw error;
    }
  }

  async findById(id: string) {
    return this.activityPeriodsRepository.findOne({ where: { id } });
  }

  async findByUser(userId: string, startDate?: Date, endDate?: Date) {
    const query = this.activityPeriodsRepository
      .createQueryBuilder('period')
      .where('period.userId = :userId', { userId });

    if (startDate) {
      query.andWhere('period.periodStart >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('period.periodEnd <= :endDate', { endDate });
    }

    return query.getMany();
  }
}