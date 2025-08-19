import { Repository } from 'typeorm';
import { Organization } from '../../entities/organization.entity';
export declare class OrganizationsService {
    private organizationsRepository;
    constructor(organizationsRepository: Repository<Organization>);
    create(createOrgDto: {
        name: string;
        code: string;
        timezone?: string;
        firstDayOfWeek?: string;
    }): Promise<Organization>;
    findAll(): Promise<Organization[]>;
    findById(id: string): Promise<Organization | null>;
}
//# sourceMappingURL=organizations.service.d.ts.map