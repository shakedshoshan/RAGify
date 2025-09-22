import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { KafkaService } from '@toxicoder/nestjs-kafka';
import { KafkaTopics } from '../topics/kafka-topics.enum';
import { EventHandler, KafkaEvent, EventProcessingResult } from '../events/kafka-event.interface';
import {
  DocumentsChunkedEventDto,
  ChunksEmbeddedEventDto,
  EmbeddingsIngestedEventDto,
  QueryReceivedEventDto,
  ContextRetrievedEventDto,
  ResponseGeneratedEventDto,
  ProcessingErrorEventDto,
  SystemMetricsEventDto
} from '../dto/kafka-event.dto';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly eventHandlers = new Map<KafkaTopics, EventHandler[]>();
  private isConsuming = false;

  constructor(private readonly kafkaService: KafkaService) {}

  async onModuleInit() {
    // Initialize consumers when module starts
    await this.initializeConsumers();
  }

  async onModuleDestroy() {
    // Gracefully shutdown consumers
    await this.shutdown();
  }

  /**
   * Initialize Kafka consumers for all topics
   */
  private async initializeConsumers(): Promise<void> {
    try {
      // Register default event handlers
      this.registerDefaultHandlers();

      // Start consuming from all topics
      await this.startConsumers();
      
      this.logger.log('✅ Kafka consumers initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Kafka consumers', error);
    }
  }

  /**
   * Register default event handlers for logging and monitoring
   */
  private registerDefaultHandlers(): void {
    // Documents Chunked Handler
    this.registerHandler(KafkaTopics.DOCUMENTS_CHUNKED, {
      handle: async (event: KafkaEvent<DocumentsChunkedEventDto>) => {
        this.logger.log(`📄 Documents chunked for project ${event.value.projectId}`, {
          totalChunks: event.value.totalChunks,
          strategy: event.value.chunkingStrategy
        });
      }
    });

    // Chunks Embedded Handler
    this.registerHandler(KafkaTopics.CHUNKS_EMBEDDED, {
      handle: async (event: KafkaEvent<ChunksEmbeddedEventDto>) => {
        this.logger.log(`🔗 Chunks embedded for project ${event.value.projectId}`, {
          totalEmbeddings: event.value.totalEmbeddings,
          model: event.value.modelUsed
        });
      }
    });

    // Embeddings Ingested Handler
    this.registerHandler(KafkaTopics.EMBEDDINGS_INGESTED, {
      handle: async (event: KafkaEvent<EmbeddingsIngestedEventDto>) => {
        if (event.value.success) {
          this.logger.log(`✅ Embeddings ingested for project ${event.value.projectId}`, {
            vectorCount: event.value.vectorCount
          });
        } else {
          this.logger.error(`❌ Embeddings ingestion failed for project ${event.value.projectId}`, {
            error: event.value.error
          });
        }
      }
    });

    // Query Received Handler
    this.registerHandler(KafkaTopics.QUERIES_RECEIVED, {
      handle: async (event: KafkaEvent<QueryReceivedEventDto>) => {
        this.logger.log(`❓ Query received for project ${event.value.projectId}`, {
          queryLength: event.value.query.length,
          correlationId: event.value.correlationId
        });
      }
    });

    // Context Retrieved Handler
    this.registerHandler(KafkaTopics.CONTEXTS_RETRIEVED, {
      handle: async (event: KafkaEvent<ContextRetrievedEventDto>) => {
        this.logger.log(`📋 Context retrieved for project ${event.value.projectId}`, {
          contextLength: event.value.context.length,
          correlationId: event.value.correlationId
        });
      }
    });

    // Response Generated Handler
    this.registerHandler(KafkaTopics.RESPONSES_GENERATED, {
      handle: async (event: KafkaEvent<ResponseGeneratedEventDto>) => {
        this.logger.log(`💬 Response generated for project ${event.value.projectId}`, {
          answerLength: event.value.answer.length,
          correlationId: event.value.correlationId
        });
      }
    });

    // Processing Error Handler
    this.registerHandler(KafkaTopics.PROCESSING_ERRORS, {
      handle: async (event: KafkaEvent<ProcessingErrorEventDto>) => {
        this.logger.error(`🚨 Processing error in ${event.value.service}`, {
          errorType: event.value.errorType,
          operation: event.value.operation,
          message: event.value.errorMessage,
          projectId: event.value.projectId
        });
      }
    });

    // System Metrics Handler
    this.registerHandler(KafkaTopics.SYSTEM_METRICS, {
      handle: async (event: KafkaEvent<SystemMetricsEventDto>) => {
        this.logger.debug(`📊 System metrics for project ${event.value.projectId}`, {
          metricType: event.value.metricType,
          service: event.value.service,
          metrics: event.value.metrics
        });
      }
    });
  }

  /**
   * Start consuming from all registered topics
   */
  private async startConsumers(): Promise<void> {
    if (this.isConsuming) {
      this.logger.warn('Consumers are already running');
      return;
    }

    try {
      // Note: @toxicoder/nestjs-kafka might not support direct consumer subscription
      // This is a placeholder implementation for consumer functionality
      // In a real implementation, you would need to use the appropriate consumer API
      
      this.isConsuming = true;
      const topics = Array.from(this.eventHandlers.keys());
      this.logger.log(`🎧 Consumer service initialized for ${topics.length} topics: ${topics.join(', ')}`);
      this.logger.warn('⚠️ Consumer implementation needs to be completed based on @toxicoder/nestjs-kafka API');
    } catch (error) {
      this.logger.error('Failed to start Kafka consumers', error);
      throw error;
    }
  }

  /**
   * Process incoming Kafka message
   */
  private async processMessage(topic: KafkaTopics, message: any): Promise<void> {
    const startTime = Date.now();
    let processingResult: EventProcessingResult = { success: true };

    try {
      const handlers = this.eventHandlers.get(topic) || [];
      
      if (handlers.length === 0) {
        this.logger.warn(`No handlers registered for topic: ${topic}`);
        return;
      }

      // Process message with all registered handlers
      const event: KafkaEvent = {
        key: message.key?.toString() || 'unknown',
        value: JSON.parse(message.value.toString()),
        partition: message.partition,
        timestamp: message.timestamp
      };

      await Promise.all(
        handlers.map(handler => handler.handle(event))
      );

      processingResult.processingTime = Date.now() - startTime;
      this.logger.debug(`✅ Processed message from ${topic}`, {
        key: event.key,
        processingTime: processingResult.processingTime
      });

    } catch (error) {
      processingResult = {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };

      this.logger.error(`❌ Failed to process message from ${topic}`, {
        error: error.message,
        processingTime: processingResult.processingTime
      });
    }
  }

  /**
   * Register an event handler for a specific topic
   */
  registerHandler(topic: KafkaTopics, handler: EventHandler): void {
    if (!this.eventHandlers.has(topic)) {
      this.eventHandlers.set(topic, []);
    }
    
    this.eventHandlers.get(topic)!.push(handler);
    this.logger.log(`📝 Registered handler for topic: ${topic}`);
  }

  /**
   * Unregister an event handler for a specific topic
   */
  unregisterHandler(topic: KafkaTopics, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(topic);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.logger.log(`🗑️ Unregistered handler for topic: ${topic}`);
      }
    }
  }

  /**
   * Get all registered handlers for a topic
   */
  getHandlers(topic: KafkaTopics): EventHandler[] {
    return this.eventHandlers.get(topic) || [];
  }

  /**
   * Get consumer status
   */
  getStatus(): { isConsuming: boolean; topics: string[]; handlerCount: number } {
    return {
      isConsuming: this.isConsuming,
      topics: Array.from(this.eventHandlers.keys()),
      handlerCount: Array.from(this.eventHandlers.values()).reduce((sum, handlers) => sum + handlers.length, 0)
    };
  }

  /**
   * Gracefully shutdown all consumers
   */
  async shutdown(): Promise<void> {
    try {
      if (this.isConsuming) {
        // Note: @toxicoder/nestjs-kafka doesn't provide explicit disconnect method
        // The service will be automatically cleaned up by NestJS
        this.isConsuming = false;
        this.logger.log('🛑 Kafka consumers shutdown completed');
      }
    } catch (error) {
      this.logger.error('Error during Kafka consumer shutdown', error);
    }
  }
}
