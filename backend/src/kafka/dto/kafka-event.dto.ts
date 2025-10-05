import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, IsDateString } from 'class-validator';

/**
 * Base Kafka Event DTO
 * All Kafka events should extend this base class
 */
export abstract class BaseKafkaEventDto {
  @IsString()
  projectId: string;

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}

/**
 * Documents Chunked Event DTO
 */
export class DocumentsChunkedEventDto extends BaseKafkaEventDto {
  @IsNumber()
  processedTexts: number;

  @IsNumber()
  totalChunks: number;

  @IsString()
  chunkingStrategy: 'semantic' | 'fixed' | 'hybrid';

  @IsOptional()
  @IsObject()
  metadata?: {
    chunkSize?: number;
    chunkOverlap?: number;
    processingTime?: number;
    modelName?: string;
  };
}

/**
 * Chunks Embedded Event DTO
 */
export class ChunksEmbeddedEventDto extends BaseKafkaEventDto {
  @IsNumber()
  processedChunks: number;

  @IsNumber()
  totalEmbeddings: number;

  @IsString()
  modelUsed: string;

  @IsNumber()
  dimensions: number;

  @IsOptional()
  @IsObject()
  metadata?: {
    processingTime?: number;
    tokenCount?: number;
    embeddings?: number[][];
    chunks?: Array<{
      id: string;
      content: string;
      sourceName?: string;
      sourceId?: string;
      chunkIndex?: number;
      startIndex?: number;
      endIndex?: number;
    }>;
  };
}

/**
 * Embeddings Ingested Event DTO
 */
export class EmbeddingsIngestedEventDto extends BaseKafkaEventDto {
  @IsNumber()
  vectorCount: number;

  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsNumber()
  chunksDeleted?: number;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    processingTime?: number;
    pineconeIndex?: string;
    deletedVectors?: number;
  };
}

/**
 * Query Received Event DTO
 */
export class QueryReceivedEventDto extends BaseKafkaEventDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    queryLength?: number;
    language?: string;
    source?: string;
  };
}

/**
 * Context Retrieved Event DTO
 */
export class ContextRetrievedEventDto extends BaseKafkaEventDto {
  @IsString()
  query: string;

  @IsString()
  context: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    retrievedChunks?: number;
    similarityScores?: number[];
    retrievalTime?: number;
    hasConversationHistory?: boolean;
    conversationTurns?: number;
  };
}

/**
 * Response Generated Event DTO
 */
export class ResponseGeneratedEventDto extends BaseKafkaEventDto {
  @IsString()
  query: string;

  @IsString()
  answer: string;

  @IsOptional()
  @IsObject()
  metadata?: {
    generationTime?: number;
    modelUsed?: string;
    tokenCount?: number;
    contextLength?: number;
    hasConversationHistory?: boolean;
    conversationTurns?: number;
  };
}

/**
 * Processing Error Event DTO
 */
export class ProcessingErrorEventDto extends BaseKafkaEventDto {
  @IsString()
  errorType: string;

  @IsString()
  errorMessage: string;

  @IsString()
  service: string;

  @IsString()
  operation: string;

  @IsOptional()
  @IsObject()
  errorDetails?: any;

  @IsOptional()
  @IsString()
  stackTrace?: string;
}

/**
 * System Metrics Event DTO
 */
export class SystemMetricsEventDto extends BaseKafkaEventDto {
  @IsString()
  metricType: 'performance' | 'usage' | 'health';

  @IsObject()
  metrics: Record<string, number | string | boolean>;

  @IsOptional()
  @IsString()
  service?: string;
}
