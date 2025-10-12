import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion } from '../../entities/app-version.entity';

@Injectable()
export class AppVersionService {
  constructor(
    @InjectRepository(AppVersion)
    private appVersionRepository: Repository<AppVersion>,
  ) {}

  async findAll(): Promise<AppVersion[]> {
    return this.appVersionRepository.find({
      order: { releaseDate: 'DESC' },
    });
  }

  async findSupported(): Promise<AppVersion[]> {
    return this.appVersionRepository.find({
      where: { isSupported: true },
      order: { releaseDate: 'DESC' },
    });
  }

  async create(data: {
    version: string;
    releaseDate: Date;
    notes?: string;
  }): Promise<AppVersion> {
    const appVersion = this.appVersionRepository.create({
      ...data,
      isSupported: true,
    });
    return this.appVersionRepository.save(appVersion);
  }

  async updateSupport(
    version: string,
    isSupported: boolean,
    deprecationDate?: Date,
  ): Promise<AppVersion> {
    const appVersion = await this.appVersionRepository.findOne({
      where: { version },
    });

    if (!appVersion) {
      throw new Error(`Version ${version} not found`);
    }

    appVersion.isSupported = isSupported;
    if (deprecationDate) {
      appVersion.deprecationDate = deprecationDate;
    }

    return this.appVersionRepository.save(appVersion);
  }

  async isVersionSupported(version: string): Promise<boolean> {
    // Trim whitespace and log the exact version being checked
    const trimmedVersion = version.trim();
    console.log(`Checking version support for: "${trimmedVersion}" (original: "${version}")`);

    const appVersion = await this.appVersionRepository.findOne({
      where: { version: trimmedVersion },
    });

    if (!appVersion) {
      console.log(`Version "${trimmedVersion}" not found in database - treating as unsupported`);
      // Let's also check what versions ARE in the database
      const allVersions = await this.appVersionRepository.find();
      console.log('Available versions in database:', allVersions.map(v => `"${v.version}" (supported: ${v.isSupported})`).join(', '));
      return false;
    }

    console.log(`Version "${trimmedVersion}" found in database - isSupported: ${appVersion.isSupported}, type: ${typeof appVersion.isSupported}, record:`, appVersion);

    // Return the boolean value directly
    return appVersion.isSupported;
  }
}
