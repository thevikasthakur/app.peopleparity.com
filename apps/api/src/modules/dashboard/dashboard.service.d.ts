import { Repository } from 'typeorm';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { Session } from '../../entities/session.entity';
export declare class DashboardService {
    private activityPeriodsRepository;
    private sessionsRepository;
    constructor(activityPeriodsRepository: Repository<ActivityPeriod>, sessionsRepository: Repository<Session>);
    getStats(userId: string): Promise<{
        today: {
            clientHours: number;
            commandHours: number;
            totalHours: number;
            focusMinutes: number;
            handsOnMinutes: number;
            researchMinutes: number;
            aiMinutes: number;
        };
        week: {
            clientHours: number;
            commandHours: number;
            totalHours: number;
        };
    }>;
    private calculateStats;
}
//# sourceMappingURL=dashboard.service.d.ts.map