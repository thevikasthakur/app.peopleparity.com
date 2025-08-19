import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';
import fs from 'fs';

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
  isSynced: number;
  createdAt: number;
}

interface ActivityPeriod {
  id: string;
  sessionId: string;
  userId: string;
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
  activityPeriodId: string;
  localPath: string;
  thumbnailPath?: string;
  s3Url?: string;
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
    
    // Initialize schema
    this.initializeSchema();
  }
  
  private runMigrations() {
    // Check if screenshots table exists and add new columns if missing
    try {
      // Check if the screenshots table exists
      const tableInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='screenshots'").get();
      
      if (tableInfo) {
        // Table exists, check for new columns and add them if missing
        const columns = this.db.prepare("PRAGMA table_info(screenshots)").all() as any[];
        const columnNames = columns.map(col => col.name);
        
        // Add sessionId column if missing
        if (!columnNames.includes('sessionId')) {
          console.log('Adding sessionId column to screenshots table...');
          this.db.exec('ALTER TABLE screenshots ADD COLUMN sessionId TEXT');
        }
        
        // Add localCaptureTime column if missing
        if (!columnNames.includes('localCaptureTime')) {
          console.log('Adding localCaptureTime column to screenshots table...');
          this.db.exec('ALTER TABLE screenshots ADD COLUMN localCaptureTime INTEGER');
        }
        
        // Add aggregatedScore column if missing
        if (!columnNames.includes('aggregatedScore')) {
          console.log('Adding aggregatedScore column to screenshots table...');
          this.db.exec('ALTER TABLE screenshots ADD COLUMN aggregatedScore INTEGER DEFAULT 0');
        }
      }
      
      // Check if screenshot_periods table exists
      const screenshotPeriodsTable = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='screenshot_periods'").get();
      
      if (!screenshotPeriodsTable) {
        console.log('Creating screenshot_periods table...');
        this.db.exec(`
          CREATE TABLE screenshot_periods (
            id TEXT PRIMARY KEY,
            screenshotId TEXT NOT NULL,
            activityPeriodId TEXT NOT NULL,
            periodOrder INTEGER NOT NULL,
            createdAt INTEGER NOT NULL,
            FOREIGN KEY (screenshotId) REFERENCES screenshots(id),
            FOREIGN KEY (activityPeriodId) REFERENCES activity_periods(id),
            UNIQUE(screenshotId, activityPeriodId)
          )
        `);
      }
    } catch (error) {
      console.error('Migration error:', error);
      // Continue even if migration fails - the app should still work with existing schema
    }
  }
  
  private initializeSchema() {
    // First run migrations on existing database
    this.runMigrations();
    
    // Current logged-in user (cached from API)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS current_user (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        organizationId TEXT NOT NULL,
        organizationName TEXT NOT NULL,
        role TEXT NOT NULL,
        lastSync INTEGER NOT NULL
      )
    `);
    
    // Projects cached from API
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cached_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        organizationId TEXT NOT NULL,
        color TEXT,
        isActive INTEGER DEFAULT 1,
        lastSync INTEGER NOT NULL
      )
    `);
    
    // Local sessions (synced to API)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        projectId TEXT,
        projectName TEXT,
        mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        isActive INTEGER DEFAULT 1,
        task TEXT,
        isSynced INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL
      )
    `);
    
    // Activity periods (synced to API)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS activity_periods (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        periodStart INTEGER NOT NULL,
        periodEnd INTEGER NOT NULL,
        mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
        notes TEXT,
        activityScore REAL DEFAULT 0,
        isValid INTEGER DEFAULT 1,
        classification TEXT,
        isSynced INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions(id)
      )
    `);
    
    // Screenshots (uploaded to S3 via API) - updated for 1-minute periods
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        sessionId TEXT,
        activityPeriodId TEXT NOT NULL,
        localPath TEXT NOT NULL,
        thumbnailPath TEXT,
        s3Url TEXT,
        capturedAt INTEGER NOT NULL,
        localCaptureTime INTEGER,
        aggregatedScore INTEGER DEFAULT 0,
        mode TEXT NOT NULL CHECK(mode IN ('client_hours', 'command_hours')),
        notes TEXT,
        isDeleted INTEGER DEFAULT 0,
        isSynced INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (activityPeriodId) REFERENCES activity_periods(id)
      )
    `);
    
    // New table to link screenshots with multiple activity periods (10 per screenshot)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS screenshot_periods (
        id TEXT PRIMARY KEY,
        screenshotId TEXT NOT NULL,
        activityPeriodId TEXT NOT NULL,
        periodOrder INTEGER NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (screenshotId) REFERENCES screenshots(id),
        FOREIGN KEY (activityPeriodId) REFERENCES activity_periods(id),
        UNIQUE(screenshotId, activityPeriodId)
      )
    `);
    
    // Command hour activities (synced to API)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS command_hour_activities (
        id TEXT PRIMARY KEY,
        activityPeriodId TEXT NOT NULL,
        uniqueKeys INTEGER DEFAULT 0,
        productiveKeyHits INTEGER DEFAULT 0,
        mouseClicks INTEGER DEFAULT 0,
        mouseScrolls INTEGER DEFAULT 0,
        mouseDistance REAL DEFAULT 0,
        isSynced INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (activityPeriodId) REFERENCES activity_periods(id)
      )
    `);
    
    // Client hour activities (synced to API)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS client_hour_activities (
        id TEXT PRIMARY KEY,
        activityPeriodId TEXT NOT NULL,
        codeCommitsCount INTEGER DEFAULT 0,
        filesSavedCount INTEGER DEFAULT 0,
        caretMovedCount INTEGER DEFAULT 0,
        textSelectionsCount INTEGER DEFAULT 0,
        filesOpenedCount INTEGER DEFAULT 0,
        tabsSwitchedCount INTEGER DEFAULT 0,
        netLinesCount INTEGER DEFAULT 0,
        copilotSuggestionsAccepted INTEGER DEFAULT 0,
        isSynced INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (activityPeriodId) REFERENCES activity_periods(id)
      )
    `);
    
    // Browser activities (synced to API)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS browser_activities (
        id TEXT PRIMARY KEY,
        activityPeriodId TEXT NOT NULL,
        url TEXT NOT NULL,
        domain TEXT NOT NULL,
        title TEXT,
        category TEXT,
        durationSeconds INTEGER DEFAULT 0,
        isSynced INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (activityPeriodId) REFERENCES activity_periods(id)
      )
    `);
    
    // Recent notes (local cache)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recent_notes (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        noteText TEXT NOT NULL,
        lastUsedAt INTEGER NOT NULL,
        useCount INTEGER DEFAULT 1,
        createdAt INTEGER NOT NULL
      )
    `);
    
    // Sync queue for offline support
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        lastAttempt INTEGER,
        createdAt INTEGER NOT NULL
      )
    `);
    
    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
      CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(isActive);
      CREATE INDEX IF NOT EXISTS idx_sessions_sync ON sessions(isSynced);
      CREATE INDEX IF NOT EXISTS idx_activity_periods_session ON activity_periods(sessionId);
      CREATE INDEX IF NOT EXISTS idx_activity_periods_user_time ON activity_periods(userId, periodStart);
      CREATE INDEX IF NOT EXISTS idx_activity_periods_sync ON activity_periods(isSynced);
      CREATE INDEX IF NOT EXISTS idx_screenshots_period ON screenshots(activityPeriodId);
      CREATE INDEX IF NOT EXISTS idx_screenshots_user_time ON screenshots(userId, capturedAt);
      CREATE INDEX IF NOT EXISTS idx_screenshots_sync ON screenshots(isSynced);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_attempts ON sync_queue(attempts);
    `);
    
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
  createSession(data: {
    userId: string;
    mode: 'client_hours' | 'command_hours';
    projectId?: string;
    projectName?: string;
    task?: string;
  }): Session {
    // End any active sessions first
    this.endActiveSessions(data.userId);
    
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
      isSynced: 0,
      createdAt: Date.now()
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, userId, projectId, projectName, mode, startTime, endTime, isActive, task, isSynced, createdAt)
      VALUES (@id, @userId, @projectId, @projectName, @mode, @startTime, @endTime, @isActive, @task, @isSynced, @createdAt)
    `);
    
    stmt.run(session);
    
    // Add to sync queue
    this.addToSyncQueue('session', session.id, 'create', session);
    
    return session;
  }
  
  endActiveSessions(userId: string) {
    const stmt = this.db.prepare(`
      UPDATE sessions 
      SET isActive = 0, endTime = ?, isSynced = 0
      WHERE userId = ? AND isActive = 1
    `);
    const result = stmt.run(Date.now(), userId);
    
    if (result.changes > 0) {
      // Add to sync queue
      const sessions = this.db.prepare(
        'SELECT id FROM sessions WHERE userId = ? AND isActive = 0 AND endTime IS NOT NULL'
      ).all(userId);
      
      sessions.forEach((session: any) => {
        this.addToSyncQueue('session', session.id, 'update', { endTime: Date.now() });
      });
    }
  }
  
  getActiveSession(userId: string): Session | null {
    const stmt = this.db.prepare(`
      SELECT * FROM sessions 
      WHERE userId = ? AND isActive = 1 
      ORDER BY startTime DESC 
      LIMIT 1
    `);
    return stmt.get(userId) as Session | null;
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

  getRecentActivityPeriods(sessionId: string, limit: number = 10): any[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activity_periods 
      WHERE sessionId = ? 
      ORDER BY periodStart DESC 
      LIMIT ?
    `);
    
    return stmt.all(sessionId, limit) || [];
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
    periodStart: Date;
    periodEnd: Date;
    mode: 'client_hours' | 'command_hours';
    activityScore: number;
    isValid: boolean;
    classification?: string;
  }): ActivityPeriod {
    const period = {
      id: crypto.randomUUID(),
      sessionId: data.sessionId,
      userId: data.userId,
      periodStart: data.periodStart.getTime(),
      periodEnd: data.periodEnd.getTime(),
      mode: data.mode,
      notes: null,
      activityScore: data.activityScore,
      isValid: data.isValid ? 1 : 0,
      classification: data.classification || null,
      isSynced: 0,
      createdAt: Date.now()
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO activity_periods (
        id, sessionId, userId, periodStart, periodEnd, mode, 
        notes, activityScore, isValid, classification, isSynced, createdAt
      ) VALUES (
        @id, @sessionId, @userId, @periodStart, @periodEnd, @mode,
        @notes, @activityScore, @isValid, @classification, @isSynced, @createdAt
      )
    `);
    
    stmt.run(period);
    
    // Add to sync queue
    this.addToSyncQueue('activity_period', period.id, 'create', period);
    
    return period;
  }
  
  // Screenshot operations
  saveScreenshot(data: {
    userId: string;
    activityPeriodId: string;
    localPath: string;
    thumbnailPath?: string;
    capturedAt: Date;
    mode: 'client_hours' | 'command_hours';
    sessionId?: string;
    aggregatedScore?: number;
    relatedPeriodIds?: string[];
  }) {
    const screenshot = {
      id: crypto.randomUUID(),
      userId: data.userId,
      sessionId: data.sessionId || null,
      activityPeriodId: data.activityPeriodId,
      localPath: data.localPath,
      thumbnailPath: data.thumbnailPath || null,
      s3Url: null,
      capturedAt: data.capturedAt.getTime(),
      localCaptureTime: data.capturedAt.getTime(),
      aggregatedScore: data.aggregatedScore || 0,
      mode: data.mode,
      notes: null,
      isDeleted: 0,
      isSynced: 0,
      createdAt: Date.now()
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO screenshots (
        id, userId, sessionId, activityPeriodId, localPath, thumbnailPath, s3Url,
        capturedAt, localCaptureTime, aggregatedScore, mode, notes, isDeleted, isSynced, createdAt
      ) VALUES (
        @id, @userId, @sessionId, @activityPeriodId, @localPath, @thumbnailPath, @s3Url,
        @capturedAt, @localCaptureTime, @aggregatedScore, @mode, @notes, @isDeleted, @isSynced, @createdAt
      )
    `);
    
    stmt.run(screenshot);
    
    // Save related activity periods if provided
    if (data.relatedPeriodIds && data.relatedPeriodIds.length > 0) {
      const periodStmt = this.db.prepare(`
        INSERT INTO screenshot_periods (
          id, screenshotId, activityPeriodId, periodOrder, createdAt
        ) VALUES (
          @id, @screenshotId, @activityPeriodId, @periodOrder, @createdAt
        )
      `);
      
      data.relatedPeriodIds.forEach((periodId, index) => {
        periodStmt.run({
          id: crypto.randomUUID(),
          screenshotId: screenshot.id,
          activityPeriodId: periodId,
          periodOrder: index,
          createdAt: Date.now()
        });
      });
    }
    
    // Add to sync queue for S3 upload with all new fields
    this.addToSyncQueue('screenshot', screenshot.id, 'upload', {
      localPath: screenshot.localPath,
      capturedAt: screenshot.capturedAt,
      localCaptureTime: screenshot.localCaptureTime,
      activityPeriodId: screenshot.activityPeriodId,
      aggregatedScore: screenshot.aggregatedScore,
      relatedPeriodIds: data.relatedPeriodIds || [],
      mode: screenshot.mode,
      userId: screenshot.userId,
      sessionId: screenshot.sessionId
    });
    
    return screenshot;
  }
  
  getTodayScreenshots(userId: string): Screenshot[] {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const stmt = this.db.prepare(`
      SELECT 
        s.*,
        s.aggregatedScore as activityScore,
        ap.activityScore as periodActivityScore
      FROM screenshots s
      LEFT JOIN activity_periods ap ON s.activityPeriodId = ap.id
      WHERE s.userId = ? AND s.capturedAt >= ? AND s.isDeleted = 0
      ORDER BY COALESCE(s.localCaptureTime, s.capturedAt) ASC
    `);
    
    const screenshots = stmt.all(userId, todayStart.getTime()) as any[];
    
    // Get related periods for each screenshot
    const periodStmt = this.db.prepare(`
      SELECT ap.* FROM activity_periods ap
      JOIN screenshot_periods sp ON ap.id = sp.activityPeriodId
      WHERE sp.screenshotId = ?
      ORDER BY sp.periodOrder
    `);
    
    // Add the activity score from the aggregated score or period score
    return screenshots.map((s: any) => {
      const relatedPeriods = periodStmt.all(s.id) || [];
      return {
        ...s,
        activityScore: s.activityScore || s.periodActivityScore || 0,
        relatedPeriods: relatedPeriods.map((p: any) => ({
          id: p.id,
          periodStart: new Date(p.periodStart),
          periodEnd: new Date(p.periodEnd),
          activityScore: p.activityScore || 0
        }))
      };
    });
  }
  
  updateScreenshotUrls(screenshotId: string, s3Url: string, thumbnailUrl: string) {
    // First, check if we need to add thumbnailUrl column (for existing DBs)
    try {
      this.db.exec(`ALTER TABLE screenshots ADD COLUMN thumbnailUrl TEXT`);
    } catch (e) {
      // Column already exists, ignore error
    }
    
    const stmt = this.db.prepare(`
      UPDATE screenshots 
      SET s3Url = ?, thumbnailUrl = ?, isSynced = 1
      WHERE id = ?
    `);
    
    stmt.run(s3Url, thumbnailUrl, screenshotId);
    console.log(`Updated screenshot ${screenshotId} with S3 URLs`);
  }
  
  // Analytics operations
  getTodayStats(userId: string) {
    const stmt = this.db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN mode = 'client_hours' THEN (periodEnd - periodStart) / 60000 ELSE 0 END), 0) as clientMinutes,
        COALESCE(SUM(CASE WHEN mode = 'command_hours' THEN (periodEnd - periodStart) / 60000 ELSE 0 END), 0) as commandMinutes
      FROM activity_periods
      WHERE userId = ? 
        AND date(periodStart / 1000, 'unixepoch') = date('now')
        AND isValid = 1
    `);
    
    const stats = stmt.get(userId) as any;
    
    return {
      clientHours: (stats?.clientMinutes || 0) / 60,
      commandHours: (stats?.commandMinutes || 0) / 60,
      totalHours: ((stats?.clientMinutes || 0) + (stats?.commandMinutes || 0)) / 60
    };
  }
  
  getWeekStats(userId: string) {
    const stmt = this.db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN mode = 'client_hours' THEN (periodEnd - periodStart) / 60000 ELSE 0 END), 0) as clientMinutes,
        COALESCE(SUM(CASE WHEN mode = 'command_hours' THEN (periodEnd - periodStart) / 60000 ELSE 0 END), 0) as commandMinutes
      FROM activity_periods
      WHERE userId = ? 
        AND date(periodStart / 1000, 'unixepoch') >= date('now', '-7 days')
        AND isValid = 1
    `);
    
    const stats = stmt.get(userId) as any;
    
    return {
      clientHours: (stats?.clientMinutes || 0) / 60,
      commandHours: (stats?.commandMinutes || 0) / 60,
      totalHours: ((stats?.clientMinutes || 0) + (stats?.commandMinutes || 0)) / 60
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
      ORDER BY createdAt ASC 
      LIMIT ?
    `);
    
    return stmt.all(limit);
  }
  
  markSynced(queueId: string) {
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
    const existing = this.db.prepare(
      'SELECT * FROM recent_notes WHERE userId = ? AND noteText = ?'
    ).get(userId, noteText) as any;
    
    if (existing) {
      this.db.prepare(
        'UPDATE recent_notes SET useCount = useCount + 1, lastUsedAt = ? WHERE id = ?'
      ).run(Date.now(), existing.id);
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO recent_notes (id, userId, noteText, lastUsedAt, useCount, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(crypto.randomUUID(), userId, noteText, Date.now(), 1, Date.now());
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