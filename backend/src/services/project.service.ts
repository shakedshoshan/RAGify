import { Injectable } from '@nestjs/common';
import { FirestoreService } from './firestore.service';
import { ProjectDto, ProjectWithRawTextDto } from '../dto/project.dto';

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
   * Get a project by ID along with all its associated rawText documents
   * @param id The project ID
   * @returns The project data with associated rawText documents or null if not found
   */
  async getProjectById(id: string): Promise<ProjectWithRawTextDto | null> {
    // Get the project document
    const project = await this.firestoreService.getDocument(this.collectionName, id);
    
    if (!project) {
      return null;
    }
    
    // Type assertion to help TypeScript understand the project structure
    const typedProject = project as Record<string, any>;
    
    // Define possible project identifiers to search for
    const projectIdentifiers: (string | number)[] = [
      typedProject.id, // Document ID
    ];
    
    // Add project_id if it exists (as both string and number)
    if ('project_id' in typedProject) {
      projectIdentifiers.push(
        String(typedProject.project_id),
        typedProject.project_id as number
      );
    }
    
    // Create an array of promises to query rawText documents
    const rawTextPromises = projectIdentifiers.map(identifier => 
      this.firestoreService.queryDocuments('rawText', { project_id: identifier })
    );
    
    // Execute all queries in parallel
    const results = await Promise.all(rawTextPromises);
    
    // Combine all results, removing duplicates by ID
    const rawTextMap = new Map<string, any>();
    results.flat().forEach(doc => {
      if (!rawTextMap.has(doc.id)) {
        rawTextMap.set(doc.id, doc);
      }
    });
    
    const rawTextDocuments = Array.from(rawTextMap.values());
    
    // Return the project with its associated rawText documents
    const projectWithRawText: ProjectWithRawTextDto = {
      user_id: typedProject.user_id as string,
      name: typedProject.name as string,
      createdAt: typedProject.createdAt,
      updatedAt: typedProject.updatedAt,
      ...typedProject,
      rawTextDocuments
    };
    
    return projectWithRawText;
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
