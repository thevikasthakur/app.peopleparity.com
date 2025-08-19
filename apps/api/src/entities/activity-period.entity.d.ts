import { User } from './user.entity';
import { Session } from './session.entity';
import { Screenshot } from './screenshot.entity';
export declare class ActivityPeriod {
    id: string;
    sessionId: string;
    session: Session;
    userId: string;
    user: User;
    periodStart: Date;
    periodEnd: Date;
    mode: string;
    notes: string;
    activityScore: number;
    isValid: boolean;
    classification: string;
    metrics: any;
    createdAt: Date;
    screenshots: Screenshot[];
}
//# sourceMappingURL=activity-period.entity.d.ts.map