import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
export declare class ProjectsService {
    private projectsRepository;
    constructor(projectsRepository: Repository<Project>);
    findByOrganization(organizationId: string): Promise<Project[]>;
    create(createProjectDto: {
        name: string;
        description?: string;
        organizationId: string;
        color?: string;
    }): Promise<Project>;
    findById(id: string): Promise<Project | null>;
}
//# sourceMappingURL=projects.service.d.ts.map