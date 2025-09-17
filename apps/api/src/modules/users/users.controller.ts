import { Controller, Get, Post, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('organization/:organizationId')
  async getOrganizationUsers(@Param('organizationId') organizationId: string) {
    const users = await this.usersService.getOrganizationUsers(organizationId);
    return { users };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createUser(@Body() createUserDto: {
    email: string;
    name: string;
    password: string;
    organizationId?: string;
    role: 'org_admin' | 'developer';
  }) {
    const user = await this.usersService.create(createUserDto);
    return { success: true, user };
  }
}