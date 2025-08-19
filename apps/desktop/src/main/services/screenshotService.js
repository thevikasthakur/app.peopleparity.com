"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotService = void 0;
const screenshot_desktop_1 = __importDefault(require("screenshot-desktop"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const electron_1 = require("electron");
const crypto_1 = __importDefault(require("crypto"));
class ScreenshotService {
    constructor(db) {
        this.db = db;
        this.isCapturing = false;
        this.captureTimers = new Map();
        this.screenshotDir = path_1.default.join(electron_1.app.getPath('userData'), 'screenshots');
        this.ensureScreenshotDir();
    }
    async start() {
        if (this.isCapturing) {
            console.log('Screenshot service already running');
            return;
        }
        console.log('Starting screenshot service...');
        this.isCapturing = true;
        this.scheduleScreenshots();
        setInterval(() => {
            console.log('Scheduling screenshots for next 10-minute period');
            this.scheduleScreenshots();
        }, 10 * 60 * 1000);
        console.log('Screenshot service started successfully');
    }
    stop() {
        this.isCapturing = false;
        this.captureTimers.forEach(timer => clearTimeout(timer));
        this.captureTimers.clear();
    }
    async ensureScreenshotDir() {
        try {
            await promises_1.default.access(this.screenshotDir);
        }
        catch {
            await promises_1.default.mkdir(this.screenshotDir, { recursive: true });
        }
    }
    scheduleScreenshots() {
        console.log('Scheduling screenshots...');
        this.captureTimers.forEach(timer => clearTimeout(timer));
        this.captureTimers.clear();
        const now = new Date();
        const currentMinute = now.getMinutes();
        const currentPeriod = Math.floor(currentMinute / 10);
        console.log(`Current time: ${now.toISOString()}, minute: ${currentMinute}, period: ${currentPeriod}`);
        // Schedule screenshots for the next hour in 10-minute intervals
        for (let i = 0; i < 6; i++) {
            const periodStartMinute = i * 10; // 0, 10, 20, 30, 40, 50
            // Create capture time for this period
            const captureTime = new Date(now);
            captureTime.setMinutes(periodStartMinute);
            captureTime.setSeconds(0);
            captureTime.setMilliseconds(0);
            // Add random offset within the 10-minute window (0-9 minutes, 59 seconds)
            const randomOffsetMs = Math.floor(Math.random() * (10 * 60 * 1000 - 1000)); // 0 to 9:59
            captureTime.setTime(captureTime.getTime() + randomOffsetMs);
            // If this time has already passed, schedule for next hour
            if (captureTime <= now) {
                captureTime.setHours(captureTime.getHours() + 1);
            }
            const delay = captureTime.getTime() - now.getTime();
            console.log(`Scheduling screenshot ${i} for ${captureTime.toISOString()} (in ${Math.round(delay / 1000)}s)`);
            const timer = setTimeout(() => {
                this.captureScreenshot(i);
            }, delay);
            this.captureTimers.set(i, timer);
        }
    }
    async captureScreenshot(periodIndex) {
        console.log(`Attempting to capture screenshot for period ${periodIndex}`);
        if (!this.isCapturing) {
            console.log('Screenshot service not capturing, skipping');
            return;
        }
        const currentActivity = await this.db.getCurrentActivity();
        console.log('Current activity:', currentActivity);
        if (!currentActivity || !currentActivity.isActive) {
            console.log('No active session, skipping screenshot');
            return;
        }
        // Get the real-time activity score
        const realtimeScore = currentActivity.activityScore || 0;
        console.log(`Real-time activity score: ${realtimeScore}`);
        // Always take screenshots when there's an active session
        // This allows users to see their actual activity levels, even if 0%
        try {
            const img = await (0, screenshot_desktop_1.default)();
            const filename = `${Date.now()}_${crypto_1.default.randomBytes(4).toString('hex')}.jpg`;
            const localPath = path_1.default.join(this.screenshotDir, filename);
            await (0, sharp_1.default)(img)
                .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toFile(localPath);
            const thumbnailFilename = `thumb_${filename}`;
            const thumbnailPath = path_1.default.join(this.screenshotDir, thumbnailFilename);
            await (0, sharp_1.default)(img)
                .resize(320, 180, { fit: 'cover' })
                .jpeg({ quality: 70 })
                .toFile(thumbnailPath);
            // Save screenshot with the activity score metadata
            const screenshotData = {
                activityPeriodId: currentActivity.periodId,
                localPath,
                thumbnailPath,
                capturedAt: new Date(),
                activityScore: realtimeScore // Include the real-time activity score
            };
            await this.db.saveScreenshot(screenshotData);
            // Also update the activity period with the current score if needed
            // This ensures the period has the latest activity data
            console.log(`Screenshot saved with activity score: ${realtimeScore}%`);
            console.log(`Screenshot captured: ${filename}`);
        }
        catch (error) {
            console.error('Failed to capture screenshot:', error);
        }
    }
    async getScreenshotFullPath(screenshotId) {
        const screenshot = await this.db.getScreenshot(screenshotId);
        if (!screenshot || !screenshot.localPath)
            return null;
        return screenshot.localPath;
    }
    async deleteScreenshotFiles(screenshotIds) {
        for (const id of screenshotIds) {
            const screenshot = await this.db.getScreenshot(id);
            if (screenshot && screenshot.localPath) {
                try {
                    await promises_1.default.unlink(screenshot.localPath);
                    const thumbnailPath = screenshot.localPath.replace(path_1.default.basename(screenshot.localPath), `thumb_${path_1.default.basename(screenshot.localPath)}`);
                    await promises_1.default.unlink(thumbnailPath);
                }
                catch (error) {
                    console.error(`Failed to delete screenshot file: ${screenshot.localPath}`, error);
                }
            }
        }
    }
}
exports.ScreenshotService = ScreenshotService;
//# sourceMappingURL=screenshotService.js.map