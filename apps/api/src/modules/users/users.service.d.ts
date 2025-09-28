import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { Project } from '../../entities/project.entity';
export declare class UsersService {
    private usersRepository;
    private organizationsRepository;
    private projectsRepository;
    constructor(usersRepository: Repository<User>, organizationsRepository: Repository<Organization>, projectsRepository: Repository<Project>);
    ensureSuperAdmin(email: string, password: string): Promise<void>;
    findByEmail(email: string): Promise<User>;
    findById(id: string): Promise<User>;
    create(createUserDto: {
        email: string;
        name: string;
        password: string;
        organizationId?: string;
        role: 'org_admin' | 'developer';
    }): Promise<User>;
    updateLastLogin(userId: string): Promise<void>;
    getOrganizationProjects(organizationId: string): Promise<{
        id: string;
        name: string;
        color: string;
        organizationId: string;
    }[]>;
    getAllUsers(): Promise<User[]>;
    getOrganizationUsers(organizationId: string): Promise<User[]>;
    updateRole(userId: string, role: 'org_admin' | 'developer'): Promise<User>;
    deactivate(userId: string): Promise<User>;
    resetPassword(userId: string, newPassword: string): Promise<User>;
    createSSOUser(ssoUserData: {
        email: string;
        name: string;
        microsoftId: string;
        authProvider: 'microsoft';
        role: 'developer' | 'org_admin';
        organizationId?: string;
    }): Promise<User[]>;
    linkMicrosoftAccount(userId: string, microsoftId: string): Promise<User>;
    updateTimezone(userId: string, timezone: string): Promise<User>;
}
//# sourceMappingURL=users.service.d.ts.map