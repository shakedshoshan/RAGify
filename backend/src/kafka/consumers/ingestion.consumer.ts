import { Injectable, Logger } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { KafkaTopics } from '../topics/kafka-topics.enum';
import { KafkaEvent } from '../events/kafka-event.interface';
import { EmbeddingsIngestedEventDto } from '../dto/kafka-event.dto';
import { KafkaConsumerService } from './kafka-consumer.service';
import { ChunkingService } from '../../services/chunking.service';
import { KafkaProducerService } from '../producers/kafka-producer.service';
import { KafkaErrorHandler } from '../error-handler/kafka-error.handler';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class IngestionConsumer implements OnModuleInit {
  private readonly logger = new Logger(IngestionConsumer.name);
  private readonly processedEvents = new Set<string>();

  constructor(
    private readonly kafkaConsumerService: KafkaConsumerService,
    private readonly chunkingService: ChunkingService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly kafkaErrorHandler: KafkaErrorHandler,
  ) {}

  async onModuleInit() {
    // Register handler for EMBEDDINGS_INGESTED events
    this.kafkaConsumerService.registerHandler(KafkaTopics.EMBEDDINGS_INGESTED, {
      handle: async (event: KafkaEvent<EmbeddingsIngestedEventDto>) => {
        this.logger.log(`📨 Received EMBEDDINGS_INGESTED event for project ${event.value.projectId}`);
        await this.handleEmbeddingsIngested(event);
      }
    });
    
    this.logger.log('✅ Ingestion consumer initialized');
  }

  /**
   * Handle embeddings ingested event and clean up temporary chunks
   */
  private async handleEmbeddingsIngested(event: KafkaEvent<EmbeddingsIngestedEventDto>): Promise<void> {
    const { projectId, success, vectorCount, error, correlationId } = event.value;
    
    // Prevent processing the same event multiple times
    const eventKey = `${projectId}-${correlationId}`;
    if (this.processedEvents.has(eventKey)) {
      this.logger.warn(`⚠️ Event already processed for project ${projectId}, correlationId: ${correlationId}`);
      return;
    }
    this.processedEvents.add(eventKey);
    
    try {
      this.logger.log(`📥 Processing ingested embeddings for project ${projectId}`);
      
      // Skip cleanup if ingestion failed
      if (!success) {
        this.logger.warn(`⚠️ Skipping chunk cleanup due to failed ingestion: ${error}`);
        return;
      }
      
      // Skip cleanup if no vectors were stored
      if (!vectorCount || vectorCount === 0) {
        this.logger.warn(`⚠️ No vectors were stored for project ${projectId}, skipping chunk cleanup`);
        return;
      }
      
      // Delete chunks from Firebase after successful Pinecone storage
      this.logger.log(`🗑️ Deleting chunks from Firebase for project ${projectId}...`);
      
      let deletedChunksCount;
      try {
        deletedChunksCount = await this.chunkingService.deleteExistingChunks(projectId);
      } catch (deleteError) {
        // Try to recover with retry logic
        const shouldRetry = await this.kafkaErrorHandler.handleError(
          deleteError,
          projectId,
          'IngestionConsumer',
          'deleteExistingChunks',
          'CHUNK_DELETION_ERROR',
          correlationId || uuidv4(),
          { maxRetries: 2 } // Custom retry config for deletion
        );
        
        if (shouldRetry) {
          // Retry the deletion
          deletedChunksCount = await this.chunkingService.deleteExistingChunks(projectId);
        } else {
          // Max retries reached, propagate the error
          throw deleteError;
        }
      }
      
      this.logger.log(`✨ Successfully deleted ${deletedChunksCount} chunks from Firebase`);
      
      // Log completion - no need to republish the event as it would create an infinite loop
      this.logger.log(`✅ Successfully completed RAG preparation for project ${projectId}`, {
        vectorCount,
        chunksDeleted: deletedChunksCount,
        correlationId: correlationId || uuidv4(),
        processingTime: Date.now()
      });
      
    } catch (error) {
      this.logger.error(`❌ Error cleaning up chunks for project ${projectId}`, error);
      
      // Publish error event
      await this.kafkaProducerService.publishProcessingError({
        projectId,
        timestamp: new Date().toISOString(),
        errorType: 'CHUNK_CLEANUP_ERROR',
        errorMessage: error.message,
        service: 'IngestionConsumer',
        operation: 'handleEmbeddingsIngested',
        correlationId: correlationId || uuidv4(),
        errorDetails: { error: error.stack }
      });
    }
  }
}
