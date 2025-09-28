import { DatabaseService } from './databaseService';
import { ActivityTracker } from './activityTracker';
export declare class ScreenshotService {
    private db;
    private isCapturing;
    private screenshotDir;
    private captureTimers;
    private activityTracker;
    private autoSessionCreationEnabled;
    constructor(db: DatabaseService);
    setActivityTracker(tracker: ActivityTracker): void;
    start(): Promise<void>;
    stop(): void;
    /**
     * Disable auto session creation (used after concurrent session detection)
     */
    disableAutoSessionCreation(): void;
    /**
     * Enable auto session creation
     */
    enableAutoSessionCreation(): void;
    private ensureScreenshotDir;
    private scheduleScreenshots;
    private captureScreenshot;
    getScreenshotFullPath(screenshotId: string): Promise<string | null>;
    deleteScreenshotFiles(screenshotIds: string[]): Promise<void>;
}
//# sourceMappingURL=screenshotService.d.ts.map