import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ProjectDto, ProjectIdDto, CreateProjectDto, UserIdDto, ProjectResponseDto } from '../dto/project.dto';
import { ProjectService } from '../services/project.service';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async createProject(@Body() projectDto: CreateProjectDto) {
    try {
      const project = await this.projectService.createProject(projectDto);
      
      return {
        success: true,
        id: project.id,
        message: 'Project created successfully',
        data: project,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create project',
        error: error.message,
      };
    }
  }

  @Get(':id')
  async getProjectById(@Param() params: ProjectIdDto) {
    try {
      const project = await this.projectService.getProjectById(params.id);
      
      if (!project) {
        return {
          success: false,
          message: 'Project not found',
        };
      }
      
      return {
        success: true,
        data: project,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get project',
        error: error.message,
      };
    }
  }

  @Get('user/:user_id')
  async getProjectsByUserId(@Param() params: UserIdDto) {
    try {
      const projects = await this.projectService.getProjectsByUserId(params.user_id);
      
      // Transform the data to include only the required fields
      const transformedProjects = projects.map((project: any) => ({
        id: project.id,
        project_id: project.project_id,
        user_id: project.user_id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }));
      
      return {
        success: true,
        data: transformedProjects,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get projects',
        error: error.message,
      };
    }
  }

  @Get()
  async getAllProjects() {
    try {
      const projects = await this.projectService.getAllProjects();
      
      return {
        success: true,
        data: projects,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get all projects',
        error: error.message,
      };
    }
  }

  @Delete(':id')
  async deleteProject(@Param() params: ProjectIdDto) {
    try {
      await this.projectService.deleteProject(params.id);
      
      return {
        success: true,
        message: 'Project deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete project',
        error: error.message,
      };
    }
  }
}
