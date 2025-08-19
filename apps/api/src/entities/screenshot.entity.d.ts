import { User } from './user.entity';
import { ActivityPeriod } from './activity-period.entity';
export declare class Screenshot {
    id: string;
    userId: string;
    user: User;
    activityPeriodId: string;
    activityPeriod: ActivityPeriod;
    s3Url: string;
    thumbnailUrl: string;
    capturedAt: Date;
    mode: string;
    notes: string;
    isDeleted: boolean;
    createdAt: Date;
}
//# sourceMappingURL=screenshot.entity.d.ts.map