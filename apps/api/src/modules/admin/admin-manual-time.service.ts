import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../entities/session.entity';
import { Screenshot } from '../../entities/screenshot.entity';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { User } from '../../entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { CreateManualTimeDto } from './admin-manual-time.controller';

@Injectable()
export class AdminManualTimeService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Screenshot)
    private screenshotRepository: Repository<Screenshot>,
    @InjectRepository(ActivityPeriod)
    private activityPeriodRepository: Repository<ActivityPeriod>,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  async createManualTimeEntry(dto: CreateManualTimeDto, adminUser: any) {
    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Parse and validate times
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Validate that session doesn't span across calendar dates (for data consistency)
    const startDateStr = startTime.toISOString().split('T')[0];
    const endDateStr = endTime.toISOString().split('T')[0];

    if (startDateStr !== endDateStr) {
      throw new BadRequestException('Session cannot span across UTC dates. Please create separate sessions for each UTC day.');
    }

    // Calculate duration and validate reasonable limits
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours > 24) {
      throw new BadRequestException('Session duration cannot exceed 24 hours');
    }

    if (durationHours < 0.1) { // 6 minutes minimum
      throw new BadRequestException('Session duration must be at least 6 minutes');
    }

    // Check for overlapping sessions
    const overlappingSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId: dto.userId })
      .andWhere('session.isActive = true')
      .andWhere(
        '(session.startTime <= :endTime AND (session.endTime IS NULL OR session.endTime >= :startTime))',
        { startTime, endTime }
      )
      .getMany();

    if (overlappingSessions.length > 0) {
      throw new BadRequestException('This time period overlaps with an existing active session');
    }

    // Create session
    const sessionId = uuidv4();
    const session = this.sessionRepository.create({
      id: sessionId,
      userId: dto.userId,
      task: null, // Task name will be stored in screenshot notes instead
      startTime,
      endTime,
      mode: 'command_hours',
      isActive: false, // Manual entries are completed sessions
    });

    await this.sessionRepository.save(session);

    // Generate screenshots and activity periods
    const { screenshotsCreated, activityPeriodsCreated } = await this.generateSessionData(
      sessionId,
      dto.userId,
      startTime,
      endTime,
      dto.taskName
    );

    return {
      success: true,
      sessionId,
      message: `Manual time entry created successfully`,
      summary: {
        userId: dto.userId,
        userEmail: user.email,
        taskName: dto.taskName,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${durationHours.toFixed(2)} hours`,
        screenshotsCreated,
        activityPeriodsCreated,
        createdBy: adminUser.email
      }
    };
  }

  async getBotDetectionReport(userId: string, date: string) {
    // Validate input
    if (!userId || !date) {
      throw new BadRequestException('userId and date are required');
    }

    // Parse date to get start and end of day
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    if (isNaN(startOfDay.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Fetch all activity periods for the user on this date that have bot detection
    const activityPeriods = await this.activityPeriodRepository
      .createQueryBuilder('ap')
      .leftJoinAndSelect('ap.screenshot', 'screenshot')
      .where('ap.userId = :userId', { userId })
      .andWhere('ap.periodStart >= :startOfDay', { startOfDay })
      .andWhere('ap.periodEnd <= :endOfDay', { endOfDay })
      .andWhere(
        `(
          ap.metrics->'botDetection'->>'keyboardBotDetected' = 'true' OR
          ap.metrics->'botDetection'->>'mouseBotDetected' = 'true'
        )`
      )
      .orderBy('ap.periodStart', 'ASC')
      .getMany();

    // Transform the data for the report
    const instances = activityPeriods.map(period => {
      const botDetection = period.metrics?.botDetection || {};

      return {
        screenshotId: period.screenshotId,
        capturedAt: period.screenshot?.capturedAt || period.periodStart,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        botDetection: {
          keyboardBotDetected: botDetection.keyboardBotDetected || false,
          mouseBotDetected: botDetection.mouseBotDetected || false,
          confidence: botDetection.confidence || 0,
          details: botDetection.details || [],
        },
      };
    });

    return {
      success: true,
      instances,
      totalCount: instances.length,
    };
  }

  private async generateSessionData(
    sessionId: string,
    userId: string,
    startTime: Date,
    endTime: Date,
    taskName: string
  ) {
    const screenshots: Screenshot[] = [];
    const activityPeriods: ActivityPeriod[] = [];

    // Calculate 10-minute intervals for screenshots
    const intervalMs = 10 * 60 * 1000; // 10 minutes
    let currentTime = new Date(startTime);
    let screenshotCount = 0;

    // Default metrics for manual entries
    const defaultMetrics = {
      mouse: {
        leftClicks: 12,
        rightClicks: 0,
        totalClicks: 12,
        doubleClicks: 1,
        totalScrolls: 45,
        clickIntervals: [500, 800, 1200, 900, 600, 1100, 750, 1000, 950, 1300],
        distancePixels: 15000,
        movementPattern: { smooth: true, avgSpeed: 1.2, maxSpeed: 8.5 },
        distancePerMinute: 15000
      },
      keyboard: {
        uniqueKeys: 12,
        typingRhythm: { consistent: true, avgIntervalMs: 65, stdDeviationMs: 200 },
        keysPerMinute: 180,
        totalKeystrokes: 180,
        keystrokeIntervals: [35, 40, 30, 45, 50, 25, 60, 35, 40, 55],
        navigationKeystrokes: 0,
        productiveKeystrokes: 175,
        productiveUniqueKeys: 8
      },
      timeMetrics: {
        idleSeconds: 0,
        activeSeconds: 60,
        activityPercentage: 100,
        periodDurationSeconds: 60
      },
      classification: {
        tags: ['productive_typing', 'active_mouse_usage', 'consistent_work'],
        category: 'active',
        confidence: 1
      },
      scoreCalculation: {
        rawScore: 85,
        finalScore: 85,
        components: {
          keyHits: 8.5,
          mouseClicks: 6.2,
          keyDiversity: 7.8,
          mouseScrolls: 8.0,
          mouseMovement: 8.2
        }
      }
    };

    while (currentTime < endTime) {
      const screenshotTime = new Date(currentTime);
      const screenshotEndTime = new Date(Math.min(
        currentTime.getTime() + intervalMs,
        endTime.getTime()
      ));

      // Create screenshot
      const screenshotId = uuidv4();
      const screenshot = this.screenshotRepository.create({
        id: screenshotId,
        userId,
        sessionId,
        capturedAt: screenshotTime,
        url: 'https://people-parity-assets.s3.ap-south-1.amazonaws.com/screenshot-full-placeholder.webp',
        thumbnailUrl: 'https://people-parity-assets.s3.ap-south-1.amazonaws.com/screeshot-thumb.png',
        mode: 'command_hours',
        notes: taskName
      });

      screenshots.push(screenshot);

      // Create activity periods for this screenshot (1 minute each)
      const screenshotDurationMs = screenshotEndTime.getTime() - screenshotTime.getTime();
      const minutesToCreate = Math.ceil(screenshotDurationMs / (60 * 1000));

      for (let i = 0; i < minutesToCreate && i < 10; i++) {
        const periodStart = new Date(screenshotTime.getTime() + (i * 60 * 1000));
        const periodEnd = new Date(Math.min(
          periodStart.getTime() + (60 * 1000),
          screenshotEndTime.getTime()
        ));

        const activityPeriod = this.activityPeriodRepository.create({
          id: uuidv4(),
          sessionId,
          userId,
          screenshotId,
          periodStart,
          periodEnd,
          mode: 'command_hours',
          activityScore: 85, // Good default score for manual entries
          isValid: true,
          classification: 'active',
          metrics: defaultMetrics
        });

        activityPeriods.push(activityPeriod);
      }

      currentTime = new Date(currentTime.getTime() + intervalMs);
      screenshotCount++;
    }

    // Save all screenshots and activity periods
    await this.screenshotRepository.save(screenshots);
    await this.activityPeriodRepository.save(activityPeriods);

    return {
      screenshotsCreated: screenshots.length,
      activityPeriodsCreated: activityPeriods.length
    };
  }
}