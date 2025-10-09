import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from './databaseService';
import Store from 'electron-store';
import { app } from 'electron';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    organizationName: string;
    role: string;
  };
  token?: string;
  message?: string;
  projects?: any[];
}

export class ApiSyncService {
  private api: AxiosInstance;
  private syncInterval: NodeJS.Timeout | null = null;
  private versionCheckInterval: NodeJS.Timeout | null = null;
  private isOnline = true;
  private concurrentSessionDetected = false;
  private concurrentSessionHandledAt = 0;
  private versionErrorEmitted = false;
  private appVersion: string;

  constructor(
    private db: DatabaseService,
    private store: Store
  ) {
    // Read app version from package.json
    this.appVersion = this.getAppVersion();
    console.log('📱 App Version:', this.appVersion);

    // Use production API URL for packaged app, local for development
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    const envUrl = process.env.API_URL || (isDev ? 'http://localhost:3001' : 'https://efr76g502g.execute-api.ap-south-1.amazonaws.com');
    // Replace localhost with 127.0.0.1 to ensure IPv4 in development
    const baseUrl = envUrl.replace('localhost', '127.0.0.1');
    const apiUrl = `${baseUrl}/api`;

    console.log('🔗 API Service initialized with URL:', apiUrl);
    console.log('📦 App packaged:', app.isPackaged, 'Dev mode:', isDev);

    this.api = axios.create({
      baseURL: apiUrl,
      timeout: 10000
    });

    this.setupInterceptors();
  }

