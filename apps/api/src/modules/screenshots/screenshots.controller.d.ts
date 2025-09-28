import { ScreenshotsService } from './screenshots.service';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { Repository } from 'typeorm';
import { Screenshot } from '../../entities/screenshot.entity';
export declare class ScreenshotsController {
    private screenshotsService;
    private sessionsService;
    private usersService;
    private screenshotsRepository;
    constructor(screenshotsService: ScreenshotsService, sessionsService: SessionsService, usersService: UsersService, screenshotsRepository: Repository<Screenshot>);
    getScreenshots(req: any, startDate?: string, endDate?: string, includeDeviceInfo?: string, userId?: string): Promise<{
        activityScore: number;
        deviceInfo: string | null | undefined;
        activityPeriods: undefined;
        id: string;
        userId: string;
        user: import("../../entities/user.entity").User;
        sessionId: string;
        session: import("../../entities/session.entity").Session;
        url: string;
        thumbnailUrl: string;
        capturedAt: Date;
        mode: string;
        notes: string;
        isDeleted: boolean;
        createdAt: Date;
    }[]>;
    getScreenshotDetails(id: string, req: any): Promise<Screenshot>;
    getSignedUrl(id: string, req: any): Promise<{
        success: boolean;
        signedUrl: string;
        expiresIn: number;
    }>;
    getScreenshot(id: string): Promise<Screenshot | null>;
    generateUploadUrl(body: {
        filename: string;
        contentType?: string;
        timezone?: string;
        localTimestamp?: string;
    }, req: any): Promise<{
        success: boolean;
        uploadUrls: {
            fullUrl: string;
            thumbnailUrl: string;
            fullKey: string;
            thumbnailKey: string;
        };
        key: string;
    }>;
    createScreenshot(body: {
        id?: string;
        capturedAt: string;
        sessionId: string;
        url: string;
        thumbnailUrl: string;
        mode?: 'client_hours' | 'command_hours';
        userId?: string;
        notes?: string;
    }, req: any): Promise<{
        success: boolean;
        screenshot: Screenshot;
    }>;
    deleteScreenshot(id: string, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    uploadScreenshot(file: Express.Multer.File, body: {
        id?: string;
        capturedAt: string;
        sessionId: string;
        mode?: 'client_hours' | 'command_hours';
        userId?: string;
        notes?: string;
    }, req: any): Promise<{
        success: boolean;
        url: string;
        thumbnailUrl: string;
        screenshot: Screenshot;
    }>;
}
//# sourceMappingURL=screenshots.controller.d.ts.map