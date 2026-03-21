import { Controller, Get, Post, Body, Param, Patch, UseGuards, Inject, Request, ForbiddenException } from '@nestjs/common';
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

    const mapUser = (user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      organizationId: user.organizationId,
      organizationName: user.organization?.name,
      timezone: user.timezone,
      assignedUserIds: user.assignedUserIds,
    });

    // Super admin can see all users
    if (currentUser.role === 'super_admin') {
      const allUsers = await this.usersService.getAllUsers();
      return allUsers.map(mapUser);
    }

    // Org admin can only see users in their organization
    if (currentUser.role === 'org_admin' && currentUser.organizationId) {
      const orgUsers = await this.usersService.getOrganizationUsers(currentUser.organizationId);
      return orgUsers.map(mapUser);
    }

    // External users can only see their assigned users
    if (currentUser.role === 'external') {
      const assignedUsers = await this.usersService.getAssignedUsers(currentUser.id);
      return assignedUsers.map(mapUser);
    }

    // Developers can only see themselves
    return [mapUser(currentUser)];
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
  async createUser(@Request() req, @Body() createUserDto: {
    email: string;
    name: string;
    password: string;
    organizationId?: string;
    role: 'org_admin' | 'developer' | 'external';
    assignedUserIds?: string[];
    timezone?: string;
  }) {
    const currentUser = await this.usersService.findById(req.user.userId);
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'org_admin') {
      throw new ForbiddenException('Only admins can create users');
    }
    const user = await this.usersService.create(createUserDto);
    return { success: true, user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/role')
  async updateUserRole(@Request() req, @Param('id') id: string, @Body() body: { role: 'org_admin' | 'developer' | 'external' }) {
    const currentUser = await this.usersService.findById(req.user.userId);
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'org_admin') {
      throw new ForbiddenException('Only admins can change user roles');
    }
    const user = await this.usersService.updateRole(id, body.role);
    return { success: true, user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/assigned-users')
  async updateAssignedUsers(@Request() req, @Param('id') id: string, @Body() body: { assignedUserIds: string[] }) {
    const currentUser = await this.usersService.findById(req.user.userId);
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'org_admin') {
      throw new ForbiddenException('Only admins can manage user assignments');
    }
    const user = await this.usersService.updateAssignedUsers(id, body.assignedUserIds);
    return { success: true, user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/deactivate')
  async deactivateUser(@Request() req, @Param('id') id: string) {
    const currentUser = await this.usersService.findById(req.user.userId);
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'org_admin') {
      throw new ForbiddenException('Only admins can deactivate users');
    }
    const user = await this.usersService.deactivate(id);
    return { success: true, user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reactivate')
  async reactivateUser(@Request() req, @Param('id') id: string) {
    const currentUser = await this.usersService.findById(req.user.userId);
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'org_admin') {
      throw new ForbiddenException('Only admins can reactivate users');
    }
    const user = await this.usersService.reactivate(id);
    return { success: true, user };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reset-password')
  async resetPassword(@Request() req, @Param('id') id: string, @Body() body: { password: string }) {
    const currentUser = await this.usersService.findById(req.user.userId);
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'org_admin') {
      throw new ForbiddenException('Only admins can reset passwords');
    }
    await this.usersService.resetPassword(id, body.password);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateUser(@Request() req, @Param('id') id: string, @Body() body: { name?: string; timezone?: string }) {
    const currentUser = await this.usersService.findById(req.user.userId);
    if (currentUser.role !== 'super_admin' && currentUser.role !== 'org_admin') {
      throw new ForbiddenException('Only admins can update users');
    }
    const user = await this.usersService.updateUser(id, body);
    return { success: true, user };
  }
}