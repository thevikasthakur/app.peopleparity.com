import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { Project } from '../../entities/project.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async ensureSuperAdmin(email: string, password: string) {
    const existingAdmin = await this.usersRepository.findOne({
      where: { email, role: 'super_admin' },
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const superAdmin = this.usersRepository.create({
        email,
        name: 'Super Admin',
        password: hashedPassword,
        role: 'super_admin',
        isActive: true,
      });

      await this.usersRepository.save(superAdmin);
      console.log('✅ Super Admin created with email:', email);
    } else {
      console.log('✅ Super Admin already exists');
    }
  }

  async findByEmail(email: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['organization'],
    });
  }

  async findById(id: string): Promise<User> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
  }

  async create(createUserDto: {
    email: string;
    name: string;
    password: string;
    organizationId?: string;
    role: 'org_admin' | 'developer';
  }) {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async updateLastLogin(userId: string) {
    await this.usersRepository.update(userId, {
      lastLogin: new Date(),
    });
  }

  async getOrganizationProjects(organizationId: string) {
    const projects = await this.projectsRepository.find({
      where: { organizationId, isActive: true },
      order: { name: 'ASC' },
    });

    return projects.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      organizationId: p.organizationId,
    }));
  }

  async getOrganizationUsers(organizationId: string) {
    return this.usersRepository.find({
      where: { organizationId },
      relations: ['organization'],
      order: { name: 'ASC' },
    });
  }

  async updateRole(userId: string, role: 'org_admin' | 'developer') {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'super_admin') {
      throw new ConflictException('Cannot change super admin role');
    }

    user.role = role;
    return this.usersRepository.save(user);
  }

  async deactivate(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'super_admin') {
      throw new ConflictException('Cannot deactivate super admin');
    }

    user.isActive = false;
    return this.usersRepository.save(user);
  }

  async resetPassword(userId: string, newPassword: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    
    return this.usersRepository.save(user);
  }
}