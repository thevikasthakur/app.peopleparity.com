export interface Organization {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface OrganizationBranch {
    id: string;
    organizationId: string;
    name: string;
    timezone: string;
    firstDayOfWeek: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface User {
    id: string;
    organizationId: string;
    branchId?: string;
    email: string;
    fullName: string;
    role: 'developer' | 'admin' | 'org_admin';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface Project {
    id: string;
    organizationId: string;
    name: string;
    repositoryUrl?: string;
    isActive: boolean;
    createdAt: Date;
}
export interface TimeSession {
    id: string;
    userId: string;
    projectId?: string;
    mode: 'client_hours' | 'command_hours';
    startTime: Date;
    endTime?: Date;
    isActive: boolean;
    createdAt: Date;
}
export interface ActivityPeriod {
    id: string;
    userId: string;
    sessionId?: string;
    periodStart: Date;
    periodEnd: Date;
    mode: 'client_hours' | 'command_hours';
    notes?: string;
    activityScore: number;
    isValid: boolean;
    classification?: 'coding' | 'pr_review' | 'research' | 'meetings' | 'comms' | 'building_testing';
    createdAt: Date;
    updatedAt: Date;
}
export interface Screenshot {
    id: string;
    userId: string;
    activityPeriodId: string;
    screenshotUrl: string;
    localPath?: string;
    capturedAt: Date;
    isDeleted: boolean;
    createdAt: Date;
}
export interface CommandHourActivity {
    id: string;
    activityPeriodId: string;
    uniqueKeys: number;
    productiveKeyHits: number;
    mouseClicks: number;
    mouseScrolls: number;
    mouseDistance: number;
    createdAt: Date;
}
export interface ClientHourActivity {
    id: string;
    activityPeriodId: string;
    codeCommitsCount: number;
    filesSavedCount: number;
    caretMovedCount: number;
    textSelectionsCount: number;
    filesOpenedCount: number;
    tabsSwitchedCount: number;
    netLinesCount: number;
    copilotSuggestionsAccepted: number;
    createdAt: Date;
}
export interface BrowserActivity {
    id: string;
    activityPeriodId: string;
    url: string;
    domain: string;
    title?: string;
    category?: 'development' | 'project_related' | 'research' | 'other';
    durationSeconds: number;
    createdAt: Date;
}
export interface ActivityContext {
    id: string;
    activityPeriodId: string;
    editorActivePercent: number;
    prViewActivePercent: number;
    meetingActivePercent: number;
    commsActivePercent: number;
    researchActivePercent: number;
    createdAt: Date;
}
export interface UserAnalytics {
    id: string;
    userId: string;
    date: Date;
    focusMinutes: number;
    handsOnKeyboardMinutes: number;
    computeMinutes: number;
    researchMinutes: number;
    aiAssistanceMinutes: number;
    totalClientHours: number;
    totalCommandHours: number;
    createdAt: Date;
}
export interface RecentNote {
    id: string;
    userId: string;
    noteText: string;
    lastUsedAt: Date;
    useCount: number;
    createdAt: Date;
}
export interface DashboardData {
    todayClientHours: number;
    todayCommandHours: number;
    weekClientHours: number;
    weekCommandHours: number;
    currentSession?: TimeSession;
    currentActivity?: ActivityPeriod;
    todayScreenshots: Screenshot[];
    todayAnalytics: UserAnalytics;
    weekAnalytics: UserAnalytics[];
    leaderboard: {
        today: LeaderboardEntry[];
        week: LeaderboardEntry[];
    };
}
export interface LeaderboardEntry {
    userId: string;
    userName: string;
    totalHours: number;
    rank: number;
}
//# sourceMappingURL=models.d.ts.map