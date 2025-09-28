"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoUpdaterService = void 0;
exports.getAutoUpdater = getAutoUpdater;
const electron_updater_1 = require("electron-updater");
const electron_1 = require("electron");
const events_1 = require("events");
class AutoUpdaterService extends events_1.EventEmitter {
    constructor() {
        super();
        this.mainWindow = null;
        this.isCheckingUpdate = false;
        this.updateAvailable = false;
        this.setupUpdater();
    }
    setMainWindow(window) {
        this.mainWindow = window;
    }
    setupUpdater() {
        // Configure auto-updater
        electron_updater_1.autoUpdater.autoDownload = false; // Let user choose when to download
        electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
        // Disable auto-updater in development
        if (process.env.NODE_ENV === 'development') {
            console.log('Auto-updater disabled in development mode');
            return;
        }
        // Set update feed URL (GitHub releases or custom server)
        electron_updater_1.autoUpdater.setFeedURL({
            provider: 'github',
            owner: 'peopleparity',
            repo: 'time-tracker-releases',
            private: false
        });
        // Auto-updater events
        electron_updater_1.autoUpdater.on('checking-for-update', () => {
            console.log('Checking for updates...');
            this.isCheckingUpdate = true;
            this.emit('checking-for-update');
        });
        electron_updater_1.autoUpdater.on('update-available', (info) => {
            console.log('Update available:', info.version);
            this.updateAvailable = true;
            this.isCheckingUpdate = false;
            // Notify user about update
            const response = electron_1.dialog.showMessageBoxSync(this.mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: `A new version (${info.version}) is available. Would you like to download it now?`,
                detail: 'The update will be downloaded in the background. You will be notified when it is ready to install.',
                buttons: ['Download', 'Later'],
                defaultId: 0,
                cancelId: 1
            });
            if (response === 0) {
                electron_updater_1.autoUpdater.downloadUpdate();
            }
            this.emit('update-available', info);
        });
        electron_updater_1.autoUpdater.on('update-not-available', (info) => {
            console.log('No updates available');
            this.isCheckingUpdate = false;
            this.emit('update-not-available', info);
        });
        electron_updater_1.autoUpdater.on('error', (error) => {
            console.error('Update error:', error);
            this.isCheckingUpdate = false;
            // Don't show error dialog in production for network errors
            if (error.message.includes('net::') || error.message.includes('ENOTFOUND')) {
                console.log('Network error checking for updates, will retry later');
                return;
            }
            electron_1.dialog.showErrorBox('Update Error', `Error checking for updates: ${error.message}`);
            this.emit('error', error);
        });
        electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
            const percent = Math.round(progressObj.percent);
            console.log(`Download progress: ${percent}%`);
            // Send progress to renderer
            if (this.mainWindow) {
                this.mainWindow.webContents.send('update-download-progress', {
                    percent,
                    bytesPerSecond: progressObj.bytesPerSecond,
                    total: progressObj.total,
                    transferred: progressObj.transferred
                });
            }
            this.emit('download-progress', progressObj);
        });
        electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
            console.log('Update downloaded:', info.version);
            const response = electron_1.dialog.showMessageBoxSync(this.mainWindow, {
                type: 'info',
                title: 'Update Ready',
                message: 'Update downloaded successfully!',
                detail: `Version ${info.version} has been downloaded and is ready to install. The application will restart to apply the update.`,
                buttons: ['Restart Now', 'Later'],
                defaultId: 0,
                cancelId: 1
            });
            if (response === 0) {
                // Quit and install update
                setImmediate(() => {
                    electron_updater_1.autoUpdater.quitAndInstall(false, true);
                });
            }
            this.emit('update-downloaded', info);
        });
    }
    /**
     * Manually check for updates
     */
    async checkForUpdates() {
        if (this.isCheckingUpdate) {
            console.log('Already checking for updates');
            return;
        }
        if (process.env.NODE_ENV === 'development') {
            console.log('Skipping update check in development');
            return;
        }
        try {
            await electron_updater_1.autoUpdater.checkForUpdates();
        }
        catch (error) {
            console.error('Error checking for updates:', error);
            throw error;
        }
    }
    /**
     * Check for updates silently (no dialogs)
     */
    async checkForUpdatesSilently() {
        if (this.isCheckingUpdate) {
            return;
        }
        if (process.env.NODE_ENV === 'development') {
            return;
        }
        try {
            await electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
        }
        catch (error) {
            // Silently fail for background checks
            console.error('Silent update check failed:', error);
        }
    }
    /**
     * Download update if available
     */
    async downloadUpdate() {
        if (this.updateAvailable) {
            await electron_updater_1.autoUpdater.downloadUpdate();
        }
    }
    /**
     * Install downloaded update and restart
     */
    quitAndInstall() {
        electron_updater_1.autoUpdater.quitAndInstall(false, true);
    }
    /**
     * Get current version
     */
    getCurrentVersion() {
        return electron_updater_1.autoUpdater.currentVersion.version;
    }
    /**
     * Check if update is available
     */
    isUpdateAvailable() {
        return this.updateAvailable;
    }
}
exports.AutoUpdaterService = AutoUpdaterService;
// Singleton instance
let autoUpdaterService = null;
function getAutoUpdater() {
    if (!autoUpdaterService) {
        autoUpdaterService = new AutoUpdaterService();
    }
    return autoUpdaterService;
}
//# sourceMappingURL=autoUpdater.js.map