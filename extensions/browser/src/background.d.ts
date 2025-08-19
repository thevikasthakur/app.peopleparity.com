interface TabActivity {
    url: string;
    domain: string;
    title: string;
    startTime: number;
    category?: 'development' | 'project_related' | 'research' | 'other';
}
declare class BrowserActivityTracker {
    private activeTab;
    private tabActivities;
    private desktopAppPort;
    private ws;
    private reconnectInterval;
    constructor();
    private setupTracking;
    private handleTabSwitch;
    private handleTabUpdate;
    private recordActivity;
    private categorizeUrl;
    private extractDomain;
    private connectToDesktopApp;
    private scheduleReconnect;
    private sendActivityReport;
}
declare const tracker: BrowserActivityTracker;
//# sourceMappingURL=background.d.ts.map