import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { Project } from '../../entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Organization, Project])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Create super admin on startup if not exists
    await this.usersService.ensureSuperAdmin(
      this.configService.get<string>('SUPER_ADMIN_EMAIL'),
      this.configService.get<string>('SUPER_ADMIN_PASSWORD'),
    );
  }
}