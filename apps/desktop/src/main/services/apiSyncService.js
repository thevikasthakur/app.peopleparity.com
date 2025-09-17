"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiSyncService = void 0;
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
class ApiSyncService {
    constructor(db, store) {
        this.db = db;
        this.store = store;
        this.syncInterval = null;
        this.isOnline = true;
        const baseUrl = process.env.API_URL || 'http://localhost:3001';
        this.api = axios_1.default.create({
            baseURL: `${baseUrl}/api`,
            timeout: 10000,
        });
        this.setupInterceptors();
    }
    setupInterceptors() {
        // Add auth token to requests
        this.api.interceptors.request.use((config) => {
            const token = this.store.get('authToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
        // Handle auth errors
        this.api.interceptors.response.use((response) => response, (error) => {
            if (error.response?.status === 401) {
                this.store.delete('authToken');
                this.store.delete('user');
                this.db.clearCurrentUser();
            }
            return Promise.reject(error);
        });
    }
    async login(email, password) {
        try {
            console.log('Attempting login for:', email);
            // Call API to authenticate
            const response = await this.api.post('/auth/login', {
                email,
                password
            });
            console.log('API Response:', response.data);
            if (!response.data.success) {
                console.log('Login failed:', response.data.message);
                return {
                    success: false,
                    message: response.data.message || 'Login failed',
                };
            }
            const { user, token, projects } = response.data;
            console.log('Login successful, storing user data...');
            // Store user info locally for offline access
            this.db.setCurrentUser({
                id: user.id,
                email: user.email,
                name: user.name,
                organizationId: user.organizationId || '',
                organizationName: user.organizationName || '',
                role: user.role
            });
            // Cache projects locally
            if (projects && projects.length > 0) {
                this.db.cacheProjects(projects);
            }
            // Store token and user info
            this.store.set('user', user);
            this.store.set('authToken', token);
            return {
                success: true,
                user,
                token,
                projects
            };
        }
        catch (error) {
            // Check if we have cached credentials for offline mode
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                const cachedUser = this.db.getCurrentUser();
                if (cachedUser && cachedUser.email === email) {
                    // Allow offline login with cached user
                    console.log('API unavailable, using offline mode');
                    return {
                        success: true,
                        user: {
                            id: cachedUser.id,
                            email: cachedUser.email,
                            name: cachedUser.name,
                            organizationId: cachedUser.organizationId,
                            organizationName: cachedUser.organizationName,
                            role: cachedUser.role
                        },
                        token: 'offline-token',
                        message: 'Logged in offline mode'
                    };
                }
            }
            return {
                success: false,
                message: error.response?.data?.message || error.message || 'Login failed',
            };
        }
    }
    async logout() {
        try {
            // Call API to logout
            await this.api.post('/auth/logout');
        }
        catch (error) {
            console.error('Logout API call failed:', error);
        }
        // Clear local data
        this.store.delete('authToken');
        this.store.delete('user');
        this.db.clearCurrentUser();
        this.stopSync();
    }
    async checkSession() {
        const token = this.store.get('authToken');
        if (!token) {
            return {};
        }
        try {
            // Verify token with API
            const response = await this.api.get('/auth/verify');
            if (response.data.valid) {
                const user = response.data.user;
                // Update local cache
                this.db.setCurrentUser({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    organizationId: user.organizationId || '',
                    organizationName: user.organizationName || '',
                    role: user.role
                });
                return { user };
            }
        }
        catch (error) {
            // Use cached user for offline mode
            const cachedUser = this.db.getCurrentUser();
            if (cachedUser) {
                return {
                    user: {
                        id: cachedUser.id,
                        email: cachedUser.email,
                        name: cachedUser.name,
                        organizationId: cachedUser.organizationId,
                        organizationName: cachedUser.organizationName,
                        role: cachedUser.role
                    }
                };
            }
        }
        return {};
    }
    async fetchProjects() {
        try {
            const response = await this.api.get('/projects');
            if (response.data.projects) {
                this.db.cacheProjects(response.data.projects);
                return response.data.projects;
            }
        }
        catch (error) {
            console.error('Failed to fetch projects:', error);
            // Return cached projects
            return this.db.getCachedProjects();
        }
    }
    async fetchOrganizationUsers() {
        try {
            const response = await this.api.get('/users/organization');
            return response.data.users || [];
        }
        catch (error) {
            console.error('Failed to fetch organization users:', error);
            return [];
        }
    }
    async fetchLeaderboard() {
        try {
            const response = await this.api.get('/analytics/leaderboard');
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            // Return local user stats only
            const currentUser = this.db.getCurrentUser();
            if (currentUser) {
                const todayStats = this.db.getTodayStats(currentUser.id);
                const weekStats = this.db.getWeekStats(currentUser.id);
                return {
                    today: [{
                            userId: currentUser.id,
                            userName: currentUser.name,
                            totalHours: todayStats.totalHours,
                            rank: 1
                        }],
                    week: [{
                            userId: currentUser.id,
                            userName: currentUser.name,
                            totalHours: weekStats.totalHours,
                            rank: 1
                        }]
                };
            }
            return { today: [], week: [] };
        }
    }
    start() {
        // Start periodic sync - sync more frequently for real-time updates
        this.syncInterval = setInterval(() => {
            this.syncData();
        }, 30 * 1000); // Sync every 30 seconds for near real-time updates
        // Initial sync after a short delay
        setTimeout(() => {
            this.syncData();
        }, 5000);
        console.log('API sync service started - syncing every 30 seconds');
    }
    stopSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
    async syncData() {
        if (!this.isOnline)
            return;
        const token = this.store.get('authToken');
        if (!token || token === 'offline-token')
            return;
        try {
            console.log('Syncing data with server...');
            // Get unsynced items from local database
            const unsyncedItems = this.db.getUnsyncedItems();
            // Group items by type to ensure correct sync order
            const sessions = unsyncedItems.filter(item => item.entityType === 'session');
            const activityPeriods = unsyncedItems.filter(item => item.entityType === 'activity_period');
            const screenshots = unsyncedItems.filter(item => item.entityType === 'screenshot');
            const others = unsyncedItems.filter(item => item.entityType !== 'session' &&
                item.entityType !== 'activity_period' &&
                item.entityType !== 'screenshot');
            // Track successfully synced sessions
            const syncedSessionIds = new Set();
            // First, sync all sessions
            for (const item of sessions) {
                try {
                    await this.syncItem(item);
                    this.db.markSynced(item.id);
                    syncedSessionIds.add(item.entityId);
                    console.log(`Session ${item.entityId} synced successfully`);
                }
                catch (error) {
                    console.error(`Failed to sync session ${item.entityId}:`, error.message);
                    this.db.incrementSyncAttempts(item.id);
                }
            }
            // Then sync activity periods, but only if their session is synced
            for (const item of activityPeriods) {
                const data = JSON.parse(item.data);
                // Check if the session exists (either just synced or previously synced)
                if (data.sessionId) {
                    // If session wasn't in this batch, verify it exists on server
                    if (!syncedSessionIds.has(data.sessionId)) {
                        try {
                            // Verify session exists on server
                            const response = await this.api.get(`/sessions/${data.sessionId}`);
                            if (!response.data) {
                                console.log(`Session ${data.sessionId} doesn't exist on server yet, skipping activity period`);
                                continue;
                            }
                        }
                        catch (error) {
                            console.log(`Cannot verify session ${data.sessionId}, skipping activity period`);
                            continue;
                        }
                    }
                }
                try {
                    await this.syncItem(item);
                    this.db.markSynced(item.id);
                }
                catch (error) {
                    console.error(`Failed to sync activity period ${item.entityId}:`, error.message);
                    // If it's a foreign key error, don't increment attempts (will retry)
                    if (error.message?.includes('foreign key constraint')) {
                        console.log(`Will retry activity period ${item.entityId} later (session not ready)`);
                    }
                    else {
                        this.db.incrementSyncAttempts(item.id);
                    }
                }
            }
            // Track successfully synced activity periods
            const syncedPeriodIds = new Set();
            // Collect already synced periods for reference
            for (const item of activityPeriods) {
                const data = JSON.parse(item.data);
                if (data.id) {
                    syncedPeriodIds.add(data.id);
                }
            }
            // Sync screenshots only if their activity period is synced
            for (const item of screenshots) {
                const data = JSON.parse(item.data);
                // Check if the activity period exists (either just synced or previously synced)
                if (data.activityPeriodId) {
                    // If period wasn't in this batch, verify it exists on server
                    if (!syncedPeriodIds.has(data.activityPeriodId)) {
                        try {
                            // Verify activity period exists on server
                            const response = await this.api.get(`/activity-periods/${data.activityPeriodId}`);
                            if (!response.data) {
                                console.log(`Activity period ${data.activityPeriodId} doesn't exist on server yet, skipping screenshot`);
                                continue;
                            }
                        }
                        catch (error) {
                            console.log(`Activity period ${data.activityPeriodId} not found on server, skipping screenshot`);
                            continue;
                        }
                    }
                }
                try {
                    await this.syncItem(item);
                    this.db.markSynced(item.id);
                }
                catch (error) {
                    console.error(`Failed to sync screenshot ${item.id}:`, error.message);
                    // If it's a foreign key error, don't increment attempts (will retry)
                    if (error.message?.includes('foreign key constraint')) {
                        console.log(`Will retry screenshot ${item.id} later (activity period not ready)`);
                    }
                    else {
                        this.db.incrementSyncAttempts(item.id);
                    }
                }
            }
            // Finally sync other items
            for (const item of others) {
                try {
                    await this.syncItem(item);
                    this.db.markSynced(item.id);
                }
                catch (error) {
                    console.error(`Failed to sync item ${item.id}:`, error.message);
                    this.db.incrementSyncAttempts(item.id);
                }
            }
            console.log('Sync completed successfully');
        }
        catch (error) {
            console.error('Sync failed:', error);
            this.handleOffline();
        }
    }
    async syncItem(item) {
        const data = JSON.parse(item.data);
        try {
            switch (item.entityType) {
                case 'session':
                    console.log('Syncing session:', item.entityId);
                    if (item.operation === 'create') {
                        const sessionResponse = await this.api.post('/sessions', {
                            id: item.entityId, // Use the local session ID
                            ...data,
                            startTime: new Date(data.startTime).toISOString()
                        });
                        if (!sessionResponse.data.success) {
                            throw new Error(`Session creation failed: ${sessionResponse.data.message}`);
                        }
                        console.log('Session synced successfully with ID:', sessionResponse.data.session.id);
                    }
                    else if (item.operation === 'update') {
                        await this.api.patch(`/sessions/${item.entityId}`, {
                            endTime: new Date(data.endTime).toISOString()
                        });
                    }
                    break;
                case 'activity_period':
                    console.log('Syncing activity period:', item.entityId, 'for session:', data.sessionId);
                    const activityResponse = await this.api.post('/activity-periods', {
                        id: item.entityId, // Use the local activity period ID
                        ...data,
                        periodStart: new Date(data.periodStart).toISOString(),
                        periodEnd: new Date(data.periodEnd).toISOString()
                    });
                    if (!activityResponse.data.success) {
                        console.error('Activity period sync failed:', activityResponse.data);
                        if (activityResponse.data.error === 'Session does not exist') {
                            throw new Error(`foreign key constraint: ${activityResponse.data.message}`);
                        }
                        throw new Error(activityResponse.data.message || 'Activity period creation failed');
                    }
                    break;
                case 'screenshot':
                    console.log('Uploading screenshot to S3:', data.localPath);
                    // Read the actual file and upload to S3
                    const fs = require('fs');
                    const FormData = require('form-data');
                    if (!fs.existsSync(data.localPath)) {
                        console.error('Screenshot file not found:', data.localPath);
                        return;
                    }
                    const formData = new FormData();
                    const fileStream = fs.createReadStream(data.localPath);
                    formData.append('screenshot', fileStream, {
                        filename: path_1.default.basename(data.localPath),
                        contentType: 'image/jpeg'
                    });
                    formData.append('capturedAt', new Date(data.capturedAt).toISOString());
                    formData.append('activityPeriodId', data.activityPeriodId);
                    formData.append('mode', data.mode || 'command_hours');
                    formData.append('userId', data.userId);
                    const screenshotResponse = await this.api.post('/screenshots/upload', formData, {
                        headers: {
                            ...formData.getHeaders()
                        }
                    });
                    console.log('Screenshot uploaded:', screenshotResponse.data.url, 'Thumbnail:', screenshotResponse.data.thumbnailUrl);
                    // Update local DB with S3 URLs
                    if (screenshotResponse.data.url && screenshotResponse.data.thumbnailUrl) {
                        this.db.updateScreenshotUrls(item.entityId, screenshotResponse.data.url, screenshotResponse.data.thumbnailUrl);
                    }
                    break;
                case 'command_activity':
                case 'client_activity':
                    console.log('Syncing activity metrics:', item.entityType);
                    await this.api.post('/activities', {
                        type: item.entityType,
                        activityPeriodId: item.entityId,
                        ...data
                    });
                    break;
            }
            console.log(`Successfully synced ${item.entityType}:${item.entityId}`);
        }
        catch (error) {
            console.error(`Failed to sync ${item.entityType}:${item.entityId}:`, error.message);
            throw error;
        }
    }
    handleOffline() {
        this.isOnline = false;
        console.log('Working in offline mode');
        // Retry connection after 30 seconds
        setTimeout(() => {
            this.isOnline = true;
            this.syncData();
        }, 30000);
    }
    async uploadScreenshot(localPath) {
        try {
            const formData = new FormData();
            // Read file and append to form data
            const fs = require('fs');
            const fileStream = fs.createReadStream(localPath);
            formData.append('screenshot', fileStream);
            const response = await this.api.post('/screenshots/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data.url;
        }
        catch (error) {
            console.error('Failed to upload screenshot:', error);
            throw error;
        }
    }
}
exports.ApiSyncService = ApiSyncService;
//# sourceMappingURL=apiSyncService.js.map