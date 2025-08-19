import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
    getLeaderboard(req: any): Promise<{
        today: any[];
        week: any[];
    }>;
}
//# sourceMappingURL=analytics.controller.d.ts.map