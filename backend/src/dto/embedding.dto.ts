export class EmbeddingDto {
  vector: number[];
  metadata: {
    content: string;
    source: string;
    projectId: string;
    chunkId?: string;
    chunkIndex?: number;
    startIndex?: number;
    endIndex?: number;
  };
  createdAt?: Date;
}

export class EmbeddingRequestDto {
  projectId: string;
  modelName?: string; // Default: 'text-embedding-3-small'
  chunkIds?: string[]; // Optional: specific chunk IDs to embed, if not provided, embeds all chunks for project
  skipDeletion?: boolean; // Optional: if true, won't delete existing vectors before embedding
}

export class ProjectEmbeddingDocumentDto {
  projectId: string;
  embeddingIds: string[];
  processedChunks: number;
  totalEmbeddings: number;
  modelUsed: string;
  dimensions: number;
  status: 'completed' | 'processing' | 'failed';
  createdAt?: Date;
  updatedAt?: Date;
}

export class EmbeddingResponseDto {
  projectId: string;
  projectDocumentId?: string; // Reference to the project document in Firestore
  processedChunks: number;
  totalEmbeddings: number;
  embeddingIds: string[];
  modelUsed: string;
  dimensions: number;
  deletedVectors?: number; // Number of vectors deleted before embedding
}
