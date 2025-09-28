import { AuthService } from './auth.service';
import { Response } from 'express';
export declare class AuthController {
    private readonly authService;
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
            timezone: any;
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
            timezone: string;
        };
    }>;
    samlLogin(res: Response): Promise<void>;
    samlCallback(req: any, res: Response): Promise<void>;
    getMetadata(): Promise<{
        success: boolean;
        message: string;
        configured: boolean;
        entityID?: undefined;
        assertionConsumerService?: undefined;
    } | {
        configured: boolean;
        entityID: string;
        assertionConsumerService: {
            url: string;
            binding: string;
        };
        success?: undefined;
        message?: undefined;
    }>;
}
//# sourceMappingURL=auth.controller.d.ts.map