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

  async findById(id: string) {
    return this.screenshotsRepository.findOne({ where: { id } });
  }
}