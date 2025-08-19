import { Organization } from './organization.entity';
import { Session } from './session.entity';
import { ActivityPeriod } from './activity-period.entity';
import { Screenshot } from './screenshot.entity';
export type UserRole = 'super_admin' | 'org_admin' | 'developer';
export declare class User {
    id: string;
    email: string;
    name: string;
    password: string;
    role: UserRole;
    organizationId: string;
    organization: Organization;
    isActive: boolean;
    lastLogin: Date;
    createdAt: Date;
    updatedAt: Date;
    sessions: Session[];
    activityPeriods: ActivityPeriod[];
    screenshots: Screenshot[];
}
//# sourceMappingURL=user.entity.d.ts.map