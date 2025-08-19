import { UsersService } from './users.service';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getOrganizationUsers(organizationId: string): Promise<{
        users: import("../../entities/user.entity").User[];
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