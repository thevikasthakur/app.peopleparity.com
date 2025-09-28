import { SessionsService } from './sessions.service';
export declare class SessionsController {
    private readonly sessionsService;
    constructor(sessionsService: SessionsService);
    getActiveSession(req: any): Promise<import("../../entities/session.entity").Session | null>;
    getSession(id: string): Promise<{
        success: boolean;
        message: string;
        session?: undefined;
    } | {
        success: boolean;
        session: import("../../entities/session.entity").Session;
        message?: undefined;
    }>;
    createSession(createSessionDto: any, req: any): Promise<{
        success: boolean;
        session: import("../../entities/session.entity").Session[];
    }>;
    updateSession(id: string, updateData: any): Promise<{
        success: boolean;
        session: import("../../entities/session.entity").Session | null;
    }>;
}
//# sourceMappingURL=sessions.controller.d.ts.map