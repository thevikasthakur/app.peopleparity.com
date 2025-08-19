import { ScreenshotsService } from './screenshots.service';
export declare class ScreenshotsController {
    private screenshotsService;
    constructor(screenshotsService: ScreenshotsService);
    getScreenshots(req: any, startDate?: string, endDate?: string): Promise<import("../../entities/screenshot.entity").Screenshot[]>;
    uploadScreenshot(file: Express.Multer.File, body: {
        capturedAt: string;
        activityPeriodId?: string;
        mode?: 'client_hours' | 'command_hours';
        userId?: string;
    }, req: any): Promise<{
        success: boolean;
        url: string;
        thumbnailUrl: string;
        screenshot: import("../../entities/screenshot.entity").Screenshot;
    }>;
}
//# sourceMappingURL=screenshots.controller.d.ts.map