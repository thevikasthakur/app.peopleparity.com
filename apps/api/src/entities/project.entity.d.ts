import { Organization } from './organization.entity';
import { Session } from './session.entity';
export declare class Project {
    id: string;
    name: string;
    description: string;
    organizationId: string;
    organization: Organization;
    color: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    sessions: Session[];
}
//# sourceMappingURL=project.entity.d.ts.map