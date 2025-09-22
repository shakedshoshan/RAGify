import { Injectable, Logger } from '@nestjs/common';
import { OnModuleInit } from '@nestjs/common';
import { KafkaTopics } from '../topics/kafka-topics.enum';
import { KafkaEvent } from '../events/kafka-event.interface';
import { DocumentsChunkedEventDto } from '../dto/kafka-event.dto';
import { KafkaConsumerService } from './kafka-consumer.service';
import { ChunkingService } from '../../services/chunking.service';
import { EmbeddingService } from '../../services/embedding.service';
import { KafkaProducerService } from '../producers/kafka-producer.service';
import { KafkaErrorHandler } from '../error-handler/kafka-error.handler';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChunkingConsumer implements OnModuleInit {
  private readonly logger = new Logger(ChunkingConsumer.name);
  private readonly processedEvents = new Set<string>();

  constructor(
    private readonly kafkaConsumerService: KafkaConsumerService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly kafkaErrorHandler: KafkaErrorHandler,
  ) {}

  async onModuleInit() {
    // Register handler for DOCUMENTS_CHUNKED events
    this.kafkaConsumerService.registerHandler(KafkaTopics.DOCUMENTS_CHUNKED, {
      handle: async (event: KafkaEvent<DocumentsChunkedEventDto>) => {
        this.logger.log(`📨 Received DOCUMENTS_CHUNKED event for project ${event.value.projectId}`);
        await this.handleDocumentsChunked(event);
      }
    });
    
    this.logger.log('✅ Chunking consumer initialized');
  }

  /**
   * Handle documents chunked event and proceed with chunking + embedding generation
   */
  private async handleDocumentsChunked(event: KafkaEvent<DocumentsChunkedEventDto>): Promise<void> {
    const { projectId, correlationId, metadata } = event.value;
    const eventCorrelationId = correlationId || uuidv4();
    
    // Prevent processing the same event multiple times
    const eventKey = `${projectId}-${eventCorrelationId}`;
    if (this.processedEvents.has(eventKey)) {
      this.logger.warn(`⚠️ Event already processed for project ${projectId}, correlationId: ${eventCorrelationId}`);
      return;
    }
    this.processedEvents.add(eventKey);
    
    try {
      this.logger.log(`📄 Processing documents for project ${projectId}`);
      
      // Extract chunking parameters from metadata
      const chunkSize = metadata?.chunkSize;
      const chunkOverlap = metadata?.chunkOverlap;
      const chunkingStrategy = event.value.chunkingStrategy || 'semantic';
      
      // Step 1: Chunk documents
      this.logger.log(`🔪 Chunking documents for project ${projectId}...`);
      
      const chunkingResult = await this.chunkingService.chunkProjectTexts(
        projectId,
        { chunkSize, chunkOverlap, chunkingStrategy },
        true // delete existing chunks
      );

      if (!chunkingResult.totalChunks || chunkingResult.totalChunks === 0) {
        this.logger.warn(`⚠️ No chunks were created for project ${projectId}`);
        
        // Publish error event
        await this.kafkaProducerService.publishProcessingError({
          projectId,
          timestamp: new Date().toISOString(),
          errorType: 'NO_CHUNKS_CREATED',
          errorMessage: `No chunks were created for project ${projectId}. Please check if documents exist.`,
          service: 'ChunkingConsumer',
          operation: 'handleDocumentsChunked',
          correlationId: eventCorrelationId
        });
        
        return;
      }
      
      // Step 2: Get chunks from database
      const chunks = await this.embeddingService.getChunksByProjectId(projectId);
      
      if (!chunks || chunks.length === 0) {
        this.logger.error(`❌ No chunks found for project ${projectId} after chunking`);
        
        // Publish error event
        await this.kafkaProducerService.publishProcessingError({
          projectId,
          timestamp: new Date().toISOString(),
          errorType: 'CHUNKS_NOT_FOUND',
          errorMessage: `No chunks found for project ${projectId} after chunking`,
          service: 'ChunkingConsumer',
          operation: 'handleDocumentsChunked',
          correlationId: eventCorrelationId
        });
        
        return;
      }
      
      // Generate embeddings (use model from metadata or default)
      const modelName = metadata?.modelName || 'text-embedding-3-small';
      
      this.logger.log(`📊 Generating embeddings for ${chunks.length} chunks using ${modelName}...`);
      
      let embeddings;
      try {
        embeddings = await this.embeddingService.generateEmbeddings(
          chunks.map(chunk => chunk.content),
          modelName
        );
      } catch (embeddingError) {
        // Try to recover with retry logic
        const shouldRetry = await this.kafkaErrorHandler.handleError(
          embeddingError,
          projectId,
          'ChunkingConsumer',
          'generateEmbeddings',
          'EMBEDDING_GENERATION_ERROR',
          eventCorrelationId
        );
        
        if (shouldRetry) {
          // Retry the embedding generation
          embeddings = await this.embeddingService.generateEmbeddings(
            chunks.map(chunk => chunk.content),
            modelName
          );
        } else {
          // Max retries reached, propagate the error
          throw embeddingError;
        }
      }
      
      // Publish chunks embedded event with embeddings data
      await this.kafkaProducerService.publishChunksEmbedded({
        projectId,
        timestamp: new Date().toISOString(),
        processedChunks: chunks.length,
        totalEmbeddings: embeddings.length,
        modelUsed: modelName,
        dimensions: embeddings[0]?.length || 512,
        correlationId: eventCorrelationId,
        metadata: {
          processingTime: Date.now(),
          tokenCount: chunks.reduce((sum, chunk) => sum + chunk.content.length, 0),
          // Include embeddings and chunks data for direct processing
          embeddings: embeddings,
          chunks: chunks.map(chunk => ({
            id: chunk.id,
            content: chunk.content,
            sourceName: chunk.sourceName || chunk.sourceId || projectId,
            chunkIndex: chunk.chunkIndex,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex
          }))
        }
      });
      
      this.logger.log(`✅ Successfully processed chunked documents for project ${projectId}`);
      
    } catch (error) {
      this.logger.error(`❌ Error processing chunked documents for project ${projectId}`, error);
      
      // Publish error event
      await this.kafkaProducerService.publishProcessingError({
        projectId,
        timestamp: new Date().toISOString(),
        errorType: 'EMBEDDING_GENERATION_ERROR',
        errorMessage: error.message,
        service: 'ChunkingConsumer',
        operation: 'handleDocumentsChunked',
        correlationId: eventCorrelationId,
        errorDetails: { error: error.stack }
      });
    }
  }
}
