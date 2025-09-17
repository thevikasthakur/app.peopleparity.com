import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../entities/session.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
  ) {}

  async create(createSessionDto: {
    id?: string; // Allow specifying ID for sync
    userId: string;
    projectId?: string;
    mode: 'client_hours' | 'command_hours';
    task?: string;
    startTime: Date;
    appVersion?: string;
    deviceInfo?: string;
    realIpAddress?: string;
    location?: { lat: number; lon: number } | null;
    isVpnDetected?: boolean;
  }) {
    // End any active sessions first
    await this.endActiveSessions(createSessionDto.userId);

    const sessionData: any = {
      ...createSessionDto,
      isActive: true,
    };

    // Use provided ID or generate a new one
    sessionData.id = createSessionDto.id || uuidv4();
    
    console.log('Creating session with ID:', sessionData.id);
    console.log('Session metadata:', {
      appVersion: sessionData.appVersion,
      deviceInfo: sessionData.deviceInfo ? 'Present' : 'Not provided',
      realIpAddress: sessionData.realIpAddress,
      location: sessionData.location,
      isVpnDetected: sessionData.isVpnDetected
    });

    const session = this.sessionsRepository.create(sessionData);

    return this.sessionsRepository.save(session);
  }

  async findById(id: string) {
    return this.sessionsRepository.findOne({
      where: { id },
      relations: ['project', 'user'],
    });
  }

  async endActiveSessions(userId: string) {
    await this.sessionsRepository.update(
      { userId, isActive: true },
      { isActive: false, endTime: new Date() }
    );
  }

  async update(sessionId: string, updateData: Partial<Session>) {
    await this.sessionsRepository.update(sessionId, updateData);
    return this.sessionsRepository.findOne({ where: { id: sessionId } });
  }

  async findActiveSession(userId: string) {
    return this.sessionsRepository.findOne({
      where: { userId, isActive: true },
      relations: ['project'],
    });
  }
}