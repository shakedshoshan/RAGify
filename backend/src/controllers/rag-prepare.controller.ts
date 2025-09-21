import { 
  Controller, 
  Post, 
  Param, 
  Body,
  HttpException, 
  HttpStatus
} from '@nestjs/common';
import { KafkaService } from '@toxicoder/nestjs-kafka';
import { ChunkingService } from '../services/chunking.service';
import { EmbeddingService } from '../services/embedding.service';
import { PineconeService } from '../services/pinecone.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('rag')
export class RagPrepareController {
  constructor(
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
    private readonly pineconeService: PineconeService,
    private readonly kafkaService: KafkaService,
  ) {}

  /**
   * Safely publish message to Kafka topic
   */
  private async safePublishToKafka(topic: string, message: any): Promise<void> {
    try {
      await this.kafkaService.send({
        topic,
        messages: {
          key: message.projectId || 'default',
          value: message,
        },
      });
      console.log(`✅ Successfully published to ${topic}:`, message);
    } catch (error) {
      console.error(`❌ Failed to publish to ${topic}:`, error.message);
      // Don't throw error - continue with the main flow
    }
  }

  /**
   * Prepare RAG system for a project - complete pipeline
   * This endpoint triggers the entire flow:
   * 1. Chunk documents
   * 2. Generate embeddings
   * 3. Store in Pinecone
   */
  @Post('prepare/:projectId')
  async prepareRag(
    @Param('projectId') projectId: string,
    @Body() params?: {
      chunkSize?: number;
      chunkOverlap?: number;
      chunkingStrategy?: 'semantic' | 'fixed' | 'hybrid';
      modelName?: string;
    }
  ) {
    try {
      const {
        chunkSize,
        chunkOverlap,
        chunkingStrategy = 'semantic',
        modelName = 'text-embedding-3-small'
      } = params || {};

      // Step 1: Chunk documents
      console.log(`🚀 Starting RAG preparation for project: ${projectId}`);
      
      const chunkingResult = await this.chunkingService.chunkProjectTexts(
        projectId,
        { chunkSize, chunkOverlap, chunkingStrategy },
        true // delete existing chunks
      );

      // Publish chunking completion event
      await this.safePublishToKafka('documents-chunked', {
        projectId,
        processedTexts: chunkingResult.processedTexts,
        totalChunks: chunkingResult.totalChunks,
        chunkingStrategy: chunkingResult.chunkingStrategy,
        timestamp: new Date().toISOString(),
      });

      if (!chunkingResult.totalChunks || chunkingResult.totalChunks === 0) {
        throw new HttpException(
          {
            success: false,
            message: 'No chunks were created. Please check if documents exist for this project.',
          },
          HttpStatus.BAD_REQUEST
        );
      }

      // Step 2: Delete existing vectors from Pinecone
      console.log(`🗑️ Deleting existing vectors for project ${projectId}...`);
      const deleteResult = await this.pineconeService.deleteVectorsByProjectId(projectId);
      
      // Check if deletion was successful
      if (!deleteResult.success && deleteResult.deleted > 0) {
        const errorMessage = `Vector deletion partially failed. Only ${deleteResult.deleted} vectors were deleted. Cannot proceed with RAG preparation to avoid data inconsistency.`;
        console.error(`❌ ${errorMessage}`);
        
        // Publish failure event
        await this.safePublishToKafka('embeddings-ingested', {
          projectId,
          vectorCount: 0,
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
        
        throw new HttpException(
          {
            success: false,
            message: errorMessage,
            details: {
              deletionAttempted: true,
              partiallyDeleted: deleteResult.deleted,
              deletionSuccess: deleteResult.success
            }
          },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      
      console.log(`✨ Successfully handled vector deletion: ${deleteResult.deleted === 0 ? 'No existing vectors found' : `Deleted ${deleteResult.deleted} existing vectors`}`);

      // Step 3: Get chunks and generate embeddings
      console.log(`📊 Generating embeddings for ${chunkingResult.totalChunks} chunks...`);
      const chunks = await this.embeddingService.getChunksByProjectId(projectId);
      
      const embeddings = await this.embeddingService.generateEmbeddings(
        chunks.map(chunk => chunk.content),
        modelName
      );

      // Publish embedding generation completion event
      await this.safePublishToKafka('chunks-embedded', {
        projectId,
        processedChunks: chunks.length,
        totalEmbeddings: embeddings.length,
        modelUsed: modelName,
        dimensions: embeddings[0]?.length || 512,
        timestamp: new Date().toISOString(),
      });

      // Step 4: Prepare vectors and store in Pinecone
      console.log(`🗄️ Storing ${embeddings.length} vectors in Pinecone...`);
      const vectors = chunks.map((chunk, index) => ({
        id: chunk.id || uuidv4(),
        values: embeddings[index],
        metadata: {
          content: chunk.content,
          source: chunk.sourceName || chunk.sourceId || projectId,
          projectId, // Store projectId directly in metadata
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
        }
      }));

      // Store vectors in Pinecone
      const pineconeResult = await this.pineconeService.batchUpsertVectors(
        projectId,
        vectors,
        100
      );

      // Publish final success event
      await this.safePublishToKafka('embeddings-ingested', {
        projectId,
        vectorCount: pineconeResult.totalUpserted,
        success: true,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ RAG preparation completed successfully for project: ${projectId}`);

      return {
        success: true,
        message: `RAG system prepared successfully. ${deleteResult.deleted > 0 ? `Deleted ${deleteResult.deleted} existing vectors. ` : 'No existing vectors found. '}Added ${pineconeResult.totalUpserted} new vectors.`,
        data: {
          projectId,
          processedTexts: chunkingResult.processedTexts,
          totalChunks: chunkingResult.totalChunks,
          chunkingStrategy: chunkingResult.chunkingStrategy,
          embeddingsGenerated: embeddings.length,
          vectorsStored: pineconeResult.totalUpserted,
          deletedVectors: deleteResult.deleted,
          deletionSuccess: deleteResult.success,
          modelUsed: modelName,
          dimensions: embeddings[0]?.length || 512,
        },
      };
    } catch (error) {
      console.error('❌ RAG preparation failed:', error);
      
      // Publish failure event safely
      await this.safePublishToKafka('embeddings-ingested', {
        projectId,
        vectorCount: 0,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to prepare RAG system',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
