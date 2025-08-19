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
    constructor(db: DatabaseService, store: Store);
    private setupInterceptors;
    login(email: string, password: string): Promise<AuthResponse>;
    logout(): Promise<void>;
    checkSession(): Promise<{
        user?: any;
    }>;
    fetchProjects(): Promise<any>;
    fetchOrganizationUsers(): Promise<any>;
    fetchLeaderboard(): Promise<any>;
    start(): void;
    stopSync(): void;
    private syncData;
    private syncItem;
    private handleOffline;
    uploadScreenshot(localPath: string): Promise<string>;
}
export {};
//# sourceMappingURL=apiSyncService.d.ts.map