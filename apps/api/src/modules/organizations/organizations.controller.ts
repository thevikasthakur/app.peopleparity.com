import { Controller, Get, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('organizations')
export class OrganizationsController {
  constructor(
    @Inject(OrganizationsService) private readonly organizationsService: OrganizationsService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getOrganizations() {
    const organizations = await this.organizationsService.findAll();
    return { organizations };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrganization(@Body() createOrgDto: {
    name: string;
    code: string;
    timezone?: string;
    firstDayOfWeek?: string;
  }) {
    const organization = await this.organizationsService.create(createOrgDto);
    return { success: true, organization };
  }
}