import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  async findByOrganization(organizationId: string) {
    return this.projectsRepository.find({
      where: { organizationId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async create(createProjectDto: {
    name: string;
    description?: string;
    organizationId: string;
    color?: string;
  }) {
    const project = this.projectsRepository.create(createProjectDto);
    return this.projectsRepository.save(project);
  }

  async findById(id: string) {
    return this.projectsRepository.findOne({ where: { id } });
  }
}