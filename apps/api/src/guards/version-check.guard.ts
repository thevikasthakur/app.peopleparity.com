import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppVersion } from '../entities/app-version.entity';

// HTTP 426 Upgrade Required
const UPGRADE_REQUIRED = 426;

@Injectable()
export class VersionCheckGuard implements CanActivate {
  constructor(
    @InjectRepository(AppVersion)
    private appVersionRepository: Repository<AppVersion>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const appVersion = request.headers['x-app-version'];

    // If no version header is present, allow the request (web/admin clients don't send version)
    // Only desktop app sends x-app-version header
    if (!appVersion) {
      return true;
    }

    // Check if version is supported
    const versionRecord = await this.appVersionRepository.findOne({
      where: { version: appVersion },
    });

    if (!versionRecord) {
      throw new HttpException(
        {
          statusCode: UPGRADE_REQUIRED,
          message: `Version ${appVersion} is not recognized. Please update your desktop application.`,
          error: 'UNKNOWN_VERSION',
        },
        UPGRADE_REQUIRED,
      );
    }

    if (!versionRecord.isSupported) {
      throw new HttpException(
        {
          statusCode: UPGRADE_REQUIRED,
          message: `Version ${appVersion} is no longer supported. Please update your desktop application.`,
          error: 'UNSUPPORTED_VERSION',
          deprecationDate: versionRecord.deprecationDate,
        },
        UPGRADE_REQUIRED,
      );
    }
    return true;
  }
}
