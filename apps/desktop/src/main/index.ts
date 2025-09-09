import { app, BrowserWindow, ipcMain, screen, desktopCapturer, dialog } from 'electron';
import path from 'path';
import * as dotenv from 'dotenv';
import { ActivityTrackerV2 } from './services/activityTrackerV2';
import { ScreenshotServiceV2 } from './services/screenshotServiceV2';
import { DatabaseService } from './services/databaseService';
import { ApiSyncService } from './services/apiSyncService';
import { BrowserExtensionBridge } from './services/browserExtensionBridge';
import { ProductiveHoursService } from './services/productiveHoursService';
import { calculateScreenshotScore, calculateTop80Average } from './utils/activityScoreCalculator';
import Store from 'electron-store';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let activityTracker: ActivityTrackerV2;
let screenshotService: ScreenshotServiceV2;
let databaseService: DatabaseService;
let apiSyncService: ApiSyncService;
let browserBridge: BrowserExtensionBridge;
let productiveHoursService: ProductiveHoursService;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    minWidth: 1200,
    minHeight: 800
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Handle window close event - prevent accidental closure during tracking
  mainWindow.on('close', (event) => {
    // Check if there's an active session
    const activeSession = databaseService?.getActiveSession();
    
    if (activeSession && activeSession.isActive) {
      // Prevent the window from closing
      event.preventDefault();
      
      // Show confirmation dialog
      const choice = dialog.showMessageBoxSync(mainWindow!, {
        type: 'warning',
        buttons: ['Keep Tracking', 'Stop & Close'],
        defaultId: 0,
        cancelId: 0,
        title: 'Tracking in Progress',
        message: 'Time tracking is currently active',
        detail: 'Do you want to stop tracking and close the application, or continue tracking?'
      });
      
      if (choice === 1) {
        // User chose to stop and close
        // Stop the session first
        activityTracker?.stopSession().then(() => {
          // Now close the window
          mainWindow!.destroy();
        }).catch((error) => {
          console.error('Error stopping session:', error);
          // Force close anyway
          mainWindow!.destroy();
        });
      }
      // If choice === 0, do nothing (keep window open)
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(async () => {
  console.log('\n🚀 Initializing application services...');
  
  // Initialize database
  databaseService = new DatabaseService();
  await databaseService.initialize();
  console.log('✅ Database initialized');
  
  // Initialize activity tracker V2
  activityTracker = new ActivityTrackerV2(databaseService);
  databaseService.setActivityTracker(activityTracker as any); // Type cast for compatibility
  console.log('✅ Activity tracker V2 initialized');
  
  // Listen for inactivity detection
  activityTracker.on('inactivity:detected', (message: { title: string; message: string }) => {
    console.log('🚨 Inactivity detected, showing alert:', message.title);
    
    // Show dialog to user
    const { dialog } = require('electron');
    dialog.showMessageBox(mainWindow!, {
      type: 'warning',
      title: message.title,
      message: message.message,
      buttons: ['OK'],
      defaultId: 0,
      noLink: true
    }).then(() => {
      // Send event to renderer to update UI
      mainWindow?.webContents.send('session-update', {
        isTracking: false,
        session: null
      });
    });
  });
  
  // Initialize screenshot service V2 (BEFORE restoring session)
  screenshotService = new ScreenshotServiceV2(databaseService);
  screenshotService.setActivityTracker(activityTracker);
  console.log('✅ Screenshot service V2 initialized');
  
  // Initialize other services
  apiSyncService = new ApiSyncService(databaseService, store);
  browserBridge = new BrowserExtensionBridge();
  productiveHoursService = new ProductiveHoursService(databaseService);
  console.log('✅ API sync, browser bridge, and productive hours service initialized');
  
  // Setup IPC handlers BEFORE creating window
  setupIpcHandlers();
  console.log('✅ IPC handlers registered');
  
  // Create window AFTER handlers are registered
  createWindow();
  console.log('✅ Main window created');
  
  // Restore existing active session if any
  try {
    const activeSession = databaseService.getActiveSession();
    if (activeSession) {
      console.log(`📄 Found existing active session: ${activeSession.id}`);
      activityTracker.restoreSession(
        activeSession.id,
        activeSession.mode,
        activeSession.projectId || undefined
      );
      // Start screenshot service for the restored session
      screenshotService.enableAutoSessionCreation();
      screenshotService.start();
      console.log('✅ Session restored and screenshot service started');
    } else {
      console.log('ℹ️ No active session found - screenshot service NOT started');
    }
  } catch (error) {
    console.error('❌ Failed to restore session:', error);
  }
  
  // Listen for session stop events to stop screenshot service
  activityTracker.on('session:stopped', () => {
    console.log('📷 Stopping screenshot service due to session stop');
    screenshotService.stop();
    
    // Notify renderer that session has stopped
    if (mainWindow) {
      mainWindow.webContents.send('session-update', { isActive: false });
    }
  });
  
  // Listen for session start events to start screenshot service
  activityTracker.on('session:started', async (session: any) => {
    console.log('📷 Session started event received, starting screenshot service for new session:', session.id);
    try {
      // Re-enable auto session creation in case it was disabled
      screenshotService.enableAutoSessionCreation();
      await screenshotService.start();
      console.log('✅ Screenshot service started successfully for session:', session.id);
    } catch (error) {
      console.error('❌ Failed to start screenshot service:', error);
    }
    
    // Notify renderer that session has started
    if (mainWindow) {
      mainWindow.webContents.send('session-update', { 
        isActive: true, 
        session: session 
      });
    }
  });
  
  // Listen for concurrent session detection
  app.on('concurrent-session-detected' as any, async (event: any) => {
    console.error('🚫 CONCURRENT SESSION DETECTED!', event);
    
    // Disable screenshot service to prevent auto-restart
    screenshotService.disableAutoSessionCreation();
    
    // Stop the current session
    if (activityTracker) {
      await activityTracker.stopSession();
    }
    
    // Clear sync queue for this session to prevent more alerts
    if (event.sessionId) {
      databaseService.clearSyncQueueForSession(event.sessionId);
    }
    
    // Show notification to user
    if (mainWindow) {
      mainWindow.webContents.send('concurrent-session-detected', {
        title: 'Session Stopped',
        message: 'Another device is already tracking time. This session has been stopped.',
        details: event.details
      });
    }
    
    // Use electron dialog to show alert (only once)
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Concurrent Session Detected',
      'Another device is already tracking time for your account. This session has been stopped to prevent duplicate time tracking.'
    );
    
    // Re-enable auto session creation after 30 seconds
    setTimeout(() => {
      screenshotService.enableAutoSessionCreation();
      apiSyncService.resetConcurrentSessionFlag();
    }, 30000);
  });
  
  // Start services (but NOT screenshot service - it starts with sessions)
  apiSyncService.start();
  browserBridge.start();
  // screenshotService.start(); // DO NOT auto-start - only start when session starts
  console.log('✅ API sync and browser bridge started');
  
  console.log('\n🎉 Application ready!\n');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

function setupIpcHandlers() {
  // Auth handlers
  ipcMain.handle('auth:login', async (_, email: string, password: string) => {
    return apiSyncService.login(email, password);
  });
  
  ipcMain.handle('auth:get-api-url', async () => {
    return process.env.API_URL || 'http://localhost:3001';
  });
  
  ipcMain.handle('auth:current-user', async () => {
    return databaseService.getCurrentUser();
  });
  
  ipcMain.handle('auth:set-user', async (_, userData: any) => {
    databaseService.setCurrentUser(userData);
    return true;
  });
  
  ipcMain.handle('auth:logout', async () => {
    return apiSyncService.logout();
  });
  
  ipcMain.handle('auth:check-session', async () => {
    return apiSyncService.checkSession();
  });

  ipcMain.handle('auth:verify-token', async (_, token: string) => {
    return apiSyncService.verifyToken(token);
  });
  
  ipcMain.handle('auth:saml-login', async () => {
    console.log('SAML login requested');
    // Navigate main window to SAML login URL
    if (mainWindow) {
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      const samlUrl = `${apiUrl}/api/auth/saml/login`;
      console.log(`Navigating to SAML URL: ${samlUrl}`);
      
      // Handle navigation and authentication
      mainWindow.loadURL(samlUrl);
      
      // Listen for successful authentication redirect
      mainWindow.webContents.on('will-redirect', (event, url) => {
        console.log('SAML redirect detected:', url);
        // Check if this is a successful auth redirect
        if (url.includes('token=') || url.includes('auth/success')) {
          // Extract token from URL if present
          const urlParams = new URL(url).searchParams;
          const token = urlParams.get('token');
          if (token) {
            console.log('SAML authentication successful, token received');
            // You might want to handle the token here
          }
        }
      });
      
      return { success: true };
    }
    console.error('Main window not available for SAML login');
    return { success: false, error: 'Main window not available' };
  });
  
  // Session handlers
  ipcMain.handle('session:start', async (_, mode: 'client_hours' | 'command_hours', task?: string, projectId?: string) => {
    return activityTracker.startSession(mode, projectId, task);
  });
  
  ipcMain.handle('session:stop', async () => {
    return activityTracker.stopSession();
  });
  
  ipcMain.handle('session:current', async () => {
    return databaseService.getActiveSession();
  });
  
  ipcMain.handle('session:activity', async () => {
    return databaseService.getCurrentActivity();
  });
  
  ipcMain.handle('session:today', async () => {
    return databaseService.getTodaySessions();
  });
  
  ipcMain.handle('session:switch-mode', async (_, mode: 'client_hours' | 'command_hours', task?: string, projectId?: string) => {
    // Stop current session and start new one
    await activityTracker.stopSession();
    return activityTracker.startSession(mode, projectId, task);
  });

  // Get current session with productive metrics
  ipcMain.handle('session:productive-info', async () => {
    const session = databaseService.getActiveSession();
    if (!session) return null;
    
    const currentUser = databaseService.getCurrentUser();
    if (!currentUser) return null;
    
    // Get screenshots for the current session to count tracked time
    // The user clarified: "10 min per valid screenshot"
    // Valid = screenshot with activity score >= 4.0 (not inactive)
    
    // Get all screenshots for this session with their activity scores
    // Apply weighted average calculation based on number of periods
    const db = (databaseService as any).localDb;
    
    // First get all screenshots
    const screenshots = db.db.prepare(`
      SELECT id, capturedAt
      FROM screenshots
      WHERE sessionId = ?
      ORDER BY capturedAt
    `).all(session.id);
    
    // Count screenshots that are NOT inactive (activity score >= 25)
    // UI uses 0-10 scale, DB uses 0-100 scale
    // Inactive threshold: < 2.5 on UI scale = < 25 on DB scale
    let validScreenshots = 0;
    const screenshotDetails: any[] = [];
    
    for (const screenshot of screenshots) {
      // Get all activity periods for this screenshot
      const activityPeriods = db.db.prepare(`
        SELECT activityScore
        FROM activity_periods
        WHERE screenshotId = ?
        ORDER BY activityScore DESC
      `).all(screenshot.id);
      
      const scores = activityPeriods.map((p: any) => p.activityScore);
      
      // Calculate weighted average using our new function
      const weightedScore = calculateScreenshotScore(scores);
      
      const isValid = weightedScore >= 25;  // 2.5 on UI scale
      if (isValid) {
        validScreenshots++;
      }
      
      const uiScore = weightedScore / 10; // Convert to UI scale
      screenshotDetails.push({
        time: new Date(screenshot.capturedAt).toLocaleTimeString(),
        score: weightedScore,
        uiScore: Math.round(uiScore * 10) / 10, // Round to 1 decimal
        periodCount: scores.length,
        valid: isValid,
        classification: 
          uiScore >= 8.5 ? 'good' :
          uiScore >= 7.0 ? 'fair' :
          uiScore >= 5.5 ? 'low' :
          uiScore >= 4.0 ? 'poor' :
          uiScore >= 2.5 ? 'critical' : 'inactive'
      });
    }
    
    // Each valid (non-inactive) screenshot = 10 minutes of tracked time
    const trackedMinutes = validScreenshots * 10;
    
    // Calculate top 80% average activity score across all screenshots
    const allScores: number[] = [];
    for (const detail of screenshotDetails) {
      if (detail.uiScore > 0) {
        allScores.push(detail.uiScore);
      }
    }
    
    const averageActivityScore = allScores.length > 0 
      ? Math.round(calculateTop80Average(allScores) * 10) / 10  // Round to 1 decimal
      : 0;
    
    console.log('Tracked time calculation:', {
      totalScreenshots: screenshots.length,
      validScreenshots,
      trackedMinutes,
      averageActivityScore,
      sessionId: session.id,
      details: screenshotDetails
    });
    
    return {
      session,
      productiveMinutes: trackedMinutes, // Keep the same field name for compatibility
      validScreenshots,
      totalScreenshots: screenshots.length,
      averageActivityScore,
      screenshotDetails
    };
  });
  
  // Dashboard handlers
  ipcMain.handle('dashboard:get-data', async () => {
    return databaseService.getDashboardData();
  });
  
  // Screenshot handlers
  ipcMain.handle('screenshots:get-today', async () => {
    return databaseService.getTodayScreenshots();
  });
  
  ipcMain.handle('screenshots:get-by-date', async (_, date: string) => {
    return databaseService.getScreenshotsByDate(new Date(date));
  });
  
  ipcMain.handle('screenshots:update-notes', async (_, screenshotIds: string[], notes: string) => {
    return databaseService.updateScreenshotNotes(screenshotIds, notes);
  });
  
  ipcMain.handle('screenshots:transfer-mode', async (_, screenshotIds: string[], newMode: 'client_hours' | 'command_hours') => {
    return databaseService.transferScreenshotMode(screenshotIds, newMode);
  });
  
  ipcMain.handle('screenshots:delete', async (_, screenshotIds: string[]) => {
    console.log('[IPC] screenshots:delete handler called with IDs:', screenshotIds);
    try {
      const result = await databaseService.deleteScreenshots(screenshotIds);
      console.log('[IPC] Delete operation result:', result);
      return result;
    } catch (error) {
      console.error('[IPC] Error in delete handler:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  
  ipcMain.handle('screenshots:retry-sync', async (_, screenshotId: string) => {
    console.log('[IPC] screenshots:retry-sync handler called for ID:', screenshotId);
    try {
      const result = await apiSyncService.retrySyncItem(screenshotId, 'screenshot');
      console.log('[IPC] Retry sync result:', result);
      return result;
    } catch (error) {
      console.error('[IPC] Error in retry sync handler:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  
  ipcMain.handle('screenshots:fetch-signed-url', async (_, screenshotId: string) => {
    console.log('[IPC] screenshots:fetch-signed-url handler called for ID:', screenshotId);
    try {
      const response = await apiSyncService.fetchSignedUrl(screenshotId);
      console.log('[IPC] Signed URL response:', response);
      return response;
    } catch (error) {
      console.error('[IPC] Error fetching signed URL:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
  
  // Activity handlers
  ipcMain.handle('activity:get-period-details', async (_, periodId: string) => {
    return databaseService.getActivityPeriodDetails(periodId);
  });
  
  ipcMain.handle('activity:get-periods-with-metrics', async (_, periodIds: string[]) => {
    return databaseService.getActivityPeriodsWithMetrics(periodIds);
  });
  
  // Notes handlers
  ipcMain.handle('notes:get-recent', async () => {
    return databaseService.getRecentNotes();
  });
  
  ipcMain.handle('notes:save', async (_, noteText: string) => {
    return databaseService.saveNote(noteText);
  });
  
  // Leaderboard handler
  ipcMain.handle('leaderboard:get', async () => {
    return databaseService.getLeaderboard();
  });

  // Productive hours handler
  ipcMain.handle('productive-hours:get', async () => {
    const currentUser = databaseService.getCurrentUser();
    console.log('Getting productive hours for user:', currentUser);
    if (!currentUser) {
      console.log('No current user found');
      return null;
    }

    const today = new Date();
    const productiveHours = await productiveHoursService.calculateProductiveHours(currentUser.id, today);
    console.log('Calculated productive hours:', productiveHours);
    
    // Calculate average activity score for today
    const db = (databaseService as any).localDb;
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all screenshots for today
    const screenshots = db.db.prepare(`
      SELECT s.id, s.capturedAt
      FROM screenshots s
      WHERE s.userId = ?
      AND s.capturedAt >= ?
      AND s.capturedAt <= ?
      ORDER BY s.capturedAt
    `).all(currentUser.id, startOfDay.getTime(), endOfDay.getTime());
    
    const allScores: number[] = [];
    
    for (const screenshot of screenshots) {
      // Get all activity periods for this screenshot
      const activityPeriods = db.db.prepare(`
        SELECT activityScore
        FROM activity_periods
        WHERE screenshotId = ?
        ORDER BY activityScore DESC
      `).all(screenshot.id);
      
      const scores = activityPeriods.map((p: any) => p.activityScore);
      
      if (scores.length > 0) {
        // Calculate weighted average using the same function as session
        const weightedScore = calculateScreenshotScore(scores);
        const uiScore = weightedScore / 10; // Convert to UI scale
        
        if (uiScore > 0) {
          allScores.push(uiScore);
        }
      }
    }
    
    // Calculate top 80% average, excluding lowest 20% of scores
    const averageActivityScore = allScores.length > 0 
      ? Math.round(calculateTop80Average(allScores) * 10) / 10  // Round to 1 decimal
      : 0;
    
    // Get last activity score for context
    const currentActivity = await databaseService.getCurrentActivity();
    const lastActivityScore = currentActivity ? (currentActivity.activityScore / 10) : 5; // Convert to 0-10 scale
    
    const markers = productiveHoursService.getScaleMarkers(today);
    const message = productiveHoursService.getHustleMessage(productiveHours, markers, lastActivityScore);
    
    // Modify attendance status color based on activity score
    const baseAttendance = productiveHoursService.getAttendanceStatus(productiveHours, markers);
    const attendance = {
      ...baseAttendance,
      color: averageActivityScore >= 8.5 ? '#10b981' : // green - Good activity
             averageActivityScore >= 7.0 ? '#3b82f6' : // blue - Fair activity
             averageActivityScore >= 5.5 ? '#f59e0b' : // amber - Low activity
             averageActivityScore >= 4.0 ? '#ef4444' : // red - Poor activity
             '#dc2626' // dark red - Critical/Inactive
    };

    console.log('Returning productive hours data:', {
      productiveHours,
      averageActivityScore,
      markers,
      message,
      attendance
    });

    return {
      productiveHours,
      averageActivityScore,
      markers,
      message,
      attendance
    };
  });

  // Weekly marathon handler
  ipcMain.handle('weekly-marathon:get', async () => {
    const currentUser = databaseService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const productiveHours = await productiveHoursService.calculateWeeklyHours(currentUser.id);
    const markers = productiveHoursService.getWeeklyMarkers();
    
    // Calculate average activity score for the week
    const db = (databaseService as any).localDb;
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Get all screenshots for the week
    const screenshots = db.db.prepare(`
      SELECT s.id, s.capturedAt
      FROM screenshots s
      WHERE s.userId = ?
      AND s.capturedAt >= ?
      AND s.capturedAt <= ?
      ORDER BY s.capturedAt
    `).all(currentUser.id, startOfWeek.getTime(), endOfWeek.getTime());
    
    const allScores: number[] = [];
    
    for (const screenshot of screenshots) {
      // Get all activity periods for this screenshot
      const activityPeriods = db.db.prepare(`
        SELECT activityScore
        FROM activity_periods
        WHERE screenshotId = ?
        ORDER BY activityScore DESC
      `).all(screenshot.id);
      
      const scores = activityPeriods.map((p: any) => p.activityScore);
      
      if (scores.length > 0) {
        // Calculate weighted average using the same function as session
        const weightedScore = calculateScreenshotScore(scores);
        const uiScore = weightedScore / 10; // Convert to UI scale
        
        if (uiScore > 0) {
          allScores.push(uiScore);
        }
      }
    }
    
    // Calculate top 80% average, excluding lowest 20% of scores
    const averageActivityScore = allScores.length > 0 
      ? Math.round(calculateTop80Average(allScores) * 10) / 10  // Round to 1 decimal
      : 0;
    
    // Calculate base attendance
    const baseAttendance = productiveHoursService.calculateWeeklyAttendance(productiveHours, markers);
    
    // Modify attendance color based on activity score
    const attendance = {
      ...baseAttendance,
      color: averageActivityScore >= 8.5 ? '#10b981' : // green - Good activity
             averageActivityScore >= 7.0 ? '#3b82f6' : // blue - Fair activity
             averageActivityScore >= 5.5 ? '#f59e0b' : // amber - Low activity
             averageActivityScore >= 4.0 ? '#ef4444' : // red - Poor activity
             '#dc2626' // dark red - Critical/Inactive
    };
    
    const message = productiveHoursService.getWeeklyMessage(productiveHours, attendance, markers);

    return {
      productiveHours,
      averageActivityScore,
      markers,
      attendance,
      message
    };
  });
  
  // Browser activity handler
  ipcMain.handle('browser:activity', async (_, data: any) => {
    return browserBridge.handleBrowserActivity(data);
  });
  
  // Database handlers
  ipcMain.handle('database:info', async () => {
    return databaseService.getDatabaseInfo();
  });
  
  ipcMain.handle('database:export', async () => {
    return databaseService.exportUserData();
  });
  
  // Projects handler
  ipcMain.handle('projects:list', async () => {
    return databaseService.getProjects();
  });
  
  // Organization handlers
  ipcMain.handle('organizations:create', async (_, name: string, code: string, timezone?: string) => {
    return databaseService.createOrganization(name, code, timezone);
  });
  
  ipcMain.handle('organizations:list', async () => {
    return databaseService.getOrganizations();
  });
  
  ipcMain.handle('organizations:stats', async (_, organizationId: string) => {
    return databaseService.getOrganizationStats(organizationId);
  });
  
  // User management handlers
  ipcMain.handle('users:create', async (_, data: any) => {
    return databaseService.createUser(data);
  });
  
  ipcMain.handle('users:list', async (_, organizationId: string) => {
    return databaseService.getOrganizationUsers(organizationId);
  });
  
  ipcMain.handle('users:get', async (_, userId: string) => {
    return databaseService.getUserById(userId);
  });
  
  ipcMain.handle('users:update-role', async (_, userId: string, role: 'org_admin' | 'developer') => {
    return databaseService.updateUserRole(userId, role);
  });
  
  ipcMain.handle('users:deactivate', async (_, userId: string) => {
    return databaseService.deactivateUser(userId);
  });
  
  ipcMain.handle('users:reset-password', async (_, userId: string, newPassword: string) => {
    return databaseService.resetUserPassword(userId, newPassword);
  });
  
  // Debug/admin handlers
  ipcMain.handle('debug:clear-sync-queue', async () => {
    return databaseService.clearSyncQueue();
  });
  
  ipcMain.handle('debug:clear-all-data', async () => {
    return databaseService.clearSessionsAndRelatedData();
  });
  
  ipcMain.handle('debug:check-foreign-keys', async () => {
    return databaseService.checkForeignKeys();
  });
  
  ipcMain.handle('debug:enable-foreign-keys', async () => {
    return databaseService.enableForeignKeys();
  });
}