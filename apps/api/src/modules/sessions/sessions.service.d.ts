import { Repository } from 'typeorm';
import { Session } from '../../entities/session.entity';
export declare class SessionsService {
    private sessionsRepository;
    constructor(sessionsRepository: Repository<Session>);
    create(createSessionDto: {
        id?: string;
        userId: string;
        projectId?: string;
        mode: 'client_hours' | 'command_hours';
        task?: string;
        startTime: Date;
        appVersion?: string;
        deviceInfo?: string;
        realIpAddress?: string;
        location?: {
            lat: number;
            lon: number;
        } | null;
        isVpnDetected?: boolean;
    }): Promise<Session[]>;
    findById(id: string): Promise<Session | null>;
    endActiveSessions(userId: string): Promise<void>;
    update(sessionId: string, updateData: Partial<Session>): Promise<Session | null>;
    findActiveSession(userId: string): Promise<Session | null>;
}
//# sourceMappingURL=sessions.service.d.ts.map