import { LocalDatabase } from './localDatabase';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import Store from 'electron-store';

export class DatabaseService {
  private static instance: DatabaseService;
  public localDb: LocalDatabase; // Made public for access from ScreenshotService
  private activityTracker: any = null; // Will be set by index.ts
  private api: AxiosInstance | null = null;
  private store: Store;
  private currentActivity: string = 'Working'; // Store current activity

  constructor() {
    this.localDb = new LocalDatabase();
    this.store = new Store();
    this.initializeApiClient();
    
    // Initialize current activity from the most recent note if available
    try {
      const user = this.localDb.getCurrentUser();
      if (user) {
        const recentNotes = this.localDb.getRecentNotes(user.id, 1);
        if (recentNotes && recentNotes.length > 0) {
          this.currentActivity = recentNotes[0];
          console.log(`DatabaseService: Initialized current activity to: "${this.currentActivity}"`);
        }
      }
    } catch (error) {
      console.log('DatabaseService: Could not initialize current activity from recent notes');
    }
  }
  
  private initializeApiClient() {
    const token = this.store.get('authToken') as string; // Changed from 'auth.token' to 'authToken'
    // Use IPv4 explicitly to avoid IPv6 connection issues
    const apiUrl = process.env.API_URL || 'http://127.0.0.1:3001/api';
    const apiUrlFixed = apiUrl.replace('localhost', '127.0.0.1').replace('[::1]', '127.0.0.1').replace('::1', '127.0.0.1');
    
    if (token) {
      this.api = axios.create({
        baseURL: apiUrlFixed,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Force IPv4
        httpAgent: new (require('http').Agent)({ family: 4 }),
        httpsAgent: new (require('https').Agent)({ family: 4 })
      } as any);
      
      // Add response interceptor to handle auth errors
      this.api.interceptors.response.use(
        response => response,
        error => {
          if (error.response?.status === 401) {
            console.log('API: Auth token expired or invalid');
            this.api = null;
          }
          return Promise.reject(error);
        }
      );
      
      console.log('API client initialized successfully');
    } else {
      console.log('No auth token found, API client not initialized');
    }
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize() {
    console.log('Database service initialized');
  }

  // User management (delegated to LocalDatabase for current user only)
  setCurrentUser(userData: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    organizationName: string;
    role: 'super_admin' | 'org_admin' | 'developer';
  }) {
    this.localDb.setCurrentUser(userData);
  }

  getCurrentUser() {
    return this.localDb.getCurrentUser();
  }

  getCurrentUserId(): string {
    let user = this.localDb.getCurrentUser();
    
    // If no user exists and we're in development mode, create a default user
    if (!user && process.env.NODE_ENV === 'development') {
      console.log('No user found, creating default development user');
      const defaultUser = {
        id: 'b09149e6-6ba6-498d-ae3b-f35a1e11f7f5', // Use the user ID we found in screenshots
        email: 'dev@example.com',
        name: 'Developer',
        organizationId: 'dev-org',
        organizationName: 'Development',
        role: 'developer' as const,
        lastSync: Date.now()
      };
      this.setCurrentUser(defaultUser);
      user = defaultUser;
    }
    
    if (!user) {
      throw new Error('No user logged in');
    }
    return user.id;
  }

  clearCurrentUser() {
    this.localDb.clearCurrentUser();
  }

  // Project management (cached from API)
  cacheProjects(projects: any[]) {
    this.localDb.cacheProjects(projects);
  }

  getCachedProjects() {
    return this.localDb.getCachedProjects();
  }

  getProjects() {
    return this.localDb.getCachedProjects();
  }

