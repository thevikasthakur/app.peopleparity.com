"use strict";
/**
 * Window Manager - Handles 10-minute window-based data collection and saving
 *
 * This service manages the collection of activity periods and screenshots
 * in 10-minute windows, saving them together when each window completes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowManager = void 0;
const events_1 = require("events");
class WindowManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.currentWindow = null;
        this.windowTimer = null;
        this.isActive = false;
        this.sessionId = null;
        this.userId = null;
        this.mode = 'command_hours';
    }
    /**
     * Start tracking for a session
     */
    startSession(sessionId, userId, mode) {
        console.log(`\n🟢 WindowManager: Starting session ${sessionId}`);
        this.sessionId = sessionId;
        this.userId = userId;
        this.mode = mode;
        this.isActive = true;
        // Initialize the first window
        this.initializeWindow();
    }
    /**
     * Stop tracking
     */
    stopSession() {
        console.log(`\n🔴 WindowManager: Stopping session ${this.sessionId}`);
        // Save current window if it has data
        if (this.currentWindow && this.currentWindow.activityPeriods.length > 0) {
            this.saveWindow(this.currentWindow);
        }
        // Clear timer
        if (this.windowTimer) {
            clearTimeout(this.windowTimer);
            this.windowTimer = null;
        }
        // Reset state
        this.currentWindow = null;
        this.isActive = false;
        this.sessionId = null;
        this.userId = null;
    }
    /**
     * Initialize a new window
     */
    initializeWindow() {
        const now = new Date();
        // Calculate window boundaries (aligned to 10-minute intervals)
        const currentMinute = now.getMinutes();
        const windowStartMinute = Math.floor(currentMinute / 10) * 10;
        const windowEndMinute = windowStartMinute + 10;
        const windowStart = new Date(now);
        windowStart.setMinutes(windowStartMinute);
        windowStart.setSeconds(0);
        windowStart.setMilliseconds(0);
        const windowEnd = new Date(windowStart);
        // Handle hour rollover
        if (windowEndMinute >= 60) {
            windowEnd.setHours(windowEnd.getHours() + Math.floor(windowEndMinute / 60));
            windowEnd.setMinutes(windowEndMinute % 60);
        }
        else {
            windowEnd.setMinutes(windowEndMinute);
        }
        this.currentWindow = {
            windowStart,
            windowEnd,
            activityPeriods: [],
            screenshot: null
        };
        console.log(`\n📅 Window initialized: ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);
        // Schedule window completion
        this.scheduleWindowCompletion(windowEnd);
    }
    /**
     * Schedule when to save and close the current window
     */
    scheduleWindowCompletion(windowEnd) {
        // Clear any existing timer
        if (this.windowTimer) {
            clearTimeout(this.windowTimer);
        }
        const now = new Date();
        const delay = windowEnd.getTime() - now.getTime() + 1000; // Add 1 second buffer
        if (delay > 0) {
            console.log(`⏰ Window completion scheduled in ${Math.round(delay / 1000)} seconds`);
            this.windowTimer = setTimeout(() => {
                console.log(`\n⏰ Window timer fired at ${new Date().toISOString()}`);
                this.completeWindow();
            }, delay);
        }
        else {
            // Window already passed, complete immediately
            console.log(`⚠️ Window already passed, completing immediately`);
            this.completeWindow();
        }
    }
    /**
     * Complete the current window and start a new one
     */
    completeWindow() {
        if (!this.currentWindow) {
            console.log('❌ No current window to complete');
            return;
        }
        console.log(`\n✅ Completing window: ${this.currentWindow.windowStart.toISOString()} - ${this.currentWindow.windowEnd.toISOString()}`);
        console.log(`  Activity periods: ${this.currentWindow.activityPeriods.length}`);
        console.log(`  Screenshot: ${this.currentWindow.screenshot ? 'Yes' : 'No'}`);
        // Save the window data
        if (this.currentWindow.activityPeriods.length > 0 || this.currentWindow.screenshot) {
            this.saveWindow(this.currentWindow);
        }
        // Start a new window if still active
        if (this.isActive) {
            this.initializeWindow();
        }
        else {
            this.currentWindow = null;
        }
    }
    /**
     * Save window data to database
     */
    saveWindow(window) {
        console.log(`\n💾 Saving window data to database...`);
        // Emit event for the activity tracker to handle the actual database saves
        this.emit('window:complete', window);
    }
    /**
     * Add an activity period to the current window
     */
    addActivityPeriod(period) {
        if (!this.currentWindow) {
            console.log('❌ No current window to add activity period to');
            return;
        }
        // Check if period belongs to current window
        const periodStart = period.periodStart.getTime();
        const windowStart = this.currentWindow.windowStart.getTime();
        const windowEnd = this.currentWindow.windowEnd.getTime();
        // Check if we've passed the window end time (timer might have failed)
        const now = new Date().getTime();
        if (now > windowEnd + 60000) { // More than 1 minute past window end
            console.log(`⚠️ Current window is overdue (ended ${new Date(windowEnd).toISOString()}), completing it now`);
            this.completeWindow();
            // Try adding to the new window if one was created
            if (this.currentWindow && periodStart >= this.currentWindow.windowStart.getTime()) {
                this.currentWindow.activityPeriods.push(period);
                console.log(`✅ Added activity period to new window (total: ${this.currentWindow.activityPeriods.length})`);
            }
            return;
        }
        // Period should overlap with the window
        if (periodStart >= windowStart && periodStart < windowEnd) {
            // Safety check: windows should not have more than 10 periods
            if (this.currentWindow.activityPeriods.length >= 10) {
                console.log(`⚠️ Window already has 10 periods, forcing completion`);
                this.completeWindow();
                // Add to new window
                if (this.currentWindow) {
                    this.addActivityPeriod(period);
                }
                return;
            }
            this.currentWindow.activityPeriods.push(period);
            console.log(`✅ Added activity period to window (total: ${this.currentWindow.activityPeriods.length})`);
        }
        else if (periodStart >= windowEnd) {
            // Period is for a future window, complete current and create new
            console.log(`⚠️ Period is for next window, completing current window`);
            this.completeWindow();
            // Try adding to the new window
            if (this.currentWindow) {
                this.addActivityPeriod(period); // Recursive call to add to new window
            }
        }
        else {
            console.log(`⚠️ Activity period ${period.periodStart.toISOString()} is from the past, ignoring`);
        }
    }
    /**
     * Set the screenshot for the current window
     */
    setScreenshot(screenshot) {
        if (!this.currentWindow) {
            console.log('❌ No current window to add screenshot to');
            return;
        }
        // Check if screenshot belongs to current window
        const capturedAt = screenshot.capturedAt.getTime();
        const windowStart = this.currentWindow.windowStart.getTime();
        const windowEnd = this.currentWindow.windowEnd.getTime();
        if (capturedAt >= windowStart && capturedAt < windowEnd) {
            this.currentWindow.screenshot = screenshot;
            console.log(`✅ Set screenshot for window`);
        }
        else {
            console.log(`⚠️ Screenshot ${screenshot.capturedAt.toISOString()} doesn't belong to current window`);
        }
    }
    /**
     * Get current window info
     */
    getCurrentWindowInfo() {
        if (!this.currentWindow) {
            return null;
        }
        return {
            windowStart: this.currentWindow.windowStart,
            windowEnd: this.currentWindow.windowEnd,
            activityPeriodCount: this.currentWindow.activityPeriods.length,
            hasScreenshot: !!this.currentWindow.screenshot
        };
    }
}
exports.WindowManager = WindowManager;
//# sourceMappingURL=windowManager.js.map