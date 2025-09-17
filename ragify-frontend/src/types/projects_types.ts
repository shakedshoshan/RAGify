// Types for project operations
export interface CreateProjectPayload {
    user_id: string;
    name: string;
  }
  
export interface Project {
    id: string;
    project_id: number;
    user_id: string;
    name: string;
    createdAt?: any; // Firestore timestamp
    updatedAt?: any; // Firestore timestamp
  }
  
export interface ProjectResponse {
    success: boolean;
    id?: string;
    message: string;
    data?: Project;
    error?: string;
  }
  
export interface ProjectListResponse {
    success: boolean;
    message: string;
    data?: Project[];
    error?: string;
  }