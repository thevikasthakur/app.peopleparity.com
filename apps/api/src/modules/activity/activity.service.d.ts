import { Repository } from 'typeorm';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { SessionsService } from '../sessions/sessions.service';
export declare class ActivityService {
    private activityPeriodsRepository;
    private readonly sessionsService;
    constructor(activityPeriodsRepository: Repository<ActivityPeriod>, sessionsService: SessionsService);
    create(createActivityDto: {
        id?: string;
        sessionId: string;
        userId: string;
        screenshotId?: string;
        periodStart: Date;
        periodEnd: Date;
        mode: 'client_hours' | 'command_hours';
        activityScore: number;
        isValid: boolean;
        classification?: string;
        metrics?: any;
    }): Promise<ActivityPeriod>;
    findById(id: string): Promise<ActivityPeriod | null>;
    findByUser(userId: string, startDate?: Date, endDate?: Date): Promise<ActivityPeriod[]>;
}
//# sourceMappingURL=activity.service.d.ts.map