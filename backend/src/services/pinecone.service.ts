import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';
import { EmbeddingDto } from '../dto/embedding.dto';
import { ChunkDto } from '../dto/chunk.dto';

// Define minimal interface types for Pinecone operations
interface PineconeVector {
  id: string;
  values: number[];
  metadata: Record<string, any>;
}

// Interface for text chunks stored in Pinecone (without embeddings)
interface PineconeTextVector {
  id: string;
  values: number[]; // We'll use dummy values since Pinecone requires vectors
  metadata: {
    content: string;
    startIndex: number;
    endIndex: number;
    sourceId: string;
    sourceName?: string;
    chunkIndex: number;
    totalChunks: number;
    projectId: string;
    createdAt: string;
  };
}

interface PineconeSearchParams {
  projectId: string;
  queryVector: number[];
  topK?: number;
  filter?: Record<string, any>;
  scoreThreshold?: number;
}

interface PineconeSearchResult {
  projectId: string;
  matches: Array<{
    id: string;
    score: number;
    metadata: Record<string, any>;
  }>;
  totalMatches: number;
}

interface PineconeStatsResult {
  projectId: string;
  totalVectorCount: number;
  dimension: number;
  indexFullness: string;
  status: string;
}

@Injectable()
export class PineconeService {
  private pinecone: Pinecone;
  private readonly defaultIndexName = 'ragify-index';
  private readonly defaultDimension = 1024; // Match your Pinecone index dimension
  private indexDimension: number = 1024; // Will be updated when we get index stats

  constructor(private readonly configService: ConfigService) {
    const pineconeConfig = this.configService.get('pinecone');
    if (!pineconeConfig || !pineconeConfig.apiKey) {
      throw new Error('Pinecone configuration is missing or incomplete');
    }

    // Initialize Pinecone client with API key
    this.pinecone = new Pinecone({
      apiKey: pineconeConfig.apiKey,
    });
    
    // Set the index name from configuration
    if (pineconeConfig.indexName) {
      this.defaultIndexName = pineconeConfig.indexName;
    }
    
    console.log(`Initialized Pinecone client`);
    console.log(`Using index: ${this.defaultIndexName}`);
  }

  /**
   * Get index for a project
   */
  private async getProjectIndex(projectId: string) {
    try {
      // First, verify that the index exists
      await this.verifyIndexExists();
      
      // Get the index
      return this.pinecone.index(this.defaultIndexName);
    } catch (error) {
      throw new BadRequestException(`Failed to get index for project ${projectId}: ${error.message}`);
    }
  }

