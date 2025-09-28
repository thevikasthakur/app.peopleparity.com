import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    getStats(req: any, dateStr?: string, userId?: string): Promise<{
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
}
//# sourceMappingURL=dashboard.controller.d.ts.map