import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppVersionService } from './app-version.service';
import { AppVersion } from '../../entities/app-version.entity';

@Controller('app-versions')
export class AppVersionController {
  constructor(
    @Inject(AppVersionService)
    private readonly appVersionService: AppVersionService
  ) {
    console.log('AppVersionController instantiated, service:', !!this.appVersionService);
  }

  @Get()
  async findAll(): Promise<AppVersion[]> {
    console.log('findAll called, service:', this.appVersionService, 'type:', typeof this.appVersionService);
    if (!this.appVersionService) {
      throw new Error('AppVersionService is not injected!');
    }
    return this.appVersionService.findAll();
  }

  @Get('supported')
  async findSupported(): Promise<AppVersion[]> {
    return this.appVersionService.findSupported();
  }

  @Get('check/:version')
  async checkVersion(@Param('version') version: string): Promise<{
    version: string;
    isSupported: boolean;
  }> {
    const isSupported = await this.appVersionService.isVersionSupported(version);
    return { version, isSupported };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body()
    data: {
      version: string;
      releaseDate: string;
      notes?: string;
    },
  ): Promise<AppVersion> {
    return this.appVersionService.create({
      ...data,
      releaseDate: new Date(data.releaseDate),
    });
  }

  @Put(':version/support')
  @UseGuards(JwtAuthGuard)
  async updateSupport(
    @Param('version') version: string,
    @Body()
    data: {
      isSupported: boolean;
      deprecationDate?: string;
    },
  ): Promise<AppVersion> {
    return this.appVersionService.updateSupport(
      version,
      data.isSupported,
      data.deprecationDate ? new Date(data.deprecationDate) : undefined,
    );
  }
}
