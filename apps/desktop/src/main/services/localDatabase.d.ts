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
    isSynced: number;
    createdAt: number;
}
interface ActivityPeriod {
    id: string;
    sessionId: string;
    userId: string;
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
    activityPeriodId: string;
    localPath: string;
    thumbnailPath?: string;
    s3Url?: string;
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
    private initializeSchema;
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
    }): Session;
    endActiveSessions(userId: string): void;
    getActiveSession(userId: string): Session | null;
    getCurrentActivityPeriod(sessionId: string): any;
    getActivityPeriod(periodId: string): any;
    getActivityMetrics(periodId: string): any;
    createActivityPeriod(data: {
        id?: string;
        sessionId: string;
        userId: string;
        periodStart: Date;
        periodEnd: Date;
        mode: 'client_hours' | 'command_hours';
        activityScore: number;
        isValid: boolean;
        classification?: string;
    }): ActivityPeriod;
    saveScreenshot(data: {
        userId: string;
        activityPeriodId: string;
        localPath: string;
        thumbnailPath?: string;
        capturedAt: Date;
        mode: 'client_hours' | 'command_hours';
    }): {
        id: `${string}-${string}-${string}-${string}-${string}`;
        userId: string;
        activityPeriodId: string;
        localPath: string;
        thumbnailPath: string | null;
        s3Url: null;
        capturedAt: number;
        mode: "client_hours" | "command_hours";
        notes: null;
        isDeleted: number;
        isSynced: number;
        createdAt: number;
    };
    getTodayScreenshots(userId: string): Screenshot[];
    updateScreenshotUrls(screenshotId: string, s3Url: string, thumbnailUrl: string): void;
    getTodayStats(userId: string): {
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
    saveRecentNote(userId: string, noteText: string): void;
    getRecentNotes(userId: string, limit?: number): string[];
    clearOldData(daysToKeep?: number): void;
    clearSyncQueue(): void;
    checkForeignKeys(): unknown;
    enableForeignKeys(): void;
    clearSessionsAndRelatedData(): void;
    close(): void;
    vacuum(): void;
    getDatabaseSize(): number;
    exportData(userId: string): any;
}
export {};
//# sourceMappingURL=localDatabase.d.ts.map