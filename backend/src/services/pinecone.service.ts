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
      
      // Query with metadata filter for projectId
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

  /**
   * Delete all vectors for a specific project using Pinecone filter API
   * Based on: https://docs.pinecone.io/reference/api/2024-07/data-plane/delete
   */
  async deleteVectorsByProjectId(projectId: string): Promise<{ deleted: number; success: boolean }> {
    try {
      const index = await this.getProjectIndex(projectId);
      
      console.log(`🗑️ Deleting all vectors for project ${projectId}...`);
      
      // Method 1: Try with metadata filter deletion (preferred method)
      try {
        await index.deleteMany({
          projectId: { $eq: projectId }
        });
        
        console.log(`✨ Successfully deleted vectors for project ${projectId} using metadata filter`);
        
        // Verify deletion by querying
        const verifyQuery = await index.query({
          vector: new Array(this.indexDimension).fill(0),
          topK: 1,
          includeMetadata: true,
          filter: {
            projectId: { $eq: projectId }
          }
        });
        
        const remainingVectors = verifyQuery.matches?.length || 0;
        console.log(`Verification: ${remainingVectors} vectors remaining for project ${projectId}`);
        
        return { deleted: remainingVectors === 0 ? 1 : 0, success: remainingVectors === 0 };
        
      } catch (filterError) {
        console.warn(`Metadata filter deletion failed: ${filterError.message}`);
        
        // Method 2: Query-then-delete approach with improved batch handling
        console.log(`🔄 Falling back to query-then-delete approach...`);
        
        try {
          // First, get count of vectors to delete
          let allVectorIds: string[] = [];
          let hasMore = true;
          let queryVector = new Array(this.indexDimension).fill(0);
          
          // Query in chunks to get all vector IDs
          while (hasMore && allVectorIds.length < 10000) { // Safety limit
            const queryResponse = await index.query({
              vector: queryVector,
              topK: 1000, // Smaller batch for querying
              includeMetadata: true,
              filter: {
                projectId: { $eq: projectId }
              }
            });

            if (!queryResponse.matches || queryResponse.matches.length === 0) {
              hasMore = false;
              break;
            }

            const batchIds = queryResponse.matches.map(match => match.id);
            allVectorIds.push(...batchIds);
            
            // If we got less than requested, we're done
            if (queryResponse.matches.length < 1000) {
              hasMore = false;
            }
          }

          if (allVectorIds.length === 0) {
            console.log(`No vectors found for project ${projectId}`);
            return { deleted: 0, success: true };
          }

          console.log(`Found ${allVectorIds.length} vectors to delete for project ${projectId}`);

          // Delete by IDs in smaller batches to avoid the "illegal condition" error
          let totalDeleted = 0;
          let failedBatches = 0;
          const batchSize = 50; // Reduced batch size to avoid API limits

          for (let i = 0; i < allVectorIds.length; i += batchSize) {
            const batch = allVectorIds.slice(i, i + batchSize);
            
            try {
              // Use the correct deleteMany syntax for IDs
              await index.deleteMany(batch);
              
              totalDeleted += batch.length;
              console.log(`✅ Deleted batch of ${batch.length} vectors (${totalDeleted}/${allVectorIds.length})`);
              
              // Longer delay between batches to avoid rate limiting
              if (i + batchSize < allVectorIds.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (batchError) {
              failedBatches++;
              console.error(`❌ Failed to delete batch ${Math.floor(i/batchSize) + 1}: ${batchError.message}`);
              
              // If too many batches fail, stop and throw error
              if (failedBatches > 3) {
                throw new Error(`Too many batch deletions failed (${failedBatches}). Stopping deletion process.`);
              }
            }
          }

          if (failedBatches > 0) {
            console.warn(`⚠️ Completed with ${failedBatches} failed batches. ${totalDeleted}/${allVectorIds.length} vectors deleted.`);
          } else {
            console.log(`✨ Successfully deleted ${totalDeleted} vectors for project ${projectId}`);
          }
          
          const success = totalDeleted > 0 && failedBatches === 0;
          return { deleted: totalDeleted, success };
          
        } catch (queryError) {
          console.error(`❌ Query-then-delete approach failed: ${queryError.message}`);
          throw new Error(`Failed to delete vectors using query-then-delete method: ${queryError.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to delete vectors:`, error);
      throw new BadRequestException(`Failed to delete vectors for project ${projectId}: ${error.message}`);
    }
  }

}