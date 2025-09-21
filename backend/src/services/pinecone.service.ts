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
  private readonly defaultDimension = 512; // Match your Pinecone index dimension
  private indexDimension: number = 512; // Will be updated when we get index stats

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
      
      // Query with simple filter - this should work with the way we're storing vectors
      const queryResponse = await index.query({
        vector: queryVector,
        topK: topK,
        includeMetadata: true,
        filter: { projectId }
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

  /**
   * Delete all vectors for a specific project using Pinecone filter API
   * Based on: https://docs.pinecone.io/reference/api/2024-07/data-plane/delete
   */
  async deleteVectorsByProjectId(projectId: string): Promise<{ deleted: number }> {
    try {
      const index = await this.getProjectIndex(projectId);
      
      console.log(`Deleting all vectors for project ${projectId} using filter...`);
      
      try {
        // Use the filter parameter to delete all vectors with matching projectId
        // According to Pinecone docs, this is the most efficient way
        const deleteResponse = await (index as any).delete({
          filter: {
            projectId: { "$eq": projectId }
          }
        });
        
        console.log(`Successfully deleted vectors for project ${projectId}`);
        
        // Pinecone delete API doesn't return count, so we estimate
        // You could query first to get count if needed, but that's less efficient
        return { deleted: 1 }; // At least something was processed
        
      } catch (filterError) {
        console.warn(`Filter-based deletion failed: ${filterError.message}`);
        
        // Fallback: try with simple filter format
        try {
          const deleteResponse = await (index as any).delete({
            filter: {
              projectId: projectId
            }
          });
          
          console.log(`Successfully deleted vectors for project ${projectId} with simple filter`);
          return { deleted: 1 };
          
        } catch (simpleFilterError) {
          console.warn(`Simple filter deletion failed: ${simpleFilterError.message}`);
          
          // Last resort: query first, then delete by IDs
          try {
            console.log(`Falling back to query-then-delete approach for project ${projectId}`);
            
            // Create a dummy query vector to search with
            const dummyVector = new Array(this.indexDimension).fill(0);
            
            // Query to get vector IDs
            const queryResponse = await index.query({
              vector: dummyVector,
              topK: 10000,
              includeMetadata: true,
              filter: { projectId }
            });
            
            if (!queryResponse.matches || queryResponse.matches.length === 0) {
              console.log(`No vectors found for project ${projectId}`);
              return { deleted: 0 };
            }
            
            // Extract IDs and delete in smaller batches
            const vectorIds = queryResponse.matches.map(match => match.id);
            console.log(`Found ${vectorIds.length} vectors for project ${projectId}`);
            
            let totalDeleted = 0;
            const batchSize = 100; // Smaller batches to avoid API limits
            
            for (let i = 0; i < vectorIds.length; i += batchSize) {
              const batch = vectorIds.slice(i, i + batchSize);
              
              try {
                // Use the delete API with ids parameter
                await (index as any).delete({
                  ids: batch
                });
                
                totalDeleted += batch.length;
                console.log(`Deleted batch of ${batch.length} vectors`);
                
                // Small delay to avoid rate limiting
                if (i + batchSize < vectorIds.length) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              } catch (batchError) {
                console.warn(`Failed to delete batch: ${batchError.message}`);
              }
            }
            
            return { deleted: totalDeleted };
            
          } catch (queryError) {
            console.error(`Query-then-delete approach failed: ${queryError.message}`);
            throw new Error(`All deletion methods failed: ${queryError.message}`);
          }
        }
      }
    } catch (error) {
      throw new BadRequestException(`Failed to delete vectors for project ${projectId}: ${error.message}`);
    }
  }

}