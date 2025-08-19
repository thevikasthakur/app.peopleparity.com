import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../entities/organization.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
  ) {}

  async create(createOrgDto: {
    name: string;
    code: string;
    timezone?: string;
    firstDayOfWeek?: string;
  }) {
    const existing = await this.organizationsRepository.findOne({
      where: [{ name: createOrgDto.name }, { code: createOrgDto.code }],
    });

    if (existing) {
      throw new ConflictException('Organization with this name or code already exists');
    }

    const organization = this.organizationsRepository.create(createOrgDto);
    return this.organizationsRepository.save(organization);
  }

  async findAll() {
    return this.organizationsRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findById(id: string) {
    return this.organizationsRepository.findOne({ where: { id } });
  }
}