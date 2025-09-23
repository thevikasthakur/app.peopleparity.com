import { Injectable, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Screenshot } from "../../entities/screenshot.entity";
import { ActivityPeriod } from "../../entities/activity-period.entity";
import * as AWS from "aws-sdk";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ScreenshotsService {
  private s3: AWS.S3 | null = null;

  constructor(
    @InjectRepository(Screenshot)
    private screenshotsRepository: Repository<Screenshot>,
    @InjectRepository(ActivityPeriod)
    private activityPeriodsRepository: Repository<ActivityPeriod>,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    // Delay S3 initialization to avoid constructor issues
  }

  private getS3Client(): AWS.S3 {
    if (!this.s3) {
      this.s3 = new AWS.S3({
        region: process.env.AWS_REGION || "ap-south-1",
        signatureVersion: "v4",
      });
    }
    return this.s3;
  }

  async generateSignedUploadUrls(
    baseKey: string,
    contentType: string,
    timezone?: string,
    localTimestamp?: string
  ): Promise<{
    fullUrl: string;
    thumbnailUrl: string;
    fullKey: string;
    thumbnailKey: string;
  }> {
    const stage = process.env.STAGE || "dev";
    const bucket = process.env.SCREENSHOTS_BUCKET || `ppv1-screenshots-${stage}`;
    const s3 = this.getS3Client();

    // Extract userId from baseKey
    // baseKey format: inzint/userId/timestamp_filename
    const parts = baseKey.split("/");
    const userId = parts[1];

    // Create filename with local time and timezone
    let humanReadableName: string;

    if (localTimestamp && timezone) {
      // localTimestamp is now in format YYYY-MM-DDTHH:MM:SS (local time, not UTC)
      // Simply extract the numbers to create the filename
      const dateStr = localTimestamp.replace(/[-:T]/g, ""); // Remove separators to get YYYYMMDDHHMMSS

      // Format timezone for filename (e.g., +0530 becomes P0530, -1100 becomes M1100)
      const tzForFilename = timezone.replace("+", "P").replace("-", "M");
      humanReadableName = `${dateStr}_${tzForFilename}.jpg`;
    } else {
      // Fallback to UTC if no timezone provided
      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
      humanReadableName = `${dateStr}_UTC.jpg`;
    }

    // Create separate folders for full and thumb
    const fullKey = `inzint/${userId}/full/${humanReadableName}`;
    const thumbKey = `inzint/${userId}/thumb/${humanReadableName}`;

    // Generate presigned URLs for uploading
    const fullUrl = await s3.getSignedUrlPromise("putObject", {
      Bucket: bucket,
      Key: fullKey,
      ContentType: contentType,
      Expires: 300, // URL expires in 5 min
    });

    // Generate presigned URL for thumbnail
    const thumbnailUrl = await s3.getSignedUrlPromise("putObject", {
      Bucket: bucket,
      Key: thumbKey,
      ContentType: contentType,
      Expires: 300,
    });

    // Return both upload URLs and the keys for later reference
    return {
      fullUrl,
      thumbnailUrl,
      fullKey,
      thumbnailKey: thumbKey,
    };
  }

  async uploadToS3(
    file: Express.Multer.File,
    userId: string
  ): Promise<{ fullUrl: string; thumbnailUrl: string }> {
    const stage = process.env.STAGE || "dev";
    const bucket =
      process.env.SCREENSHOTS_BUCKET || `ppv1-screenshots-${stage}`;

    // Create human-readable timestamp
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
    const filename = `${dateStr}.jpg`;

    // Lazy load sharp to avoid initialization issues in serverless
    const sharp = await import("sharp");

    // Create thumbnail (250px width, maintaining aspect ratio)
    const thumbnailBuffer = await sharp
      .default(file.buffer)
      .resize(250, null, {
        fit: "inside",
        withoutEnlargement: false,
      })
      .jpeg({ quality: 99 })
      .toBuffer();

    // Upload full-size image (private by default)
    const fullKey = `inzint/${userId}/full/${filename}`;
    const fullParams = {
      Bucket: bucket,
      Key: fullKey,
      Body: file.buffer,
      ContentType: "image/jpeg",
    };

    // Upload thumbnail with public-read ACL
    const thumbKey = `inzint/${userId}/thumb/${filename}`;
    const thumbParams = {
      Bucket: bucket,
      Key: thumbKey,
      Body: thumbnailBuffer,
      ContentType: "image/jpeg",
    };

    // Upload both versions in parallel
    const [fullResult, thumbResult] = await Promise.all([
      this.getS3Client().upload(fullParams).promise(),
      this.getS3Client().upload(thumbParams).promise(),
    ]);

    return {
      fullUrl: fullResult.Location,
      thumbnailUrl: thumbResult.Location,
    };
  }

  async create(createScreenshotDto: {
    id?: string; // Optional ID from desktop app
    userId: string;
    sessionId: string; // Required - direct relationship to session
    url: string;
    thumbnailUrl?: string;
    capturedAt: Date;
    mode: "client_hours" | "command_hours";
    notes?: string;
  }) {
    // Create the main screenshot record with properly populated columns
    const screenshot = this.screenshotsRepository.create({
      ...(createScreenshotDto.id && { id: createScreenshotDto.id }), // Use provided ID if available
      userId: createScreenshotDto.userId,
      sessionId: createScreenshotDto.sessionId, // Direct relationship to session
      url: createScreenshotDto.url,
      thumbnailUrl: createScreenshotDto.thumbnailUrl,
      capturedAt: createScreenshotDto.capturedAt,
      mode: createScreenshotDto.mode,
      notes: createScreenshotDto.notes || "", // Copy of session task
    });

    const savedScreenshot = await this.screenshotsRepository.save(screenshot);

    return savedScreenshot;
  }

  async findByUser(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    includeDeviceInfo = false,
    includeActivityScores = false
  ) {
    const query = this.screenshotsRepository
      .createQueryBuilder("screenshot")
      .where("screenshot.userId = :userId", { userId })
      .andWhere("screenshot.isDeleted = :isDeleted", { isDeleted: false });

    // Include session relation to get device info if requested
    if (includeDeviceInfo) {
      query.leftJoinAndSelect("screenshot.session", "session");
    }

    if (startDate) {
      query.andWhere("screenshot.capturedAt >= :startDate", { startDate });
    }

    if (endDate) {
      query.andWhere("screenshot.capturedAt <= :endDate", { endDate });
    }

    const screenshots = await query.getMany();

    // If we need activity scores, fetch them separately based on time windows
    let activityScoreMap: Map<string, number> = new Map();
    if (includeActivityScores) {
      // Fetch all activity periods for this user in the date range
      const periodsQuery = this.activityPeriodsRepository
        .createQueryBuilder("period")
        .where("period.userId = :userId", { userId })
        .andWhere("period.isValid = :isValid", { isValid: true });

      if (startDate) {
        periodsQuery.andWhere("period.periodStart >= :startDate", { startDate });
      }

      if (endDate) {
        periodsQuery.andWhere("period.periodEnd <= :endDate", { endDate });
      }

      const allPeriods = await periodsQuery.getMany();

      // Group periods by 10-minute windows and calculate scores
      for (const screenshot of screenshots) {
        const capturedAt = new Date(screenshot.capturedAt);
        const windowStart = new Date(capturedAt);
        windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 10) * 10, 0, 0);
        const windowEnd = new Date(windowStart);
        windowEnd.setMinutes(windowEnd.getMinutes() + 10);

        // Find periods that overlap with this screenshot's window
        const windowPeriods = allPeriods.filter(p => {
          const periodStart = new Date(p.periodStart);
          return periodStart >= windowStart && periodStart < windowEnd;
        });

        if (windowPeriods.length > 0) {
          const scores = windowPeriods.map(p => p.activityScore);
          activityScoreMap.set(screenshot.id, this.calculateScreenshotScore(scores));
        } else {
          activityScoreMap.set(screenshot.id, 0);
        }
      }
    }

    // Process screenshots to ensure proper URLs and include activity scores
    const processedScreenshots = screenshots.map((screenshot) => {
      let processedThumbnailUrl = screenshot.thumbnailUrl;

      // If thumbnailUrl exists and is not a full URL, convert it to public S3 URL
      if (screenshot.thumbnailUrl && !screenshot.thumbnailUrl.startsWith('http')) {
        const stage = process.env.STAGE || "dev";
        const bucket = process.env.SCREENSHOTS_BUCKET || `ppv1-screenshots-${stage}`;
        const region = process.env.AWS_REGION || "ap-south-1";
        processedThumbnailUrl = `https://${bucket}.s3.${region}.amazonaws.com/${screenshot.thumbnailUrl}`;
      }

      const result: any = {
        ...screenshot,
        thumbnailUrl: processedThumbnailUrl
      };

      // Include device info if requested
      if (includeDeviceInfo && screenshot.session) {
        result.deviceInfo = screenshot.session.deviceInfo || null;
      }

      // Include activity score if requested
      if (includeActivityScores) {
        result.activityScore = activityScoreMap.get(screenshot.id) || 0;
      }

      return result;
    });

    return processedScreenshots;
  }

  /**
   * Calculate weighted average for screenshot (10-minute window)
   * Uses thresholds: >8 periods = best 8, >4 periods = discard worst 1, <=4 = simple avg
   * This mirrors the desktop app's calculateScreenshotScore function
   */
  private calculateScreenshotScore(scores: number[]): number {
    if (!scores || scores.length === 0) {
      return 0;
    }

    // Sort scores in descending order (best to worst)
    const sortedScores = [...scores].sort((a, b) => b - a);
    const count = sortedScores.length;

    let scoresToAverage: number[];

    if (count > 8) {
      // More than 8 periods: take best 8 scores
      scoresToAverage = sortedScores.slice(0, 8);
    } else if (count > 4) {
      // Between 4 and 8: discard worst 1
      scoresToAverage = sortedScores.slice(0, -1);
    } else {
      // 4 or less: take simple average
      scoresToAverage = sortedScores;
    }

    // Calculate average
    if (scoresToAverage.length === 0) {
      return 0;
    }

    const sum = scoresToAverage.reduce((acc, score) => acc + score, 0);
    const average = sum / scoresToAverage.length;
    // Convert from 0-100 scale to 0-10 scale with 1 decimal place
    return Math.round((average / 10) * 10) / 10;
  }

  async findById(id: string) {
    return this.screenshotsRepository.findOne({ where: { id } });
  }

  async generateViewSignedUrl(s3Url: string): Promise<string> {
    const stage = process.env.STAGE || "dev";
    const bucket =
      process.env.SCREENSHOTS_BUCKET || `ppv1-screenshots-${stage}`;
    const s3 = this.getS3Client();

    // Extract the S3 key from the URL
    // URL format: https://bucket.s3.region.amazonaws.com/key
    let key: string;

    if (s3Url.includes(".s3.")) {
      // Standard S3 URL format
      const urlParts = s3Url.split(".amazonaws.com/");
      if (urlParts.length === 2) {
        key = decodeURIComponent(urlParts[1]);
      } else {
        throw new Error("Invalid S3 URL format");
      }
    } else if (s3Url.includes("s3.amazonaws.com")) {
      // Alternative S3 URL format
      const urlParts = s3Url.split("s3.amazonaws.com/")[1];
      const keyParts = urlParts.split("/");
      keyParts.shift(); // Remove bucket name
      key = decodeURIComponent(keyParts.join("/"));
    } else {
      // Assume it's already just the key
      key = s3Url;
    }

    // Generate a signed URL for viewing (GET request)
    const signedUrl = await s3.getSignedUrlPromise("getObject", {
      Bucket: bucket,
      Key: key,
      Expires: 300, // URL expires in 1 hour
    });

    return signedUrl;
  }

  async softDelete(id: string): Promise<void> {
    console.log("\n\n\n\t\t\t\Deleting screenshot:", { id });
    // Hard delete the screenshot from database
    await this.screenshotsRepository.delete({ id });
  }

  async deleteActivityPeriods(screenshotId: string): Promise<void> {
    // Delete all activity periods associated with this screenshot
    await this.activityPeriodsRepository.delete({ screenshotId });
  }
}
