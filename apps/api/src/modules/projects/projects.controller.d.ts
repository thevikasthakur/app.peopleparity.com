import { ProjectsService } from './projects.service';
export declare class ProjectsController {
    private projectsService;
    constructor(projectsService: ProjectsService);
    getProjects(req: any): Promise<{
        projects: import("../../entities/project.entity").Project[];
    }>;
    createProject(createProjectDto: {
        name: string;
        description?: string;
        color?: string;
    }, req: any): Promise<{
        success: boolean;
        project: import("../../entities/project.entity").Project;
    }>;
}
//# sourceMappingURL=projects.controller.d.ts.map