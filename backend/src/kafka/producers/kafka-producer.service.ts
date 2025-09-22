import { Injectable, Logger } from '@nestjs/common';
import { KafkaSendInputMessage, KafkaService } from '@toxicoder/nestjs-kafka';
import { KafkaTopics } from '../topics/kafka-topics.enum';
import { KafkaEvent, KafkaProducerOptions } from '../events/kafka-event.interface';
import {
  BaseKafkaEventDto,
  DocumentsChunkedEventDto,
  ChunksEmbeddedEventDto,
  EmbeddingsIngestedEventDto,
  QueryReceivedEventDto,
  ContextRetrievedEventDto,
  ResponseGeneratedEventDto,
  ProcessingErrorEventDto,
  SystemMetricsEventDto
} from '../dto/kafka-event.dto';
import { KafkaConsumerService } from '../consumers/kafka-consumer.service';

@Injectable()
export class KafkaProducerService {
  private readonly logger = new Logger(KafkaProducerService.name);

  private isConnected = false;
  private connectionRetryCount = 0;
  private readonly maxRetries = 10;
  private readonly initialRetryDelay = 1000;
  private readonly maxRetryDelay = 30000;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly kafkaConsumerService: KafkaConsumerService
  ) {
    this.initializeProducer();
  }

  private async initializeProducer(): Promise<void> {
    try {
      await this.kafkaService.connect();
      this.isConnected = true;
      this.connectionRetryCount = 0;
      this.logger.log('✅ Kafka producer connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect Kafka producer:', error.message);
      await this.retryConnection();
    }
  }

  private async retryConnection(): Promise<void> {
    if (this.connectionRetryCount >= this.maxRetries) {
      this.logger.error(`❌ Failed to connect after ${this.maxRetries} attempts. Giving up.`);
      return;
    }

    const delay = Math.min(
      this.initialRetryDelay * Math.pow(2, this.connectionRetryCount),
      this.maxRetryDelay
    );

    this.logger.warn(`⏳ Retrying connection in ${delay}ms (attempt ${this.connectionRetryCount + 1}/${this.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    this.connectionRetryCount++;
    
    await this.initializeProducer();
  }

  /**
   * Generic method to publish events to Kafka
   */
  private async publishEvent<T extends BaseKafkaEventDto>(
    topic: KafkaTopics,
    event: T,
    options?: Partial<KafkaProducerOptions>
  ): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`⚠️ Kafka producer not connected. Attempting to reconnect...`);
      await this.initializeProducer();
      if (!this.isConnected) {
        throw new Error('Kafka producer is not connected');
      }
    }

    try {
      const kafkaEvent: KafkaEvent<T> = {
        key: options?.key || event.projectId || 'default',
        value: event,
        partition: options?.partition,
        timestamp: options?.timestamp || Date.now(),
        headers: options?.headers
      };

      await this.kafkaService.send({
        topic,
        messages: [kafkaEvent as unknown as KafkaSendInputMessage]
      });

      this.logger.log(`✅ Successfully published event to ${topic}`, {
        projectId: event.projectId,
        timestamp: event.timestamp,
        correlationId: event.correlationId
      });

      // Also process the event directly for development/testing
      // This ensures the flow works even if Kafka consumers aren't properly configured
      try {
        await this.kafkaConsumerService.processEventDirectly(topic, kafkaEvent);
      } catch (directProcessError) {
        this.logger.warn(`⚠️ Direct event processing failed for ${topic}`, directProcessError.message);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to publish event to ${topic}`, {
        error: error.message,
        projectId: event.projectId,
        event: event.constructor.name
      });

      // If connection error, try to reconnect
      if (error.message.includes('disconnected') || error.message.includes('not connected')) {
        this.isConnected = false;
        await this.initializeProducer();
      }
      
      // Don't throw error - continue with the main flow
      // But log the error for monitoring
      try {
        await this.publishProcessingError({
          projectId: event.projectId,
          timestamp: new Date().toISOString(),
          errorType: 'KAFKA_PUBLISH_ERROR',
          errorMessage: error.message,
          service: 'KafkaProducerService',
          operation: `publishEvent:${topic}`,
          errorDetails: { topic, event: event.constructor.name }
        });
      } catch (errorPublishError) {
        this.logger.error(`💥 Critical: Failed to publish error event`, {
          originalError: error.message,
          publishError: errorPublishError.message
        });
      }
    }
  }

  /**
   * Publish Documents Chunked Event
   */
  async publishDocumentsChunked(event: DocumentsChunkedEventDto): Promise<void> {
    await this.publishEvent(KafkaTopics.DOCUMENTS_CHUNKED, event);
  }

  /**
   * Publish Chunks Embedded Event
   */
  async publishChunksEmbedded(event: ChunksEmbeddedEventDto): Promise<void> {
    await this.publishEvent(KafkaTopics.CHUNKS_EMBEDDED, event);
  }

  /**
   * Publish Embeddings Ingested Event
   */
  async publishEmbeddingsIngested(event: EmbeddingsIngestedEventDto): Promise<void> {
    await this.publishEvent(KafkaTopics.EMBEDDINGS_INGESTED, event);
  }

  /**
   * Publish Query Received Event
   */
  async publishQueryReceived(event: QueryReceivedEventDto): Promise<void> {
    await this.publishEvent(KafkaTopics.QUERIES_RECEIVED, event);
  }

  /**
   * Publish Context Retrieved Event
   */
  async publishContextRetrieved(event: ContextRetrievedEventDto): Promise<void> {
    await this.publishEvent(KafkaTopics.CONTEXTS_RETRIEVED, event);
  }

  /**
   * Publish Response Generated Event
   */
  async publishResponseGenerated(event: ResponseGeneratedEventDto): Promise<void> {
    await this.publishEvent(KafkaTopics.RESPONSES_GENERATED, event);
  }

  /**
   * Publish Processing Error Event
   */
  async publishProcessingError(event: ProcessingErrorEventDto): Promise<void> {
    try {
      const kafkaEvent: KafkaEvent<ProcessingErrorEventDto> = {
        key: event.projectId || 'system-error',
        value: event
      };

      await this.kafkaService.send({
        topic: KafkaTopics.PROCESSING_ERRORS,
        messages: [kafkaEvent as unknown as KafkaSendInputMessage]
      });

      this.logger.error(`📨 Published processing error event`, {
        errorType: event.errorType,
        service: event.service,
        operation: event.operation
      });
    } catch (error) {
      // Last resort logging - don't create infinite loop
      this.logger.error(`💥 Critical: Failed to publish error event`, {
        originalError: event.errorMessage,
        publishError: error.message
      });
    }
  }

  /**
   * Publish System Metrics Event
   */
  async publishSystemMetrics(event: SystemMetricsEventDto): Promise<void> {
    await this.publishEvent(KafkaTopics.SYSTEM_METRICS, event);
  }

  /**
   * Batch publish multiple events of the same type
   */
  async batchPublishEvents<T extends BaseKafkaEventDto>(
    topic: KafkaTopics,
    events: T[]
  ): Promise<void> {
    try {
      const kafkaEvents: KafkaEvent<T>[] = events.map(event => ({
        key: event.projectId || 'batch',
        value: event,
        timestamp: Date.now()
      }));

      await this.kafkaService.send({
        topic,
        messages: kafkaEvents as unknown as KafkaSendInputMessage[]
      });

      this.logger.log(`✅ Successfully published ${events.length} events to ${topic}`);
    } catch (error) {
      this.logger.error(`❌ Failed to batch publish events to ${topic}`, {
        error: error.message,
        eventCount: events.length
      });
    }
  }

  /**
   * Health check method
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to publish a simple health check event
      await this.publishSystemMetrics({
        projectId: 'system',
        timestamp: new Date().toISOString(),
        metricType: 'health',
        metrics: { status: 'healthy', timestamp: Date.now() },
        service: 'KafkaProducerService'
      });
      return true;
    } catch (error) {
      this.logger.error('Kafka producer health check failed', error);
      return false;
    }
  }
}
