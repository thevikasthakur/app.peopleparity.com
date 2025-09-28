/**
 * Window Manager - Handles 10-minute window-based data collection and saving
 *
 * This service manages the collection of activity periods and screenshots
 * in 10-minute windows, saving them together when each window completes.
 */
import { EventEmitter } from 'events';
export interface WindowData {
    windowStart: Date;
    windowEnd: Date;
    activityPeriods: ActivityPeriod[];
    screenshot: Screenshot | null;
}
export interface ActivityPeriod {
    id: string;
    sessionId: string;
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    mode: 'client_hours' | 'command_hours';
    activityScore: number;
    isValid: boolean;
    classification?: string;
    metrics?: any;
    metricsBreakdown?: any;
    commandHourData?: any;
    clientHourData?: any;
}
export interface Screenshot {
    id: string;
    sessionId: string;
    userId: string;
    localPath: string;
    thumbnailPath?: string;
    capturedAt: Date;
    mode: 'client_hours' | 'command_hours';
    notes?: string;
}
export declare class WindowManager extends EventEmitter {
    private currentWindow;
    private windowTimer;
    private isActive;
    private sessionId;
    private userId;
    private mode;
    constructor();
    /**
     * Start tracking for a session
     */
    startSession(sessionId: string, userId: string, mode: 'client_hours' | 'command_hours'): void;
    /**
     * Stop tracking
     */
    stopSession(): void;
    /**
     * Initialize a new window
     */
    private initializeWindow;
    /**
     * Schedule when to save and close the current window
     */
    private scheduleWindowCompletion;
    /**
     * Complete the current window and start a new one
     */
    private completeWindow;
    /**
     * Save window data to database
     */
    private saveWindow;
    /**
     * Add an activity period to the current window
     */
    addActivityPeriod(period: ActivityPeriod): void;
    /**
     * Set the screenshot for the current window
     */
    setScreenshot(screenshot: Screenshot): void;
    /**
     * Get current window info
     */
    getCurrentWindowInfo(): {
        windowStart: Date;
        windowEnd: Date;
        activityPeriodCount: number;
        hasScreenshot: boolean;
    } | null;
}
//# sourceMappingURL=windowManager.d.ts.map