import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';
import fs from 'fs';
import { DatabaseMigrator } from './migrations';
import { TrackingMetadataService } from './trackingMetadata';
import * as packageJson from '../../../package.json';

// Local database only stores current user's tracking data
// All user auth and organization data comes from API

interface LocalUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: 'super_admin' | 'org_admin' | 'developer';
  lastSync: number;
}

interface Session {
  id: string;
  userId: string;
  projectId: string | null;
  projectName: string | null;
  mode: 'client_hours' | 'command_hours';
  startTime: number;
  endTime: number | null;
  isActive: number;
  task: string | null;
  appVersion: string | null;
  deviceInfo?: string | null;
  realIpAddress?: string | null;
  location?: string | null;
  isVpnDetected?: number;
  isSynced: number;
  createdAt: number;
}

interface ActivityPeriod {
  id: string;
  sessionId: string;
  userId: string;
  screenshotId?: string | null;
  periodStart: number;
  periodEnd: number;
  mode: 'client_hours' | 'command_hours';
  notes?: string | null;
  activityScore: number;
  isValid: number;
  classification?: string | null;
  isSynced: number;
  createdAt: number;
}

interface Screenshot {
  id: string;
  userId: string;
  sessionId: string;
  localPath: string;
  thumbnailPath?: string;
  url?: string;  // S3 URL after upload
  thumbnailUrl?: string;
  capturedAt: number;
  mode: 'client_hours' | 'command_hours';
  notes?: string;
  isDeleted: number;
  isSynced: number;
  createdAt: number;
}

export class LocalDatabase {
  private db: Database.Database;
  private dbPath: string;
  
  constructor() {
    // Store database in user's app data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'local_tracking.db');
    
    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    console.log(`Initializing local tracking database at: ${this.dbPath}`);
    
    // Open database connection
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Better performance and concurrency
    this.db.pragma('foreign_keys = ON'); // Enable foreign key constraints
    
    // Run migrations
    const migrator = new DatabaseMigrator(this.db);
    migrator.runMigrations();
    
    console.log('Local tracking database initialized');
  }
  
