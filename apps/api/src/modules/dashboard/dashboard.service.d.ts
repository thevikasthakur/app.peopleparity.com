import { Repository } from 'typeorm';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { Session } from '../../entities/session.entity';
import { ProductiveHoursService } from '../analytics/productive-hours.service';
export declare class DashboardService {
    private activityPeriodsRepository;
    private sessionsRepository;
    private productiveHoursService;
    constructor(activityPeriodsRepository: Repository<ActivityPeriod>, sessionsRepository: Repository<Session>, productiveHoursService: ProductiveHoursService);
    getStats(userId: string, date?: Date): Promise<{
        today: {
            clientHours: number;
            commandHours: number;
            totalHours: number;
            averageActivityScore: number;
            focusMinutes: number;
            handsOnMinutes: number;
            researchMinutes: number;
            aiMinutes: number;
        };
        week: {
            clientHours: number;
            commandHours: number;
            totalHours: number;
            averageActivityScore: number;
        };
    }>;
    private calculateModeBreakdown;
}
//# sourceMappingURL=dashboard.service.d.ts.map