  private getAppVersion(): string {
    try {
      const packageJsonPath = path.join(__dirname, '../../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.appVersion || packageJson.version || 'unknown';
    } catch (error) {
      console.error('Failed to read app version:', error);
      return 'unknown';
    }
  }

  private setupInterceptors() {
    // Add auth token and app version to requests
    this.api.interceptors.request.use((config) => {
      const token = this.store.get('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Add app version header
      config.headers['x-app-version'] = this.appVersion;
      return config;
    });

    // Handle auth and version errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Handle version errors (426 Upgrade Required)
        if (error.response?.status === 426) {
          const errorData = error.response?.data;
          console.error('❌ App version not supported (426):', errorData);

          // Store version error to show in UI
          const versionError = {
            message: errorData.message || 'Your app version is not supported. Please update.',
            error: errorData.error,
            timestamp: Date.now()
          };
          this.store.set('versionError', versionError);

          // Emit event to notify main process (trigger UI notification and logout)
          // Only emit once to avoid multiple dialogs
          if (!this.versionErrorEmitted) {
            this.versionErrorEmitted = true;
            const { app } = require('electron');
            app.emit('version-upgrade-required', {
              message: versionError.message,
              timestamp: new Date()
            });
          }

          // Create a more user-friendly error with the version message
          const userError = new Error(versionError.message);
          (userError as any).isVersionError = true;
          (userError as any).statusCode = 426;

          return Promise.reject(userError);
        }

        if (error.response?.status === 401) {
          // Don't delete token for certain endpoints that might fail with 401 for other reasons
          const url = error.config?.url || '';
          const shouldClearAuth = !url.includes('/auth/verify') &&
                                 !url.includes('/auth/login') &&
                                 !url.includes('/sessions') &&
                                 !url.includes('/activity-periods');

          if (shouldClearAuth) {
            console.log('401 error on endpoint:', url, '- clearing auth token');
            this.store.delete('authToken');
            this.store.delete('user');
            this.db.clearCurrentUser();
          } else {
            console.log('401 error on endpoint:', url, '- keeping auth token');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async checkVersion(): Promise<{ isSupported: boolean; message?: string }> {
    try {
      const version = this.appVersion;
      const response = await this.api.get(`/app-versions/check/${version}`);

      if (response.data.isSupported) {
        console.log('✅ App version is supported:', version);
        this.store.delete('versionError'); // Clear any previous errors
        return { isSupported: true };
      } else {
        const message = `Version ${version} is not supported. Please update your app.`;
        console.error('❌ App version not supported:', version);
        this.store.set('versionError', {
          message,
          error: 'UNSUPPORTED_VERSION',
          timestamp: Date.now()
        });
        return { isSupported: false, message };
      }
    } catch (error: any) {
      console.error('Error checking app version:', error.message);

      // If it's a version error (426), don't allow the app to continue
      if ((error as any).isVersionError || (error as any).statusCode === 426 || error.response?.status === 426) {
        return {
          isSupported: false,
          message: error.message || 'Your app version is not supported. Please update.'
        };
      }

      // If we can't check version (network error, etc), allow the app to continue
      return { isSupported: true };
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
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
    } catch (error: any) {
      console.error('Login error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      });

      // Check for version errors first
      if ((error as any).isVersionError || (error as any).statusCode === 426) {
        return {
          success: false,
          message: error.message || 'Your app version is not supported. Please update your desktop application.'
        };
      }

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
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
    
    // Clear local data
    this.store.delete('authToken');
    this.store.delete('user');
    this.db.clearCurrentUser();
    this.stopSync();
  }

  async checkSession(): Promise<{ user?: any }> {
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
    } catch (error) {
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

  async verifyToken(token: string): Promise<{ valid: boolean; user?: any }> {
    try {
      console.log('Verifying token:', token.substring(0, 20) + '...');
      
      // Set the token temporarily for this request
      const response = await this.api.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Token verification response:', response.data);
      
      if (response.data.valid) {
        const user = response.data.user;
        
        // Store the token and user info
        this.store.set('authToken', token);
        this.store.set('user', user);
        
        // Update local cache
        this.db.setCurrentUser({
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: user.organizationId || '',
          organizationName: user.organizationName || '',
          role: user.role
        });
        
        console.log('Token verified successfully for user:', user.email);
        return { valid: true, user };
      } else {
        console.error('Token validation failed - server returned valid: false');
      }
    } catch (error: any) {
      console.error('Token verification error:', error.message);
      console.error('Error details:', error.response?.data || error);
    }

    return { valid: false };
  }

  async fetchProjects() {
    try {
      const response = await this.api.get('/projects');
      if (response.data.projects) {
        this.db.cacheProjects(response.data.projects);
        return response.data.projects;
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      // Return cached projects
      return this.db.getCachedProjects();
    }
  }

  async fetchOrganizationUsers() {
    try {
      const response = await this.api.get('/users/organization');
      return response.data.users || [];
    } catch (error) {
      console.error('Failed to fetch organization users:', error);
      return [];
    }
  }

  async fetchLeaderboard() {
    try {
      const response = await this.api.get('/analytics/leaderboard');
      return response.data;
    } catch (error) {
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

  async fetchDailyProductiveHours(date: Date) {
    try {
      const token = this.store.get('authToken');
      if (!token) {
        console.error('❌ No auth token found - user not logged in or token expired');
        return null;
      }

      console.log('🔄 Fetching daily productive hours from cloud for date:', date.toISOString());
      console.log('🔑 Using auth token:', (token as string).substring(0, 20) + '...');

      // Call the new productive hours endpoint
      const dateStr = date.toISOString().split('T')[0];
      const url = `/analytics/productive-hours/daily?date=${dateStr}`;
      console.log('📡 API URL:', this.api.defaults.baseURL + url);

      const response = await this.api.get(url);

      console.log('✅ Cloud API response for daily productive hours:', response.data);

      // Return the productive hours data
      if (response.data) {
        const result = {
          productiveHours: response.data.productiveHours || 0,
          averageActivityScore: response.data.averageActivityScore || 0,
          activityLevel: response.data.activityLevel || undefined,
          totalScreenshots: response.data.totalScreenshots || 0,
          validScreenshots: response.data.validScreenshots || 0
        };
        console.log('📊 Returning cloud data:', result);
        return result;
      }

      console.warn('⚠️ Cloud API returned empty data');
      return null;
    } catch (error: any) {
      console.error('❌ Failed to fetch daily productive hours from cloud:');
      console.error('  Error message:', error.message);
      console.error('  Error code:', error.code);
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Response data:', error.response.data);
      }

      // Return null to indicate fallback to local calculation
      return null;
    }
  }

  async fetchWeeklyProductiveHours(date: Date) {
    try {
      const token = this.store.get('authToken');
      if (!token) {
        console.error('❌ No auth token found - user not logged in or token expired');
        return null;
      }

      console.log('🔄 Fetching weekly productive hours from cloud for date:', date.toISOString());
      console.log('🔑 Using auth token:', (token as string).substring(0, 20) + '...');
      
      // Call the new productive hours endpoint
      const dateStr = date.toISOString().split('T')[0];
      const url = `/analytics/productive-hours/weekly?date=${dateStr}`;
      console.log('📡 API URL:', this.api.defaults.baseURL + url);

      const response = await this.api.get(url);

      console.log('✅ Cloud API response for weekly productive hours:', response.data);

      // Return the productive hours data
      if (response.data) {
        const result = {
          productiveHours: response.data.productiveHours || 0,
          averageActivityScore: response.data.averageActivityScore || 0,
          activityLevel: response.data.activityLevel || undefined,
          dailyData: response.data.dailyData || [],
          weekStart: response.data.weekStart,
          weekEnd: response.data.weekEnd
        };
        console.log('📊 Returning cloud data:', result);
        return result;
      }

      console.warn('⚠️ Cloud API returned empty data');
      return null;
    } catch (error: any) {
      console.error('❌ Failed to fetch weekly productive hours from cloud:');
      console.error('  Error message:', error.message);
      console.error('  Error code:', error.code);
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Response data:', error.response.data);
      }

      // Return null to indicate fallback to local calculation
      return null;
    }
  }

  async fetchDashboardStats() {
    try {
      console.log('Fetching dashboard stats from cloud...');
      const response = await this.api.get('/dashboard/stats');
      console.log('Dashboard stats response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error.message);
      return null;
    }
  }

  async fetchSignedUrl(screenshotId: string) {
    try {
      const response = await this.api.get(`/screenshots/${screenshotId}/signed-url`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch signed URL:', error.message);
      if (error.response?.status === 404) {
        return { success: false, error: 'Screenshot not found' };
      }
      if (error.response?.status === 403) {
        return { success: false, error: 'Unauthorized access' };
      }
      return { success: false, error: error.message || 'Failed to fetch signed URL' };
    }
  }

  async deleteScreenshot(screenshotId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    console.log(`[ApiSyncService] deleteScreenshot called for ID: ${screenshotId}`);
    try {
      console.log(`[ApiSyncService] Making DELETE request to: /screenshots/${screenshotId}`);
      const response = await this.api.delete(`/screenshots/${screenshotId}`);
      console.log(`[ApiSyncService] Screenshot ${screenshotId} deleted from cloud successfully, response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to delete screenshot from cloud:', error.message);
      if (error.response?.status === 404) {
        // Screenshot not found in cloud, consider it already deleted
        console.log(`Screenshot ${screenshotId} not found in cloud, treating as already deleted`);
        return { success: true, message: 'Screenshot already deleted from cloud' };
      }
      if (error.response?.status === 403) {
        return { success: false, error: 'Unauthorized to delete this screenshot' };
      }
      // For network errors, return success false but don't block local deletion
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.log('Cloud API unavailable, will delete from cloud later during sync');
        return { success: false, error: 'Cloud API unavailable' };
      }
      return { success: false, error: error.message || 'Failed to delete screenshot from cloud' };
    }
  }

  async checkAppVersion() {
    try {
      console.log('🔍 Checking app version:', this.appVersion);
      const response = await this.api.get(`/app-versions/check/${this.appVersion}`);

      if (response.data && !response.data.isSupported) {
        console.error('🚫 APP VERSION NO LONGER SUPPORTED!');

        // Store version error
        this.store.set('versionError', {
          message: `Version ${this.appVersion} is no longer supported. Please update your desktop application.`,
          error: 'UNSUPPORTED_VERSION',
          timestamp: Date.now()
        });

        // Emit event to stop tracking and logout
        const { app } = require('electron');
        app.emit('version-upgrade-required', {
          message: `Version ${this.appVersion} is no longer supported. Please update your desktop application.`,
          timestamp: new Date()
        });
      } else {
        console.log('✅ App version is supported');

        // Clear any stale version errors when version is confirmed supported
        const existingError = this.store.get('versionError') as any;
        if (existingError) {
          console.log('🧹 Clearing stale version error from store');
          this.store.delete('versionError');
          // Reset the flag so future version errors will trigger notifications
          this.versionErrorEmitted = false;
        }
      }
    } catch (error: any) {
      // If we get 426 status, the version is definitely not supported
      if (error.response?.status === 426) {
        console.error('🚫 APP VERSION NO LONGER SUPPORTED (426)!');

        // Store version error
        this.store.set('versionError', {
          message: error.response?.data?.message || `Version ${this.appVersion} is no longer supported. Please update your desktop application.`,
          error: 'UNSUPPORTED_VERSION',
          timestamp: Date.now()
        });

        const { app } = require('electron');
        app.emit('version-upgrade-required', {
          message: error.response?.data?.message || `Version ${this.appVersion} is no longer supported. Please update your desktop application.`,
          timestamp: new Date()
        });
      } else {
        // For other errors (network, etc), check if there's a stale version error
        const existingError = this.store.get('versionError') as any;
        if (existingError) {
          const errorAge = Date.now() - existingError.timestamp;
          const ONE_HOUR = 60 * 60 * 1000;

          // If version error is older than 1 hour, clear it (might be stale)
          if (errorAge > ONE_HOUR) {
            console.log('🧹 Clearing stale version error (older than 1 hour)');
            this.store.delete('versionError');
            // Reset the flag so future version errors will trigger notifications
            this.versionErrorEmitted = false;
          }
        }

        console.error('Failed to check app version:', error.message);
      }
    }
  }

  startVersionCheck() {
    // Check version immediately on start
    this.checkAppVersion();

    // Then check every 10 minutes
    this.versionCheckInterval = setInterval(() => {
      this.checkAppVersion();
    }, 10 * 60 * 1000); // 10 minutes

    console.log('📱 Version check started - checking every 10 minutes');
  }

  stopVersionCheck() {
    if (this.versionCheckInterval) {
      clearInterval(this.versionCheckInterval);
      this.versionCheckInterval = null;
      console.log('📱 Version check stopped');
    }
  }

  start() {
    // Reset concurrent session flag when starting
    this.concurrentSessionDetected = false;
    this.concurrentSessionHandledAt = 0;

    // Start periodic sync - sync more frequently for real-time updates
    this.syncInterval = setInterval(() => {
      this.syncData();
    }, 30 * 1000); // Sync every 30 seconds for near real-time updates

    // Initial sync after a short delay
    setTimeout(() => {
      this.syncData();
    }, 5000);

    // Start version checking
    this.startVersionCheck();

    console.log('API sync service started - syncing every 30 seconds');
  }

  resetConcurrentSessionFlag() {
    this.concurrentSessionDetected = false;
    this.concurrentSessionHandledAt = 0;
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.stopVersionCheck();
  }

  /**
   * Clean up failed screenshots with 0.0 score
   * These are auto-deleted after max attempts
   */
  async cleanupFailedScreenshots() {
    try {
      const failedItems = this.db.getFailedSyncItems();
      const screenshotsToDelete: string[] = [];
      const queueItemsToRemove: string[] = [];
      
      for (const item of failedItems) {
        const failedItem = item as any;
        if (failedItem.entityType === 'screenshot' && failedItem.attempts >= 5) {
          // Get screenshot details
          const screenshot = this.db.getScreenshot(failedItem.entityId);
          if (screenshot) {
            // Check if activity score is 0 (user was away)
            const activityPeriods = this.db.getActivityPeriodsForScreenshot(failedItem.entityId);
            const avgScore = activityPeriods.length > 0 
              ? activityPeriods.reduce((sum: number, p: any) => sum + (p.activityScore || 0), 0) / activityPeriods.length
              : 0;
            
            if (avgScore === 0) {
              console.log(`Auto-deleting failed screenshot ${failedItem.entityId} with 0.0 score after ${failedItem.attempts} attempts`);
              screenshotsToDelete.push(failedItem.entityId);
              queueItemsToRemove.push(failedItem.id);
            }
          }
        }
      }
      
      // Delete screenshots with 0.0 score
      if (screenshotsToDelete.length > 0) {
        this.db.deleteScreenshots(screenshotsToDelete);
        // Remove from sync queue
        for (const queueId of queueItemsToRemove) {
          this.db.removeSyncQueueItem(queueId);
        }
        console.log(`Cleaned up ${screenshotsToDelete.length} failed screenshots with 0.0 score`);
      }
    } catch (error) {
      console.error('Error cleaning up failed screenshots:', error);
    }
  }
  
  /**
   * Manually retry syncing a specific item and its related items
   */
  async retrySyncItem(entityId: string, entityType: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Manual retry requested for ${entityType} ${entityId}`);
      
      // If it's a screenshot, also retry its related activity periods
      if (entityType === 'screenshot') {
        // Get the screenshot's related activity periods
        const activityPeriods = this.db.getActivityPeriodsForScreenshot(entityId);
        console.log(`Found ${activityPeriods.length} activity periods for screenshot ${entityId}`);
        
        // Reset and retry each activity period
        for (const period of activityPeriods) {
          const periodQueueItem = this.db.getSyncQueueItem(period.id, 'activity_period') as any;
          if (periodQueueItem) {
            console.log(`Retrying activity period ${period.id}`);
            this.db.resetSyncAttempts(periodQueueItem.id);
            try {
              await this.syncItem(periodQueueItem);
              this.db.markSynced(periodQueueItem.id);
              console.log(`Successfully synced activity period ${period.id}`);
            } catch (error: any) {
              console.error(`Failed to sync activity period ${period.id}:`, error.message);
              this.db.incrementSyncAttempts(periodQueueItem.id);
            }
          }
        }
      }
      
      // Now sync the main item (screenshot)
      const queueItem = this.db.getSyncQueueItem(entityId, entityType) as any;
      if (!queueItem) {
        // For partial uploads, the item might already be synced or syncing
        // Check if the screenshot exists and has a URL (meaning it's at least partially synced)
        const screenshot = this.db.getScreenshot(entityId) as any;
        if (screenshot && screenshot.url) {
          console.log(`Screenshot ${entityId} appears to be already syncing/synced (has URL), triggering refresh`);
          // Return success to trigger UI refresh
          return { success: true };
        }
        
        // If it's truly not in queue and not synced, we still return success
        // The regular sync process will pick it up eventually
        console.log(`Item ${entityId} not in sync queue, likely already syncing`);
        if (screenshot) {
          console.log(`Screenshot ${entityId} exists, triggering UI refresh`);
          // Return success to trigger UI refresh even if not in queue
          return { success: true };
        }
        
        return { success: false, error: 'Item not found in sync queue' };
      }
      
      // Reset attempts to give it a fresh try
      this.db.resetSyncAttempts(queueItem.id);
      
      // Try to sync immediately
      try {
        await this.syncItem(queueItem);
        this.db.markSynced(queueItem.id);
        console.log(`Successfully synced ${entityType} ${entityId} on manual retry`);
        return { success: true };
      } catch (error: any) {
        console.error(`Failed to sync ${entityType} ${entityId} on manual retry:`, error.message);
        this.db.incrementSyncAttempts(queueItem.id);
        return { success: false, error: error.message };
      }
    } catch (error: any) {
      console.error('Error in manual retry:', error);
      return { success: false, error: error.message };
    }
  }

  private async syncData() {
    if (!this.isOnline) return;

    const token = this.store.get('authToken');
    if (!token || token === 'offline-token') return;

    // Check for stale version errors before syncing
    const versionError = this.store.get('versionError') as any;
    if (versionError) {
      const errorAge = Date.now() - versionError.timestamp;
      const FIVE_MINUTES = 5 * 60 * 1000;

      // If version error is older than 5 minutes, try to recheck version
      if (errorAge > FIVE_MINUTES) {
        console.log('⚠️ Stale version error detected (>5 minutes old), rechecking version...');
        await this.checkAppVersion();

        // If error is still there after recheck, don't sync
        if (this.store.get('versionError')) {
          console.log('Version is still not supported, skipping sync');
          return;
        } else {
          console.log('✅ Version error cleared, resuming sync');
        }
      } else {
        // Fresh version error, don't sync
        console.log('⚠️ Version error present (age: ' + Math.round(errorAge / 1000) + 's), skipping sync');
        return;
      }
    }

    // Clean up failed screenshots with 0.0 score before syncing
    await this.cleanupFailedScreenshots();

    try {
      // Get unsynced items from local database - increase batch size to handle backlog
      const unsyncedItems = this.db.getUnsyncedItems(200);
      
      // Only log if there are items to sync
      if (unsyncedItems.length > 0) {
        console.log(`Syncing ${unsyncedItems.length} items with server...`);
      }
      
      // Group items by type to ensure correct sync order
      const sessions = unsyncedItems.filter(item => item.entityType === 'session');
      const activityPeriods = unsyncedItems.filter(item => item.entityType === 'activity_period');
      const screenshots = unsyncedItems.filter(item => item.entityType === 'screenshot');
      const others = unsyncedItems.filter(item => 
        item.entityType !== 'session' && 
        item.entityType !== 'activity_period' && 
        item.entityType !== 'screenshot'
      );
      
      // Track successfully synced sessions
      const syncedSessionIds = new Set<string>();
      
      // First, sync all sessions
      for (const item of sessions) {
        try {
          await this.syncItem(item);
          this.db.markSynced(item.id);
          syncedSessionIds.add(item.entityId);
          console.log(`Session ${item.entityId} synced successfully`);
        } catch (error: any) {
          console.error(`Failed to sync session ${item.entityId}:`, error.message);
          this.db.incrementSyncAttempts(item.id);
        }
      }
      
      // Sync screenshots before activity periods (since periods now reference screenshots)
      console.log(`Found ${screenshots.length} screenshots to sync`);
      for (const item of screenshots) {
        try {
          console.log(`Syncing screenshot ${item.entityId}, attempts: ${item.attempts || 0}`);
          await this.syncItem(item);
          this.db.markSynced(item.id);
          console.log(`Screenshot ${item.entityId} synced successfully`);
        } catch (error: any) {
          console.error(`Failed to sync screenshot ${item.entityId}:`, error.message);
          console.error(`Error details:`, error.response?.data || error);
          this.db.incrementSyncAttempts(item.id);
        }
      }
      
      // Then sync activity periods, but only if their session and screenshot are synced
      for (const item of activityPeriods) {
        const data = JSON.parse(item.data);
        
        // Skip items that have failed too many times
        if (item.attempts >= 2) {
          continue; // Skip after 2 attempts to avoid flooding
        }
        
        // Check if the session exists (either just synced or previously synced)
        if (data.sessionId) {
          // If session wasn't in this batch, verify it exists on server
          if (!syncedSessionIds.has(data.sessionId)) {
            try {
              // Verify session exists on server
              const response = await this.api.get(`/sessions/${data.sessionId}`);
              if (!response.data) {
                // Only log first attempt
                if (item.attempts === 0) {
                  console.log(`Session ${data.sessionId} doesn't exist on server, will retry later`);
                }
                this.db.incrementSyncAttempts(item.id); // Increment attempts for non-existent sessions
                continue;
              }
            } catch (error) {
              // Only log first attempt
              if (item.attempts === 0) {
                console.log(`Cannot verify session ${data.sessionId}, will retry later`);
              }
              this.db.incrementSyncAttempts(item.id);
              continue;
            }
          }
        }
        
        // Check if screenshot exists (if period has a screenshot reference)
        if (data.screenshotId) {
          try {
            // Verify screenshot exists on server
            const response = await this.api.get(`/screenshots/${data.screenshotId}`);
            if (!response.data) {
              if (item.attempts === 0) {
                console.log(`Screenshot ${data.screenshotId} doesn't exist on server, will retry later`);
              }
              this.db.incrementSyncAttempts(item.id);
              continue;
            }
          } catch (error) {
            if (item.attempts === 0) {
              console.log(`Cannot verify screenshot ${data.screenshotId}, will retry later`);
            }
            this.db.incrementSyncAttempts(item.id);
            continue;
          }
        }
        
        try {
          await this.syncItem(item);
          this.db.markSynced(item.id);
        } catch (error: any) {
          console.error(`Failed to sync activity period ${item.entityId}:`, error.message);
          
          // If it's a foreign key error, don't increment attempts (will retry)
          if (error.message?.includes('foreign key constraint')) {
            console.log(`Will retry activity period ${item.entityId} later (dependencies not ready)`);
          } else {
            this.db.incrementSyncAttempts(item.id);
          }
        }
      }
      
      // Note: Screenshots are now synced before activity periods
      
      // Finally sync other items
      for (const item of others) {
        try {
          await this.syncItem(item);
          this.db.markSynced(item.id);
        } catch (error: any) {
          console.error(`Failed to sync item ${item.id}:`, error.message);
          this.db.incrementSyncAttempts(item.id);
        }
      }
      
      console.log('Sync completed successfully');
    } catch (error: any) {
      // Only log ECONNREFUSED once per offline period
      if (error.code === 'ECONNREFUSED') {
        if (this.isOnline) {
          console.log('API server is not available, switching to offline mode');
          this.handleOffline();
        }
        // Don't log repeated connection errors while offline
      } else {
        console.error('Sync failed:', error);
        this.handleOffline();
      }
    }
  }

  private async syncItem(item: any) {
    const data = JSON.parse(item.data);
    
    try {
      switch (item.entityType) {
        case 'session':
          console.log('Syncing session:', item.entityId);
          if (item.operation === 'create') {
            // Parse location if it's a string
            let location = data.location;
            if (location && typeof location === 'string') {
              try {
                location = JSON.parse(location);
              } catch (e) {
                console.warn('Failed to parse location:', e);
                location = null;
              }
            }
            
            const sessionResponse = await this.api.post('/sessions', {
              id: item.entityId, // Use the local session ID
              ...data,
              startTime: new Date(data.startTime).toISOString(),
              // Include the new metadata fields
              appVersion: data.appVersion,
              deviceInfo: data.deviceInfo,
              realIpAddress: data.realIpAddress,
              location: location,
              isVpnDetected: data.isVpnDetected === 1 || data.isVpnDetected === true
            });
            
            if (!sessionResponse.data.success) {
              throw new Error(`Session creation failed: ${sessionResponse.data.message}`);
            }
            console.log('Session synced successfully with ID:', sessionResponse.data.session.id);
            console.log('Session metadata synced:', {
              appVersion: data.appVersion,
              hostname: data.deviceInfo || 'Not provided',
              realIpAddress: data.realIpAddress,
              location: location,
              isVpnDetected: data.isVpnDetected
            });
          } else if (item.operation === 'update') {
            const updateData: any = {};
            if (data.endTime) {
              updateData.endTime = new Date(data.endTime).toISOString();
              // When ending a session, always set isActive to false
              updateData.isActive = false;
            }
            if (data.hasOwnProperty('isActive')) {
              updateData.isActive = data.isActive;
            }
            if (data.task !== undefined) {
              updateData.task = data.task;
            }
            await this.api.patch(`/sessions/${item.entityId}`, updateData);
            console.log(`Session ${item.entityId} updated with:`, updateData);
          }
          break;
          
        case 'activity_period':
          console.log('Syncing activity period:', item.entityId, 'for session:', data.sessionId, 'screenshot:', data.screenshotId);
          
          // Parse metricsBreakdown if it's a string
          let metricsBreakdown = null;
          if (data.metricsBreakdown) {
            try {
              metricsBreakdown = typeof data.metricsBreakdown === 'string' 
                ? JSON.parse(data.metricsBreakdown) 
                : data.metricsBreakdown;
            } catch (e) {
              console.warn('Failed to parse metricsBreakdown:', e);
            }
          }
          
          const activityResponse = await this.api.post('/activity-periods', {
            id: item.entityId, // Use the local activity period ID
            ...data,
            periodStart: new Date(data.periodStart).toISOString(),
            periodEnd: new Date(data.periodEnd).toISOString(),
            screenshotId: data.screenshotId, // Include screenshot FK
            metricsBreakdown // Include detailed metrics
          });
          
          if (!activityResponse.data.success) {
            console.error('Activity period sync failed:', activityResponse.data);
            
            // Handle concurrent session detection
            if (activityResponse.data.error === 'CONCURRENT_SESSION_DETECTED') {
              const details = activityResponse.data.details || {};
              const otherDeviceInfo = details.activeDevice || details.deviceInfo || '';
              const currentDeviceInfo = require('os').hostname();

              console.log('🔍 Concurrent session check:', {
                currentDevice: currentDeviceInfo,
                otherDevice: otherDeviceInfo,
                isSameDevice: otherDeviceInfo === currentDeviceInfo
              });

              // Only treat as concurrent session if it's from a DIFFERENT device
              if (otherDeviceInfo && otherDeviceInfo !== currentDeviceInfo) {
                console.error('🚫 CONCURRENT SESSION DETECTED! Another device is already tracking:', otherDeviceInfo);

                // Only emit event once per detection period (5 minutes)
                const now = Date.now();
                if (!this.concurrentSessionDetected || (now - this.concurrentSessionHandledAt) > 5 * 60 * 1000) {
                  this.concurrentSessionDetected = true;
                  this.concurrentSessionHandledAt = now;

                  // Emit event to stop tracking
                  const { app } = require('electron');
                  app.emit('concurrent-session-detected', {
                    message: activityResponse.data.message,
                    details: activityResponse.data.details,
                    sessionId: data.sessionId,
                    otherDevice: otherDeviceInfo
                  });
                }
              } else {
                console.log('⚠️ Concurrent session detected but from SAME device - ignoring');
                // Don't treat as error if it's the same device
                // This can happen when toggling tracking on/off quickly
              }
              
              // Mark this as a critical error that shouldn't be retried
              this.db.markSynced(item.id); // Mark as "synced" to remove from queue
              return; // Don't throw, just return
            }
            
            if (activityResponse.data.error === 'Session does not exist' || activityResponse.data.error === 'Screenshot does not exist') {
              throw new Error(`foreign key constraint: ${activityResponse.data.message}`);
            }
            throw new Error(activityResponse.data.message || 'Activity period creation failed');
          }
          break;
          
        case 'screenshot':
          console.log('Processing screenshot sync:', item.entityId);
          const fs = require('fs');
          
          // Check if screenshot already has S3 URLs (already uploaded)
          const screenshotData = this.db.getScreenshot(item.entityId) as any;
          if (!screenshotData) {
            console.error('Screenshot not found in database:', item.entityId);
            return;
          }
          
          let s3FullUrl = screenshotData.url;
          let s3ThumbnailUrl = screenshotData.thumbnailUrl;
          
          // If URLs don't exist, upload to S3 first
          if (!s3FullUrl || !s3ThumbnailUrl) {
            if (!fs.existsSync(data.localPath)) {
              console.error('Screenshot file not found:', data.localPath);
              return;
            }
            
            console.log('Uploading screenshot to S3:', data.localPath);
            const capturedAt = new Date(data.capturedAt); // Use the actual capture time
            const uploadResult = await this.uploadScreenshot(data.localPath, capturedAt);
            s3FullUrl = uploadResult.fullUrl;
            s3ThumbnailUrl = uploadResult.thumbnailUrl;
            
            console.log('Screenshot uploaded to S3:', s3FullUrl);
            
            // Update local DB with S3 URLs
            this.db.updateScreenshotUrls(item.entityId, s3FullUrl, s3ThumbnailUrl);
            
            // Delete local files since they're now on S3
            try {
              await fs.promises.unlink(data.localPath);
              if (data.thumbnailPath) {
                await fs.promises.unlink(data.thumbnailPath);
              }
              console.log('Deleted local screenshot files after successful S3 upload');
            } catch (deleteError) {
              console.warn('Failed to delete local screenshot files:', deleteError);
            }
          }
          
          // Step 2: Send screenshot data with S3 URLs to the server
          console.log('Creating screenshot record on server with S3 URLs');
          const screenshotResponse = await this.api.post('/screenshots/create', {
            id: item.entityId,
            sessionId: data.sessionId,
            userId: data.userId,
            url: s3FullUrl,
            thumbnailUrl: s3ThumbnailUrl,
            capturedAt: new Date(data.capturedAt).toISOString(),
            mode: data.mode || 'client_hours',
            notes: data.notes || ''
          });
          
          if (!screenshotResponse.data.success) {
            throw new Error(`Screenshot creation failed: ${screenshotResponse.data.message}`);
          }
          
          console.log('Screenshot record created successfully on server');
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
    } catch (error: any) {
      console.error(`Failed to sync ${item.entityType}:${item.entityId}:`, error.message);

      // Check for version upgrade required (426 Upgrade Required)
      if (error.response?.status === 426) {
        const message = error.response?.data?.message || 'Your app version is no longer supported. Please update your desktop application.';

        console.error('🚫 VERSION UPGRADE REQUIRED:', message);

        // Emit event to stop tracking and logout
        const { app } = require('electron');
        app.emit('version-upgrade-required', {
          message: message,
          timestamp: new Date()
        });

        // Don't retry this sync
        return;
      }

      // Check for invalid operation (e.g., session not found)
      if (error.response?.status === 400 && error.response?.data?.error === 'INVALID_OPERATION') {
        const details = error.response?.data?.details || {};
        const message = error.response?.data?.message || 'Invalid operation';

        console.error('🚫 INVALID OPERATION:', message);
        console.error('Details:', details);

        // If this was a screenshot upload that failed due to missing session
        if (item.entityType === 'screenshot') {
          console.log('Screenshot sync failed - session does not exist:', item.entityId);

          // Delete the local screenshot since it can't be synced
          this.db.deleteScreenshots([item.entityId]);

          // Emit event to stop tracking and show error
          const { app } = require('electron');
          app.emit('invalid-operation-detected', {
            message: message,
            details: details,
            sessionId: details.sessionId,
            timestamp: new Date()
          });
        }

        // Don't retry this sync
        return;
      }

      // Check for concurrent session detection
      if (error.response?.status === 409 || error.response?.data?.error === 'CONCURRENT_SESSION_DETECTED') {
        const details = error.response?.data?.details || {};
        const otherDeviceInfo = details.activeDevice || details.deviceInfo || '';
        const currentDeviceInfo = require('os').hostname();

        console.log('🔍 Concurrent session check during sync:', {
          currentDevice: currentDeviceInfo,
          otherDevice: otherDeviceInfo,
          isSameDevice: otherDeviceInfo === currentDeviceInfo
        });

        // Only treat as concurrent session if it's from a DIFFERENT device
        if (otherDeviceInfo && otherDeviceInfo !== currentDeviceInfo) {
          console.error('🚫 CONCURRENT SESSION DETECTED DURING SYNC! Other device:', otherDeviceInfo);

          // If this was a screenshot upload that failed due to concurrent session
          if (item.entityType === 'screenshot') {
            // Mark this screenshot as from a different device in the database
            console.log('Marking screenshot as from different device:', item.entityId);
            // Delete the local screenshot since it wasn't uploaded
            this.db.deleteScreenshots([item.entityId]);

            // Optionally, you could create a placeholder entry indicating
            // that this time slot was tracked on a different device
            // But for now, we'll just delete it to clean up the UI
          }

          // Emit event to stop tracking
          const { app } = require('electron');
          app.emit('concurrent-session-detected', {
            message: error.response?.data?.message || 'Another device is tracking time',
            details,
            sessionId: details.sessionId,
            otherDevice: otherDeviceInfo,
            timestamp: new Date()
          });
        } else {
          console.log('⚠️ Concurrent session detected during sync but from SAME device - ignoring');
          // Don't delete screenshots or stop tracking if it's the same device
        }

        // Don't retry this sync
        return;
      }

      throw error;
    }
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('Working in offline mode');
    
    // Retry connection after 30 seconds
    setTimeout(() => {
      this.isOnline = true;
      this.syncData();
    }, 30000);
  }

  async uploadScreenshot(localPath: string, captureTime?: Date): Promise<{ fullUrl: string; thumbnailUrl: string }> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      const sharp = require('sharp');
      
      // Read the file
      const fileBuffer = await fs.readFile(localPath);
      const filename = path.basename(localPath);
      
      // Use capture time if provided, otherwise fall back to current time (for backward compatibility)
      const timestampDate = captureTime || new Date();
      
      // Get timezone information from the capture time
      const timezoneOffset = timestampDate.getTimezoneOffset(); // in minutes
      const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
      const offsetMinutes = Math.abs(timezoneOffset) % 60;
      const offsetSign = timezoneOffset <= 0 ? '+' : '-'; // Note: getTimezoneOffset returns negative for positive offsets
      const timezone = `${offsetSign}${offsetHours.toString().padStart(2, '0')}${offsetMinutes.toString().padStart(2, '0')}`;
      
      // Format capture time as YYYY-MM-DDTHH:MM:SS without timezone conversion
      const year = timestampDate.getFullYear();
      const month = String(timestampDate.getMonth() + 1).padStart(2, '0');
      const day = String(timestampDate.getDate()).padStart(2, '0');
      const hour = String(timestampDate.getHours()).padStart(2, '0');
      const minute = String(timestampDate.getMinutes()).padStart(2, '0');
      const second = String(timestampDate.getSeconds()).padStart(2, '0');
      const localTimestamp = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      
      // Step 1: Request signed URLs from the server
      const urlResponse = await this.api.post('/screenshots/generate-upload-url', {
        filename,
        contentType: 'image/jpeg',
        timezone,
        localTimestamp // This is now in local time, not UTC
      });
      
      const { uploadUrls, key } = urlResponse.data;
      
      // Step 2: Create thumbnail
      const thumbnailBuffer = await sharp(fileBuffer)
        .resize(250, null, { 
          fit: 'inside',
          withoutEnlargement: false 
        })
        .jpeg({ quality: 99 })
        .toBuffer();
      
      // Step 3: Upload both files directly to S3 using signed URLs
      const [fullUpload, thumbUpload] = await Promise.all([
        // Upload full image
        axios.put(uploadUrls.fullUrl, fileBuffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': fileBuffer.length
          }
        }),
        // Upload thumbnail
        axios.put(uploadUrls.thumbnailUrl, thumbnailBuffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': thumbnailBuffer.length
          }
        })
      ]);
      

      // Step 4: Return the S3 URLs by stripping query parameters from the upload URLs
      // The presigned URLs contain the correct bucket and path, we just need to remove the auth params
      const fullUrl = uploadUrls.fullUrl.split('?')[0];
      const thumbnailUrl = uploadUrls.thumbnailUrl.split('?')[0];
      
      return { fullUrl, thumbnailUrl };
    } catch (error) {
      console.error('Failed to upload screenshot:', error);
      throw error;
    }
  }
}