  // Session management
  async createSession(data: {
    mode: 'client_hours' | 'command_hours';
    projectId?: string;
    task?: string;
    startTime: Date;
  }) {
    const session = this.localDb.createSession({
      userId: this.getCurrentUserId(),
      mode: data.mode,
      projectId: data.projectId,
      projectName: data.projectId ? 
        this.localDb.getCachedProjects().find(p => p.id === data.projectId)?.name : undefined,
      task: data.task
    });
    
    return {
      id: session.id,
      userId: session.userId,
      mode: session.mode,
      projectId: session.projectId || undefined,
      startTime: new Date(session.startTime),
      isActive: true,
      task: session.task || undefined
    };
  }

  async endSession(sessionId: string) {
    this.localDb.endActiveSessions(this.getCurrentUserId());
  }
  
  getActiveSession() {
    try {
      const userId = this.getCurrentUserId();
      return this.localDb.getActiveSession(userId);
    } catch {
      return null;
    }
  }
  
  getSession(sessionId: string) {
    return this.localDb.getSession(sessionId);
  }

  // Activity period management
  async createActivityPeriod(data: any) {
    const periodData = {
      id: data.id, // Pass through the ID if provided
      sessionId: data.sessionId,
      userId: data.userId || this.getCurrentUserId(),
      screenshotId: data.screenshotId || null, // Include screenshotId
      periodStart: data.startTime || data.periodStart,
      periodEnd: data.endTime || data.periodEnd,
      mode: data.mode,
      activityScore: data.activityScore || 0,
      isValid: data.isValid !== undefined ? data.isValid : true,
      classification: data.classification,
      metricsBreakdown: data.metricsBreakdown // Include detailed metrics
    };
    
    const period = this.localDb.createActivityPeriod(periodData);
    
    return period;
  }

  async saveCommandHourActivity(periodId: string, data: any) {
    this.localDb.saveCommandHourActivity(periodId, data);
  }

  async saveClientHourActivity(periodId: string, data: any) {
    this.localDb.saveClientHourActivity(periodId, data);
  }

  async getCurrentActivity() {
    const session = this.localDb.getActiveSession(this.getCurrentUserId());
    
    if (!session) {
      return null;
    }
    
    // Ensure the activity tracker knows about the current session
    // This is important when the tracker instance is shared
    if (this.activityTracker && session.id) {
      const trackerSessionId = this.activityTracker.getCurrentSessionId?.();
      if (trackerSessionId !== session.id) {
        console.error('Activity tracker session mismatch!');
        console.error(`Database session: ${session.id}, Tracker session: ${trackerSessionId}`);
        console.error('This should not happen - tracker should be restored on startup');
        // Don't create fake data, just return actual score
      }
    }
    
    // Get current activity period
    const currentPeriod = this.localDb.getCurrentActivityPeriod(session.id);
    
    if (!currentPeriod) {
      // Create a new period if none exists
      const periodId = crypto.randomUUID();
      const newPeriod = this.localDb.createActivityPeriod({
        id: periodId,
        sessionId: session.id,
        userId: this.getCurrentUserId(),
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 60 * 1000), // 1 minute periods
        mode: session.mode,
        activityScore: 0,
        isValid: true
      });
      
      // Get real-time activity score from activity tracker
      const realtimeScore = this.activityTracker?.getCurrentActivityScore?.() || 0;
      
      return {
        isActive: true,
        activityScore: realtimeScore,
        periodId: newPeriod.id,
        sessionId: session.id
      };
    }
    
    // Get real-time activity score from activity tracker if available
    const realtimeScore = this.activityTracker?.getCurrentActivityScore?.() || 0;
    
    // Use real-time score if available, otherwise fall back to stored metrics
    const activityMetrics = this.localDb.getActivityMetrics(currentPeriod.id);
    const storedScore = activityMetrics ? activityMetrics.activityScore : 0;
    let activityScore = realtimeScore > 0 ? realtimeScore : storedScore;
    
    // Log if no activity detected
    if (activityScore === 0 && session.mode === 'command_hours') {
      console.log('No activity detected in current period');
    }
    
