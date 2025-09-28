import { User } from './user.entity';
import { Session } from './session.entity';
import { Screenshot } from './screenshot.entity';
export declare class ActivityPeriod {
    id: string;
    sessionId: string;
    session: Session;
    userId: string;
    user: User;
    screenshotId: string;
    screenshot: Screenshot;
    periodStart: Date;
    periodEnd: Date;
    mode: string;
    notes: string;
    activityScore: number;
    isValid: boolean;
    classification: string;
    metrics: any;
    createdAt: Date;
}
//# sourceMappingURL=activity-period.entity.d.ts.map