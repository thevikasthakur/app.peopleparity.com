import { User } from './user.entity';
import { Project } from './project.entity';
import { ActivityPeriod } from './activity-period.entity';
import { Screenshot } from './screenshot.entity';
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
    appVersion: string;
    deviceInfo: string;
    realIpAddress: string;
    location: {
        lat: number;
        lon: number;
    } | null;
    isVpnDetected: boolean;
    createdAt: Date;
    updatedAt: Date;
    activityPeriods: ActivityPeriod[];
    screenshots: Screenshot[];
}
//# sourceMappingURL=session.entity.d.ts.map