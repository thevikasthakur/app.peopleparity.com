import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screenshot } from '../../entities/screenshot.entity';
import * as AWS from 'aws-sdk';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';

@Injectable()
export class ScreenshotsService {
  private s3: AWS.S3;

  constructor(
    @InjectRepository(Screenshot)
    private screenshotsRepository: Repository<Screenshot>,
    private configService: ConfigService,
  ) {
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async uploadToS3(file: Express.Multer.File, userId: string): Promise<{ fullUrl: string; thumbnailUrl: string }> {
    const bucket = this.configService.get('AWS_S3_BUCKET');
    const timestamp = Date.now();
    const baseKey = `screenshots/${userId}/${timestamp}`;
    
    // Create thumbnail (100px width, maintaining aspect ratio)
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(250, null, { 
        fit: 'inside',
        withoutEnlargement: false 
      })
      .jpeg({ quality: 99 })
      .toBuffer();
    
    // Upload full-size image with public ACL
    const fullKey = `${baseKey}_full.jpg`;
    const fullParams = {
      Bucket: bucket,
      Key: fullKey,
      Body: file.buffer,
      ContentType: 'image/jpeg',
    };
    
    // Upload thumbnail with public ACL
    const thumbKey = `${baseKey}_thumb.jpg`;
    const thumbParams = {
      Bucket: bucket,
      Key: thumbKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
    };
    
    // Upload both versions in parallel
    const [fullResult, thumbResult] = await Promise.all([
      this.s3.upload(fullParams).promise(),
      this.s3.upload(thumbParams).promise(),
    ]);
    
    return {
      fullUrl: fullResult.Location,
      thumbnailUrl: thumbResult.Location,
    };
  }

  async create(createScreenshotDto: {
    userId: string;
    activityPeriodId: string;
    s3Url: string;
    thumbnailUrl?: string;
    capturedAt: Date;
    localCaptureTime?: Date;
    mode: 'client_hours' | 'command_hours';
    aggregatedScore?: number;
    relatedPeriodIds?: string[];
  }) {
    // Create the main screenshot record
    const screenshot = this.screenshotsRepository.create({
      userId: createScreenshotDto.userId,
      activityPeriodId: createScreenshotDto.activityPeriodId,
      s3Url: createScreenshotDto.s3Url,
      thumbnailUrl: createScreenshotDto.thumbnailUrl,
      capturedAt: createScreenshotDto.capturedAt,
      mode: createScreenshotDto.mode,
      // Store aggregated score and local capture time if provided
      metadata: {
        aggregatedScore: createScreenshotDto.aggregatedScore,
        localCaptureTime: createScreenshotDto.localCaptureTime,
        relatedPeriodIds: createScreenshotDto.relatedPeriodIds,
      }
    });
    
    const savedScreenshot = await this.screenshotsRepository.save(screenshot);
    
    // If we have related period IDs, we might want to store them in a junction table
    // This would require adding a screenshot_periods table to the cloud database
    // For now, we're storing them in the metadata JSON field
    
    return savedScreenshot;
  }

  async findByUser(userId: string, startDate?: Date, endDate?: Date) {
    const query = this.screenshotsRepository
      .createQueryBuilder('screenshot')
      .where('screenshot.userId = :userId', { userId })
      .andWhere('screenshot.isDeleted = :isDeleted', { isDeleted: false });

    if (startDate) {
      query.andWhere('screenshot.capturedAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('screenshot.capturedAt <= :endDate', { endDate });
    }

    return query.getMany();
  }
}