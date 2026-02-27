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


  async getActivityMetrics(userId: string, startDate: string, endDate: string) {
    if (!userId || !startDate || !endDate) {
      throw new BadRequestException('userId, startDate, and endDate are required');
    }

    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }

    // Single optimized query: extract only needed JSONB fields in SQL, aggregate per screenshot per day
    const rows: Array<{
      date_key: string;
      screenshot_id: string;
      captured_at: string;
      total_keystrokes: number;
      total_clicks: number;
      total_scrolls: number;
      avg_score: number;
      bot_keyboard_count: number;
      bot_mouse_count: number;
      max_bot_confidence: number;
      bot_reasons: string[];
    }> = await this.activityPeriodRepository.query(
      `SELECT
        (ap."periodStart" AT TIME ZONE 'UTC')::date::text AS date_key,
        ap."screenshotId" AS screenshot_id,
        MIN(s."capturedAt")::text AS captured_at,
        SUM(COALESCE((ap.metrics->'keyboard'->>'totalKeystrokes')::int, 0)) AS total_keystrokes,
        SUM(COALESCE((ap.metrics->'mouse'->>'totalClicks')::int, 0)) AS total_clicks,
        SUM(COALESCE((ap.metrics->'mouse'->>'totalScrolls')::int, 0)) AS total_scrolls,
        AVG(CASE WHEN ap."activityScore" > 0 THEN ap."activityScore" ELSE NULL END)::float AS avg_score,
        SUM(CASE WHEN (ap.metrics->'botDetection'->>'keyboardBotDetected')::boolean = true THEN 1 ELSE 0 END)::int AS bot_keyboard_count,
        SUM(CASE WHEN (ap.metrics->'botDetection'->>'mouseBotDetected')::boolean = true THEN 1 ELSE 0 END)::int AS bot_mouse_count,
        MAX(COALESCE((ap.metrics->'botDetection'->>'confidence')::float, 0))::float AS max_bot_confidence,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT
          CASE WHEN (ap.metrics->'botDetection'->>'keyboardBotDetected')::boolean = true
                 OR (ap.metrics->'botDetection'->>'mouseBotDetected')::boolean = true
          THEN COALESCE(
            ap.metrics->'botDetection'->>'reasons',
            ap.metrics->'botDetection'->>'details',
            ''
          ) ELSE NULL END
        ), NULL) AS bot_reasons
      FROM activity_periods ap
      LEFT JOIN screenshots s ON s.id = ap."screenshotId"
      WHERE ap."userId" = $1
        AND ap."periodStart" >= $2
        AND ap."periodEnd" <= $3
      GROUP BY date_key, ap."screenshotId"
      ORDER BY date_key, MIN(s."capturedAt")`,
      [userId, start.toISOString(), end.toISOString()]
    );

    // Also fetch bot warning details (only rows with bot detections — small subset)
    const botRows: Array<{
      date_key: string;
      screenshot_id: string;
      period_start: string;
      period_end: string;
      keyboard_bot: boolean;
      mouse_bot: boolean;
      confidence: number;
      reasons: string;
    }> = await this.activityPeriodRepository.query(
      `SELECT
        (ap."periodStart" AT TIME ZONE 'UTC')::date::text AS date_key,
        ap."screenshotId" AS screenshot_id,
        ap."periodStart"::text AS period_start,
        ap."periodEnd"::text AS period_end,
        COALESCE((ap.metrics->'botDetection'->>'keyboardBotDetected')::boolean, false) AS keyboard_bot,
        COALESCE((ap.metrics->'botDetection'->>'mouseBotDetected')::boolean, false) AS mouse_bot,
        COALESCE((ap.metrics->'botDetection'->>'confidence')::float, 0) AS confidence,
        COALESCE(ap.metrics->'botDetection'->>'reasons', ap.metrics->'botDetection'->>'details', '') AS reasons
      FROM activity_periods ap
      WHERE ap."userId" = $1
        AND ap."periodStart" >= $2
        AND ap."periodEnd" <= $3
        AND (
          (ap.metrics->'botDetection'->>'keyboardBotDetected')::boolean = true
          OR (ap.metrics->'botDetection'->>'mouseBotDetected')::boolean = true
        )
      ORDER BY ap."periodStart" ASC`,
      [userId, start.toISOString(), end.toISOString()]
    );

    // Build result from aggregated rows
    const result: Record<string, any> = {};

    for (const row of rows) {
      const dateKey = row.date_key;
      if (!result[dateKey]) {
        result[dateKey] = {
          totalKeystrokes: 0,
          totalClicks: 0,
          totalScrolls: 0,
          botWarnings: [],
          screenshots: [],
        };
      }
      const day = result[dateKey];

      day.totalKeystrokes += Number(row.total_keystrokes) || 0;
      day.totalClicks += Number(row.total_clicks) || 0;
      day.totalScrolls += Number(row.total_scrolls) || 0;

      const botKeyboardCount = Number(row.bot_keyboard_count) || 0;
      const botMouseCount = Number(row.bot_mouse_count) || 0;
      const botDetected = (botKeyboardCount > 0 || botMouseCount > 0);
      const types: string[] = [];
      if (botKeyboardCount > 0) types.push('Keyboard');
      if (botMouseCount > 0) types.push('Mouse');

      // Parse bot reasons — the ARRAY_AGG returns stringified arrays or raw strings
      let botReasons: string[] = [];
      if (row.bot_reasons && row.bot_reasons.length > 0) {
        for (const r of row.bot_reasons) {
          if (!r) continue;
          try {
            const parsed = JSON.parse(r);
            if (Array.isArray(parsed)) botReasons.push(...parsed);
            else if (typeof parsed === 'string' && parsed) botReasons.push(parsed);
          } catch {
            if (r) botReasons.push(r);
          }
        }
        botReasons = [...new Set(botReasons)];
      }

      const avgScore = Number(row.avg_score) || 0;
      day.screenshots.push({
        screenshotId: row.screenshot_id,
        capturedAt: row.captured_at,
        activityScore: avgScore > 0
          ? Math.round((avgScore / 10) * 10) / 10
          : 0,
        keystrokes: Number(row.total_keystrokes) || 0,
        clicks: Number(row.total_clicks) || 0,
        scrolls: Number(row.total_scrolls) || 0,
        botDetected,
        botType: types.join(' + '),
        botConfidence: Number(row.max_bot_confidence) || 0,
        botReasons,
      });
    }

    // Attach bot warnings from the second query
    for (const bw of botRows) {
      const dateKey = bw.date_key;
      if (!result[dateKey]) continue;

      let reasons: string[] = [];
      if (bw.reasons) {
        try {
          const parsed = JSON.parse(bw.reasons);
          if (Array.isArray(parsed)) reasons = parsed;
          else if (typeof parsed === 'string' && parsed) reasons = [parsed];
        } catch {
          if (bw.reasons) reasons = [bw.reasons];
        }
      }

      result[dateKey].botWarnings.push({
        screenshotId: bw.screenshot_id,
        periodStart: bw.period_start,
        periodEnd: bw.period_end,
        keyboardBot: !!bw.keyboard_bot,
        mouseBot: !!bw.mouse_bot,
        confidence: Number(bw.confidence) || 0,
        reasons,
      });
    }

    return { success: true, days: result };
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