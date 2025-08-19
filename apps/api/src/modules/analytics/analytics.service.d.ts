import { Repository } from 'typeorm';
import { ActivityPeriod } from '../../entities/activity-period.entity';
import { User } from '../../entities/user.entity';
export declare class AnalyticsService {
    private activityPeriodsRepository;
    private usersRepository;
    constructor(activityPeriodsRepository: Repository<ActivityPeriod>, usersRepository: Repository<User>);
    getLeaderboard(organizationId: string): Promise<{
        today: any[];
        week: any[];
    }>;
}
//# sourceMappingURL=analytics.service.d.ts.map