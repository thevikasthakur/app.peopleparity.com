"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const localDatabase_1 = require("./localDatabase");
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const electron_store_1 = __importDefault(require("electron-store"));
class DatabaseService {
    constructor() {
        this.activityTracker = null; // Will be set by index.ts
        this.api = null;
        this.localDb = new localDatabase_1.LocalDatabase();
        this.store = new electron_store_1.default();
        this.initializeApiClient();
    }
    initializeApiClient() {
        const token = this.store.get('auth.token');
        const baseUrl = process.env.API_URL || 'http://localhost:3001';
        const apiUrl = `${baseUrl}/api`;
        if (token) {
            this.api = axios_1.default.create({
                baseURL: apiUrl,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            // Add response interceptor to handle auth errors
            this.api.interceptors.response.use(response => response, error => {
                if (error.response?.status === 401) {
                    console.log('API: Auth token expired or invalid');
                    this.api = null;
                }
                return Promise.reject(error);
            });
        }
    }
    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }
    async initialize() {
        console.log('Database service initialized');
    }
    // User management (delegated to LocalDatabase for current user only)
    setCurrentUser(userData) {
        this.localDb.setCurrentUser(userData);
    }
    getCurrentUser() {
        return this.localDb.getCurrentUser();
    }
    getCurrentUserId() {
        const user = this.localDb.getCurrentUser();
        if (!user) {
            throw new Error('No user logged in');
        }
        return user.id;
    }
    clearCurrentUser() {
        this.localDb.clearCurrentUser();
    }
    // Project management (cached from API)
    cacheProjects(projects) {
        this.localDb.cacheProjects(projects);
    }
    getCachedProjects() {
        return this.localDb.getCachedProjects();
    }
    getProjects() {
        return this.localDb.getCachedProjects();
    }
    // Session management
    async createSession(data) {
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
    async endSession(sessionId) {
        this.localDb.endActiveSessions(this.getCurrentUserId());
    }
    getActiveSession() {
        try {
            const userId = this.getCurrentUserId();
            return this.localDb.getActiveSession(userId);
        }
        catch {
            return null;
        }
    }
    // Activity period management
    async createActivityPeriod(data) {
        const period = this.localDb.createActivityPeriod({
            ...data,
            userId: this.getCurrentUserId()
        });
        return {
            id: period.id,
            ...data,
            createdAt: new Date(period.createdAt)
        };
    }
    async saveCommandHourActivity(periodId, data) {
        this.localDb.saveCommandHourActivity(periodId, data);
    }
    async saveClientHourActivity(periodId, data) {
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
            const periodId = crypto_1.default.randomUUID();
            const newPeriod = this.localDb.createActivityPeriod({
                id: periodId,
                sessionId: session.id,
                userId: this.getCurrentUserId(),
                periodStart: new Date(),
                periodEnd: new Date(Date.now() + 10 * 60 * 1000), // 10 minute periods
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
    // Screenshot management
    async saveScreenshot(data) {
        const session = this.localDb.getActiveSession(this.getCurrentUserId());
        if (!session)
            return;
        this.localDb.saveScreenshot({
            userId: this.getCurrentUserId(),
            activityPeriodId: data.activityPeriodId,
            localPath: data.localPath,
            thumbnailPath: data.thumbnailPath,
            capturedAt: data.capturedAt,
            mode: session.mode
        });
    }
    async getScreenshot(id) {
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
            }
            catch (error) {
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
    getTodayStats(userId) {
        return this.localDb.getTodayStats(userId);
    }
    getWeekStats(userId) {
        return this.localDb.getWeekStats(userId);
    }
    async getTodayScreenshots() {
        // Always try to fetch from cloud API first (primary source)
        try {
            const apiScreenshots = await this.fetchScreenshotsFromAPI();
            if (apiScreenshots && apiScreenshots.length > 0) {
                console.log('Using screenshots from cloud database');
                return apiScreenshots;
            }
        }
        catch (error) {
            console.log('Failed to fetch from cloud, falling back to local cache:', error);
        }
        // Fallback to local database only if API fails (offline mode)
        console.log('Using local database as fallback');
        const screenshots = this.localDb.getTodayScreenshots(this.getCurrentUserId());
        console.log('Raw screenshots from DB:', screenshots.map(s => ({
            id: s.id,
            s3Url: s.s3Url,
            thumbnailUrl: s.thumbnailUrl,
            thumbnailPath: s.thumbnailPath,
            localPath: s.localPath
        })));
        return screenshots.map(s => {
            // Never use file:// protocol - use S3 URLs or empty string
            let thumbnailUrl = '';
            let fullUrl = '';
            if (s.thumbnailUrl && s.thumbnailUrl.startsWith('http')) {
                thumbnailUrl = s.thumbnailUrl;
            }
            else if (s.s3Url && s.s3Url.startsWith('http')) {
                thumbnailUrl = s.s3Url.replace('_full.jpg', '_thumb.jpg');
            }
            if (s.s3Url && s.s3Url.startsWith('http')) {
                fullUrl = s.s3Url;
            }
            // If we still don't have valid URLs, don't include file:// paths
            if (!thumbnailUrl && s.thumbnailPath) {
                console.log('Warning: Screenshot', s.id, 'has no S3 URL, only local path:', s.thumbnailPath);
            }
            // Get real activity score from the activity period
            let activityScore = 0;
            if (s.activityPeriodId) {
                const period = this.localDb.getActivityPeriod(s.activityPeriodId);
                if (period) {
                    activityScore = period.activityScore || 0;
                    console.log(`Screenshot ${s.id} has activity score: ${activityScore} from period ${s.activityPeriodId}`);
                }
                else {
                    console.log(`Warning: Activity period ${s.activityPeriodId} not found for screenshot ${s.id}`);
                }
            }
            const result = {
                id: s.id,
                thumbnailUrl: thumbnailUrl || '', // Empty string if no valid URL
                fullUrl: fullUrl || '', // Empty string if no valid URL
                timestamp: new Date(s.capturedAt),
                notes: s.notes || '',
                mode: s.mode === 'client_hours' ? 'client' : 'command',
                activityScore: activityScore, // Real activity score from activity period
                activityPeriodId: s.activityPeriodId
            };
            console.log('Processed screenshot:', result.id, 'score:', result.activityScore, 'thumb:', result.thumbnailUrl || '(empty)');
            return result;
        });
    }
    async fetchScreenshotsFromAPI() {
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
                }
            });
            console.log(`API returned ${response.data.length} screenshots`);
            // Transform API response to match our format
            return response.data.map((s) => ({
                id: s.id,
                thumbnailUrl: s.thumbnailUrl || s.s3Url?.replace('_full.jpg', '_thumb.jpg') || '',
                fullUrl: s.s3Url || '',
                timestamp: new Date(s.capturedAt),
                notes: s.notes || '',
                mode: s.mode === 'client_hours' ? 'client' : 'command',
                // Use real activity score from the activity period
                activityScore: s.activityPeriod?.activityScore || s.activityScore || 0,
                activityPeriodId: s.activityPeriodId
            }));
        }
        catch (error) {
            console.error('Failed to fetch screenshots from API:', error.message);
            throw error;
        }
    }
    async updateScreenshotNotes(ids, notes) {
        // This would need to be implemented in LocalDatabase
        console.log('Updating screenshot notes:', ids, notes);
    }
    updateScreenshotUrls(screenshotId, s3Url, thumbnailUrl) {
        this.localDb.updateScreenshotUrls(screenshotId, s3Url, thumbnailUrl);
    }
    async transferScreenshotMode(ids, mode) {
        // This would need to be implemented in LocalDatabase
        console.log('Transferring screenshots to mode:', ids, mode);
    }
    async deleteScreenshots(ids) {
        // This would need to be implemented in LocalDatabase
        console.log('Deleting screenshots:', ids);
    }
    async getActivityPeriodDetails(periodId) {
        // This would need to be implemented in LocalDatabase
        return {
            id: periodId,
            activities: [
                { type: 'keypress', count: 523 },
                { type: 'mouseclick', count: 89 },
                { type: 'scroll', count: 34 }
            ]
        };
    }
    // Notes management
    async getRecentNotes() {
        return this.localDb.getRecentNotes(this.getCurrentUserId(), 10);
    }
    async saveNote(noteText) {
        this.localDb.saveRecentNote(this.getCurrentUserId(), noteText);
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
    getUnsyncedItems(limit) {
        return this.localDb.getUnsyncedItems(limit);
    }
    markSynced(queueId) {
        this.localDb.markSynced(queueId);
    }
    incrementSyncAttempts(queueId) {
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
            path: path_1.default.join(electron_1.app.getPath('userData'), 'local_tracking.db'),
            sizeInMB: `${sizeInMB} MB`,
            sizeInBytes
        };
    }
    // These methods are no longer needed as auth is handled by API
    authenticateUser(email, password) {
        throw new Error('Authentication should be handled by API server');
    }
    createOrganization(name, code, timezone) {
        throw new Error('Organization management should be handled by API server');
    }
    getOrganizations() {
        throw new Error('Organization management should be handled by API server');
    }
    createUser(data) {
        throw new Error('User management should be handled by API server');
    }
    getOrganizationUsers(organizationId) {
        throw new Error('User management should be handled by API server');
    }
    getUserById(userId) {
        throw new Error('User management should be handled by API server');
    }
    updateUserRole(userId, role) {
        throw new Error('User management should be handled by API server');
    }
    deactivateUser(userId) {
        throw new Error('User management should be handled by API server');
    }
    resetUserPassword(userId, newPassword) {
        throw new Error('User management should be handled by API server');
    }
    getOrganizationStats(organizationId) {
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
    setActivityTracker(tracker) {
        this.activityTracker = tracker;
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=databaseService.js.map