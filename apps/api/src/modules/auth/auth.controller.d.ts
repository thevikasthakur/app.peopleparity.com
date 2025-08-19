import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: {
        email: string;
        password: string;
    }): Promise<{
        success: boolean;
        user: {
            id: any;
            email: any;
            name: any;
            organizationId: any;
            organizationName: any;
            role: any;
        };
        token: string;
        projects: any[];
    } | {
        success: boolean;
        message: string;
    }>;
    logout(): Promise<{
        success: boolean;
    }>;
    verify(req: any): Promise<{
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
        };
    }>;
}
//# sourceMappingURL=auth.controller.d.ts.map