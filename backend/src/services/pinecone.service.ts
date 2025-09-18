import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pinecone } from '@pinecone-database/pinecone';

// Define minimal interface types for Pinecone operations
interface PineconeVector {
  id: string;
  values: number[];
  metadata: Record<string, any>;
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
   * Query vectors by similarity search
   */
  async queryVectors(
    projectId: string,
    queryVector: number[],
    topK: number = 5
  ): Promise<{ matches: Array<{ id: string; score: number; metadata: Record<string, any> }> }> {
    try {
      const index = await this.getProjectIndex(projectId);
      
      const queryResponse = await index.query({
        vector: queryVector,
        topK: topK,
        includeMetadata: true,
        filter: {
          projectId: { $eq: projectId }
        }
      });

      return {
        matches: queryResponse.matches?.map(match => ({
          id: match.id,
          score: match.score || 0,
          metadata: match.metadata || {}
        })) || []
      };
    } catch (error) {
      throw new BadRequestException(`Failed to query vectors: ${error.message}`);
    }
  }

}