import { Repository } from 'typeorm';
import { Screenshot } from '../../entities/screenshot.entity';
import { ConfigService } from '@nestjs/config';
export declare class ScreenshotsService {
    private screenshotsRepository;
    private configService;
    private s3;
    constructor(screenshotsRepository: Repository<Screenshot>, configService: ConfigService);
    uploadToS3(file: Express.Multer.File, userId: string): Promise<{
        fullUrl: string;
        thumbnailUrl: string;
    }>;
    create(createScreenshotDto: {
        userId: string;
        activityPeriodId: string;
        s3Url: string;
        thumbnailUrl?: string;
        capturedAt: Date;
        mode: 'client_hours' | 'command_hours';
    }): Promise<Screenshot>;
    findByUser(userId: string, startDate?: Date, endDate?: Date): Promise<Screenshot[]>;
}
//# sourceMappingURL=screenshots.service.d.ts.map