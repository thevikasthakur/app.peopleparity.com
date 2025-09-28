interface ActivityPeriod {
    id: string;
    periodStart: string;
    periodEnd: string;
    activityScore: number;
    isValid: boolean;
    metrics?: {
        keyboard?: {
            totalKeystrokes: number;
            uniqueKeys: number;
            productiveKeystrokes: number;
            typingRhythm?: {
                consistent: boolean;
                stdDeviationMs: number;
            };
        };
        mouse?: {
            totalClicks: number;
            totalScrolls: number;
            distancePixels: number;
            movementPattern?: {
                smooth: boolean;
                avgSpeed: number;
            };
        };
        botDetection?: {
            keyboardBotDetected: boolean;
            mouseBotDetected: boolean;
            confidence: number;
            details?: string[];
        };
        scoreCalculation?: {
            finalScore: number;
        };
    };
}
interface Screenshot {
    id: string;
    thumbnailUrl?: string;
    url?: string;
    fullUrl?: string;
    timestamp?: string;
    capturedAt?: string;
    userId: string;
    userName?: string;
    activityScore?: number;
    activityName?: string;
    notes?: string;
    task?: string;
    mode: 'client_hours' | 'command_hours' | 'client' | 'command';
    deviceInfo?: string;
    activityPeriods?: ActivityPeriod[];
}
interface ScreenshotGridProps {
    screenshots: Screenshot[];
    isLoading: boolean;
    onRefresh: () => void;
    userRole?: string;
    userTimezone?: string;
    developerTimezone?: string;
    isViewingAsAdmin?: boolean;
}
export declare function ScreenshotGrid({ screenshots, isLoading, userRole, userTimezone, developerTimezone, isViewingAsAdmin }: ScreenshotGridProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ScreenshotGrid.d.ts.map