  /**
   * Verify that the index exists and is ready
   */
  private async verifyIndexExists(): Promise<void> {
    try {
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === this.defaultIndexName);
      
      if (!indexExists) {
        throw new Error(`Index '${this.defaultIndexName}' does not exist. Please create the index in your Pinecone dashboard first.`);
      }
      
      // Check if index is ready
      const indexInfo = indexList.indexes?.find(idx => idx.name === this.defaultIndexName);
      if (indexInfo && !indexInfo.status?.ready) {
        throw new Error(`Index '${this.defaultIndexName}' exists but is not ready. Status: ${indexInfo.status?.state || 'unknown'}`);
      }
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('not ready')) {
        throw error;
      }
      throw new Error(`Failed to verify index existence: ${error.message}`);
    }
  }

  /**
   * Create index if it doesn't exist (helper method for development)
   */
  async createIndexIfNotExists(): Promise<{ created: boolean; message: string }> {
    try {
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === this.defaultIndexName);
      
      if (indexExists) {
        return { created: false, message: `Index '${this.defaultIndexName}' already exists` };
      }

      // Create the index
      await this.pinecone.createIndex({
        name: this.defaultIndexName,
        dimension: this.defaultDimension,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      // Wait for index to be ready
      await this.waitForIndexReady(this.defaultIndexName);

      return { created: true, message: `Index '${this.defaultIndexName}' created successfully` };
    } catch (error) {
      throw new BadRequestException(`Failed to create index: ${error.message}`);
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(indexName: string, maxWaitTime = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const indexList = await this.pinecone.listIndexes();
        const index = indexList.indexes?.find(idx => idx.name === indexName);
        
        if (index && index.status?.ready) {
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.warn('Error checking index status:', error.message);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new BadRequestException(`Index ${indexName} did not become ready within ${maxWaitTime}ms`);
  }

  /**
   * Search for similar vectors
   */
  async searchVectors(params: PineconeSearchParams): Promise<PineconeSearchResult> {
    try {
      const index = await this.getProjectIndex(params.projectId);
      
      const searchResponse = await index.query({
        vector: params.queryVector,
        topK: params.topK || 10,
        filter: params.filter,
        includeMetadata: true,
        includeValues: false
      });

      // Filter by score threshold if provided
      let matches = searchResponse.matches || [];
      if (params.scoreThreshold !== undefined) {
        matches = matches.filter(match => (match.score || 0) >= (params.scoreThreshold || 0));
      }

      return {
        projectId: params.projectId,
        matches: matches.map(match => ({
          id: match.id,
          score: match.score || 0,
          metadata: match.metadata as Record<string, any>
        })),
        totalMatches: matches.length
      };
    } catch (error) {
      throw new BadRequestException(`Failed to search vectors: ${error.message}`);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(projectId: string): Promise<PineconeStatsResult> {
    try {
      const index = await this.getProjectIndex(projectId);
      const stats = await index.describeIndexStats();
      
      // Update our internal dimension tracking
      if (stats.dimension) {
        this.indexDimension = stats.dimension;
      }
      
      return {
        projectId,
        totalVectorCount: stats.totalRecordCount || 0,
        dimension: stats.dimension || this.defaultDimension,
        indexFullness: String(stats.indexFullness || '0%'),
        status: 'ready'
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get index stats: ${error.message}`);
    }
  }

  /**
   * Delete all vectors for a project
   */
  async deleteAllProjectVectors(projectId: string): Promise<{ deletedCount: number }> {
    try {
      const index = await this.getProjectIndex(projectId);
      
      await index.deleteMany({
        filter: {
          projectId: { $eq: projectId }
        }
      });
      
      return {
        deletedCount: -1 // Unknown count for delete all
      };
    } catch (error) {
      throw new BadRequestException(`Failed to delete all vectors for project ${projectId}: ${error.message}`);
    }
  }

  /**
   * Batch upsert vectors with progress tracking
   */
  async batchUpsertVectors(
    projectId: string, 
    vectors: PineconeVector[], 
    batchSize: number = 100
  ): Promise<{ totalUpserted: number; batches: number }> {
    try {
      const index = await this.getProjectIndex(projectId);
      let totalUpserted = 0;
      let batchCount = 0;

      // Process vectors in batches
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        const pineconeVectors = batch.map(vector => ({
          id: vector.id,
          values: vector.values,
          metadata: vector.metadata
        }));

        await index.upsert(pineconeVectors);
        totalUpserted += batch.length;
        batchCount++;

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < vectors.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        totalUpserted,
        batches: batchCount
      };
    } catch (error) {
      throw new BadRequestException(`Failed to batch upsert vectors: ${error.message}`);
    }
  }

  /**
   * Convert EmbeddingDto to Pinecone vector format
   */
  convertEmbeddingToPineconeVector(embedding: EmbeddingDto, id: string): PineconeVector {
    return {
      id,
      values: embedding.vector,
      metadata: embedding.metadata
    };
  }

  /**
   * Convert ChunkDto to Pinecone text vector format (using dummy embeddings)
   */
  convertChunkToPineconeTextVector(chunk: ChunkDto & { project_id: string }, id: string): PineconeTextVector {
    // Create dummy vector values since Pinecone requires vectors but we only want to store text
    // Use the actual index dimension to avoid dimension mismatch
    // Pinecone requires at least one non-zero value, so we set the first element to a small value
    const dummyVector = new Array(this.indexDimension).fill(0);
    dummyVector[0] = 0.001; // Set first element to small non-zero value to satisfy Pinecone requirements
    
    return {
      id,
      values: dummyVector,
      metadata: {
        content: chunk.content,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        sourceId: chunk.sourceId,
        sourceName: chunk.sourceName,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        projectId: chunk.project_id,
        createdAt: new Date().toISOString(),
      }
    };
  }

  /**
   * Batch upsert text chunks with progress tracking
   */
  async batchUpsertTextChunks(
    projectId: string, 
    chunks: (ChunkDto & { project_id: string })[], 
    batchSize: number = 100
  ): Promise<{ totalUpserted: number; batches: number; chunkIds: string[] }> {
    try {
      // Get index stats to ensure we have the correct dimension
      await this.getIndexStats(projectId);
      
      const index = await this.getProjectIndex(projectId);
      let totalUpserted = 0;
      let batchCount = 0;
      const chunkIds: string[] = [];

      // Process chunks in batches
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const pineconeVectors = batch.map((chunk, batchIndex) => {
          const chunkId = `${projectId}-chunk-${i + batchIndex}-${Date.now()}`;
          chunkIds.push(chunkId);
          return this.convertChunkToPineconeTextVector(chunk, chunkId);
        });

        await index.upsert(pineconeVectors);
        totalUpserted += batch.length;
        batchCount++;

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return {
        totalUpserted,
        batches: batchCount,
        chunkIds
      };
    } catch (error) {
      throw new BadRequestException(`Failed to batch upsert text chunks: ${error.message}`);
    }
  }

  /**
   * Search for text chunks by project ID (without vector similarity)
   */
  async getTextChunksByProjectId(projectId: string, limit: number = 100): Promise<{
    projectId: string;
    chunks: Array<{
      id: string;
      content: string;
      startIndex: number;
      endIndex: number;
      sourceId: string;
      sourceName?: string;
      chunkIndex: number;
      totalChunks: number;
      createdAt: string;
    }>;
    totalChunks: number;
  }> {
    try {
      // Get index stats to ensure we have the correct dimension
      await this.getIndexStats(projectId);
      
      const index = await this.getProjectIndex(projectId);
      
      // Use a dummy query vector since we're only filtering by metadata
      // Pinecone requires at least one non-zero value
      const dummyVector = new Array(this.indexDimension).fill(0);
      dummyVector[0] = 0.001; // Set first element to small non-zero value
      
      const searchResponse = await index.query({
        vector: dummyVector,
        topK: limit,
        filter: {
          projectId: { $eq: projectId }
        },
        includeMetadata: true,
        includeValues: false
      });

      const chunks = (searchResponse.matches || []).map(match => ({
        id: match.id,
        content: match.metadata?.content as string,
        startIndex: match.metadata?.startIndex as number,
        endIndex: match.metadata?.endIndex as number,
        sourceId: match.metadata?.sourceId as string,
        sourceName: match.metadata?.sourceName as string,
        chunkIndex: match.metadata?.chunkIndex as number,
        totalChunks: match.metadata?.totalChunks as number,
        createdAt: match.metadata?.createdAt as string,
      }));

      return {
        projectId,
        chunks,
        totalChunks: chunks.length
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get text chunks: ${error.message}`);
    }
  }
}