import { User } from './user.entity';
import { Project } from './project.entity';
import { ActivityPeriod } from './activity-period.entity';
export type SessionMode = 'client_hours' | 'command_hours';
export declare class Session {
    id: string;
    userId: string;
    user: User;
    projectId: string;
    project: Project;
    mode: SessionMode;
    startTime: Date;
    endTime: Date;
    isActive: boolean;
    task: string;
    createdAt: Date;
    updatedAt: Date;
    activityPeriods: ActivityPeriod[];
}
//# sourceMappingURL=session.entity.d.ts.map