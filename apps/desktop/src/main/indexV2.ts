import { app, BrowserWindow, ipcMain, screen, desktopCapturer } from 'electron';
import path from 'path';
import { ActivityTrackerV2 } from './services/activityTrackerV2';
import { ScreenshotServiceV2 } from './services/screenshotServiceV2';
import { DatabaseService } from './services/databaseService';
import { ApiSyncService } from './services/apiSyncService';
import { BrowserExtensionBridge } from './services/browserExtensionBridge';
import Store from 'electron-store';

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let activityTracker: ActivityTrackerV2;
let screenshotService: ScreenshotServiceV2;
let databaseService: DatabaseService;
let apiSyncService: ApiSyncService;
let browserBridge: BrowserExtensionBridge;

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(async () => {
  createWindow();
  
  console.log('\n🚀 Initializing application services...');
  
  // Initialize database
  databaseService = new DatabaseService();
  await databaseService.initialize();
  console.log('✅ Database initialized');
  
  // Initialize activity tracker V2
  activityTracker = new ActivityTrackerV2(databaseService);
  databaseService.setActivityTracker(activityTracker as any); // Type cast for compatibility
  console.log('✅ Activity tracker V2 initialized');
  
  // Initialize screenshot service V2 (before restoring session)
  screenshotService = new ScreenshotServiceV2(databaseService);
  screenshotService.setActivityTracker(activityTracker);
  console.log('✅ Screenshot service V2 initialized');
  
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
  
  // Initialize other services
  apiSyncService = new ApiSyncService(databaseService, store);
  browserBridge = new BrowserExtensionBridge();
  console.log('✅ API sync and browser bridge initialized');

  // Listen for version upgrade required (426 status)
  app.on('version-upgrade-required' as any, async (event: any) => {
    console.error('🚫 VERSION UPGRADE REQUIRED!', event);

    // Disable screenshot service to prevent auto-restart
    screenshotService.disableAutoSessionCreation();

    // Stop the current session
    if (activityTracker) {
      await activityTracker.stopSession();
    }

    // Show notification to user
    if (mainWindow) {
      mainWindow.webContents.send('version-upgrade-required', {
        title: 'Update Required',
        message: event.message || 'Your app version is no longer supported. Please update your desktop application.',
      });
    }

    // Use electron dialog to show alert
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Update Required',
      event.message || 'Your app version is no longer supported. Please update your desktop application to continue tracking time.'
    );

    // Logout the user
    if (apiSyncService) {
      await apiSyncService.logout();
    }

    // Navigate to login page
    if (mainWindow) {
      mainWindow.webContents.send('navigate-to-login');
    }
  });

  // Listen for invalid operation detection (e.g., session not found)
  app.on('invalid-operation-detected' as any, async (event: any) => {
    console.error('🚫 INVALID OPERATION DETECTED!', event);

    // Disable screenshot service to prevent auto-restart
    screenshotService.disableAutoSessionCreation();

    // Stop the current session
    if (activityTracker) {
      await activityTracker.stopSession();
    }

    // Clear sync queue for this session to prevent more errors
    if (event.details?.sessionId) {
      databaseService.clearSyncQueueForSession(event.details.sessionId);
    }

    // Show notification to user
    if (mainWindow) {
      mainWindow.webContents.send('invalid-operation-detected', {
        title: 'Sync Error - Session Not Found',
        message: event.message || 'Failed to sync screenshot because the session does not exist on the server.',
        details: event.details
      });
    }

    // Use electron dialog to show alert
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Sync Error',
      event.message || 'Failed to sync data. The session was not found on the server. You will be logged out.'
    );

    // Logout the user
    if (apiSyncService) {
      await apiSyncService.logout();
    }

    // Navigate to login page
    if (mainWindow) {
      mainWindow.webContents.send('navigate-to-login');
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
  
  setupIpcHandlers();
  console.log('✅ IPC handlers registered');
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
  
  // Session handlers
  ipcMain.handle('session:start', async (_, mode: 'client_hours' | 'command_hours', projectId?: string, task?: string) => {
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
  
  ipcMain.handle('session:switch-mode', async (_, mode: 'client_hours' | 'command_hours', projectId?: string, task?: string) => {
    // Stop current session and start new one
    await activityTracker.stopSession();
    return activityTracker.startSession(mode, projectId, task);
  });
  
  // Dashboard handlers
  ipcMain.handle('dashboard:get-data', async () => {
    return databaseService.getDashboardData();
  });
  
  // Screenshot handlers
  ipcMain.handle('screenshots:get-today', async () => {
    return databaseService.getTodayScreenshots();
  });
  
  ipcMain.handle('screenshots:update-notes', async (_, screenshotIds: string[], notes: string) => {
    return databaseService.updateScreenshotNotes(screenshotIds, notes);
  });
  
  ipcMain.handle('screenshots:transfer-mode', async (_, screenshotIds: string[], newMode: 'client_hours' | 'command_hours') => {
    return databaseService.transferScreenshotMode(screenshotIds, newMode);
  });
  
  ipcMain.handle('screenshots:delete', async (_, screenshotIds: string[]) => {
    return databaseService.deleteScreenshots(screenshotIds);
  });
  
  // Activity handlers
  ipcMain.handle('activity:get-period-details', async (_, periodId: string) => {
    return databaseService.getActivityPeriodDetails(periodId);
  });
  
  // Notes handlers
  ipcMain.handle('notes:get-recent', async () => {
    return databaseService.getRecentNotes();
  });
  
  ipcMain.handle('notes:save', async (_, noteText: string) => {
    console.log('IPC: notes:save called with:', noteText);
    const result = await databaseService.saveNote(noteText);
    console.log('IPC: notes:save completed');
    return result;
  });
  
  ipcMain.handle('notes:get-current', async () => {
    // Get the current activity from the main window's localStorage
    const result = await mainWindow?.webContents.executeJavaScript(
      'localStorage.getItem("currentActivity")'
    );
    console.log('Current activity from UI:', result);
    return result || 'Working';
  });
  
  // Leaderboard handler
  ipcMain.handle('leaderboard:get', async () => {
    return databaseService.getLeaderboard();
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