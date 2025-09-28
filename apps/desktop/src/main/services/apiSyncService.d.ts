import { DatabaseService } from './databaseService';
import Store from 'electron-store';
interface AuthResponse {
    success: boolean;
    user?: {
        id: string;
        email: string;
        name: string;
        organizationId: string;
        organizationName: string;
        role: string;
    };
    token?: string;
    message?: string;
    projects?: any[];
}
export declare class ApiSyncService {
    private db;
    private store;
    private api;
    private syncInterval;
    private isOnline;
    private concurrentSessionDetected;
    private concurrentSessionHandledAt;
    constructor(db: DatabaseService, store: Store);
    private setupInterceptors;
    login(email: string, password: string): Promise<AuthResponse>;
    logout(): Promise<void>;
    checkSession(): Promise<{
        user?: any;
    }>;
    verifyToken(token: string): Promise<{
        valid: boolean;
        user?: any;
    }>;
    fetchProjects(): Promise<any>;
    fetchOrganizationUsers(): Promise<any>;
    fetchLeaderboard(): Promise<any>;
    fetchDailyProductiveHours(date: Date): Promise<{
        productiveHours: any;
        averageActivityScore: any;
        activityLevel: any;
        totalScreenshots: any;
        validScreenshots: any;
    } | null>;
    fetchWeeklyProductiveHours(date: Date): Promise<{
        productiveHours: any;
        averageActivityScore: any;
        activityLevel: any;
        dailyData: any;
        weekStart: any;
        weekEnd: any;
    } | null>;
    fetchDashboardStats(): Promise<any>;
    fetchSignedUrl(screenshotId: string): Promise<any>;
    deleteScreenshot(screenshotId: string): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }>;
    start(): void;
    resetConcurrentSessionFlag(): void;
    stopSync(): void;
    /**
     * Clean up failed screenshots with 0.0 score
     * These are auto-deleted after max attempts
     */
    cleanupFailedScreenshots(): Promise<void>;
    /**
     * Manually retry syncing a specific item and its related items
     */
    retrySyncItem(entityId: string, entityType: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    private syncData;
    private syncItem;
    private handleOffline;
    uploadScreenshot(localPath: string, captureTime?: Date): Promise<{
        fullUrl: string;
        thumbnailUrl: string;
    }>;
}
export {};
//# sourceMappingURL=apiSyncService.d.ts.map