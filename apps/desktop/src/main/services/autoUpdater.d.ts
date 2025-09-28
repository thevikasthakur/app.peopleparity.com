import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
export declare class AutoUpdaterService extends EventEmitter {
    private mainWindow;
    private isCheckingUpdate;
    private updateAvailable;
    constructor();
    setMainWindow(window: BrowserWindow): void;
    private setupUpdater;
    /**
     * Manually check for updates
     */
    checkForUpdates(): Promise<void>;
    /**
     * Check for updates silently (no dialogs)
     */
    checkForUpdatesSilently(): Promise<void>;
    /**
     * Download update if available
     */
    downloadUpdate(): Promise<void>;
    /**
     * Install downloaded update and restart
     */
    quitAndInstall(): void;
    /**
     * Get current version
     */
    getCurrentVersion(): string;
    /**
     * Check if update is available
     */
    isUpdateAvailable(): boolean;
}
export declare function getAutoUpdater(): AutoUpdaterService;
//# sourceMappingURL=autoUpdater.d.ts.map