    return {
      isActive: true,
      activityScore: activityScore,
      periodId: currentPeriod.id,
      sessionId: session.id
    };
  }

  async getAggregatedActivityScore(periodCount: number = 10): Promise<number> {
    const session = this.localDb.getActiveSession(this.getCurrentUserId());
    if (!session) {
      return 0;
    }
    
    // Get the last N activity periods for this session
    const recentPeriods = this.localDb.getRecentActivityPeriods(session.id, periodCount);
    
    if (!recentPeriods || recentPeriods.length === 0) {
      return 0;
    }
    
    // Calculate the average activity score across all periods
    const totalScore = recentPeriods.reduce((sum, period) => sum + (period.activityScore || 0), 0);
    const averageScore = Math.round(totalScore / recentPeriods.length);
    
    console.log(`Aggregated ${recentPeriods.length} periods: scores=[${recentPeriods.map(p => p.activityScore).join(', ')}], average=${averageScore}`);
    
    return averageScore;
  }

  async getRecentActivityPeriods(periodCount: number = 10): Promise<any[]> {
    const session = this.localDb.getActiveSession(this.getCurrentUserId());
    if (!session) {
      return [];
    }
    
    return this.localDb.getRecentActivityPeriods(session.id, periodCount);
  }

  async getActivityPeriodsForTimeRange(sessionId: string, windowStart: Date, windowEnd: Date): Promise<any[]> {
    return this.localDb.getActivityPeriodsForTimeRange(sessionId, windowStart, windowEnd);
  }

  // Screenshot management
  async saveScreenshot(data: {
    id?: string;  // Optional ID to use instead of generating new one
    localPath: string;
    thumbnailPath: string;
    capturedAt: Date;
    activityScore?: number;
    relatedPeriodIds?: string[];
    sessionId?: string;
    notes?: string;  // Add notes parameter
  }) {
    let session = this.localDb.getActiveSession(this.getCurrentUserId());
    let sessionId = data.sessionId || session?.id;
    
    // If no session exists, create an idle session
    if (!sessionId) {
      const idleSessionData = {
        mode: 'command_hours' as const,
        projectId: undefined,
        task: 'Idle - No active tracking',
        startTime: new Date()
      };
      
      const newSession = await this.createSession(idleSessionData);
      sessionId = newSession.id;
      console.log(`Created idle session ${sessionId} for screenshot storage`);
      
      // Restore the idle session in activity tracker so activity periods are created
      if (this.activityTracker) {
        this.activityTracker.restoreSession(sessionId, 'command_hours', undefined);
        console.log(`Restored idle session ${sessionId} in activity tracker`);
      }
    }
    
    const mode = session?.mode || 'command_hours';
    
    // Use provided notes, or fall back to session task
    const notes = data.notes || session?.task || 'Idle';
    
    return this.localDb.saveScreenshot({
      id: data.id,  // Pass through the ID if provided
      userId: this.getCurrentUserId(),
      sessionId: sessionId,
      localPath: data.localPath,
      thumbnailPath: data.thumbnailPath,
      capturedAt: data.capturedAt,
      mode: mode,
      task: notes  // Use the determined notes value
    });
  }

  async getScreenshot(id: string) {
    // This would need to be implemented in LocalDatabase
    return null;
  }

  // Dashboard data - fetch from cloud API first, fallback to local
  async getDashboardData() {
    const userId = this.getCurrentUserId();
    
    // Try to fetch from cloud API first
    if (this.api) {
      try {
        console.log('Fetching dashboard data from cloud...');
        const [sessionsRes, statsRes] = await Promise.all([
          this.api.get('/sessions/active'),
          this.api.get('/dashboard/stats')
        ]);
        
        const cloudSession = sessionsRes.data;
        const cloudStats = statsRes.data;
        
        // Transform cloud data to match our format
        return {
          currentSession: cloudSession ? {
            id: cloudSession.id,
            startTime: new Date(cloudSession.startTime),
            activity: cloudSession.task || 'Working...',
            mode: cloudSession.mode === 'client_hours' ? 'client' : 'command',
            projectName: cloudSession.project?.name,
            isActive: cloudSession.isActive
          } : null,
          todayStats: {
            clientHours: cloudStats.today.clientHours || 0,
            commandHours: cloudStats.today.commandHours || 0,
            totalHours: cloudStats.today.totalHours || 0,
            analytics: {
              focusMinutes: cloudStats.today.focusMinutes || 0,
              handsOnMinutes: cloudStats.today.handsOnMinutes || 0,
              researchMinutes: cloudStats.today.researchMinutes || 0,
              aiMinutes: cloudStats.today.aiMinutes || 0
            }
          },
          weekStats: {
            clientHours: cloudStats.week.clientHours || 0,
            commandHours: cloudStats.week.commandHours || 0,
            totalHours: cloudStats.week.totalHours || 0
          }
        };
      } catch (error) {
        console.log('Failed to fetch from cloud, using local data:', error);
      }
    }
    
    // Fallback to local database
    console.log('Using local database for dashboard data');
    const session = this.localDb.getActiveSession(userId);
    const todayStats = this.localDb.getTodayStats(userId);
    const weekStats = this.localDb.getWeekStats(userId);
    const projects = this.localDb.getCachedProjects();
    
    return {
      currentSession: session ? {
        id: session.id,
        startTime: new Date(session.startTime),
        activity: session.task || 'Working...',
        mode: session.mode === 'client_hours' ? 'client' : 'command',
        projectName: projects.find(p => p.id === session.projectId)?.name,
        isActive: true
      } : null,
      todayStats: {
        clientHours: todayStats.clientHours,
        commandHours: todayStats.commandHours,
        totalHours: todayStats.totalHours,
        analytics: {
          focusMinutes: Math.round(todayStats.totalHours * 60 * 0.7),
          handsOnMinutes: Math.round(todayStats.totalHours * 60 * 0.6),
          researchMinutes: Math.round(todayStats.totalHours * 60 * 0.2),
          aiMinutes: Math.round(todayStats.totalHours * 60 * 0.1)
        }
      },
      weekStats: {
        clientHours: weekStats.clientHours,
        commandHours: weekStats.commandHours,
        totalHours: weekStats.totalHours
      }
    };
  }

  // Analytics
  getTodayStats(userId: string) {
    return this.localDb.getTodayStats(userId);
  }

  getWeekStats(userId: string) {
    return this.localDb.getWeekStats(userId);
  }

  async getScreenshotsByDate(date: Date) {
    console.log('\n=== getScreenshotsByDate called ===', date);
    
    // Try to get current user ID, but handle case where no user is logged in
    let userId: string;
    try {
      userId = this.getCurrentUserId();
    } catch (error) {
      console.log('No user logged in, returning empty screenshots array');
      return [];
    }
    
    const screenshots = this.localDb.getScreenshotsByDate(userId, date);
    console.log('Raw screenshots from DB for date:', date.toDateString(), screenshots.length);
    
    try {
      const mappedScreenshots = screenshots.map(s => {
        try {
          // Never use file:// protocol - use S3 URLs or empty string
          let thumbnailUrl = '';
          let fullUrl = '';
          
          if (s.thumbnailUrl && s.thumbnailUrl.startsWith('http')) {
            thumbnailUrl = s.thumbnailUrl;
          } else if (s.url && s.url.startsWith('http')) {
            thumbnailUrl = s.url.replace('_full.jpg', '_thumb.jpg');
          }
          
          if (s.url && s.url.startsWith('http')) {
            fullUrl = s.url;
          }
          
          // Get activity score from related periods
          let activityScore = (s as any).activityScore || 0;
          
          // Get related period IDs from the already loaded data
          let activityPeriodIds = [];
          if ((s as any).relatedPeriods && Array.isArray((s as any).relatedPeriods)) {
            activityPeriodIds = (s as any).relatedPeriods.map((p: any) => p.id);
          }
          
          // Get sync status if available
          const syncStatus = (s as any).syncStatus || null;
          
          const result = {
            id: s.id,
            thumbnailUrl: thumbnailUrl || '', // Empty string if no valid URL
            fullUrl: fullUrl || '', // Empty string if no valid URL
            timestamp: new Date(s.capturedAt),
            notes: s.notes || '',
            mode: s.mode === 'client_hours' ? 'client' as const : 'command' as const,
            activityScore: activityScore,
            activityPeriodIds: activityPeriodIds,
            syncStatus: syncStatus
          };
          
          return result;
        } catch (mapError) {
          console.error('Error mapping screenshot:', s.id, mapError);
          throw mapError;
        }
      });
      
      console.log(`Successfully mapped ${mappedScreenshots.length} screenshots for date ${date.toDateString()}`);
      return mappedScreenshots;
    } catch (error) {
      console.error('Error in screenshot mapping:', error);
      throw error;
    }
  }

  async getTodayScreenshots() {
    console.log('\n=== getTodayScreenshots called ===');
    // Skip API for now to debug the local database issue
    // // Always try to fetch from cloud API first (primary source)
    // try {
    //   const apiScreenshots = await this.fetchScreenshotsFromAPI();
    //   if (apiScreenshots && apiScreenshots.length > 0) {
    //     console.log('Using screenshots from cloud database');
    //     return apiScreenshots;
    //   }
    // } catch (error) {
    //   console.log('Failed to fetch from cloud, falling back to local cache:', error);
    // }
    
    // Fallback to local database only if API fails (offline mode)
    console.log('Using local database as fallback');
    
    // Try to get current user ID, but handle case where no user is logged in
    let userId: string;
    try {
      userId = this.getCurrentUserId();
    } catch (error) {
      console.log('No user logged in, returning empty screenshots array');
      return [];
    }
    
    const screenshots = this.localDb.getTodayScreenshots(userId);
    
    console.log('Raw screenshots from DB:', screenshots.map(s => ({
      id: s.id,
      url: s.url,
      thumbnailUrl: s.thumbnailUrl,
      thumbnailPath: s.thumbnailPath,
      localPath: s.localPath,
      activityScore: (s as any).activityScore,
      relatedPeriods: (s as any).relatedPeriods?.length || 0
    })));
    
    try {
      const mappedScreenshots = screenshots.map(s => {
        try {
          // Never use file:// protocol - use S3 URLs or empty string
          let thumbnailUrl = '';
          let fullUrl = '';
          
          if (s.thumbnailUrl && s.thumbnailUrl.startsWith('http')) {
            thumbnailUrl = s.thumbnailUrl;
          } else if (s.url && s.url.startsWith('http')) {
            thumbnailUrl = s.url.replace('_full.jpg', '_thumb.jpg');
          }
          
          if (s.url && s.url.startsWith('http')) {
            fullUrl = s.url;
          }
          
          // If we still don't have valid URLs, don't include file:// paths
          if (!thumbnailUrl && s.thumbnailPath) {
            console.log('Warning: Screenshot', s.id, 'has no URL, only local path:', s.thumbnailPath);
          }
          
          // Get activity score from related periods (calculated in getTodayScreenshots)
          let activityScore = (s as any).activityScore || 0;
          
          // Get related period IDs from the already loaded data
          let activityPeriodIds = [];
          if ((s as any).relatedPeriods && Array.isArray((s as any).relatedPeriods)) {
            activityPeriodIds = (s as any).relatedPeriods.map((p: any) => p.id);
          }
          
          // Get sync status if available
          const syncStatus = (s as any).syncStatus || null;
          
          console.log(`Screenshot ${s.id} has activity score: ${activityScore}`);
          
          const result = {
            id: s.id,
            thumbnailUrl: thumbnailUrl || '',  // Empty string if no valid URL
            fullUrl: fullUrl || '',  // Empty string if no valid URL
            timestamp: new Date(s.capturedAt),
            notes: s.notes || '',
            mode: s.mode === 'client_hours' ? 'client' : 'command' as any,
            activityScore: activityScore,  // Calculated from related periods
            activityPeriodIds: activityPeriodIds,  // Array of period IDs from related periods
            syncStatus: syncStatus  // Add sync status information
          };
          
          console.log('Processed screenshot:', result.id, 'score:', result.activityScore, 'thumb:', result.thumbnailUrl || '(empty)');
          return result;
        } catch (mapError) {
          console.error('Error mapping screenshot:', s.id, mapError);
          throw mapError;
        }
      });
      
      console.log(`Successfully mapped ${mappedScreenshots.length} screenshots`);
      return mappedScreenshots;
    } catch (error) {
      console.error('Error in screenshot mapping:', error);
      throw error;
    }
  }
  
  private async fetchScreenshotsFromAPI(): Promise<any[]> {
    if (!this.api) {
      console.log('API client not initialized, user might not be logged in');
      return [];
    }
    
    try {
      // Get today's date range
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      console.log('Fetching screenshots from API for today...');
      
      // Fetch screenshots with activity periods included
      const response = await this.api.get('/screenshots', {
        params: {
          startDate: todayStart.toISOString(),
          endDate: todayEnd.toISOString(),
          includeActivityPeriod: true
        },
        timeout: 5000 // 5 second timeout
      });
      
      console.log(`API returned ${response.data.length} screenshots`);
      
      // Transform API response to match our format
      return response.data.map((s: any) => ({
        id: s.id,
        thumbnailUrl: s.thumbnailUrl || s.url?.replace('_full.jpg', '_thumb.jpg') || '',
        fullUrl: s.url || '',
        timestamp: new Date(s.capturedAt),
        notes: s.notes || '',
        mode: s.mode === 'client_hours' ? 'client' : 'command',
        // Use real activity score from the activity period
        activityScore: s.activityPeriod?.activityScore || s.activityScore || 0,
        activityPeriodId: s.activityPeriodId
      }));
    } catch (error: any) {
      console.error('Failed to fetch screenshots from API:', error.message);
      throw error;
    }
  }

  async updateScreenshotNotes(ids: string[], notes: string) {
    return this.localDb.updateScreenshotNotes(ids, notes);
  }
  
  updateScreenshotUrls(screenshotId: string, url: string, thumbnailUrl: string) {
    this.localDb.updateScreenshotUrls(screenshotId, url, thumbnailUrl);
  }

  async transferScreenshotMode(ids: string[], mode: 'client_hours' | 'command_hours') {
    // This would need to be implemented in LocalDatabase
    console.log('Transferring screenshots to mode:', ids, mode);
  }

  async deleteScreenshots(ids: string[]) {
    console.log('DatabaseService: Deleting screenshots:', ids);
    return this.localDb.deleteScreenshots(ids);
  }

  async getActivityPeriodDetails(periodId: string) {
    const period = this.localDb.getActivityPeriodWithMetrics(periodId);
    if (!period) {
      return null;
    }
    
    return {
      id: period.id,
      periodStart: new Date(period.periodStart),
      periodEnd: new Date(period.periodEnd),
      activityScore: period.activityScore,
      metricsBreakdown: period.metricsBreakdown,
      classification: period.classification
    };
  }
  
  async getActivityPeriodsWithMetrics(periodIds: string[]) {
    const periods = this.localDb.getActivityPeriodsWithMetrics(periodIds);
    return periods.map(period => ({
      id: period.id,
      periodStart: new Date(period.periodStart),
      periodEnd: new Date(period.periodEnd),
      activityScore: period.activityScore,
      metricsBreakdown: period.metricsBreakdown,
      classification: period.classification
    }));
  }

  // Notes management
  async getRecentNotes() {
    return this.localDb.getRecentNotes(this.getCurrentUserId(), 10);
  }

  async saveNote(noteText: string) {
    console.log(`DatabaseService: saveNote called with: "${noteText}"`);
    const userId = this.getCurrentUserId();
    console.log(`DatabaseService: Current user ID: ${userId}`);
    
    // Store the current activity for screenshot service to use
    this.currentActivity = noteText;
    console.log(`DatabaseService: Updated current activity to: "${noteText}"`);
    
    this.localDb.saveRecentNote(userId, noteText);
    console.log(`DatabaseService: saveNote completed`);
  }
  
  getCurrentActivityNote(): string {
    return this.currentActivity;
  }

  // Leaderboard
  async getLeaderboard() {
    // For local mode, just return the current user
    const todayStats = this.localDb.getTodayStats(this.getCurrentUserId());
    const weekStats = this.localDb.getWeekStats(this.getCurrentUserId());
    const currentUser = this.localDb.getCurrentUser();
    
    return {
      today: [
        { 
          userId: this.getCurrentUserId(), 
          userName: currentUser?.name || 'You', 
          totalHours: todayStats.totalHours, 
          rank: 1 
        }
      ],
      week: [
        { 
          userId: this.getCurrentUserId(), 
          userName: currentUser?.name || 'You', 
          totalHours: weekStats.totalHours, 
          rank: 1 
        }
      ]
    };
  }

  // Sync queue management
  getUnsyncedItems(limit?: number) {
    return this.localDb.getUnsyncedItems(limit);
  }

  markSynced(queueId: string) {
    this.localDb.markSynced(queueId);
  }

  incrementSyncAttempts(queueId: string) {
    this.localDb.incrementSyncAttempts(queueId);
  }

  // Export and maintenance
  async exportUserData() {
    // This would need to be implemented in LocalDatabase
    return {
      user: this.getCurrentUser(),
      sessions: [],
      screenshots: []
    };
  }
  
  getDatabaseInfo() {
    const sizeInBytes = this.localDb.getDatabaseSize();
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    
    return {
      path: path.join(app.getPath('userData'), 'local_tracking.db'),
      sizeInMB: `${sizeInMB} MB`,
      sizeInBytes
    };
  }

  // These methods are no longer needed as auth is handled by API
  authenticateUser(email: string, password: string) {
    throw new Error('Authentication should be handled by API server');
  }
  
  createOrganization(name: string, code: string, timezone?: string) {
    throw new Error('Organization management should be handled by API server');
  }
  
  getOrganizations() {
    throw new Error('Organization management should be handled by API server');
  }
  
  createUser(data: any) {
    throw new Error('User management should be handled by API server');
  }
  
  getOrganizationUsers(organizationId: string) {
    throw new Error('User management should be handled by API server');
  }
  
  getUserById(userId: string) {
    throw new Error('User management should be handled by API server');
  }
  
  updateUserRole(userId: string, role: string) {
    throw new Error('User management should be handled by API server');
  }
  
  deactivateUser(userId: string) {
    throw new Error('User management should be handled by API server');
  }
  
  resetUserPassword(userId: string, newPassword: string) {
    throw new Error('User management should be handled by API server');
  }
  
  getOrganizationStats(organizationId: string) {
    throw new Error('Organization stats should be handled by API server');
  }
  
  clearSyncQueue() {
    return this.localDb.clearSyncQueue();
  }
  
  clearSessionsAndRelatedData() {
    return this.localDb.clearSessionsAndRelatedData();
  }
  
  checkForeignKeys() {
    return this.localDb.checkForeignKeys();
  }
  
  enableForeignKeys() {
    return this.localDb.enableForeignKeys();
  }
  
  setActivityTracker(tracker: any) {
    this.activityTracker = tracker;
  }
}