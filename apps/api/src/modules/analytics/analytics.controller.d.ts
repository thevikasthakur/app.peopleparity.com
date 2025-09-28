import { AnalyticsService } from './analytics.service';
import { ProductiveHoursService } from './productive-hours.service';
import { UsersService } from '../users/users.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    private readonly productiveHoursService;
    private readonly usersService;
    constructor(analyticsService: AnalyticsService, productiveHoursService: ProductiveHoursService, usersService: UsersService);
    getLeaderboard(req: any): Promise<{
        today: any[];
        week: any[];
    }>;
    getDailyProductiveHours(req: any, dateStr?: string, targetUserId?: string): Promise<{
        productiveHours: number;
        averageActivityScore: number;
        activityLevel: string;
        totalScreenshots: number;
        validScreenshots: number;
        date: string;
    }>;
    getWeeklyProductiveHours(req: any, dateStr?: string, targetUserId?: string): Promise<{
        productiveHours: number;
        averageActivityScore: number;
        activityLevel: string;
        dailyData: {
            date: string;
            hours: number;
            averageActivityScore: number;
        }[];
        weekStart: string;
        weekEnd: string;
    }>;
}
//# sourceMappingURL=analytics.controller.d.ts.map