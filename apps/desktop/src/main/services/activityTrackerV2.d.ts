/**
 * Activity Tracker V2 - Simplified and reliable activity tracking
 *
 * This version uses the WindowManager for proper 10-minute window handling
 */
import { EventEmitter } from 'events';
import { DatabaseService } from './databaseService';
export declare class ActivityTrackerV2 extends EventEmitter {
    private db;
    private windowManager;
    private metricsCollector;
    private isTracking;
    private currentSessionId;
    private currentUserId;
    private currentMode;
    private currentProjectId;
    private currentTask;
    private sessionStartDate;
    private currentMetrics;
    private periodStartTime;
    private lastActivityTime;
    private activeSeconds;
    private periodTimer;
    private activeTimeTimer;
    private dateChangeTimer;
    private productiveKeys;
    private navigationKeys;
    private consecutiveZeroActivityCount;
    constructor(db: DatabaseService);
    private initializeKeys;
    private setupWindowManager;
    /**
     * Start a new tracking session
     */
    startSession(mode: 'client_hours' | 'command_hours', projectId?: string, task?: string): Promise<{
        id: string;
        userId: string;
        mode: "client_hours" | "command_hours";
        projectId: string | undefined;
        startTime: Date;
        isActive: boolean;
        task: string | undefined;
    }>;
    /**
     * Stop the current session
     */
    stopSession(): Promise<void>;
    /**
     * Restore an existing session (e.g., after app restart)
     */
    restoreSession(sessionId: string, mode: 'client_hours' | 'command_hours', projectId?: string, task?: string): void;
    /**
     * Start all tracking mechanisms
     */
    private startTracking;
    /**
     * Stop all tracking mechanisms
     */
    private stopTracking;
    /**
     * Setup keyboard tracking
     */
    private setupKeyboardTracking;
    /**
     * Setup mouse tracking
     */
    private setupMouseTracking;
    /**
     * Start the period timer (saves every minute)
     */
    private startPeriodTimer;
    /**
     * Start active time tracking
     */
    private startActiveTimeTracking;
    /**
     * Save period data (called every minute)
     */
    private savePeriodData;
    /**
     * Store a screenshot (called by ScreenshotService)
     */
    storeScreenshot(screenshotData: {
        id: string;
        userId: string;
        sessionId: string;
        localPath: string;
        thumbnailPath?: string;
        capturedAt: Date;
        mode: 'client_hours' | 'command_hours';
        notes?: string;
    }): Promise<void>;
    /**
     * Calculate activity score based on metrics
     */
    private calculateActivityScore;
    /**
     * Classify activity based on score
     */
    private classifyActivity;
    /**
     * Get current activity score (real-time)
     */
    getCurrentActivityScore(): number;
    /**
     * Get current session ID
     */
    getCurrentSessionId(): string | null;
    /**
     * Create empty metrics object
     */
    private createEmptyMetrics;
    /**
     * Get UTC date string in YYYY-MM-DD format
     */
    private getUTCDateString;
    /**
     * Start the date change timer to check for UTC midnight rollover
     */
    private startDateChangeTimer;
    /**
     * Handle UTC date change - stop session at midnight
     */
    private handleDateChange;
    /**
     * Pause tracking temporarily (keeps session active)
     */
    pauseTracking(): void;
    /**
     * Resume tracking after pause
     */
    resumeTracking(): void;
}
//# sourceMappingURL=activityTrackerV2.d.ts.map