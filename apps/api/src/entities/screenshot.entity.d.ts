import { User } from './user.entity';
import { Session } from './session.entity';
import { ActivityPeriod } from './activity-period.entity';
export declare class Screenshot {
    id: string;
    userId: string;
    user: User;
    sessionId: string;
    session: Session;
    url: string;
    thumbnailUrl: string;
    capturedAt: Date;
    mode: string;
    notes: string;
    isDeleted: boolean;
    activityPeriods: ActivityPeriod[];
    createdAt: Date;
}
//# sourceMappingURL=screenshot.entity.d.ts.map