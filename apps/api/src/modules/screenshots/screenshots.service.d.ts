import { Repository } from "typeorm";
import { Screenshot } from "../../entities/screenshot.entity";
import { ActivityPeriod } from "../../entities/activity-period.entity";
import { ConfigService } from "@nestjs/config";
export declare class ScreenshotsService {
    private screenshotsRepository;
    private activityPeriodsRepository;
    private readonly configService;
    private s3;
    constructor(screenshotsRepository: Repository<Screenshot>, activityPeriodsRepository: Repository<ActivityPeriod>, configService: ConfigService);
    private getS3Client;
    generateSignedUploadUrls(baseKey: string, contentType: string, timezone?: string, localTimestamp?: string): Promise<{
        fullUrl: string;
        thumbnailUrl: string;
        fullKey: string;
        thumbnailKey: string;
    }>;
    uploadToS3(file: Express.Multer.File, userId: string): Promise<{
        fullUrl: string;
        thumbnailUrl: string;
    }>;
    create(createScreenshotDto: {
        id?: string;
        userId: string;
        sessionId: string;
        url: string;
        thumbnailUrl?: string;
        capturedAt: Date;
        mode: "client_hours" | "command_hours";
        notes?: string;
    }): Promise<Screenshot>;
    findByUser(userId: string, startDate?: Date, endDate?: Date, includeDeviceInfo?: boolean): Promise<{
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
    findById(id: string): Promise<Screenshot | null>;
    findByIdWithDetails(id: string): Promise<Screenshot | null>;
    generateViewSignedUrl(s3Url: string): Promise<string>;
    softDelete(id: string): Promise<void>;
    deleteActivityPeriods(screenshotId: string): Promise<void>;
}
//# sourceMappingURL=screenshots.service.d.ts.map