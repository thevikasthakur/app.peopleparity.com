import { Controller, Post, Patch, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('active')
  async getActiveSession(@Request() req) {
    return this.sessionsService.findActiveSession(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getSession(@Param('id') id: string) {
    const session = await this.sessionsService.findById(id);
    if (!session) {
      return { success: false, message: 'Session not found' };
    }
    return { success: true, session };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createSession(@Body() createSessionDto: any, @Request() req) {
    try {
      // Remove auto-generated fields but keep ID for sync consistency
      const { createdAt, updatedAt, ...cleanDto } = createSessionDto;
      
      console.log('Creating session with ID:', cleanDto.id);
      
      const session = await this.sessionsService.create({
        ...cleanDto,
        startTime: new Date(cleanDto.startTime),
        userId: req.user.userId,
      });
      
      console.log('Session created successfully:', (session as any).id);
      return { success: true, session };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateSession(
    @Param('id') id: string,
    @Body() updateData: any,
  ) {
    // Convert date strings to Date objects if present
    if (updateData.endTime) {
      updateData.endTime = new Date(updateData.endTime);
    }
    if (updateData.startTime) {
      updateData.startTime = new Date(updateData.startTime);
    }
    const session = await this.sessionsService.update(id, updateData);
    return { success: true, session };
  }
}