import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, password: string): Promise<any>;
    login(user: any): Promise<{
        success: boolean;
        user: {
            id: any;
            email: any;
            name: any;
            organizationId: any;
            organizationName: any;
            role: any;
            timezone: any;
        };
        token: string;
        projects: any[];
    }>;
    verify(token: string): Promise<{
        valid: boolean;
        user?: undefined;
    } | {
        valid: boolean;
        user: {
            id: string;
            email: string;
            name: string;
            organizationId: string;
            organizationName: string | null;
            role: import("../../entities/user.entity").UserRole;
            timezone: string;
        };
    }>;
    handleSamlLogin(samlProfile: any): Promise<{
        success: boolean;
        user: {
            id: any;
            email: any;
            name: any;
            organizationId: any;
            organizationName: any;
            role: any;
            timezone: any;
        };
        token: string;
        projects: any[];
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map