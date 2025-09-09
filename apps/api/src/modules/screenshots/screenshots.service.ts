import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screenshot } from '../../entities/screenshot.entity';
import * as AWS from 'aws-sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScreenshotsService {
  private s3: AWS.S3 | null = null;

  constructor(
    @InjectRepository(Screenshot)
    private screenshotsRepository: Repository<Screenshot>,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    // Delay S3 initialization to avoid constructor issues
  }

  private getS3Client(): AWS.S3 {
    if (!this.s3) {
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'ap-south-1',
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
    const bucket = process.env.SCREENSHOTS_BUCKET || 'pp-tracker-screenshots-dev';
    const s3 = this.getS3Client();
    
    // Extract userId from baseKey
    // baseKey format: inzint/userId/timestamp_filename
    const parts = baseKey.split('/');
    const userId = parts[1];
    
    // Create filename with local time and timezone
    let humanReadableName: string;
    
    if (localTimestamp && timezone) {
      // localTimestamp is now in format YYYY-MM-DDTHH:MM:SS (local time, not UTC)
      // Simply extract the numbers to create the filename
      const dateStr = localTimestamp.replace(/[-:T]/g, ''); // Remove separators to get YYYYMMDDHHMMSS
      
      // Format timezone for filename (e.g., +0530 becomes P0530, -1100 becomes M1100)
      const tzForFilename = timezone.replace('+', 'P').replace('-', 'M');
      humanReadableName = `${dateStr}_${tzForFilename}.jpg`;
    } else {
      // Fallback to UTC if no timezone provided
      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
      humanReadableName = `${dateStr}_UTC.jpg`;
    }
    
    // Create separate folders for full and thumb
    const fullKey = `inzint/${userId}/full/${humanReadableName}`;
    const thumbKey = `inzint/${userId}/thumb/${humanReadableName}`;
    
    // Generate presigned URLs for uploading
    const fullUrl = await s3.getSignedUrlPromise('putObject', {
      Bucket: bucket,
      Key: fullKey,
      ContentType: contentType,
      Expires: 300, // URL expires in 1 hour
    });
    
    // Generate presigned URL for thumbnail
    const thumbnailUrl = await s3.getSignedUrlPromise('putObject', {
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

  async uploadToS3(file: Express.Multer.File, userId: string): Promise<{ fullUrl: string; thumbnailUrl: string }> {
    const bucket = process.env.SCREENSHOTS_BUCKET || 'pp-tracker-screenshots-dev';
    
    // Create human-readable timestamp
    const now = new Date();
    const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const filename = `${dateStr}.jpg`;
    
    // Lazy load sharp to avoid initialization issues in serverless
    const sharp = await import('sharp');
    
    // Create thumbnail (250px width, maintaining aspect ratio)
    const thumbnailBuffer = await sharp.default(file.buffer)
      .resize(250, null, { 
        fit: 'inside',
        withoutEnlargement: false 
      })
      .jpeg({ quality: 99 })
      .toBuffer();
    
    // Upload full-size image (private by default)
    const fullKey = `inzint/${userId}/full/${filename}`;
    const fullParams = {
      Bucket: bucket,
      Key: fullKey,
      Body: file.buffer,
      ContentType: 'image/jpeg',
    };
    
    // Upload thumbnail with public-read ACL
    const thumbKey = `inzint/${userId}/thumb/${filename}`;
    const thumbParams = {
      Bucket: bucket,
      Key: thumbKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
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
    mode: 'client_hours' | 'command_hours';
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
      notes: createScreenshotDto.notes || '' // Copy of session task
    });
    
    const savedScreenshot = await this.screenshotsRepository.save(screenshot);
    
    return savedScreenshot;
  }

  async findByUser(userId: string, startDate?: Date, endDate?: Date, includeDeviceInfo = false) {
    const query = this.screenshotsRepository
      .createQueryBuilder('screenshot')
      .where('screenshot.userId = :userId', { userId })
      .andWhere('screenshot.isDeleted = :isDeleted', { isDeleted: false });

    // Include session relation to get device info if requested
    if (includeDeviceInfo) {
      query.leftJoinAndSelect('screenshot.session', 'session');
    }

    if (startDate) {
      query.andWhere('screenshot.capturedAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('screenshot.capturedAt <= :endDate', { endDate });
    }

    const screenshots = await query.getMany();
    
    // Map to include device info if available
    if (includeDeviceInfo) {
      return screenshots.map(screenshot => ({
        ...screenshot,
        deviceInfo: screenshot.session?.deviceInfo || null
      }));
    }
    
    return screenshots;
  }

  async findById(id: string) {
    return this.screenshotsRepository.findOne({ where: { id } });
  }

  async generateViewSignedUrl(s3Url: string): Promise<string> {
    const bucket = process.env.SCREENSHOTS_BUCKET || 'pp-tracker-screenshots-dev';
    const s3 = this.getS3Client();
    
    // Extract the S3 key from the URL
    // URL format: https://bucket.s3.region.amazonaws.com/key
    let key: string;
    
    if (s3Url.includes('.s3.')) {
      // Standard S3 URL format
      const urlParts = s3Url.split('.amazonaws.com/');
      if (urlParts.length === 2) {
        key = decodeURIComponent(urlParts[1]);
      } else {
        throw new Error('Invalid S3 URL format');
      }
    } else if (s3Url.includes('s3.amazonaws.com')) {
      // Alternative S3 URL format
      const urlParts = s3Url.split('s3.amazonaws.com/')[1];
      const keyParts = urlParts.split('/');
      keyParts.shift(); // Remove bucket name
      key = decodeURIComponent(keyParts.join('/'));
    } else {
      // Assume it's already just the key
      key = s3Url;
    }
    
    // Generate a signed URL for viewing (GET request)
    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: 300, // URL expires in 1 hour
    });
    
    return signedUrl;
  }
}