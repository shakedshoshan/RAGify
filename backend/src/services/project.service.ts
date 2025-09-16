import { Injectable } from '@nestjs/common';
import { FirestoreService } from './firestore.service';
import { ProjectDto } from '../dto/project.dto';

@Injectable()
export class ProjectService {
  private readonly collectionName = 'projects';

  constructor(private readonly firestoreService: FirestoreService) {}

  /**
   * Create a new project
   * @param projectDto The project data
   * @returns The created project with ID
   */
  async createProject(projectDto: ProjectDto) {
    // Get the next project ID
    const nextId = await this.getNextProjectId();
    
    const docRef = await this.firestoreService.addDocument(this.collectionName, {
      ...projectDto,
      project_id: nextId,
    });
    
    return {
      id: docRef.id,
      project_id: nextId,
      ...projectDto,
    };
  }

  /**
   * Get the next project ID by counting existing projects
   * @returns The next project ID
   */
  private async getNextProjectId(): Promise<number> {
    const projects = await this.firestoreService.queryDocuments(this.collectionName);
    return projects.length + 1;
  }

  /**
   * Get a project by ID
   * @param id The project ID
   * @returns The project data or null if not found
   */
  async getProjectById(id: string) {
    return this.firestoreService.getDocument(this.collectionName, id);
  }

  /**
   * Get all projects for a specific user
   * @param userId The user ID
   * @returns Array of projects
   */
  async getProjectsByUserId(userId: string) {
    return this.firestoreService.queryDocuments(this.collectionName, {
      user_id: userId,
    });
  }

  /**
   * Get all projects
   * @returns Array of all projects
   */
  async getAllProjects() {
    return this.firestoreService.queryDocuments(this.collectionName);
  }

  /**
   * Delete a project by ID
   * @param id The project ID
   * @returns True if deletion was successful
   */
  async deleteProject(id: string) {
    return this.firestoreService.deleteDocument(this.collectionName, id);
  }
}
