// Types for project operations
export interface CreateProjectPayload {
    user_id: string;
    name: string;
  }
  
export interface RawTextDocument {
    id: string;
    project_id: string | number;
    name: string;
    text: string;
    createdAt?: any; // Firestore timestamp
    updatedAt?: any; // Firestore timestamp
  }

export interface Project {
    id: string;
    project_id: number;
    user_id: string;
    name: string;
    createdAt?: any; // Firestore timestamp
    updatedAt?: any; // Firestore timestamp
    rawTextDocuments?: RawTextDocument[]; // Array of associated rawText documents
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