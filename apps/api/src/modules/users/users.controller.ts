import { Controller, Get, Post, Body, Param, Patch, UseGuards, Inject, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('team-members')
  async getTeamMembers(@Request() req) {
    const currentUser = await this.usersService.findById(req.user.userId);

    // Super admin can see all users
    if (currentUser.role === 'super_admin') {
      const allUsers = await this.usersService.getAllUsers();
      return allUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name
      }));
    }

    // Org admin can only see users in their organization
    if (currentUser.role === 'org_admin' && currentUser.organizationId) {
      const orgUsers = await this.usersService.getOrganizationUsers(currentUser.organizationId);
      return orgUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name
      }));
    }

    // Developers can only see themselves
    return [{
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      organizationId: currentUser.organizationId,
      organizationName: currentUser.organization?.name
    }];
  }

  @UseGuards(JwtAuthGuard)
  @Get('organization/:organizationId')
  async getOrganizationUsers(@Param('organizationId') organizationId: string) {
    const users = await this.usersService.getOrganizationUsers(organizationId);
    return { users };
  }

  @UseGuards(JwtAuthGuard)
  @Get('settings')
  async getUserSettings(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return {
      timezone: user.timezone || 'Asia/Kolkata',
      name: user.name,
      email: user.email,
      role: user.role
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings')
  async updateUserSettings(@Request() req, @Body() body: { timezone: string }) {
    const user = await this.usersService.updateTimezone(req.user.userId, body.timezone);
    return {
      success: true,
      timezone: user.timezone
    };
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