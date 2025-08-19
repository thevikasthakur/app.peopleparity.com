import { OrganizationsService } from './organizations.service';
export declare class OrganizationsController {
    private organizationsService;
    constructor(organizationsService: OrganizationsService);
    getOrganizations(): Promise<{
        organizations: import("../../entities/organization.entity").Organization[];
    }>;
    createOrganization(createOrgDto: {
        name: string;
        code: string;
        timezone?: string;
        firstDayOfWeek?: string;
    }): Promise<{
        success: boolean;
        organization: import("../../entities/organization.entity").Organization;
    }>;
}
//# sourceMappingURL=organizations.controller.d.ts.map