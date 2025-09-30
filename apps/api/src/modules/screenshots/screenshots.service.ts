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
    includeDeviceInfo = false
  ) {
    console.log(`📸 Finding screenshots for userId: ${userId}, startDate: ${startDate?.toISOString()}, endDate: ${endDate?.toISOString()}`);

    const query = this.screenshotsRepository
      .createQueryBuilder("screenshot")
      .leftJoinAndSelect("screenshot.activityPeriods", "activityPeriod")
      .where("screenshot.userId = :userId", { userId })
      .andWhere("(screenshot.isDeleted IS NULL OR screenshot.isDeleted = :isDeleted)", { isDeleted: false });

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
    console.log(`📸 Found ${screenshots.length} screenshots`);

    // Map to include device info and calculate average activity score
    return screenshots.map((screenshot) => {
      const activityPeriods = screenshot.activityPeriods || [];
      // Use the proper weighted average calculation
      const activityScore = this.calculateScreenshotScore(activityPeriods);

      return {
        ...screenshot,
        activityScore,
        deviceInfo: includeDeviceInfo ? (screenshot.session?.deviceInfo || null) : undefined,
        activityPeriods: undefined,
      };
    });
  }

  async findById(id: string) {
    return this.screenshotsRepository.findOne({ where: { id } });
  }

  async findByIdWithDetails(id: string) {
    return this.screenshotsRepository.findOne({
      where: { id },
      relations: ['activityPeriods'],
      order: {
        activityPeriods: {
          periodEnd: 'ASC'
        }
      }
    });
  }

  async generateViewSignedUrl(s3Url: string): Promise<string> {
    const s3 = this.getS3Client();

    console.log('🔍 Generating signed URL for:', s3Url);

    // Extract both bucket and key from the URL
    // URL format: https://bucket.s3.region.amazonaws.com/key
    let bucket: string;
    let key: string;

    if (s3Url.includes(".s3.")) {
      // Standard S3 URL format: https://bucket.s3.region.amazonaws.com/key
      const urlParts = s3Url.split(".s3.");
      if (urlParts.length === 2) {
        // Extract bucket name from the first part
        bucket = urlParts[0].replace('https://', '');
        // Extract key from after .amazonaws.com/
        const afterDomain = s3Url.split(".amazonaws.com/");
        if (afterDomain.length === 2) {
          key = decodeURIComponent(afterDomain[1]);
        } else {
          throw new Error("Invalid S3 URL format");
        }
      } else {
        throw new Error("Invalid S3 URL format");
      }
    } else if (s3Url.includes("s3.amazonaws.com")) {
      // Alternative S3 URL format
      const urlParts = s3Url.split("s3.amazonaws.com/")[1];
      const keyParts = urlParts.split("/");
      bucket = keyParts.shift(); // First part is bucket name
      key = decodeURIComponent(keyParts.join("/"));
    } else {
      // Fallback to environment bucket if URL format is not recognized
      const stage = process.env.STAGE || "dev";
      bucket = process.env.SCREENSHOTS_BUCKET || `ppv1-screenshots-${stage}`;
      key = s3Url;
    }

    console.log('🔑 Extracted key:', key);
    console.log('🪣 Bucket:', bucket);

    // Generate a signed URL for viewing (GET request)
    const signedUrl = await s3.getSignedUrlPromise("getObject", {
      Bucket: bucket,
      Key: key,
      Expires: 300, // URL expires in 5 minutes
    });

    console.log('✅ Generated signed URL:', signedUrl);

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

  /**
   * Calculate weighted average activity score for a screenshot
   * Uses the same logic as the frontend and productive-hours service:
   * - More than 8 periods: Take best 8 scores only
   * - 5-8 periods: Discard worst 1 score
   * - 4 or fewer periods: Simple average
   */
  private calculateScreenshotScore(activityPeriods: any[]): number {
    if (!activityPeriods || activityPeriods.length === 0) {
      return 0;
    }

    // Extract all scores (not filtering by isValid - we want all activity scores)
    const scores = activityPeriods
      .map(period => period.activityScore || 0)
      .sort((a, b) => b - a); // Sort descending (highest first)

    if (scores.length === 0) {
      return 0;
    }

    let scoresToAverage: number[];

    if (scores.length > 8) {
      // More than 8 periods: Take best 8 scores only
      scoresToAverage = scores.slice(0, 8);
    } else if (scores.length > 4) {
      // 5-8 periods: Discard worst 1 score
      scoresToAverage = scores.slice(0, -1);
    } else {
      // 4 or fewer periods: Simple average of all
      scoresToAverage = scores;
    }

    // Calculate average of selected scores
    const average = scoresToAverage.reduce((sum, score) => sum + score, 0) / scoresToAverage.length;

    // Log for debugging
    console.log(`📊 Activity score calculation: ${scores.length} total periods, using ${scoresToAverage.length} scores, average: ${average.toFixed(2)}`);

    return average;
  }
}
