import { DatabaseService } from './databaseService';
import { EventEmitter } from 'events';
interface ActivityMetrics {
    keyHits: number;
    productiveKeyHits: number;
    navigationKeyHits: number;
    uniqueKeys: Set<number>;
    productiveUniqueKeys: Set<number>;
    mouseClicks: number;
    rightClicks: number;
    mouseScrolls: number;
    mouseDistance: number;
    lastMousePosition: {
        x: number;
        y: number;
    } | null;
}
interface MemoryActivityPeriod {
    id: string;
    sessionId: string;
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    mode: 'client_hours' | 'command_hours';
    activityScore: number;
    isValid: boolean;
    classification?: string;
    metrics: ActivityMetrics;
    vsCodeData?: any;
    commandHourData?: any;
    clientHourData?: any;
}
export declare class ActivityTracker extends EventEmitter {
    private db;
    private isTracking;
    private currentMode;
    private currentSessionId;
    private currentProjectId;
    private metrics;
    private periodStartTime;
    private sessionStartTime;
    private vsCodeExtensionData;
    private idleTimer;
    private periodTimer;
    private lastActivityTime;
    private activeSeconds;
    private activeTimeInterval;
    private memoryActivityPeriods;
    private memoryScreenshots;
    private windowCompletionTimer;
    private currentWindowEnd;
    private savedWindows;
    private keyTimestamps;
    private clickTimestamps;
    private lastKeyCode;
    private repeatedKeyCount;
    private suspiciousActivityScore;
    private navigationKeys;
    private productiveKeys;
    constructor(db: DatabaseService);
    private initializeKeySets;
    restoreSession(sessionId: string, mode: 'client_hours' | 'command_hours', projectId?: string): void;
    start(): void;
    stop(): void;
    private setupKeyboardTracking;
    private setupMouseTracking;
    private detectBotActivity;
    private startActiveTimeTracking;
    private startPeriodTimer;
    private startIdleDetection;
    private savePeriodData;
    storeScreenshotInMemory(screenshotData: {
        id: string;
        userId: string;
        sessionId: string;
        localPath: string;
        thumbnailPath?: string;
        capturedAt: Date;
        mode: 'client_hours' | 'command_hours';
        notes?: string;
    }): void;
    private scheduleWindowCompletion;
    private saveCompletedWindow;
    saveMemoryPeriodsToDatabase(screenshotId: string, screenshotTime: Date): Promise<string[]>;
    getMemoryActivityPeriods(windowStart: Date, windowEnd: Date): MemoryActivityPeriod[];
    private calculateActivityScore;
    private determineValidity;
    private classifyActivity;
    startSession(mode: 'client_hours' | 'command_hours', projectId?: string, task?: string): Promise<{
        id: string;
        userId: string;
        mode: "client_hours" | "command_hours";
        projectId: string | undefined;
        startTime: Date;
        isActive: boolean;
        task: string | undefined;
    }>;
    stopSession(): Promise<void>;
    switchMode(mode: 'client_hours' | 'command_hours', projectId?: string, task?: string): Promise<{
        id: string;
        userId: string;
        mode: "client_hours" | "command_hours";
        projectId: string | undefined;
        startTime: Date;
        isActive: boolean;
        task: string | undefined;
    }>;
    receiveVSCodeData(data: any): void;
    getCurrentActivityScore(): number;
    private updateCurrentPeriodScore;
    getCurrentSessionId(): string | null;
    hasActiveSession(): boolean;
    private resetMetrics;
}
export {};
//# sourceMappingURL=activityTracker.d.ts.map