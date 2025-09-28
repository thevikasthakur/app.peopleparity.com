"use strict";
/**
 * Screenshot Service V2 - Works with the new ActivityTrackerV2
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotServiceV2 = void 0;
// import screenshot from 'screenshot-desktop';
const screenshotElectron_1 = require("./screenshotElectron");
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const electron_1 = require("electron");
const crypto_1 = __importDefault(require("crypto"));
class ScreenshotServiceV2 {
    constructor(db) {
        this.db = db;
        this.isCapturing = false;
        this.captureTimers = new Map();
        this.activityTracker = null;
        this.lastScreenshotWindow = -1; // Track the last window we took a screenshot in
        this.autoSessionCreationEnabled = true; // Flag to control auto session creation
        this.screenshotDir = path_1.default.join(electron_1.app.getPath('userData'), 'screenshots');
        console.log('📂 Screenshot directory:', this.screenshotDir);
        this.ensureScreenshotDir();
    }
    setActivityTracker(tracker) {
        this.activityTracker = tracker;
    }
    async start() {
        if (this.isCapturing) {
            console.log('📷 Screenshot service already running');
            return;
        }
        console.log('📷 Starting screenshot service...');
        console.log('📷 Auto session creation enabled:', this.autoSessionCreationEnabled);
        this.isCapturing = true;
        // Capture initial screenshot immediately when starting
        console.log('📸 Taking initial screenshot on session start...');
        await this.captureScreenshot(0);
        // Then schedule regular screenshots
        this.scheduleNextScreenshot();
        console.log('✅ Screenshot service started - will capture screenshots every 10 minutes');
    }
    stop() {
        console.log('🛑 Stopping screenshot service...');
        this.isCapturing = false;
        // Clear all timers
        this.captureTimers.forEach(timer => clearTimeout(timer));
        this.captureTimers.clear();
        console.log('✅ Screenshot service stopped');
    }
    async ensureScreenshotDir() {
        try {
            await promises_1.default.access(this.screenshotDir);
        }
        catch {
            await promises_1.default.mkdir(this.screenshotDir, { recursive: true });
        }
    }
    /**
     * Schedule the next screenshot within the current 10-minute window
     */
    scheduleNextScreenshot() {
        if (!this.isCapturing)
            return;
        const now = new Date();
        const currentMinute = now.getMinutes();
        const windowStartMinute = Math.floor(currentMinute / 10) * 10;
        const windowEndMinute = windowStartMinute + 10;
        const currentHour = now.getHours();
        const currentWindowId = currentHour * 6 + Math.floor(currentMinute / 10);
        // Check if we've already taken a screenshot in this window
        const alreadyTakenInWindow = this.lastScreenshotWindow === currentWindowId;
        let captureTime = new Date(now);
        if (!alreadyTakenInWindow && (currentMinute - windowStartMinute) < 8) {
            // We're early in the current window and haven't taken a screenshot yet
            // Schedule within the current window (2-8 minutes from window start)
            const remainingMinutes = windowEndMinute - currentMinute;
            const randomOffsetMinutes = 2 + Math.random() * Math.min(6, remainingMinutes - 2);
            const targetMinute = windowStartMinute + randomOffsetMinutes;
            captureTime.setMinutes(Math.floor(targetMinute));
            captureTime.setSeconds(Math.floor((targetMinute % 1) * 60));
            captureTime.setMilliseconds(0);
            // Make sure it's in the future (at least 5 seconds from now)
            if (captureTime.getTime() <= now.getTime() + 5000) {
                captureTime.setTime(now.getTime() + 5000 + Math.random() * 10000);
            }
        }
        else {
            // Schedule for the NEXT window
            const nextWindowStart = windowEndMinute % 60;
            const randomOffsetMinutes = Math.random() * 10; // 0-10 minutes spread
            // If next window is in the next hour
            if (windowEndMinute >= 60) {
                captureTime.setHours(captureTime.getHours() + 1);
            }
            // Set the minutes
            const targetMinute = nextWindowStart + randomOffsetMinutes;
            captureTime.setMinutes(Math.floor(targetMinute));
            captureTime.setSeconds(Math.floor((targetMinute % 1) * 60));
            captureTime.setMilliseconds(0);
            // Make sure we're scheduling for the future
            if (captureTime.getTime() <= now.getTime()) {
                captureTime.setHours(captureTime.getHours() + 1);
            }
        }
        const delay = captureTime.getTime() - now.getTime();
        console.log(`\n📅 Next screenshot scheduled at ${captureTime.toISOString()} (in ${Math.round(delay / 1000)}s)`);
        // Clear any existing timer
        if (this.captureTimers.has(0)) {
            clearTimeout(this.captureTimers.get(0));
        }
        const timer = setTimeout(() => {
            this.captureScreenshot(0);
        }, delay);
        this.captureTimers.set(0, timer);
    }
    /**
     * Schedule screenshots for the next hour (one per 10-minute window) - DEPRECATED
     */
    scheduleScreenshots() {
        console.log('\n📅 Scheduling screenshots for next hour...');
        // Clear existing timers
        this.captureTimers.forEach(timer => clearTimeout(timer));
        this.captureTimers.clear();
        const now = new Date();
        // Schedule one screenshot for each 10-minute window in the next hour
        for (let i = 0; i < 6; i++) {
            // Calculate window start time
            const windowStartMinute = i * 10;
            const captureTime = new Date(now);
            captureTime.setMinutes(windowStartMinute);
            captureTime.setSeconds(0);
            captureTime.setMilliseconds(0);
            // Add random offset within the 10-minute window (1-9 minutes)
            const randomOffset = Math.floor(Math.random() * 9 * 60 * 1000) + 60000; // 1-9 minutes in ms
            captureTime.setTime(captureTime.getTime() + randomOffset);
            // If time has passed, schedule for next hour
            if (captureTime <= now) {
                captureTime.setHours(captureTime.getHours() + 1);
            }
            const delay = captureTime.getTime() - now.getTime();
            console.log(`  Window ${i}: Screenshot at ${captureTime.toISOString()} (in ${Math.round(delay / 1000)}s)`);
            const timer = setTimeout(() => {
                this.captureScreenshot(i);
            }, delay);
            this.captureTimers.set(i, timer);
        }
    }
    /**
     * Capture a screenshot
     */
    async captureScreenshot(windowIndex) {
        if (!this.isCapturing) {
            console.log('⚠️ Screenshot service not capturing');
            return;
        }
        // Check if we've already taken a screenshot in this window
        const now = new Date();
        const currentWindow = Math.floor(now.getMinutes() / 10);
        const currentHour = now.getHours();
        const windowId = currentHour * 6 + currentWindow; // Unique ID for each 10-min window in a day
        if (this.lastScreenshotWindow === windowId) {
            console.log(`⚠️ Screenshot already taken for window ${currentHour}:${currentWindow}0-${currentHour}:${currentWindow + 1}0, skipping`);
            // Schedule next screenshot for next window
            this.scheduleNextScreenshot();
            return;
        }
        // Get current user (required)
        const currentUser = this.db.getCurrentUser();
        if (!currentUser) {
            console.log('⚠️ No current user, skipping screenshot');
            return;
        }
        // Try to get active session, but don't fail if none exists
        let session = this.db.getActiveSession();
        console.log('📷 Screenshot capture - Active session from DB:', session ? `${session.id} (task: ${session.task})` : 'none');
        // If no active session, check with activity tracker
        let sessionId = session?.id;
        if (!sessionId && this.activityTracker) {
            const trackerSessionId = this.activityTracker.getCurrentSessionId();
            console.log('📷 Activity tracker session ID:', trackerSessionId);
            sessionId = trackerSessionId || undefined;
            if (sessionId) {
                // Get session details from database
                const trackerSession = this.db.getSession?.(sessionId);
                if (trackerSession) {
                    session = trackerSession;
                    console.log('📷 Session from tracker:', `${trackerSession.id} (task: ${trackerSession.task})`);
                }
            }
        }
        // If still no session, check if auto-creation is allowed
        if (!session || !sessionId) {
            if (!this.autoSessionCreationEnabled) {
                console.log('⚠️ No active session and auto-creation disabled, skipping screenshot');
                // Schedule next screenshot
                this.scheduleNextScreenshot();
                return;
            }
            console.log('⚠️ No active session found, but continuing with screenshot capture');
            // Use a fallback session ID or create a temporary one
            sessionId = 'TEMP-' + Date.now();
        }
        const captureTime = new Date();
        console.log(`\n📸 Capturing screenshot at ${captureTime.toISOString()}`);
        try {
            // Capture the screenshot
            console.log('📷 Calling Electron desktopCapturer to capture screen...');
            let img;
            try {
                img = await (0, screenshotElectron_1.captureScreenshotAlternative)();
            }
            catch (screenshotError) {
                console.error('❌ Electron screenshot error:', screenshotError.message);
                console.error('Error details:', screenshotError);
                throw screenshotError;
            }
            console.log('📷 Screenshot captured, buffer size:', img ? img.length : 0);
            if (!img || img.length === 0) {
                throw new Error('Screenshot buffer is empty');
            }
            // Generate filenames
            const filename = `${captureTime.getTime()}_${crypto_1.default.randomBytes(4).toString('hex')}.jpg`;
            const localPath = path_1.default.join(this.screenshotDir, filename);
            const thumbnailFilename = `thumb_${filename}`;
            const thumbnailPath = path_1.default.join(this.screenshotDir, thumbnailFilename);
            console.log('📷 Saving screenshot to:', localPath);
            console.log('🔍 Debug - localPath type:', typeof localPath, 'value:', localPath);
            console.log('🔍 Debug - img type:', typeof img, 'isBuffer:', Buffer.isBuffer(img), 'length:', img?.length);
            // Save full size image
            try {
                // Ensure localPath is a string
                const pathStr = String(localPath);
                console.log('🔍 Debug - Using pathStr:', pathStr);
                await (0, sharp_1.default)(img)
                    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 85 })
                    .toFile(pathStr);
            }
            catch (sharpError) {
                console.error('❌ Sharp error (full size):', sharpError.message);
                throw sharpError;
            }
            console.log('📷 Saving thumbnail to:', thumbnailPath);
            // Save thumbnail
            try {
                // Ensure thumbnailPath is a string
                const thumbPathStr = String(thumbnailPath);
                await (0, sharp_1.default)(img)
                    .resize(320, 180, { fit: 'cover' })
                    .jpeg({ quality: 70 })
                    .toFile(thumbPathStr);
            }
            catch (sharpError) {
                console.error('❌ Sharp error (thumbnail):', sharpError.message);
                throw sharpError;
            }
            console.log('📷 Screenshot and thumbnail saved successfully');
            // Get the current activity directly from the database service
            const currentActivity = this.db.getCurrentActivityNote?.() || session?.task || 'Working';
            console.log(`📷 Using activity for screenshot: "${currentActivity}"`);
            // Create screenshot data
            const screenshotData = {
                id: crypto_1.default.randomUUID(),
                userId: currentUser.id,
                sessionId: sessionId, // Use sessionId variable (guaranteed to have value)
                localPath,
                thumbnailPath,
                capturedAt: captureTime,
                mode: session?.mode || 'command_hours',
                notes: currentActivity // Use the current activity from UI
            };
            // Store in activity tracker (which will add to window manager or save directly)
            if (this.activityTracker) {
                await this.activityTracker.storeScreenshot(screenshotData);
                console.log(`✅ Screenshot processed by activity tracker`);
                // Mark this window as having a screenshot
                this.lastScreenshotWindow = windowId;
            }
            else {
                console.warn('⚠️ ActivityTracker not set, cannot store screenshot');
            }
        }
        catch (error) {
            console.error('❌ Failed to capture screenshot:', error);
        }
        finally {
            // Always schedule the next screenshot
            this.scheduleNextScreenshot();
        }
    }
    /**
     * Get the full path of a screenshot
     */
    async getScreenshotFullPath(screenshotId) {
        const screenshot = await this.db.getScreenshot(screenshotId);
        if (!screenshot || !screenshot.localPath)
            return null;
        return screenshot.localPath;
    }
    /**
     * Disable auto session creation (used after concurrent session detection)
     */
    disableAutoSessionCreation() {
        console.log('🔒 Auto session creation disabled');
        this.autoSessionCreationEnabled = false;
    }
    /**
     * Enable auto session creation (used when starting a new session)
     */
    enableAutoSessionCreation() {
        console.log('🔓 Auto session creation enabled');
        this.autoSessionCreationEnabled = true;
    }
    /**
     * Delete screenshot files
     */
    async deleteScreenshotFiles(screenshotIds) {
        for (const id of screenshotIds) {
            const screenshot = await this.db.getScreenshot(id);
            if (screenshot && screenshot.localPath) {
                try {
                    await promises_1.default.unlink(screenshot.localPath);
                    // Delete thumbnail too
                    const thumbnailPath = screenshot.localPath.replace(path_1.default.basename(screenshot.localPath), `thumb_${path_1.default.basename(screenshot.localPath)}`);
                    await promises_1.default.unlink(thumbnailPath);
                }
                catch (error) {
                    console.error(`Failed to delete screenshot file: ${screenshot.localPath}`, error);
                }
            }
        }
    }
    /**
     * Pause screenshot capture temporarily
     */
    pauseCapture() {
        console.log('⏸ Pausing screenshot capture...');
        this.isCapturing = false;
        // Clear all timers
        this.captureTimers.forEach(timer => clearTimeout(timer));
        this.captureTimers.clear();
    }
    /**
     * Resume screenshot capture
     */
    resumeCapture() {
        if (this.isCapturing) {
            console.log('⚠️ Screenshot capture is already active');
            return;
        }
        console.log('▶️ Resuming screenshot capture...');
        this.isCapturing = true;
        // Schedule next capture
        this.scheduleNextScreenshot();
    }
}
exports.ScreenshotServiceV2 = ScreenshotServiceV2;
//# sourceMappingURL=screenshotServiceV2.js.map