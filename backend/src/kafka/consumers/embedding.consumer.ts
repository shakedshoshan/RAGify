import { Injectable, Logger } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { KafkaTopics } from '../topics/kafka-topics.enum';
import { KafkaEvent } from '../events/kafka-event.interface';
import { ChunksEmbeddedEventDto } from '../dto/kafka-event.dto';
import { KafkaConsumerService } from './kafka-consumer.service';
import { PineconeService } from '../../services/pinecone.service';
import { EmbeddingService } from '../../services/embedding.service';
import { KafkaProducerService } from '../producers/kafka-producer.service';
import { KafkaErrorHandler } from '../error-handler/kafka-error.handler';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmbeddingConsumer implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingConsumer.name);
  private readonly processedEvents = new Set<string>();

  constructor(
    private readonly kafkaConsumerService: KafkaConsumerService,
    private readonly pineconeService: PineconeService,
    private readonly embeddingService: EmbeddingService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly kafkaErrorHandler: KafkaErrorHandler,
  ) {}

  async onModuleInit() {
    // Register handler for CHUNKS_EMBEDDED events
    this.kafkaConsumerService.registerHandler(KafkaTopics.CHUNKS_EMBEDDED, {
      handle: async (event: KafkaEvent<ChunksEmbeddedEventDto>) => {
        this.logger.log(`📨 Received CHUNKS_EMBEDDED event for project ${event.value.projectId}`);
        await this.handleChunksEmbedded(event);
      }
    });
    
    this.logger.log('✅ Embedding consumer initialized');
  }

  /**
   * Handle chunks embedded event and proceed with vector storage
   */
  private async handleChunksEmbedded(event: KafkaEvent<ChunksEmbeddedEventDto>): Promise<void> {
    const { projectId, totalEmbeddings, modelUsed, correlationId, metadata } = event.value;
    
    // Prevent processing the same event multiple times
    const eventKey = `${projectId}-${correlationId}`;
    if (this.processedEvents.has(eventKey)) {
      this.logger.warn(`⚠️ Event already processed for project ${projectId}, correlationId: ${correlationId}`);
      return;
    }
    this.processedEvents.add(eventKey);
    
    try {
      this.logger.log(`🔗 Processing embedded chunks for project ${projectId}`);
      
      // Skip processing if no embeddings were created
      if (!totalEmbeddings || totalEmbeddings === 0) {
        this.logger.warn(`⚠️ No embeddings to process for project ${projectId}`);
        return;
      }
      
      // Get embeddings and chunks from event metadata
      const embeddings = metadata?.embeddings;
      const chunks = metadata?.chunks;
      
      if (!embeddings || !chunks || embeddings.length === 0 || chunks.length === 0) {
        this.logger.error(`❌ No embeddings or chunks data found in event metadata for project ${projectId}`);
        
        // Publish error event
        await this.kafkaProducerService.publishProcessingError({
          projectId,
          timestamp: new Date().toISOString(),
          errorType: 'EMBEDDINGS_DATA_MISSING',
          errorMessage: `No embeddings or chunks data found in event metadata for project ${projectId}`,
          service: 'EmbeddingConsumer',
          operation: 'handleChunksEmbedded',
          correlationId: correlationId || uuidv4()
        });
        
        return;
      }
      
      // Step 1: Delete existing vectors from Pinecone
      this.logger.log(`🗑️ Deleting existing vectors for project ${projectId}...`);
      const deleteResult = await this.pineconeService.deleteVectorsByProjectId(projectId);
      
      // Check if deletion was successful
      if (!deleteResult.success && deleteResult.deleted > 0) {
        const errorMessage = `Vector deletion partially failed. Only ${deleteResult.deleted} vectors were deleted. Cannot proceed with vector storage to avoid data inconsistency.`;
        this.logger.error(`❌ ${errorMessage}`);
        
        // Publish failure event
        await this.kafkaProducerService.publishEmbeddingsIngested({
          projectId,
          timestamp: new Date().toISOString(),
          vectorCount: 0,
          success: false,
          error: errorMessage,
          correlationId: correlationId || uuidv4(),
          metadata: {
            processingTime: Date.now(),
            deletedVectors: deleteResult.deleted
          }
        });
        
        return;
      }
      
      this.logger.log(`✨ Successfully handled vector deletion: ${deleteResult.deleted === 0 ? 'No existing vectors found' : `Deleted ${deleteResult.deleted} existing vectors`}`);
      
      // Step 2: Prepare vectors and store in Pinecone
      this.logger.log(`🗄️ Storing ${embeddings.length} vectors in Pinecone...`);
      
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
      
      // Store vectors in Pinecone with retry logic
      let pineconeResult;
      try {
        pineconeResult = await this.pineconeService.batchUpsertVectors(
          projectId,
          vectors,
          100
        );
      } catch (pineconeError) {
        // Try to recover with retry logic
        const shouldRetry = await this.kafkaErrorHandler.handleError(
          pineconeError,
          projectId,
          'EmbeddingConsumer',
          'batchUpsertVectors',
          'PINECONE_UPSERT_ERROR',
          correlationId || uuidv4(),
          { maxRetries: 3, initialDelayMs: 2000 } // Custom retry config for Pinecone
        );
        
        if (shouldRetry) {
          // Retry the vector storage
          pineconeResult = await this.pineconeService.batchUpsertVectors(
            projectId,
            vectors,
            100
          );
        } else {
          // Max retries reached, propagate the error
          throw pineconeError;
        }
      }
      
      // Publish embeddings ingested event
      await this.kafkaProducerService.publishEmbeddingsIngested({
        projectId,
        timestamp: new Date().toISOString(),
        vectorCount: pineconeResult.totalUpserted,
        success: true,
        correlationId: correlationId || uuidv4(),
        metadata: {
          processingTime: Date.now(),
          pineconeIndex: 'ragify-vectors',
          deletedVectors: deleteResult.deleted
        }
      });
      
      this.logger.log(`✅ Successfully stored vectors in Pinecone for project ${projectId}`);
      
    } catch (error) {
      this.logger.error(`❌ Error processing embedded chunks for project ${projectId}`, error);
      
      // Publish error event
      await this.kafkaProducerService.publishProcessingError({
        projectId,
        timestamp: new Date().toISOString(),
        errorType: 'VECTOR_STORAGE_ERROR',
        errorMessage: error.message,
        service: 'EmbeddingConsumer',
        operation: 'handleChunksEmbedded',
        correlationId: correlationId || uuidv4(),
        errorDetails: { error: error.stack }
      });
      
      // Log failure - no need to republish the event as it would create an infinite loop
      this.logger.error(`❌ Failed to process embedded chunks for project ${projectId}`, {
        error: error.message,
        correlationId: correlationId || uuidv4(),
        processingTime: Date.now()
      });
    }
  }
}
