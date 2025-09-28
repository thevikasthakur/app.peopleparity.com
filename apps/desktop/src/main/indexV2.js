"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const activityTrackerV2_1 = require("./services/activityTrackerV2");
const screenshotServiceV2_1 = require("./services/screenshotServiceV2");
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
    console.log('\n🚀 Initializing application services...');
    // Initialize database
    databaseService = new databaseService_1.DatabaseService();
    await databaseService.initialize();
    console.log('✅ Database initialized');
    // Initialize activity tracker V2
    activityTracker = new activityTrackerV2_1.ActivityTrackerV2(databaseService);
    databaseService.setActivityTracker(activityTracker); // Type cast for compatibility
    console.log('✅ Activity tracker V2 initialized');
    // Initialize screenshot service V2 (before restoring session)
    screenshotService = new screenshotServiceV2_1.ScreenshotServiceV2(databaseService);
    screenshotService.setActivityTracker(activityTracker);
    console.log('✅ Screenshot service V2 initialized');
    // Restore existing active session if any
    try {
        const activeSession = databaseService.getActiveSession();
        if (activeSession) {
            console.log(`📄 Found existing active session: ${activeSession.id}`);
            activityTracker.restoreSession(activeSession.id, activeSession.mode, activeSession.projectId || undefined);
            // Start screenshot service for the restored session
            screenshotService.enableAutoSessionCreation();
            screenshotService.start();
            console.log('✅ Session restored and screenshot service started');
        }
        else {
            console.log('ℹ️ No active session found - screenshot service NOT started');
        }
    }
    catch (error) {
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
    activityTracker.on('session:started', async (session) => {
        console.log('📷 Session started event received, starting screenshot service for new session:', session.id);
        try {
            // Re-enable auto session creation in case it was disabled
            screenshotService.enableAutoSessionCreation();
            await screenshotService.start();
            console.log('✅ Screenshot service started successfully for session:', session.id);
        }
        catch (error) {
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
    apiSyncService = new apiSyncService_1.ApiSyncService(databaseService, store);
    browserBridge = new browserExtensionBridge_1.BrowserExtensionBridge();
    console.log('✅ API sync and browser bridge initialized');
    // Listen for concurrent session detection
    electron_1.app.on('concurrent-session-detected', async (event) => {
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
        dialog.showErrorBox('Concurrent Session Detected', 'Another device is already tracking time for your account. This session has been stopped to prevent duplicate time tracking.');
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
    // Auth handlers
    electron_1.ipcMain.handle('auth:login', async (_, email, password) => {
        return apiSyncService.login(email, password);
    });
    electron_1.ipcMain.handle('auth:current-user', async () => {
        return databaseService.getCurrentUser();
    });
    electron_1.ipcMain.handle('auth:set-user', async (_, userData) => {
        databaseService.setCurrentUser(userData);
        return true;
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
    // Session handlers
    electron_1.ipcMain.handle('session:start', async (_, mode, projectId, task) => {
        return activityTracker.startSession(mode, projectId, task);
    });
    electron_1.ipcMain.handle('session:stop', async () => {
        return activityTracker.stopSession();
    });
    electron_1.ipcMain.handle('session:current', async () => {
        return databaseService.getActiveSession();
    });
    electron_1.ipcMain.handle('session:activity', async () => {
        return databaseService.getCurrentActivity();
    });
    electron_1.ipcMain.handle('session:switch-mode', async (_, mode, projectId, task) => {
        // Stop current session and start new one
        await activityTracker.stopSession();
        return activityTracker.startSession(mode, projectId, task);
    });
    // Dashboard handlers
    electron_1.ipcMain.handle('dashboard:get-data', async () => {
        return databaseService.getDashboardData();
    });
    // Screenshot handlers
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
    // Activity handlers
    electron_1.ipcMain.handle('activity:get-period-details', async (_, periodId) => {
        return databaseService.getActivityPeriodDetails(periodId);
    });
    // Notes handlers
    electron_1.ipcMain.handle('notes:get-recent', async () => {
        return databaseService.getRecentNotes();
    });
    electron_1.ipcMain.handle('notes:save', async (_, noteText) => {
        console.log('IPC: notes:save called with:', noteText);
        const result = await databaseService.saveNote(noteText);
        console.log('IPC: notes:save completed');
        return result;
    });
    electron_1.ipcMain.handle('notes:get-current', async () => {
        // Get the current activity from the main window's localStorage
        const result = await mainWindow?.webContents.executeJavaScript('localStorage.getItem("currentActivity")');
        console.log('Current activity from UI:', result);
        return result || 'Working';
    });
    // Leaderboard handler
    electron_1.ipcMain.handle('leaderboard:get', async () => {
        return databaseService.getLeaderboard();
    });
    // Browser activity handler
    electron_1.ipcMain.handle('browser:activity', async (_, data) => {
        return browserBridge.handleBrowserActivity(data);
    });
    // Database handlers
    electron_1.ipcMain.handle('database:info', async () => {
        return databaseService.getDatabaseInfo();
    });
    electron_1.ipcMain.handle('database:export', async () => {
        return databaseService.exportUserData();
    });
    // Projects handler
    electron_1.ipcMain.handle('projects:list', async () => {
        return databaseService.getProjects();
    });
    // Organization handlers
    electron_1.ipcMain.handle('organizations:create', async (_, name, code, timezone) => {
        return databaseService.createOrganization(name, code, timezone);
    });
    electron_1.ipcMain.handle('organizations:list', async () => {
        return databaseService.getOrganizations();
    });
    electron_1.ipcMain.handle('organizations:stats', async (_, organizationId) => {
        return databaseService.getOrganizationStats(organizationId);
    });
    // User management handlers
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
//# sourceMappingURL=indexV2.js.map