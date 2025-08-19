import { EventEmitter } from 'events';
interface BrowserActivity {
    url: string;
    domain: string;
    title: string;
    category: 'development' | 'project_related' | 'research' | 'other';
    duration: number;
    timestamp: number;
}
export declare class BrowserExtensionBridge extends EventEmitter {
    private wss;
    private port;
    private activities;
    private clients;
    start(): void;
    stop(): void;
    private handleMessage;
    private processBrowserActivity;
    handleBrowserActivity(data: any): {
        success: boolean;
    };
    getRecentActivities(minutes?: number): BrowserActivity[];
    categorizeActivities(): {
        development: number;
        projectRelated: number;
        research: number;
        other: number;
    };
    clearOldActivities(): void;
    private broadcast;
}
export {};
//# sourceMappingURL=browserExtensionBridge.d.ts.map