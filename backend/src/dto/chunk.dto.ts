export class ChunkDto {
  content: string;
  startIndex: number;
  endIndex: number;
  sourceId: string;
  sourceName?: string;
  chunkIndex: number;
  totalChunks: number;
  project_id?: string;
}
