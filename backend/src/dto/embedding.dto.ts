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
}

export class EmbeddingResponseDto {
  projectId: string;
  processedChunks: number;
  totalEmbeddings: number;
  embeddingIds: string[];
  modelUsed: string;
  dimensions: number;
}