  // Current user operations (cached from API)
  setCurrentUser(userData: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    organizationName: string;
    role: 'super_admin' | 'org_admin' | 'developer';
  }) {
    // Clear existing user
    this.db.prepare('DELETE FROM current_user').run();
    
    // Insert new user
    const stmt = this.db.prepare(`
      INSERT INTO current_user (id, email, name, organizationId, organizationName, role, lastSync)
      VALUES (@id, @email, @name, @organizationId, @organizationName, @role, @lastSync)
    `);
    
    stmt.run({
      ...userData,
      lastSync: Date.now()
    });
  }
  
  getCurrentUser(): LocalUser | null {
    const stmt = this.db.prepare('SELECT * FROM current_user LIMIT 1');
    return stmt.get() as LocalUser | null;
  }
  
  clearCurrentUser() {
    this.db.prepare('DELETE FROM current_user').run();
  }
  
  // Project operations (cached from API)
  cacheProjects(projects: any[]) {
    // Clear existing cache
    this.db.prepare('DELETE FROM cached_projects').run();
    
    // Insert new projects
    const stmt = this.db.prepare(`
      INSERT INTO cached_projects (id, name, organizationId, color, isActive, lastSync)
      VALUES (@id, @name, @organizationId, @color, @isActive, @lastSync)
    `);
    
    const insert = this.db.transaction((projects: any[]) => {
      for (const project of projects) {
        stmt.run({
          ...project,
          lastSync: Date.now()
        });
      }
    });
    
    insert(projects);
  }
  
  getCachedProjects(): any[] {
    const stmt = this.db.prepare('SELECT * FROM cached_projects WHERE isActive = 1 ORDER BY name');
    return stmt.all();
  }
  
  getProjects(): any[] {
    return this.getCachedProjects();
  }
  
  // Session operations
  async createSession(data: {
    userId: string;
    mode: 'client_hours' | 'command_hours';
    projectId?: string;
    projectName?: string;
    task?: string;
  }): Promise<Session> {
    // End any active sessions first
    this.endActiveSessions(data.userId);
    
    // Get tracking metadata
    const metadataService = TrackingMetadataService.getInstance();
    const metadata = await metadataService.getTrackingMetadata();
    
    const session: Session = {
      id: crypto.randomUUID(),
      userId: data.userId,
      projectId: data.projectId || null,
      projectName: data.projectName || null,
      mode: data.mode,
      startTime: Date.now(),
      endTime: null,
      isActive: 1,
      task: data.task || null,
      appVersion: packageJson.version || '1.0.0',
      deviceInfo: metadata.deviceInfo,
      realIpAddress: metadata.realIpAddress,
      location: metadata.location ? JSON.stringify(metadata.location) : null,
      isVpnDetected: metadata.isVpnDetected ? 1 : 0,
      isSynced: 0,
      createdAt: Date.now()
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, userId, projectId, projectName, mode, startTime, endTime, isActive, task, appVersion, deviceInfo, realIpAddress, location, isVpnDetected, isSynced, createdAt)
      VALUES (@id, @userId, @projectId, @projectName, @mode, @startTime, @endTime, @isActive, @task, @appVersion, @deviceInfo, @realIpAddress, @location, @isVpnDetected, @isSynced, @createdAt)
    `);
    
    stmt.run(session);
    
    // Add to sync queue
    this.addToSyncQueue('session', session.id, 'create', session);
    
    return session;
  }
  
  endActiveSessions(userId: string) {
    const endTime = Date.now();
    
    // First get the active sessions before updating them
    const activeSessions = this.db.prepare(
      'SELECT id FROM sessions WHERE userId = ? AND isActive = 1'
    ).all(userId);
    
    // Update all active sessions to inactive with endTime
    const stmt = this.db.prepare(`
      UPDATE sessions 
      SET isActive = 0, endTime = ?, isSynced = 0
      WHERE userId = ? AND isActive = 1
    `);
    const result = stmt.run(endTime, userId);
    
    if (result.changes > 0) {
      console.log(`Ended ${result.changes} active session(s) for user ${userId}`);
      
      // Add each ended session to sync queue
      activeSessions.forEach((session: any) => {
        this.addToSyncQueue('session', session.id, 'update', { 
          endTime: endTime,
          isActive: 0
        });
      });
    }
  }
  
  getActiveSession(userId?: string): Session | null {
    // If no userId provided, get for current user
    if (!userId) {
      const currentUser = this.getCurrentUser();
      if (!currentUser) return null;
      userId = currentUser.id;
    }
    
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      WHERE userId = ? AND isActive = 1 
      ORDER BY startTime DESC 
      LIMIT 1
    `);
    return stmt.get(userId) as Session | null;
  }
  
  getSession(sessionId: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      WHERE id = ?
    `);
    return stmt.get(sessionId) as Session | null;
  }
  
  // Activity period operations
  getCurrentActivityPeriod(sessionId: string): any {
    const stmt = this.db.prepare(`
      SELECT * FROM activity_periods 
      WHERE sessionId = ? 
      AND periodEnd > ?
      ORDER BY periodStart DESC 
      LIMIT 1
    `);
    
    return stmt.get(sessionId, Date.now());
  }
  
  getActivityPeriod(periodId: string): any {
    const stmt = this.db.prepare(`
      SELECT * FROM activity_periods 
      WHERE id = ?
    `);
    
    return stmt.get(periodId);
  }
  
  getActivityPeriodWithMetrics(periodId: string): any {
    const period = this.db.prepare(`
      SELECT * FROM activity_periods 
      WHERE id = ?
    `).get(periodId) as any;
    
    if (!period) return null;
    
    // Parse the metricsBreakdown JSON if it exists
    if (period.metricsBreakdown) {
      try {
        period.metricsBreakdown = JSON.parse(period.metricsBreakdown);
      } catch (e) {
        console.error('Failed to parse metricsBreakdown:', e);
        period.metricsBreakdown = null;
      }
    }
    
    return period;
  }
  
  getActivityPeriodsWithMetrics(periodIds: string[]): any[] {
    if (!periodIds || periodIds.length === 0) return [];
    
    const placeholders = periodIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      SELECT * FROM activity_periods 
      WHERE id IN (${placeholders})
      ORDER BY periodStart ASC
    `);
    
    const periods = stmt.all(...periodIds) as any[];
    
    // Parse metricsBreakdown for each period
    return periods.map((period: any) => {
      if (period.metricsBreakdown) {
        try {
          period.metricsBreakdown = JSON.parse(period.metricsBreakdown);
        } catch (e) {
          console.error('Failed to parse metricsBreakdown:', e);
          period.metricsBreakdown = null;
        }
      }
      return period;
    });
  }

  getRecentActivityPeriods(sessionId: string, limit: number = 10): any[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT * FROM activity_periods 
      WHERE sessionId = ? 
      GROUP BY periodStart, periodEnd
      ORDER BY periodStart DESC 
      LIMIT ?
    `);
    
    return stmt.all(sessionId, limit) || [];
  }
  
  getActivityPeriodsForScreenshot(screenshotId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activity_periods 
      WHERE screenshotId = ?
      ORDER BY periodStart ASC
    `);
    
    return stmt.all(screenshotId) || [];
  }
  
  updateActivityPeriodScreenshot(periodId: string, screenshotId: string) {
    const stmt = this.db.prepare(`
      UPDATE activity_periods 
      SET screenshotId = ?, isSynced = 0
      WHERE id = ?
    `);
    
    stmt.run(screenshotId, periodId);
  }
  
  getActivityPeriodsForTimeRange(sessionId: string, windowStart: Date, windowEnd: Date): any[] {
    // Get all activity periods that fall within or overlap with the time window
    // Normalize timestamps to avoid millisecond issues
    const normalizedStart = new Date(windowStart);
    normalizedStart.setMilliseconds(0);
    const normalizedEnd = new Date(windowEnd);
    normalizedEnd.setMilliseconds(0);
    
    const stmt = this.db.prepare(`
      SELECT * FROM activity_periods 
      WHERE sessionId = ? 
      AND (
        -- Period starts within the window
        (periodStart >= ? AND periodStart < ?)
        OR
        -- Period ends within the window  
        (periodEnd > ? AND periodEnd <= ?)
        OR
        -- Period spans the entire window
        (periodStart <= ? AND periodEnd >= ?)
      )
      ORDER BY periodStart ASC
    `);
    
    const windowStartMs = normalizedStart.getTime();
    const windowEndMs = normalizedEnd.getTime();
    
    const periods = stmt.all(
      sessionId, 
      windowStartMs, windowEndMs,  // for periodStart check
      windowStartMs, windowEndMs,  // for periodEnd check
      windowStartMs, windowEndMs   // for spanning check
    ) || [];
    
    // Remove duplicates based on periodStart and periodEnd
    const uniquePeriods = new Map<string, any>();
    for (const period of periods as any[]) {
      const key = `${Math.floor(period.periodStart/1000)}-${Math.floor(period.periodEnd/1000)}`;
      if (!uniquePeriods.has(key) || period.activityScore > (uniquePeriods.get(key).activityScore || 0)) {
        uniquePeriods.set(key, period);
      }
    }
    
    return Array.from(uniquePeriods.values());
  }
  
  getActivityMetrics(periodId: string): any {
    // Get the activity data for this period
    const commandActivity = this.db.prepare(`
      SELECT * FROM command_activities WHERE activityPeriodId = ?
    `).get(periodId) as any;
    
    const clientActivity = this.db.prepare(`
      SELECT * FROM client_activities WHERE activityPeriodId = ?
    `).get(periodId) as any;
    
    const activity = commandActivity || clientActivity;
    if (!activity) return null;
    
    return {
      activityScore: activity.activityScore || 0,
      keyboardActivity: activity.keyboardActivity || 0,
      mouseActivity: activity.mouseActivity || 0
    };
  }
  
  createActivityPeriod(data: {
    id?: string;
    sessionId: string;
    userId: string;
    screenshotId?: string | null;
    periodStart: Date;
    periodEnd: Date;
    mode: 'client_hours' | 'command_hours';
    activityScore: number;
    isValid: boolean;
    classification?: string;
    metricsBreakdown?: any; // Detailed metrics from MetricsCollector
  }): ActivityPeriod {
    // Normalize timestamps to start of second to avoid millisecond mismatches
    const normalizedStart = new Date(data.periodStart);
    normalizedStart.setMilliseconds(0);
    const normalizedEnd = new Date(data.periodEnd);
    normalizedEnd.setMilliseconds(0);
    
    // Check if a period already exists for this exact time range
    // Use a range check to handle slight timestamp variations
    const existingPeriod = this.db.prepare(`
      SELECT * FROM activity_periods 
      WHERE sessionId = ? 
      AND periodStart >= ? AND periodStart < ?
      AND periodEnd >= ? AND periodEnd < ?
      LIMIT 1
    `).get(
      data.sessionId, 
      normalizedStart.getTime() - 500, 
      normalizedStart.getTime() + 500,
      normalizedEnd.getTime() - 500,
      normalizedEnd.getTime() + 500
    ) as ActivityPeriod | undefined;
    
    if (existingPeriod) {
      console.log(`Activity period already exists for ${normalizedStart.toISOString()} to ${normalizedEnd.toISOString()}, ID: ${existingPeriod.id}, existing score: ${existingPeriod.activityScore}, new score: ${data.activityScore}`);
      // Always update the score if the new one is higher (for placeholder periods)
      if (data.activityScore > existingPeriod.activityScore) {
        const updateStmt = this.db.prepare(`
          UPDATE activity_periods 
          SET activityScore = ?, classification = ?, isSynced = 0
          WHERE id = ?
        `);
        updateStmt.run(data.activityScore, data.classification || existingPeriod.classification, existingPeriod.id);
        existingPeriod.activityScore = data.activityScore;
        console.log(`Updated period ${existingPeriod.id} score from ${existingPeriod.activityScore} to ${data.activityScore}`);
      }
      return existingPeriod;
    }
    
    const period = {
      id: data.id || crypto.randomUUID(),
      sessionId: data.sessionId,
      userId: data.userId,
      screenshotId: data.screenshotId || null,
      periodStart: normalizedStart.getTime(),
      periodEnd: normalizedEnd.getTime(),
      mode: data.mode,
      notes: null,
      activityScore: data.activityScore,
      isValid: data.isValid ? 1 : 0,
      classification: data.classification || null,
      metricsBreakdown: data.metricsBreakdown ? JSON.stringify(data.metricsBreakdown) : null,
      isSynced: 0,
      createdAt: Date.now()
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO activity_periods (
        id, sessionId, userId, screenshotId, periodStart, periodEnd, mode, 
        notes, activityScore, isValid, classification, metricsBreakdown, isSynced, createdAt
      ) VALUES (
        @id, @sessionId, @userId, @screenshotId, @periodStart, @periodEnd, @mode,
        @notes, @activityScore, @isValid, @classification, @metricsBreakdown, @isSynced, @createdAt
      )
    `);
    
    stmt.run(period);
    
    // Add to sync queue
    this.addToSyncQueue('activity_period', period.id, 'create', period);
    
    return period;
  }
  
  // Screenshot operations
  saveScreenshot(data: {
    id?: string;  // Optional ID to use instead of generating new one
    userId: string;
    sessionId: string;
    localPath: string;
    thumbnailPath?: string;
    capturedAt: Date;
    mode: 'client_hours' | 'command_hours';
    task?: string;  // From session
  }) {
    // Check if a screenshot with the same localPath already exists
    const existingScreenshot = this.db.prepare(`
      SELECT * FROM screenshots WHERE localPath = ?
    `).get(data.localPath) as any;
    
    if (existingScreenshot) {
      console.log(`Screenshot already exists with id ${existingScreenshot.id}, not saving duplicate`);
      
      // Check if it's already in sync queue
      const existingInQueue = this.db.prepare(`
        SELECT id FROM sync_queue 
        WHERE entityType = 'screenshot' AND entityId = ? AND attempts < 5
      `).get(existingScreenshot.id) as any;
      
      if (!existingInQueue) {
        // Add the existing screenshot to sync queue if not already there
        this.addToSyncQueue('screenshot', existingScreenshot.id, 'upload', {
          localPath: existingScreenshot.localPath,
          capturedAt: existingScreenshot.capturedAt,
          mode: existingScreenshot.mode,
          userId: existingScreenshot.userId,
          sessionId: existingScreenshot.sessionId,
          notes: existingScreenshot.notes
        });
        console.log(`Added existing screenshot ${existingScreenshot.id} to sync queue`);
      } else {
        console.log(`Screenshot ${existingScreenshot.id} already in sync queue`);
      }
      
      return existingScreenshot;
    }
    
    // Get session task for notes field
    const session = this.db.prepare('SELECT task FROM sessions WHERE id = ?').get(data.sessionId) as any;
    const notes = session?.task || null;
    
    const screenshot = {
      id: data.id || crypto.randomUUID(),  // Use provided ID or generate new one
      userId: data.userId,
      sessionId: data.sessionId,
      localPath: data.localPath,
      thumbnailPath: data.thumbnailPath || null,
      url: null,
      capturedAt: data.capturedAt.getTime(),
      mode: data.mode,
      notes: notes,  // Copy from session task
      isDeleted: 0,
      isSynced: 0,
      createdAt: Date.now()
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO screenshots (
        id, userId, sessionId, localPath, thumbnailPath, url,
        capturedAt, mode, notes, isDeleted, isSynced, createdAt
      ) VALUES (
        @id, @userId, @sessionId, @localPath, @thumbnailPath, @url,
        @capturedAt, @mode, @notes, @isDeleted, @isSynced, @createdAt
      )
    `);
    
    stmt.run(screenshot);
    
    console.log(`Saved new screenshot ${screenshot.id}`);
    
    // Add to sync queue for S3 upload with all new fields
    this.addToSyncQueue('screenshot', screenshot.id, 'upload', {
      localPath: screenshot.localPath,
      capturedAt: screenshot.capturedAt,
      mode: screenshot.mode,
      userId: screenshot.userId,
      sessionId: screenshot.sessionId,
      notes: screenshot.notes
    });
    console.log(`Added screenshot ${screenshot.id} to sync queue`);
    
    return screenshot;
  }
  
  getScreenshotsByDate(userId: string, date: Date): Screenshot[] {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    console.log('getScreenshotsByDate - userId:', userId);
    console.log('getScreenshotsByDate - dateStart:', dateStart.toISOString(), 'timestamp:', dateStart.getTime());
    console.log('getScreenshotsByDate - dateEnd:', dateEnd.toISOString(), 'timestamp:', dateEnd.getTime());
    
    const stmt = this.db.prepare(`
      SELECT s.*
      FROM screenshots s
      WHERE s.userId = ? AND s.capturedAt >= ? AND s.capturedAt <= ? AND s.isDeleted = 0
      ORDER BY s.capturedAt ASC
    `);
    
    const screenshots = stmt.all(userId, dateStart.getTime(), dateEnd.getTime()) as any[];
    
    console.log('getScreenshotsByDate - found', screenshots.length, 'screenshots for user', userId, 'on date', dateStart.toDateString());
    
    // For each screenshot, get its associated activity periods and calculate aggregated score
    return screenshots.map((s: any) => {
      // Get activity periods for this screenshot
      const periods = this.getActivityPeriodsForScreenshot(s.id);
      
      // Calculate aggregated score from associated periods
      const totalScore = periods.reduce((sum: number, period: any) => sum + (period.activityScore || 0), 0);
      const aggregatedScore = periods.length > 0 ? Math.round(totalScore / periods.length) : 0;
      
      // Extract period IDs for fetching detailed metrics
      const periodIds = periods.map((p: any) => p.id);
      
      // Get sync status for screenshot and its periods
      const syncStatus = this.getScreenshotSyncStatus(s.id, periodIds);
      
      return {
        ...s,
        activityScore: aggregatedScore,
        aggregatedScore: aggregatedScore, // For backward compatibility
        relatedPeriods: periods,
        activityPeriodIds: periodIds, // Add period IDs for metrics fetching
        syncStatus // Add sync status information
      };
    });
  }

  getTodayScreenshots(userId: string): Screenshot[] {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    console.log('getTodayScreenshots - userId:', userId);
    console.log('getTodayScreenshots - todayStart:', todayStart.toISOString(), 'timestamp:', todayStart.getTime());
    
    const stmt = this.db.prepare(`
      SELECT s.*
      FROM screenshots s
      WHERE s.userId = ? AND s.capturedAt >= ? AND s.isDeleted = 0
      ORDER BY s.capturedAt ASC
    `);
    
    const screenshots = stmt.all(userId, todayStart.getTime()) as any[];
    console.log('getTodayScreenshots - found', screenshots.length, 'screenshots for user', userId);
    
    // For each screenshot, get its associated activity periods and calculate aggregated score
    return screenshots.map((s: any) => {
      // Get activity periods for this screenshot
      const periods = this.getActivityPeriodsForScreenshot(s.id);
      
      // Calculate aggregated score from associated periods
      const totalScore = periods.reduce((sum: number, period: any) => sum + (period.activityScore || 0), 0);
      const aggregatedScore = periods.length > 0 ? Math.round(totalScore / periods.length) : 0;
      
      // Extract period IDs for fetching detailed metrics
      const periodIds = periods.map((p: any) => p.id);
      
      // Get sync status for screenshot and its periods
      const syncStatus = this.getScreenshotSyncStatus(s.id, periodIds);
      
      return {
        ...s,
        activityScore: aggregatedScore,
        aggregatedScore: aggregatedScore, // For backward compatibility
        relatedPeriods: periods,
        activityPeriodIds: periodIds, // Add period IDs for metrics fetching
        syncStatus // Add sync status information
      };
    });
  }
  
  getScreenshotSyncStatus(screenshotId: string, periodIds: string[]) {
    // Check screenshot sync status
    const screenshotSyncQuery = this.db.prepare(`
      SELECT 
        s.isSynced as screenshotSynced,
        s.url,
        sq.id as queueId,
        sq.attempts,
        sq.createdAt as queuedAt,
        sq.lastAttempt as lastAttemptAt,
        sq.data
      FROM screenshots s
      LEFT JOIN sync_queue sq ON sq.entityId = s.id AND sq.entityType = 'screenshot'
      WHERE s.id = ?
    `).get(screenshotId) as any;
    
    // Check activity periods sync status
    let periodsSyncQuery: any = { totalPeriods: 0, syncedPeriods: 0, queuedPeriods: 0, maxAttempts: 0 };
    
    if (periodIds.length > 0) {
      periodsSyncQuery = this.db.prepare(`
        SELECT 
          COUNT(*) as totalPeriods,
          SUM(CASE WHEN isSynced = 1 THEN 1 ELSE 0 END) as syncedPeriods,
          SUM(CASE WHEN sq.id IS NOT NULL THEN 1 ELSE 0 END) as queuedPeriods,
          MAX(sq.attempts) as maxAttempts
        FROM activity_periods ap
        LEFT JOIN sync_queue sq ON sq.entityId = ap.id AND sq.entityType = 'activity_period'
        WHERE ap.id IN (${periodIds.map(() => '?').join(',')})
      `).get(...periodIds) as any;
    }
    
    // Get individual activity period sync status
    let periodsDetails: any[] = [];
    if (periodIds.length > 0) {
      periodsDetails = this.db.prepare(`
        SELECT 
          ap.id,
          ap.periodStart,
          ap.periodEnd,
          ap.isSynced,
          sq.id as queueId,
          sq.attempts,
          sq.lastAttempt
        FROM activity_periods ap
        LEFT JOIN sync_queue sq ON sq.entityId = ap.id AND sq.entityType = 'activity_period'
        WHERE ap.id IN (${periodIds.map(() => '?').join(',')})
        ORDER BY ap.periodStart ASC
      `).all(...periodIds) as any[];
    }
    
    // Get queue position if in queue
    let queuePosition = 0;
    if (screenshotSyncQuery?.queueId) {
      const positionQuery = this.db.prepare(`
        SELECT COUNT(*) as position
        FROM sync_queue
        WHERE createdAt < (SELECT createdAt FROM sync_queue WHERE id = ?)
        AND attempts < 5
      `).get(screenshotSyncQuery.queueId) as any;
      queuePosition = positionQuery?.position || 0;
    }
    
    // Calculate next retry time based on exponential backoff
    let nextRetryTime = null;
    if (screenshotSyncQuery?.attempts > 0 && screenshotSyncQuery?.attempts < 5) {
      const baseDelay = 5000; // 5 seconds
      const retryDelay = baseDelay * Math.pow(2, screenshotSyncQuery.attempts - 1);
      const lastAttempt = new Date(screenshotSyncQuery.lastAttemptAt || screenshotSyncQuery.queuedAt);
      nextRetryTime = new Date(lastAttempt.getTime() + retryDelay);
    }
    
    // Calculate upload percentage (screenshot = 1 item, each period = 1 item)
    const totalItems = 1 + periodIds.length; // 1 screenshot + N activity periods
    const screenshotUploaded = screenshotSyncQuery?.screenshotSynced === 1 || !!screenshotSyncQuery?.url;
    const syncedItems = (screenshotUploaded ? 1 : 0) + (periodsSyncQuery?.syncedPeriods || 0);
    const uploadPercentage = (syncedItems / totalItems) * 100;
    
    // Determine overall sync status
    let status: 'synced' | 'partial' | 'pending' | 'failed' | 'queued';
    const allPeriodsSynced = periodsSyncQuery?.syncedPeriods === periodsSyncQuery?.totalPeriods;
    const hasFailedItems = screenshotSyncQuery?.attempts >= 5 || periodsSyncQuery?.maxAttempts >= 5;
    
    if (screenshotUploaded && allPeriodsSynced) {
      status = 'synced';
    } else if (hasFailedItems) {
      status = 'failed';
    } else if (syncedItems > 0 && syncedItems < totalItems) {
      // Show partial with percentage only if actively syncing
      status = 'partial';
    } else if (screenshotSyncQuery?.queueId || periodsSyncQuery?.queuedPeriods > 0) {
      status = 'queued';
    } else if (syncedItems === 0) {
      status = 'pending';
    } else {
      // All items synced but not detected above - mark as synced
      status = 'synced';
    }
    
    return {
      status,
      uploadPercentage: Math.round(uploadPercentage * 10) / 10, // Round to 1 decimal place
      screenshot: {
        synced: screenshotUploaded,
        attempts: screenshotSyncQuery?.attempts || 0,
        lastError: undefined  // We don't track errors in the current schema
      },
      activityPeriods: {
        total: periodsSyncQuery?.totalPeriods || 0,
        synced: periodsSyncQuery?.syncedPeriods || 0,
        queued: periodsSyncQuery?.queuedPeriods || 0,
        maxAttempts: periodsSyncQuery?.maxAttempts || 0,
        details: periodsDetails.map(p => ({
          id: p.id,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          synced: p.isSynced === 1,
          queued: !!p.queueId,
          attempts: p.attempts || 0,
          status: p.isSynced === 1 ? 'synced' : (p.queueId ? (p.attempts >= 5 ? 'failed' : 'queued') : 'pending')
        }))
      },
      queuePosition,
      nextRetryTime,
      lastAttemptAt: screenshotSyncQuery?.lastAttemptAt ? new Date(screenshotSyncQuery.lastAttemptAt) : null
    };
  }
  
  updateScreenshotUrls(screenshotId: string, url: string, thumbnailUrl: string) {
    const stmt = this.db.prepare(`
      UPDATE screenshots 
      SET url = ?, thumbnailUrl = ?, isSynced = 1
      WHERE id = ?
    `);
    
    stmt.run(url, thumbnailUrl, screenshotId);
    console.log(`Updated screenshot ${screenshotId} with S3 URLs`);
  }

  updateScreenshotNotes(screenshotIds: string[], notes: string) {
    console.log(`[updateScreenshotNotes] Called with ${screenshotIds.length} IDs and notes: "${notes}"`);
    console.log(`[updateScreenshotNotes] Screenshot IDs:`, screenshotIds);
    
    // First check if screenshots exist
    const checkStmt = this.db.prepare('SELECT id, notes, task FROM screenshots WHERE id = ?');
    console.log(`[updateScreenshotNotes] Checking existing screenshots...`);
    for (const id of screenshotIds) {
      const existing = checkStmt.get(id) as any;
      if (existing) {
        console.log(`[updateScreenshotNotes] Screenshot ${id} found - current notes: "${existing.notes}", task: "${existing.task}"`);
      } else {
        console.log(`[updateScreenshotNotes] WARNING: Screenshot ${id} NOT FOUND in database!`);
      }
    }
    
    const stmt = this.db.prepare(`
      UPDATE screenshots 
      SET notes = ?, isSynced = 0
      WHERE id = ?
    `);
    
    let updatedCount = 0;
    const updateTransaction = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        const result = stmt.run(notes, id);
        console.log(`[updateScreenshotNotes] Update result for ${id}: changes=${result.changes}`);
        if (result.changes > 0) {
          updatedCount++;
          // Add to sync queue for updating in cloud
          this.addToSyncQueue('screenshot', id, 'update', { notes });
        }
      }
    });
    
    updateTransaction(screenshotIds);
    console.log(`[updateScreenshotNotes] Transaction completed. Updated ${updatedCount}/${screenshotIds.length} screenshots`);
    
    // Verify the update
    console.log(`[updateScreenshotNotes] Verifying updates...`);
    const verifyStmt = this.db.prepare('SELECT id, notes, task FROM screenshots WHERE id = ?');
    for (const id of screenshotIds) {
      const row = verifyStmt.get(id) as any;
      if (row) {
        console.log(`[updateScreenshotNotes] After update - Screenshot ${id}: notes="${row.notes}", task="${row.task}"`);
      } else {
        console.log(`[updateScreenshotNotes] ERROR: Screenshot ${id} not found after update!`);
      }
    }
    
    console.log(`[updateScreenshotNotes] Returning success with updatedCount=${updatedCount}`);
    return { success: true, updatedCount };
  }

  deleteScreenshots(screenshotIds: string[]) {
    console.log(`[deleteScreenshots] Called with ${screenshotIds.length} IDs:`, screenshotIds);
    console.log(`[deleteScreenshots] Screenshot IDs to delete:`, screenshotIds);
    
    // First check what we're deleting and collect related data
    const checkStmt = this.db.prepare('SELECT id, sessionId, localPath, thumbnailPath, isSynced FROM screenshots WHERE id = ?');
    const getPeriodsStmt = this.db.prepare('SELECT id FROM activity_periods WHERE screenshotId = ?');
    const filesToDelete: string[] = [];
    const periodsToUpdate: string[] = [];
    
    for (const id of screenshotIds) {
      const screenshot = checkStmt.get(id) as any;
      if (screenshot) {
        console.log(`[deleteScreenshots] Found screenshot ${id} in session ${screenshot.sessionId}, synced: ${screenshot.isSynced}`);
        if (screenshot.localPath) filesToDelete.push(screenshot.localPath);
        if (screenshot.thumbnailPath) filesToDelete.push(screenshot.thumbnailPath);
        
        // Find activity periods that reference this screenshot
        const periods = getPeriodsStmt.all(id) as any[];
        for (const period of periods) {
          periodsToUpdate.push(period.id);
        }
      } else {
        console.log(`[deleteScreenshots] WARNING: Screenshot ${id} not found`);
      }
    }
    
    console.log(`[deleteScreenshots] Found ${periodsToUpdate.length} activity periods to update`);
    
    // Start transaction for all database operations
    let deletedCount = 0;
    const deleteTransaction = this.db.transaction((ids: string[]) => {
      // First, update activity periods to remove screenshot reference
      const updatePeriodStmt = this.db.prepare('UPDATE activity_periods SET screenshotId = NULL WHERE screenshotId = ?');
      for (const id of ids) {
        updatePeriodStmt.run(id);
      }
      
      // Delete screenshots from database
      const deleteStmt = this.db.prepare('DELETE FROM screenshots WHERE id = ?');
      for (const id of ids) {
        const result = deleteStmt.run(id);
        if (result.changes > 0) {
          deletedCount++;
          console.log(`[deleteScreenshots] Deleted screenshot ${id} from database`);
        } else {
          console.log(`[deleteScreenshots] No changes when deleting ${id} - might not exist`);
        }
      }
      
      // Remove from sync queue (both for screenshot and any related entities)
      const deleteSyncQueueStmt = this.db.prepare('DELETE FROM sync_queue WHERE entityId = ? AND entityType = ?');
      for (const id of ids) {
        deleteSyncQueueStmt.run(id, 'screenshot');
        // Also mark screenshot for deletion in cloud if it was synced
        const screenshot = checkStmt.get(id) as any;
        if (screenshot && screenshot.isSynced) {
          // Add a delete operation to sync queue
          this.addToSyncQueue('screenshot', id, 'delete', { deleted: true });
        }
      }
    });
    
    try {
      deleteTransaction(screenshotIds);
      console.log(`[deleteScreenshots] Database transaction completed. Deleted ${deletedCount} screenshots`);
    } catch (error) {
      console.error(`[deleteScreenshots] Database transaction failed:`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
    
    // Delete files from disk (outside transaction)
    const fs = require('fs');
    let filesDeleted = 0;
    for (const filePath of filesToDelete) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          filesDeleted++;
          console.log(`[deleteScreenshots] Deleted file: ${filePath}`);
        } else {
          console.log(`[deleteScreenshots] File not found: ${filePath}`);
        }
      } catch (error) {
        console.error(`[deleteScreenshots] Failed to delete file ${filePath}:`, error);
      }
    }
    
    console.log(`[deleteScreenshots] Operation complete. Deleted ${deletedCount} screenshots from database and ${filesDeleted} files from disk`);
    return { success: true, deletedCount, filesDeleted };
  }
  
  // Analytics operations
  getTodayStats(userId: string) {
    // Get all periods for today
    const periodsStmt = this.db.prepare(`
      SELECT id, sessionId, periodStart, periodEnd, mode, activityScore
      FROM activity_periods
      WHERE userId = ? 
        AND date(periodStart / 1000, 'unixepoch') = date('now')
        AND isValid = 1
      ORDER BY periodStart ASC
    `);
    
    const allPeriods = periodsStmt.all(userId) as any[];
    
    // Filter periods that should be counted
    const countablePeriods = allPeriods.filter(period => {
      // Count if activity score is 4.0 or higher (Poor, Fair, Good)
      if (period.activityScore >= 4.0) {
        return true;
      }
      
      // Check if it's Critical (2.5-4.0)
      if (period.activityScore >= 2.5 && period.activityScore < 4.0) {
        // Check condition 1: Either neighbor is better (>= 4.0)
        const periodIndex = allPeriods.findIndex(p => p.id === period.id);
        
        // Check previous neighbor
        if (periodIndex > 0 && allPeriods[periodIndex - 1].activityScore >= 4.0) {
          return true;
        }
        
        // Check next neighbor
        if (periodIndex < allPeriods.length - 1 && allPeriods[periodIndex + 1].activityScore >= 4.0) {
          return true;
        }
        
        // Check condition 2: Average activity for the hour is >= 4.0
        const periodHourStart = new Date(period.periodStart);
        periodHourStart.setMinutes(0, 0, 0);
        const periodHourEnd = new Date(periodHourStart);
        periodHourEnd.setHours(periodHourEnd.getHours() + 1);
        
        const hourPeriods = allPeriods.filter(p => 
          p.periodStart >= periodHourStart.getTime() && 
          p.periodStart < periodHourEnd.getTime()
        );
        
        if (hourPeriods.length > 0) {
          const avgScore = hourPeriods.reduce((sum, p) => sum + p.activityScore, 0) / hourPeriods.length;
          if (avgScore >= 4.0) {
            return true;
          }
        }
      }
      
      // Don't count Inactive periods (< 2.5)
      return false;
    });
    
    // Calculate stats from countable periods
    let clientMinutes = 0;
    let commandMinutes = 0;
    
    countablePeriods.forEach(period => {
      const minutes = (period.periodEnd - period.periodStart) / 60000;
      if (period.mode === 'client_hours') {
        clientMinutes += minutes;
      } else if (period.mode === 'command_hours') {
        commandMinutes += minutes;
      }
    });
    
    return {
      clientHours: clientMinutes / 60,
      commandHours: commandMinutes / 60,
      totalHours: (clientMinutes + commandMinutes) / 60
    };
  }
  
  getWeekStats(userId: string) {
    // Get all periods for the last 7 days
    const periodsStmt = this.db.prepare(`
      SELECT id, sessionId, periodStart, periodEnd, mode, activityScore
      FROM activity_periods
      WHERE userId = ? 
        AND date(periodStart / 1000, 'unixepoch') >= date('now', '-7 days')
        AND isValid = 1
      ORDER BY periodStart ASC
    `);
    
    const allPeriods = periodsStmt.all(userId) as any[];
    
    // Filter periods that should be counted
    const countablePeriods = allPeriods.filter(period => {
      // Count if activity score is 4.0 or higher (Poor, Fair, Good)
      if (period.activityScore >= 4.0) {
        return true;
      }
      
      // Check if it's Critical (2.5-4.0)
      if (period.activityScore >= 2.5 && period.activityScore < 4.0) {
        // Check condition 1: Either neighbor is better (>= 4.0)
        const periodIndex = allPeriods.findIndex(p => p.id === period.id);
        
        // Check previous neighbor
        if (periodIndex > 0 && allPeriods[periodIndex - 1].activityScore >= 4.0) {
          return true;
        }
        
        // Check next neighbor
        if (periodIndex < allPeriods.length - 1 && allPeriods[periodIndex + 1].activityScore >= 4.0) {
          return true;
        }
        
        // Check condition 2: Average activity for the hour is >= 4.0
        const periodHourStart = new Date(period.periodStart);
        periodHourStart.setMinutes(0, 0, 0);
        const periodHourEnd = new Date(periodHourStart);
        periodHourEnd.setHours(periodHourEnd.getHours() + 1);
        
        const hourPeriods = allPeriods.filter(p => 
          p.periodStart >= periodHourStart.getTime() && 
          p.periodStart < periodHourEnd.getTime()
        );
        
        if (hourPeriods.length > 0) {
          const avgScore = hourPeriods.reduce((sum, p) => sum + p.activityScore, 0) / hourPeriods.length;
          if (avgScore >= 4.0) {
            return true;
          }
        }
      }
      
      // Don't count Inactive periods (< 2.5)
      return false;
    });
    
    // Calculate stats from countable periods
    let clientMinutes = 0;
    let commandMinutes = 0;
    
    countablePeriods.forEach(period => {
      const minutes = (period.periodEnd - period.periodStart) / 60000;
      if (period.mode === 'client_hours') {
        clientMinutes += minutes;
      } else if (period.mode === 'command_hours') {
        commandMinutes += minutes;
      }
    });
    
    return {
      clientHours: clientMinutes / 60,
      commandHours: commandMinutes / 60,
      totalHours: (clientMinutes + commandMinutes) / 60
    };
  }
  
  // Activity metrics operations
  saveCommandHourActivity(periodId: string, data: any) {
    const stmt = this.db.prepare(`
      INSERT INTO command_hour_activities (
        id, activityPeriodId, uniqueKeys, productiveKeyHits,
        mouseClicks, mouseScrolls, mouseDistance, isSynced, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const id = crypto.randomUUID();
    stmt.run(
      id,
      periodId,
      data.uniqueKeys,
      data.productiveKeyHits,
      data.mouseClicks,
      data.mouseScrolls,
      data.mouseDistance,
      0,
      Date.now()
    );
    
    // Add to sync queue
    this.addToSyncQueue('command_activity', id, 'create', data);
  }
  
  saveClientHourActivity(periodId: string, data: any) {
    const stmt = this.db.prepare(`
      INSERT INTO client_hour_activities (
        id, activityPeriodId, codeCommitsCount, filesSavedCount,
        caretMovedCount, textSelectionsCount, filesOpenedCount,
        tabsSwitchedCount, netLinesCount, copilotSuggestionsAccepted, isSynced, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const id = crypto.randomUUID();
    stmt.run(
      id,
      periodId,
      data.codeCommitsCount || 0,
      data.filesSavedCount || 0,
      data.caretMovedCount || 0,
      data.textSelectionsCount || 0,
      data.filesOpenedCount || 0,
      data.tabsSwitchedCount || 0,
      data.netLinesCount || 0,
      data.copilotSuggestionsAccepted || 0,
      0,
      Date.now()
    );
    
    // Add to sync queue
    this.addToSyncQueue('client_activity', id, 'create', data);
  }
  
  // Sync queue operations
  addToSyncQueue(entityType: string, entityId: string, operation: string, data: any) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_queue (id, entityType, entityId, operation, data, attempts, lastAttempt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      crypto.randomUUID(),
      entityType,
      entityId,
      operation,
      JSON.stringify(data),
      0,
      null,
      Date.now()
    );
  }
  
  getUnsyncedItems(limit = 100): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM sync_queue 
      WHERE attempts < 5 
      ORDER BY 
        CASE 
          WHEN entityType = 'session' THEN 1
          WHEN entityType = 'screenshot' THEN 2
          WHEN entityType = 'activity_period' THEN 3
          ELSE 4
        END,
        createdAt DESC 
      LIMIT ?
    `);
    
    return stmt.all(limit);
  }
  
  markSynced(queueId: string) {
    // Get the entity info before deleting from queue
    const queueItem = this.db.prepare('SELECT entityType, entityId FROM sync_queue WHERE id = ?').get(queueId) as any;
    
    if (queueItem) {
      // Update isSynced flag for the entity
      let updateResult;
      switch (queueItem.entityType) {
        case 'activity_period':
          updateResult = this.db.prepare('UPDATE activity_periods SET isSynced = 1 WHERE id = ?').run(queueItem.entityId);
          console.log(`Marked activity_period ${queueItem.entityId} as synced (${updateResult.changes} rows updated)`);
          break;
        case 'screenshot':
          updateResult = this.db.prepare('UPDATE screenshots SET isSynced = 1 WHERE id = ?').run(queueItem.entityId);
          console.log(`Marked screenshot ${queueItem.entityId} as synced (${updateResult.changes} rows updated)`);
          break;
        case 'session':
          updateResult = this.db.prepare('UPDATE sessions SET isSynced = 1 WHERE id = ?').run(queueItem.entityId);
          console.log(`Marked session ${queueItem.entityId} as synced (${updateResult.changes} rows updated)`);
          break;
        case 'command_activity':
        case 'client_activity':
          // These don't have isSynced flags in their tables
          console.log(`Skipping isSynced update for ${queueItem.entityType}`);
          break;
        default:
          console.warn(`Unknown entity type in markSynced: ${queueItem.entityType}`);
      }
    } else {
      console.warn(`Queue item ${queueId} not found when trying to mark as synced`);
    }
    
    // Remove from sync queue
    this.db.prepare('DELETE FROM sync_queue WHERE id = ?').run(queueId);
  }
  
  incrementSyncAttempts(queueId: string) {
    this.db.prepare(`
      UPDATE sync_queue 
      SET attempts = attempts + 1, lastAttempt = ? 
      WHERE id = ?
    `).run(Date.now(), queueId);
  }
  
  // Recent notes operations
  saveRecentNote(userId: string, noteText: string) {
    console.log(`LocalDatabase: saveRecentNote called with userId: ${userId}, noteText: "${noteText}"`);
    
    const existing = this.db.prepare(
      'SELECT * FROM recent_notes WHERE userId = ? AND noteText = ?'
    ).get(userId, noteText) as any;
    
    if (existing) {
      console.log(`LocalDatabase: Note already exists, updating use count`);
      this.db.prepare(
        'UPDATE recent_notes SET useCount = useCount + 1, lastUsedAt = ? WHERE id = ?'
      ).run(Date.now(), existing.id);
    } else {
      console.log(`LocalDatabase: Creating new note entry`);
      const stmt = this.db.prepare(`
        INSERT INTO recent_notes (id, userId, noteText, lastUsedAt, useCount, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(crypto.randomUUID(), userId, noteText, Date.now(), 1, Date.now());
    }
    
    // Also update the active session's task field with the new note
    console.log(`LocalDatabase: Looking for active session for user: ${userId}`);
    const activeSession = this.getActiveSession(userId);
    if (activeSession) {
      console.log(`LocalDatabase: Found active session: ${activeSession.id} with current task: "${activeSession.task}"`);
      const updateStmt = this.db.prepare('UPDATE sessions SET task = ? WHERE id = ?');
      const result = updateStmt.run(noteText, activeSession.id);
      console.log(`LocalDatabase: UPDATE result - changes: ${result.changes}, lastInsertRowid: ${result.lastInsertRowid}`);
      console.log(`LocalDatabase: Updated active session ${activeSession.id} task from "${activeSession.task}" to: "${noteText}"`);
      
      // Add to sync queue if session is already synced
      const isSynced = this.db.prepare('SELECT isSynced FROM sessions WHERE id = ?').get(activeSession.id) as any;
      if (isSynced && isSynced.isSynced === 1) {
        // Add update operation to sync queue
        this.addToSyncQueue('session', activeSession.id, 'update', {
          task: noteText
        });
        console.log(`LocalDatabase: Added session task update to sync queue`);
      }
    } else {
      console.log(`LocalDatabase: No active session found for user: ${userId}`);
    }
  }
  
  getRecentNotes(userId: string, limit = 10): string[] {
    const stmt = this.db.prepare(`
      SELECT noteText FROM recent_notes 
      WHERE userId = ? 
      ORDER BY lastUsedAt DESC 
      LIMIT ?
    `);
    
    const notes = stmt.all(userId, limit) as { noteText: string }[];
    return notes.map(n => n.noteText);
  }
  
  // Cleanup and maintenance
  clearOldData(daysToKeep = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    // Delete old synced data
    this.db.prepare('DELETE FROM sessions WHERE createdAt < ? AND isSynced = 1').run(cutoffTime);
    this.db.prepare('DELETE FROM activity_periods WHERE createdAt < ? AND isSynced = 1').run(cutoffTime);
    this.db.prepare('DELETE FROM screenshots WHERE createdAt < ? AND isSynced = 1').run(cutoffTime);
    
    // Clean up sync queue
    this.db.prepare('DELETE FROM sync_queue WHERE attempts >= 5').run();
  }
  
  clearSyncQueue() {
    console.log('Clearing all sync queue entries');
    this.db.prepare('DELETE FROM sync_queue').run();
  }
  
  checkForeignKeys() {
    const result = this.db.pragma('foreign_keys');
    console.log('Foreign keys enabled:', result);
    return result;
  }
  
  enableForeignKeys() {
    this.db.pragma('foreign_keys = ON');
    console.log('Foreign keys re-enabled');
  }
  
  clearSessionsAndRelatedData() {
    console.log('Clearing all sessions and related data');
    
    // Disable foreign key checks temporarily
    this.db.pragma('foreign_keys = OFF');
    
    try {
      // Clear in reverse dependency order to avoid foreign key issues
      this.db.prepare('DELETE FROM screenshots').run();
      this.db.prepare('DELETE FROM command_hour_activities').run();
      this.db.prepare('DELETE FROM client_hour_activities').run();
      this.db.prepare('DELETE FROM browser_activities').run();
      this.db.prepare('DELETE FROM activity_periods').run();
      this.db.prepare('DELETE FROM sessions').run();
      this.db.prepare('DELETE FROM sync_queue').run();
      
      console.log('All data cleared successfully');
    } finally {
      // Re-enable foreign key checks
      this.db.pragma('foreign_keys = ON');
    }
  }
  
  close() {
    this.db.close();
  }
  
  vacuum() {
    this.db.exec('VACUUM');
  }
  
  getDatabaseSize(): number {
    const stats = fs.statSync(this.dbPath);
    return stats.size;
  }
  
  exportData(userId: string): any {
    const sessions = this.db.prepare('SELECT * FROM sessions WHERE userId = ?').all(userId);
    const activityPeriods = this.db.prepare('SELECT * FROM activity_periods WHERE userId = ?').all(userId);
    const screenshots = this.db.prepare('SELECT * FROM screenshots WHERE userId = ?').all(userId);
    
    return {
      sessions,
      activityPeriods,
      screenshots,
      exportedAt: Date.now()
    };
  }
}