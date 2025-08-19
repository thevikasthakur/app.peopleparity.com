import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
    getStats(req: any): Promise<{
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
}
//# sourceMappingURL=dashboard.controller.d.ts.map