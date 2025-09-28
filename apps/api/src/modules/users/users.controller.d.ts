import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getTeamMembers(req: any): Promise<{
        id: string;
        name: string;
        email: string;
        role: import("../../entities/user.entity").UserRole;
        organizationId: string;
        organizationName: string;
        timezone: string;
    }[]>;
    getOrganizationUsers(organizationId: string): Promise<{
        users: import("../../entities/user.entity").User[];
    }>;
    getUserSettings(req: any): Promise<{
        timezone: string;
        name: string;
        email: string;
        role: import("../../entities/user.entity").UserRole;
    }>;
    updateUserSettings(req: any, body: {
        timezone: string;
    }): Promise<{
        success: boolean;
        timezone: string;
    }>;
    createUser(createUserDto: {
        email: string;
        name: string;
        password: string;
        organizationId?: string;
        role: 'org_admin' | 'developer';
    }): Promise<{
        success: boolean;
        user: import("../../entities/user.entity").User;
    }>;
}
//# sourceMappingURL=users.controller.d.ts.map