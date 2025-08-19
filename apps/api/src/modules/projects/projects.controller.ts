import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProjects(@Request() req) {
    const projects = await this.projectsService.findByOrganization(req.user.organizationId);
    return { projects };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createProject(@Body() createProjectDto: {
    name: string;
    description?: string;
    color?: string;
  }, @Request() req) {
    const project = await this.projectsService.create({
      ...createProjectDto,
      organizationId: req.user.organizationId,
    });
    return { success: true, project };
  }
}