import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ActivityModule } from './modules/activity/activity.module';
import { ScreenshotsModule } from './modules/screenshots/screenshots.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AdminModule } from './modules/admin/admin.module';

// Import all entities explicitly for serverless
import { User } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { Project } from './entities/project.entity';
import { Session } from './entities/session.entity';
import { ActivityPeriod } from './entities/activity-period.entity';
import { Screenshot } from './entities/screenshot.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [
          User,
          Organization,
          Project,
          Session,
          ActivityPeriod,
          Screenshot
        ],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false, // Use migrations for schema management
        migrationsRun: true, // Enable migrations to run automatically
        logging: process.env.NODE_ENV === 'development',
        ssl: configService.get('DATABASE_HOST')?.includes('supabase.com') 
          ? { rejectUnauthorized: false }
          : false,
        connectTimeoutMS: 30000,
        extra: {
          max: 10,
          connectionTimeoutMillis: 30000,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    SessionsModule,
    ActivityModule,
    ScreenshotsModule,
    AnalyticsModule,
    DashboardModule,
    AdminModule,
  ],
})
export class AppModule {}