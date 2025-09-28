import { Repository } from "typeorm";
import { Screenshot } from "../../entities/screenshot.entity";
import { ActivityPeriod } from "../../entities/activity-period.entity";
export declare class ProductiveHoursService {
    private screenshotRepository;
    private activityPeriodRepository;
    constructor(screenshotRepository: Repository<Screenshot>, activityPeriodRepository: Repository<ActivityPeriod>);
    getDailyProductiveHours(userId: string, date: Date): Promise<{
        productiveHours: number;
        averageActivityScore: number;
        activityLevel: string;
        totalScreenshots: number;
        validScreenshots: number;
        date: string;
    }>;
    getWeeklyProductiveHours(userId: string, date: Date): Promise<{
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
    private calculateTop80Average;
    private getActivityLevel;
}
//# sourceMappingURL=productive-hours.service.d.ts.map