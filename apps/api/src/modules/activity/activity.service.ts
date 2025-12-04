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

  /**
   * Calculate activity score from raw metrics
   * Score calculation moved from desktop app to API server
   */
  private calculateActivityScore(metrics: any, periodDurationSeconds: number): number {
    if (!metrics) {
      console.log('[Score Calculation] No metrics provided, returning 0');
      return 0;
    }

    const durationMinutes = periodDurationSeconds / 60;
    if (durationMinutes <= 0) {
      console.log('[Score Calculation] Invalid duration, returning 0');
      return 0;
    }

    // Extract raw metrics from keyboard and mouse data
    const keyboard = metrics.keyboard || {};
    const mouse = metrics.mouse || {};

    const keystrokes = keyboard.totalKeystrokes || 0;
    const uniqueKeys = keyboard.uniqueKeys || 0;
    const mouseClicks = mouse.totalClicks || 0;
    const mouseScrolls = mouse.totalScrolls || 0;
    const mouseDistance = mouse.distancePixels || 0;

    // Normalize per minute for consistent scoring
    const keyHitsPerMin = keystrokes / durationMinutes;
    const uniqueKeysPerMin = uniqueKeys / durationMinutes;
    const clicksPerMin = mouseClicks / durationMinutes;
    const scrollsPerMin = mouseScrolls / durationMinutes;
    const mouseDistancePerMin = mouseDistance / durationMinutes;

    // Score components (0-10 scale each) - PeopleParity-style scoring
    const components = {
      // Key hits: Progressive scoring
      // 0-25.5: linear (0-5), 26-51: slower growth (5-7), 52-85: diminishing (7-8.5), 85+: caps at 9.0
      keyHits: keyHitsPerMin <= 25.5
        ? (keyHitsPerMin / 25.5) * 5
        : keyHitsPerMin <= 51
        ? 5 + ((keyHitsPerMin - 25.5) / 25.5) * 2
        : keyHitsPerMin <= 85
        ? 7 + ((keyHitsPerMin - 51) / 34) * 1.5
        : Math.min(9, 8.5 + ((keyHitsPerMin - 85) / 85) * 0.5),

      // Key diversity: Progressive scoring for unique keys
      // 0-8.5: linear (0-5), 9-17: slower (5-7), 18-25.5: diminishing (7-8.5), 25.5+: caps at 9.0
      keyDiversity: uniqueKeysPerMin <= 8.5
        ? (uniqueKeysPerMin / 8.5) * 5
        : uniqueKeysPerMin <= 17
        ? 5 + ((uniqueKeysPerMin - 8.5) / 8.5) * 2
        : uniqueKeysPerMin <= 25.5
        ? 7 + ((uniqueKeysPerMin - 17) / 8.5) * 1.5
        : Math.min(9, 8.5 + ((uniqueKeysPerMin - 25.5) / 17) * 0.5),

      // Mouse clicks: Progressive scoring
      // 0-12.75: linear (0-5), 13-25.5: slower (5-6.5), 26-42.5: diminishing (6.5-7.5)
      mouseClicks: clicksPerMin <= 12.75
        ? (clicksPerMin / 12.75) * 5
        : clicksPerMin <= 25.5
        ? 5 + ((clicksPerMin - 12.75) / 12.75) * 1.5
        : Math.min(7.5, 6.5 + ((clicksPerMin - 25.5) / 17) * 1),

      // Mouse scrolls: Progressive scoring
      // 0-6.8: linear (0-5), 7-12.75: slower (5-6.5), 13.6+: caps at 7.5
      mouseScrolls: scrollsPerMin <= 6.8
        ? (scrollsPerMin / 6.8) * 5
        : scrollsPerMin <= 12.75
        ? 5 + ((scrollsPerMin - 6.8) / 5.95) * 1.5
        : Math.min(7.5, 6.5 + ((scrollsPerMin - 12.75) / 8.5) * 1),

      // Mouse movement: Progressive scoring based on distance
      // 0-1700: linear (0-5), 1701-3400: slower (5-6.5), 3401+: caps at 7.5
      mouseMovement: mouseDistancePerMin <= 1700
        ? (mouseDistancePerMin / 1700) * 5
        : mouseDistancePerMin <= 3400
        ? 5 + ((mouseDistancePerMin - 1700) / 1700) * 1.5
        : Math.min(7.5, 6.5 + ((mouseDistancePerMin - 3400) / 1700) * 1),
    };

    // Calculate weighted average (PeopleParity-style scoring)
    // Key diversity has highest weight (45%)
    const weightedScore =
      components.keyHits * 0.25 +           // 25% weight
      components.keyDiversity * 0.45 +       // 45% weight (MOST IMPORTANT)
      components.mouseClicks * 0.10 +        // 10% weight
      components.mouseScrolls * 0.10 +       // 10% weight
      components.mouseMovement * 0.10;       // 10% weight

    // Calculate penalties for suspicious behavior (same as desktop metricsCollector.ts)
    const penalties = {
      botPenalty: 0,
      idlePenalty: 0,
      suspiciousActivityPenalty: 0
    };

    // Bot penalty - check if botDetection results exist in metrics
    const botDetection = metrics.botDetection || {};
    if (botDetection.keyboardBotDetected) {
      penalties.botPenalty += 1.5;
    }
    if (botDetection.mouseBotDetected && botDetection.confidence > 0.7) {
      penalties.botPenalty += 1.0;
    }

    // Idle penalty based on activity percentage
    const timeMetrics = metrics.timeMetrics || {};
    const activityPercentage = timeMetrics.activityPercentage || 0;
    if (activityPercentage < 30) {
      penalties.idlePenalty = 2;
    } else if (activityPercentage < 50) {
      penalties.idlePenalty = 1;
    }

    // Suspicious activity penalty
    if (botDetection.suspiciousIntervals > 10) {
      penalties.suspiciousActivityPenalty = 1;
    }

    const totalPenalties = penalties.botPenalty + penalties.idlePenalty + penalties.suspiciousActivityPenalty;

    // Scale to 0-100 and apply penalties for base score
    const baseScore = Math.max(0, Math.min(100, (weightedScore * 10) - totalPenalties));

    // Activity bonus (0-30 points) - Added ON TOP of base score
    let activityBonus = 0;
    const totalMouseActivity = clicksPerMin + scrollsPerMin + (mouseDistancePerMin / 1000);
    const totalKeyboardActivity = keyHitsPerMin + (uniqueKeysPerMin * 2);

    // Check for human-like typing patterns
    const hasHumanLikeTyping =
      keyHitsPerMin > 10 && keyHitsPerMin < 200 && // Reasonable typing speed
      uniqueKeysPerMin > 3; // Good key diversity

    // Priority 1: Keyboard bonus when mouse activity is low
    if (totalMouseActivity < 5 && hasHumanLikeTyping) {
      if (totalKeyboardActivity > 150) {
        activityBonus = 25;
      } else if (totalKeyboardActivity > 100) {
        activityBonus = 20;
      } else if (totalKeyboardActivity > 60) {
        activityBonus = 15;
      } else if (totalKeyboardActivity > 30) {
        activityBonus = 10;
      }
    }
    // Priority 2: Mouse bonus when keyboard activity is low
    else if (totalKeyboardActivity < 30 && (clicksPerMin > 0 || mouseDistancePerMin > 500)) {
      if (totalMouseActivity > 20) {
        activityBonus = 30;
      } else if (totalMouseActivity > 15) {
        activityBonus = 25;
      } else if (totalMouseActivity > 10) {
        activityBonus = 20;
      } else if (totalMouseActivity > 5) {
        activityBonus = 15;
      } else if (totalMouseActivity > 2) {
        activityBonus = 10;
      }
    }
    // Priority 3: Balanced activity gets a small bonus
    else if (totalMouseActivity > 5 && totalKeyboardActivity > 30 && hasHumanLikeTyping) {
      activityBonus = 10;
    }

    // Add bonus on top of base score, apply 15% boost, and cap at 100
    const rawScore = baseScore + activityBonus;
    const boostedScore = Math.min(100, rawScore * 1.15); // Apply 15% boost

    console.log('[Score Calculation]', {
      perMinute: {
        keyHits: keyHitsPerMin.toFixed(1),
        uniqueKeys: uniqueKeysPerMin.toFixed(1),
        clicks: clicksPerMin.toFixed(1),
        scrolls: scrollsPerMin.toFixed(1),
        distance: mouseDistancePerMin.toFixed(0) + 'px'
      },
      penalties: totalPenalties.toFixed(1),
      baseScore: baseScore.toFixed(0),
      activityBonus,
      rawScore: rawScore.toFixed(0),
      boostedScore: boostedScore.toFixed(0)
    });

    return Math.round(boostedScore);
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
        console.warn('                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ');
      }
    }
    
    try {
      // Calculate activity score from raw metrics (score calculation moved from desktop to API)
      // Calculate period duration in seconds
      const periodStart = new Date(createActivityDto.periodStart);
      const periodEnd = new Date(createActivityDto.periodEnd);
      const periodDurationSeconds = (periodEnd.getTime() - periodStart.getTime()) / 1000;

      // Calculate score from metrics if available, otherwise use provided score (for backwards compatibility)
      let finalScore: number;
      if (createActivityDto.metrics && (createActivityDto.activityScore === 0 || createActivityDto.activityScore === undefined)) {
        // New behavior: Calculate score from raw metrics
        finalScore = this.calculateActivityScore(createActivityDto.metrics, periodDurationSeconds);
        console.log(`[Activity Score] Calculated from metrics: ${finalScore}`);
      } else {
        // Backwards compatibility: Apply 15% boost to provided score
        finalScore = Math.min(100, createActivityDto.activityScore * 1.15);
        console.log(`[Activity Score] Using provided score with boost: ${createActivityDto.activityScore} -> ${finalScore}`);
      }

      const period = this.activityPeriodsRepository.create({
        ...createActivityDto,
        activityScore: finalScore
      });
      const savedPeriod = await this.activityPeriodsRepository.save(period);
      console.log('Activity period created successfully with score:', savedPeriod.id, 'score:', finalScore);

      // Return the full entity with metrics (savedPeriod may not have all columns due to RETURNING clause)
      // Merge savedPeriod with the original period to ensure metrics are included
      const fullPeriod = {
        ...period,
        ...savedPeriod,
        metrics: createActivityDto.metrics // Ensure metrics with botDetection is included
      };
      console.log('[ACTIVITY SERVICE] Returning period with metrics keys:', fullPeriod.metrics ? Object.keys(fullPeriod.metrics) : 'NO METRICS');
      return fullPeriod;
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