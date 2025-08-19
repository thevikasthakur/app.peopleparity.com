import { DatabaseService } from './databaseService';
export declare class ScreenshotService {
    private db;
    private isCapturing;
    private screenshotDir;
    private captureTimers;
    constructor(db: DatabaseService);
    start(): Promise<void>;
    stop(): void;
    private ensureScreenshotDir;
    private scheduleScreenshots;
    private captureScreenshot;
    getScreenshotFullPath(screenshotId: string): Promise<string | null>;
    deleteScreenshotFiles(screenshotIds: string[]): Promise<void>;
}
//# sourceMappingURL=screenshotService.d.ts.map