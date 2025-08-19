import { User } from './user.entity';
import { Project } from './project.entity';
export declare class Organization {
    id: string;
    name: string;
    code: string;
    timezone: string;
    firstDayOfWeek: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    users: User[];
    projects: Project[];
}
//# sourceMappingURL=organization.entity.d.ts.map