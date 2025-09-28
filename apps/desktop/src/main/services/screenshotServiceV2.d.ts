/**
 * Screenshot Service V2 - Works with the new ActivityTrackerV2
 */
import { DatabaseService } from './databaseService';
import { ActivityTrackerV2 } from './activityTrackerV2';
export declare class ScreenshotServiceV2 {
    private db;
    private isCapturing;
    private screenshotDir;
    private captureTimers;
    private activityTracker;
    private lastScreenshotWindow;
    private autoSessionCreationEnabled;
    constructor(db: DatabaseService);
    setActivityTracker(tracker: ActivityTrackerV2): void;
    start(): Promise<void>;
    stop(): void;
    private ensureScreenshotDir;
    /**
     * Schedule the next screenshot within the current 10-minute window
     */
    private scheduleNextScreenshot;
    /**
     * Schedule screenshots for the next hour (one per 10-minute window) - DEPRECATED
     */
    private scheduleScreenshots;
    /**
     * Capture a screenshot
     */
    private captureScreenshot;
    /**
     * Get the full path of a screenshot
     */
    getScreenshotFullPath(screenshotId: string): Promise<string | null>;
    /**
     * Disable auto session creation (used after concurrent session detection)
     */
    disableAutoSessionCreation(): void;
    /**
     * Enable auto session creation (used when starting a new session)
     */
    enableAutoSessionCreation(): void;
    /**
     * Delete screenshot files
     */
    deleteScreenshotFiles(screenshotIds: string[]): Promise<void>;
    /**
     * Pause screenshot capture temporarily
     */
    pauseCapture(): void;
    /**
     * Resume screenshot capture
     */
    resumeCapture(): void;
}
//# sourceMappingURL=screenshotServiceV2.d.ts.map