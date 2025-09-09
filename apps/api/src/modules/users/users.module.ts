import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
export class UsersModule {
  // Remove onModuleInit for now to avoid serverless initialization issues
  // Super admin creation can be handled via API endpoints or migrations
}