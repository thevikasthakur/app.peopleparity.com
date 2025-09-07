import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from './databaseService';
import Store from 'electron-store';
import path from 'path';

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
  private isOnline = true;
  private concurrentSessionDetected = false;
  private concurrentSessionHandledAt = 0;

  constructor(
    private db: DatabaseService,
    private store: Store
  ) {
    // Use IPv4 explicitly to avoid IPv6 connection issues
    const apiUrl = process.env.API_URL || 'http://127.0.0.1:3001/api';
    const apiUrlFixed = apiUrl.replace('localhost', '127.0.0.1').replace('[::1]', '127.0.0.1').replace('::1', '127.0.0.1');
    
    this.api = axios.create({
      baseURL: apiUrlFixed,
      timeout: 10000,
      // Force IPv4
      httpAgent: new (require('http').Agent)({ family: 4 }),
      httpsAgent: new (require('https').Agent)({ family: 4 })
    } as any);

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Add auth token to requests
    this.api.interceptors.request.use((config) => {
      const token = this.store.get('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.store.delete('authToken');
          this.store.delete('user');
          this.db.clearCurrentUser();
        }
        return Promise.reject(error);
      }
    );
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
      // Set the token temporarily for this request
      const response = await this.api.get('/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
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
        
        return { valid: true, user };
      }
    } catch (error) {
      console.error('Token verification failed:', error);
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
  }

  private async syncData() {
    if (!this.isOnline) return;

    const token = this.store.get('authToken');
    if (!token || token === 'offline-token') return;

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
              console.error('🚫 CONCURRENT SESSION DETECTED! Another device is already tracking for this user.');
              
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
                  sessionId: data.sessionId
                });
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
            filename: path.basename(data.localPath),
            contentType: 'image/jpeg'
          });
          formData.append('id', item.entityId); // Include screenshot ID for reference
          formData.append('capturedAt', new Date(data.capturedAt).toISOString());
          formData.append('sessionId', data.sessionId); // Direct session relationship
          formData.append('mode', data.mode || 'command_hours');
          formData.append('userId', data.userId);
          
          // Add notes (copied from session task)
          if (data.notes) {
            formData.append('notes', data.notes);
          }
          
          const screenshotResponse = await this.api.post('/screenshots/upload', formData, {
            headers: {
              ...formData.getHeaders()
            }
          });
          
          console.log('Screenshot uploaded:', screenshotResponse.data.url, 'Thumbnail:', screenshotResponse.data.thumbnailUrl);
          
          // Update local DB with S3 URLs
          if (screenshotResponse.data.url && screenshotResponse.data.thumbnailUrl) {
            this.db.updateScreenshotUrls(
              item.entityId, 
              screenshotResponse.data.url,
              screenshotResponse.data.thumbnailUrl
            );
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
    } catch (error: any) {
      console.error(`Failed to sync ${item.entityType}:${item.entityId}:`, error.message);
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

  async uploadScreenshot(localPath: string): Promise<string> {
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
    } catch (error) {
      console.error('Failed to upload screenshot:', error);
      throw error;
    }
  }
}