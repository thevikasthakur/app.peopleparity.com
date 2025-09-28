"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const activityTracker_1 = require("./services/activityTracker");
const screenshotService_1 = require("./services/screenshotService");
const databaseService_1 = require("./services/databaseService");
const apiSyncService_1 = require("./services/apiSyncService");
const browserExtensionBridge_1 = require("./services/browserExtensionBridge");
const electron_store_1 = __importDefault(require("electron-store"));
const store = new electron_store_1.default();
let mainWindow = null;
let activityTracker;
let screenshotService;
let databaseService;
let apiSyncService;
let browserBridge;
const createWindow = () => {
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
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
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../renderer/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};
electron_1.app.whenReady().then(async () => {
    createWindow();
    databaseService = new databaseService_1.DatabaseService();
    await databaseService.initialize();
    activityTracker = new activityTracker_1.ActivityTracker(databaseService);
    databaseService.setActivityTracker(activityTracker); // Link the tracker to the database service
    // Restore existing active session if any
    try {
        const activeSession = databaseService.getActiveSession();
        if (activeSession) {
            console.log('Found existing active session, restoring:', activeSession.id);
            activityTracker.restoreSession(activeSession.id, activeSession.mode, activeSession.projectId || undefined);
        }
    }
    catch (error) {
        console.error('Failed to restore session:', error);
    }
    screenshotService = new screenshotService_1.ScreenshotService(databaseService);
    screenshotService.setActivityTracker(activityTracker); // Link the tracker to screenshot service
    apiSyncService = new apiSyncService_1.ApiSyncService(databaseService, store);
    browserBridge = new browserExtensionBridge_1.BrowserExtensionBridge();
    // Start API sync service
    apiSyncService.start();
    browserBridge.start();
    // Try to start activity tracking with proper error handling
    try {
        console.log('Attempting to start activity tracker...');
        // Note: Activity tracker will start when a session is started
        // activityTracker.start(); // Will be started when session starts
        console.log('Activity tracker initialized');
    }
    catch (error) {
        console.error('Failed to start activity tracker:', error);
        console.log('App will continue without keyboard/mouse tracking. Grant accessibility permissions to enable.');
    }
    // Start screenshot service
    try {
        console.log('Starting screenshot service...');
        screenshotService.start();
        console.log('Screenshot service started');
    }
    catch (error) {
        console.error('Failed to start screenshot service:', error);
    }
    setupIpcHandlers();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
function setupIpcHandlers() {
    electron_1.ipcMain.handle('auth:login', async (_, email, password) => {
        return apiSyncService.login(email, password);
    });
    electron_1.ipcMain.handle('auth:logout', async () => {
        return apiSyncService.logout();
    });
    electron_1.ipcMain.handle('auth:check-session', async () => {
        return apiSyncService.checkSession();
    });
    electron_1.ipcMain.handle('auth:verify-token', async (_, token) => {
        return apiSyncService.verifyToken(token);
    });
    electron_1.ipcMain.handle('auth:saml-login', async () => {
        // Navigate main window to SAML login URL
        if (mainWindow) {
            mainWindow.loadURL('http://localhost:3001/api/auth/saml/login');
            return { success: true };
        }
        return { success: false, error: 'Main window not available' };
    });
    electron_1.ipcMain.handle('session:start', async (_, mode, task, projectId) => {
        console.log('IPC: Starting session', { mode, task, projectId });
        return activityTracker.startSession(mode, projectId, task);
    });
    electron_1.ipcMain.handle('session:stop', async () => {
        console.log('IPC: Stopping session');
        return activityTracker.stopSession();
    });
    electron_1.ipcMain.handle('session:switch-mode', async (_, mode, task, projectId) => {
        console.log('IPC: Switching mode', { mode, task, projectId });
        return activityTracker.switchMode(mode, projectId, task);
    });
    electron_1.ipcMain.handle('dashboard:get-data', async () => {
        return databaseService.getDashboardData();
    });
    electron_1.ipcMain.handle('screenshots:get-today', async () => {
        return databaseService.getTodayScreenshots();
    });
    electron_1.ipcMain.handle('screenshots:update-notes', async (_, screenshotIds, notes) => {
        return databaseService.updateScreenshotNotes(screenshotIds, notes);
    });
    electron_1.ipcMain.handle('screenshots:transfer-mode', async (_, screenshotIds, newMode) => {
        return databaseService.transferScreenshotMode(screenshotIds, newMode);
    });
    electron_1.ipcMain.handle('screenshots:delete', async (_, screenshotIds) => {
        return databaseService.deleteScreenshots(screenshotIds);
    });
    electron_1.ipcMain.handle('activity:get-period-details', async (_, periodId) => {
        return databaseService.getActivityPeriodDetails(periodId);
    });
    electron_1.ipcMain.handle('notes:get-recent', async () => {
        return databaseService.getRecentNotes();
    });
    electron_1.ipcMain.handle('notes:save', async (_, noteText) => {
        return databaseService.saveNote(noteText);
    });
    electron_1.ipcMain.handle('leaderboard:get', async () => {
        return databaseService.getLeaderboard();
    });
    electron_1.ipcMain.handle('browser:activity', async (_, data) => {
        return browserBridge.handleBrowserActivity(data);
    });
    electron_1.ipcMain.handle('database:info', async () => {
        return databaseService.getDatabaseInfo();
    });
    electron_1.ipcMain.handle('database:export', async () => {
        return databaseService.exportUserData();
    });
    electron_1.ipcMain.handle('projects:list', async () => {
        return databaseService.getProjects();
    });
    // Organization management
    electron_1.ipcMain.handle('organizations:create', async (_, name, code, timezone) => {
        return databaseService.createOrganization(name, code, timezone);
    });
    electron_1.ipcMain.handle('organizations:list', async () => {
        return databaseService.getOrganizations();
    });
    electron_1.ipcMain.handle('organizations:stats', async (_, organizationId) => {
        return databaseService.getOrganizationStats(organizationId);
    });
    // User management
    electron_1.ipcMain.handle('users:create', async (_, data) => {
        return databaseService.createUser(data);
    });
    electron_1.ipcMain.handle('users:list', async (_, organizationId) => {
        return databaseService.getOrganizationUsers(organizationId);
    });
    electron_1.ipcMain.handle('users:get', async (_, userId) => {
        return databaseService.getUserById(userId);
    });
    electron_1.ipcMain.handle('users:update-role', async (_, userId, role) => {
        return databaseService.updateUserRole(userId, role);
    });
    electron_1.ipcMain.handle('users:deactivate', async (_, userId) => {
        return databaseService.deactivateUser(userId);
    });
    electron_1.ipcMain.handle('users:reset-password', async (_, userId, newPassword) => {
        return databaseService.resetUserPassword(userId, newPassword);
    });
    // Debug/admin handlers
    electron_1.ipcMain.handle('debug:clear-sync-queue', async () => {
        return databaseService.clearSyncQueue();
    });
    electron_1.ipcMain.handle('debug:clear-all-data', async () => {
        return databaseService.clearSessionsAndRelatedData();
    });
    electron_1.ipcMain.handle('debug:check-foreign-keys', async () => {
        return databaseService.checkForeignKeys();
    });
    electron_1.ipcMain.handle('debug:enable-foreign-keys', async () => {
        return databaseService.enableForeignKeys();
    });
}
//# sourceMappingURL=index.backup.js.map