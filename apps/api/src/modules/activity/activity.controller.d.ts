import { ActivityService } from './activity.service';
export declare class ActivityController {
    private activityService;
    constructor(activityService: ActivityService);
    getActivityPeriod(id: string): Promise<import("../../entities/activity-period.entity").ActivityPeriod | null>;
    createActivityPeriod(createActivityDto: any, req: any): Promise<{
        success: boolean;
        period: import("../../entities/activity-period.entity").ActivityPeriod;
        error?: undefined;
        message?: undefined;
        sessionId?: undefined;
    } | {
        success: boolean;
        error: string;
        message: string;
        sessionId: any;
        period?: undefined;
    }>;
    createMultipleActivityPeriods(periods: any[], req: any): Promise<{
        success: boolean;
        periods: import("../../entities/activity-period.entity").ActivityPeriod[];
    }>;
}
export declare class ActivitiesController {
    private activityService;
    constructor(activityService: ActivityService);
    createActivityMetrics(createActivityDto: any, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=activity.controller.d.ts.map