import { 
  Controller, 
  Post, 
  Get,
  Param, 
  Body,
  HttpException, 
  HttpStatus,
  Logger
} from '@nestjs/common';
import { ChunkingService } from '../services/chunking.service';
import { KafkaProducerService } from '../kafka/producers/kafka-producer.service';
import { FirestoreService } from '../services/firestore.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('rag')
export class RagPrepareController {
  private readonly logger = new Logger(RagPrepareController.name);

  constructor(
    private readonly chunkingService: ChunkingService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly firestoreService: FirestoreService,
  ) {}


  /**
   * Prepare RAG system for a project - Kafka-based pipeline
   * This endpoint initiates the RAG preparation flow by:
   * 1. Publishing a DOCUMENTS_CHUNKED event
   * 
   * The flow is handled by Kafka consumers:
   * - ChunkingConsumer listens for DOCUMENTS_CHUNKED events and chunks documents + generates embeddings
   * - EmbeddingConsumer listens for CHUNKS_EMBEDDED events and stores vectors in Pinecone
   * - IngestionConsumer listens for EMBEDDINGS_INGESTED events and cleans up temporary chunks
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

      const correlationId = uuidv4();

      this.logger.log(`🚀 Starting RAG preparation for project: ${projectId}`);
      
      // Publish chunking initiation event to trigger the entire flow
      await this.kafkaProducerService.publishDocumentsChunked({
        projectId,
        timestamp: new Date().toISOString(),
        processedTexts: 0, // Will be updated by ChunkingConsumer
        totalChunks: 0, // Will be updated by ChunkingConsumer
        chunkingStrategy: chunkingStrategy as 'semantic' | 'fixed' | 'hybrid',
        correlationId,
        metadata: {
          processingTime: Date.now(),
          chunkSize,
          chunkOverlap,
          modelName
        }
      });

      this.logger.log(`✅ RAG preparation initiated for project: ${projectId}`);

      return {
        success: true,
        message: `RAG preparation initiated successfully. The system will process documents in the background.`,
        data: {
          projectId,
          correlationId,
          status: 'processing',
          chunkingStrategy,
          chunkSize,
          chunkOverlap,
          modelName
        },
      };
    } catch (error) {
      this.logger.error('❌ RAG preparation initiation failed:', error);
      
      // Publish failure event safely
      const correlationId = uuidv4();
      await this.kafkaProducerService.publishProcessingError({
        projectId,
        timestamp: new Date().toISOString(),
        errorType: 'RAG_PREPARATION_INIT_ERROR',
        errorMessage: error.message,
        service: 'RagPrepareController',
        operation: 'prepareRag',
        correlationId,
        errorDetails: { error: error.stack }
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to initiate RAG preparation',
          error: error.message,
          correlationId
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get RAG preparation status
   * This endpoint checks the status of RAG preparation for a project
   */
  @Get('status/:projectId/:correlationId')
  async getRagStatus(
    @Param('projectId') projectId: string,
    @Param('correlationId') correlationId: string
  ) {
    try {
      // In a real implementation, you would check the status of the RAG preparation
      // by querying a database or cache for events with this correlationId
      
      // For now, we'll just return a placeholder response
      return {
        success: true,
        message: 'RAG preparation status retrieved successfully',
        data: {
          projectId,
          correlationId,
          // This would be determined by checking which events have been processed
          currentStep: 'processing', // One of: processing, completed, failed
          progress: {
            chunking: true,
            embedding: false,
            vectorStorage: false,
            cleanup: false
          }
        }
      };
    } catch (error) {
      this.logger.error('❌ Failed to get RAG preparation status:', error);
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get RAG preparation status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Update project embedding status after RAG preparation is complete
   * This method should be called by the Kafka consumer after the RAG preparation is complete
   * @param projectId The project ID to update
   * @param numberOfDocs The number of documents that were embedded
   */
  async updateProjectAfterRagComplete(projectId: string, numberOfDocs: number) {
    try {
      this.logger.log(`Updating project ${projectId} after RAG preparation completed`);
      
      // Update the project in Firestore with embedding status
      const result = await this.firestoreService.updateProjectEmbeddingStatus(projectId, numberOfDocs);
      
      this.logger.log(`✅ Project ${projectId} updated successfully with embedding status`);
      
      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to update project ${projectId} after RAG preparation:`, error);
      
      // Publish failure event
      await this.kafkaProducerService.publishProcessingError({
        projectId,
        timestamp: new Date().toISOString(),
        errorType: 'PROJECT_UPDATE_ERROR',
        errorMessage: error.message,
        service: 'RagPrepareController',
        operation: 'updateProjectAfterRagComplete',
        correlationId: uuidv4(),
        errorDetails: { error: error.stack }
      });
      
      throw error;
    }
  }
}