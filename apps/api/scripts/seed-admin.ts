import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { User } from '../src/entities/user.entity';
import { Organization } from '../src/entities/organization.entity';
import { Project } from '../src/entities/project.entity';
import { Session } from '../src/entities/session.entity';
import { ActivityPeriod } from '../src/entities/activity-period.entity';
import { Screenshot } from '../src/entities/screenshot.entity';

// Load environment variables
dotenv.config();

async function seedAdmin() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_HOST?.includes('supabase.com')
      ? { rejectUnauthorized: false }
      : false,
    entities: [User, Organization, Project, Session, ActivityPeriod, Screenshot],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected');

    const userRepository = dataSource.getRepository(User);

    const adminEmail = 'jai@inzint.com';
    const adminPassword = 'Expresstrackadmin1';

    // Check if admin already exists
    const existingAdmin = await userRepository.findOne({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'super_admin';
      existingAdmin.isActive = true;
      await userRepository.save(existingAdmin);
      console.log('Admin password updated successfully');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const newAdmin = userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin User',
        role: 'super_admin',
        isActive: true,
        authProvider: 'local'
      });

      await userRepository.save(newAdmin);

      console.log('Admin user created successfully');
      console.log('Email:', adminEmail);
      console.log('Password:', adminPassword);
    }

    await dataSource.destroy();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding admin:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seedAdmin();