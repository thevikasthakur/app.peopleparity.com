import { app, BrowserWindow, ipcMain, screen, desktopCapturer } from 'electron';
import path from 'path';
import { ActivityTracker } from './services/activityTracker';
import { ScreenshotService } from './services/screenshotService';
import { DatabaseService } from './services/databaseService';
import { ApiSyncService } from './services/apiSyncService';
import { BrowserExtensionBridge } from './services/browserExtensionBridge';
import Store from 'electron-store';

const store = new Store();
let mainWindow: BrowserWindow | null = null;
let activityTracker: ActivityTracker;
let screenshotService: ScreenshotService;
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
  
  databaseService = new DatabaseService();
  await databaseService.initialize();
  
  activityTracker = new ActivityTracker(databaseService);
  databaseService.setActivityTracker(activityTracker); // Link the tracker to the database service
  
  // Restore existing active session if any
  try {
    const activeSession = databaseService.getActiveSession();
    if (activeSession) {
      console.log('Found existing active session, restoring:', activeSession.id);
      activityTracker.restoreSession(
        activeSession.id,
        activeSession.mode,
        activeSession.projectId || undefined
      );
    }
  } catch (error) {
    console.error('Failed to restore session:', error);
  }
  
  screenshotService = new ScreenshotService(databaseService);
  apiSyncService = new ApiSyncService(databaseService, store);
  browserBridge = new BrowserExtensionBridge();
  
  // Start API sync service
  apiSyncService.start();
  browserBridge.start();
  
  // Try to start activity tracking with proper error handling
  try {
    console.log('Attempting to start activity tracker...');
    // Note: Activity tracker will start when a session is started
    // activityTracker.start(); // Will be started when session starts
    console.log('Activity tracker initialized');
  } catch (error) {
    console.error('Failed to start activity tracker:', error);
    console.log('App will continue without keyboard/mouse tracking. Grant accessibility permissions to enable.');
  }
  
  // Start screenshot service
  try {
    console.log('Starting screenshot service...');
    screenshotService.start();
    console.log('Screenshot service started');
  } catch (error) {
    console.error('Failed to start screenshot service:', error);
  }
  
  setupIpcHandlers();
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
  ipcMain.handle('auth:login', async (_, email: string, password: string) => {
    return apiSyncService.login(email, password);
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
    // Navigate main window to SAML login URL
    if (mainWindow) {
      mainWindow.loadURL('http://localhost:3001/api/auth/saml/login');
      return { success: true };
    }
    return { success: false, error: 'Main window not available' };
  });
  
  ipcMain.handle('session:start', async (_, mode: 'client_hours' | 'command_hours', task?: string, projectId?: string) => {
    console.log('IPC: Starting session', { mode, task, projectId });
    return activityTracker.startSession(mode, projectId, task);
  });
  
  ipcMain.handle('session:stop', async () => {
    console.log('IPC: Stopping session');
    return activityTracker.stopSession();
  });
  
  ipcMain.handle('session:switch-mode', async (_, mode: 'client_hours' | 'command_hours', task?: string, projectId?: string) => {
    console.log('IPC: Switching mode', { mode, task, projectId });
    return activityTracker.switchMode(mode, projectId, task);
  });
  
  ipcMain.handle('dashboard:get-data', async () => {
    return databaseService.getDashboardData();
  });
  
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
  
  ipcMain.handle('activity:get-period-details', async (_, periodId: string) => {
    return databaseService.getActivityPeriodDetails(periodId);
  });
  
  ipcMain.handle('notes:get-recent', async () => {
    return databaseService.getRecentNotes();
  });
  
  ipcMain.handle('notes:save', async (_, noteText: string) => {
    return databaseService.saveNote(noteText);
  });
  
  ipcMain.handle('leaderboard:get', async () => {
    return databaseService.getLeaderboard();
  });
  
  ipcMain.handle('browser:activity', async (_, data: any) => {
    return browserBridge.handleBrowserActivity(data);
  });
  
  ipcMain.handle('database:info', async () => {
    return databaseService.getDatabaseInfo();
  });
  
  ipcMain.handle('database:export', async () => {
    return databaseService.exportUserData();
  });
  
  ipcMain.handle('projects:list', async () => {
    return databaseService.getProjects();
  });
  
  // Organization management
  ipcMain.handle('organizations:create', async (_, name: string, code: string, timezone?: string) => {
    return databaseService.createOrganization(name, code, timezone);
  });
  
  ipcMain.handle('organizations:list', async () => {
    return databaseService.getOrganizations();
  });
  
  ipcMain.handle('organizations:stats', async (_, organizationId: string) => {
    return databaseService.getOrganizationStats(organizationId);
  });
  
  // User management
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