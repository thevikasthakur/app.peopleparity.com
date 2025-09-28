interface LocalUser {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    organizationName: string;
    role: 'super_admin' | 'org_admin' | 'developer';
    lastSync: number;
}
interface Session {
    id: string;
    userId: string;
    projectId: string | null;
    projectName: string | null;
    mode: 'client_hours' | 'command_hours';
    startTime: number;
    endTime: number | null;
    isActive: number;
    task: string | null;
    appVersion: string | null;
    deviceInfo?: string | null;
    realIpAddress?: string | null;
    location?: string | null;
    isVpnDetected?: number;
    isSynced: number;
    createdAt: number;
}
interface ActivityPeriod {
    id: string;
    sessionId: string;
    userId: string;
    screenshotId?: string | null;
    periodStart: number;
    periodEnd: number;
    mode: 'client_hours' | 'command_hours';
    notes?: string | null;
    activityScore: number;
    isValid: number;
    classification?: string | null;
    isSynced: number;
    createdAt: number;
}
interface Screenshot {
    id: string;
    userId: string;
    sessionId: string;
    localPath: string;
    thumbnailPath?: string;
    url?: string;
    thumbnailUrl?: string;
    capturedAt: number;
    mode: 'client_hours' | 'command_hours';
    notes?: string;
    isDeleted: number;
    isSynced: number;
    createdAt: number;
}
export declare class LocalDatabase {
    private db;
    private dbPath;
    constructor();
    setCurrentUser(userData: {
        id: string;
        email: string;
        name: string;
        organizationId: string;
        organizationName: string;
        role: 'super_admin' | 'org_admin' | 'developer';
    }): void;
    getCurrentUser(): LocalUser | null;
    clearCurrentUser(): void;
    cacheProjects(projects: any[]): void;
    getCachedProjects(): any[];
    getProjects(): any[];
    createSession(data: {
        userId: string;
        mode: 'client_hours' | 'command_hours';
        projectId?: string;
        projectName?: string;
        task?: string;
    }): Promise<Session>;
    endActiveSessions(userId: string): void;
    getActiveSession(userId?: string): Session | null;
    getSession(sessionId: string): Session | null;
    getLatestScreenshotForSession(sessionId: string): Screenshot | null;
    getCurrentActivityPeriod(sessionId: string): any;
    getActivityPeriod(periodId: string): any;
    getActivityPeriodWithMetrics(periodId: string): any;
    getActivityPeriodsWithMetrics(periodIds: string[]): any[];
    getRecentActivityPeriods(sessionId: string, limit?: number): any[];
    getActivityPeriodsForScreenshot(screenshotId: string): any[];
    updateActivityPeriodScreenshot(periodId: string, screenshotId: string): void;
    getActivityPeriodsForTimeRange(sessionId: string, windowStart: Date, windowEnd: Date): any[];
    getActivityMetrics(periodId: string): any;
    createActivityPeriod(data: {
        id?: string;
        sessionId: string;
        userId: string;
        screenshotId?: string | null;
        periodStart: Date;
        periodEnd: Date;
        mode: 'client_hours' | 'command_hours';
        activityScore: number;
        isValid: boolean;
        classification?: string;
        metricsBreakdown?: any;
    }): ActivityPeriod;
    saveScreenshot(data: {
        id?: string;
        userId: string;
        sessionId: string;
        localPath: string;
        thumbnailPath?: string;
        capturedAt: Date;
        mode: 'client_hours' | 'command_hours';
        task?: string;
    }): any;
    getScreenshotsByDate(userId: string, date: Date): Screenshot[];
    getTodayScreenshots(userId: string): Screenshot[];
    getScreenshot(screenshotId: string): unknown;
    getScreenshotSyncStatus(screenshotId: string, periodIds: string[]): {
        status: "synced" | "partial" | "pending" | "failed" | "queued";
        uploadPercentage: number;
        screenshot: {
            synced: boolean;
            attempts: any;
            lastError: undefined;
        };
        activityPeriods: {
            total: any;
            synced: any;
            queued: any;
            maxAttempts: any;
            details: {
                id: any;
                periodStart: any;
                periodEnd: any;
                synced: boolean;
                queued: boolean;
                attempts: any;
                status: string;
            }[];
        };
        queuePosition: number;
        nextRetryTime: Date | null;
        lastAttemptAt: Date | null;
    };
    updateScreenshotUrls(screenshotId: string, url: string, thumbnailUrl: string): void;
    updateScreenshotNotes(screenshotIds: string[], notes: string): {
        success: boolean;
        updatedCount: number;
    };
    deleteScreenshots(screenshotIds: string[]): {
        success: boolean;
        error: string;
        deletedCount?: undefined;
        periodsUpdated?: undefined;
        filesDeleted?: undefined;
    } | {
        success: boolean;
        deletedCount: number;
        periodsUpdated: number;
        filesDeleted: number;
        error?: undefined;
    };
    getDateStats(userId: string, date: Date): {
        clientHours: number;
        commandHours: number;
        totalHours: number;
    };
    getTodayStats(userId: string): {
        clientHours: number;
        commandHours: number;
        totalHours: number;
    };
    getWeekStatsForDate(userId: string, date: Date): {
        clientHours: number;
        commandHours: number;
        totalHours: number;
    };
    getWeekStats(userId: string): {
        clientHours: number;
        commandHours: number;
        totalHours: number;
    };
    saveCommandHourActivity(periodId: string, data: any): void;
    saveClientHourActivity(periodId: string, data: any): void;
    addToSyncQueue(entityType: string, entityId: string, operation: string, data: any): void;
    getUnsyncedItems(limit?: number): any[];
    markSynced(queueId: string): void;
    incrementSyncAttempts(queueId: string): void;
    getFailedSyncItems(): unknown[];
    getSyncQueueItem(entityId: string, entityType: string): unknown;
    resetSyncAttempts(queueId: string): void;
    removeSyncQueueItem(queueId: string): void;
    saveRecentNote(userId: string, noteText: string): void;
    getRecentNotes(userId: string, limit?: number): string[];
    clearOldData(daysToKeep?: number): void;
    clearSyncQueue(): void;
    clearSyncQueueForSession(sessionId: string): void;
    checkForeignKeys(): unknown;
    enableForeignKeys(): void;
    clearSessionsAndRelatedData(): void;
    close(): void;
    vacuum(): void;
    getDatabaseSize(): number;
    exportData(userId: string): any;
    getValidActivityPeriodsForSession(sessionId: string): any[];
}
export {};
//# sourceMappingURL=localDatabase.d.ts.map