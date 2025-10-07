export interface RagPrepareParams {
    chunkSize?: number;
    chunkOverlap?: number;
    chunkingStrategy?: 'semantic' | 'fixed' | 'hybrid';
    modelName?: string;
  }
  
  export interface RagPrepareResponse {
    success: boolean;
    message: string;
    data: {
      projectId: string;
      correlationId: string;
      status: string;
      chunkingStrategy: string;
      chunkSize?: number;
      chunkOverlap?: number;
      modelName: string;
    };
  }
  
  export interface RagStatusResponse {
    success: boolean;
    message: string;
    data: {
      projectId: string;
      correlationId: string;
      currentStep: 'processing' | 'completed' | 'failed';
      progress: {
        chunking: boolean;
        embedding: boolean;
        vectorStorage: boolean;
        cleanup: boolean;
      };
    };
  }
  
  export interface PrepareRagButtonProps {
    projectId: string;
    onPrepareSuccess?: (correlationId: string) => void;
    className?: string;
  }