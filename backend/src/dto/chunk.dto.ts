export class ChunkDto {
  content: string;
  startIndex: number;
  endIndex: number;
  sourceId: string;
  sourceName?: string;
  chunkIndex: number;
  totalChunks: number;
  project_id?: string;
  
  // Additional metadata for improved RAG retrieval
  chunkSize?: number;           // Size of this chunk in characters
  chunkOverlap?: number;        // Overlap used when creating this chunk
  previousChunkId?: string;     // ID of the previous chunk in sequence (for context)
  nextChunkId?: string;         // ID of the next chunk in sequence (for context)
  createdAt?: Date;             // When this chunk was created
  contentPrefix?: string;       // First few words of content (for quick identification)
  contentType?: string;         // Type of content (paragraph, section, etc.)
  keywords?: string[];          // Extracted keywords from the chunk
}
