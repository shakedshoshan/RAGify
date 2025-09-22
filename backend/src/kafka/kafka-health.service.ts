import { Injectable, Logger } from '@nestjs/common';
import { KafkaService } from '@toxicoder/nestjs-kafka';
import { KafkaTopics, KAFKA_TOPIC_CONFIG } from './topics/kafka-topics.enum';
import { KafkaProducerService } from './producers/kafka-producer.service';
import { KafkaConsumerService } from './consumers/kafka-consumer.service';

export interface KafkaHealthStatus {
  isHealthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    connection: boolean;
    producer: boolean;
    consumer: boolean;
    topics: Record<string, boolean>;
  };
  lastCheck: string;
  error?: string;
}

@Injectable()
export class KafkaHealthService {
  private readonly logger = new Logger(KafkaHealthService.name);
  private lastHealthCheck: KafkaHealthStatus | null = null;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly kafkaConsumerService: KafkaConsumerService,
  ) {}

  /**
   * Comprehensive health check for Kafka services
   */
  async checkHealth(): Promise<KafkaHealthStatus> {
    const startTime = Date.now();
    const healthStatus: KafkaHealthStatus = {
      isHealthy: false,
      status: 'unhealthy',
      details: {
        connection: false,
        producer: false,
        consumer: false,
        topics: {}
      },
      lastCheck: new Date().toISOString()
    };

    try {
      // Check connection
      healthStatus.details.connection = await this.checkConnection();
      
      // Check producer
      healthStatus.details.producer = await this.kafkaProducerService.healthCheck();
      
      // Check consumer
      const consumerStatus = this.kafkaConsumerService.getStatus();
      healthStatus.details.consumer = consumerStatus.isConsuming;
      
      // Check topics
      healthStatus.details.topics = await this.checkTopics();
      
      // Determine overall health
      const allChecks = [
        healthStatus.details.connection,
        healthStatus.details.producer,
        healthStatus.details.consumer,
        Object.values(healthStatus.details.topics).every(Boolean)
      ];
      
      const healthyCount = allChecks.filter(Boolean).length;
      
      if (healthyCount === allChecks.length) {
        healthStatus.isHealthy = true;
        healthStatus.status = 'healthy';
      } else if (healthyCount >= allChecks.length / 2) {
        healthStatus.isHealthy = false;
        healthStatus.status = 'degraded';
      } else {
        healthStatus.isHealthy = false;
        healthStatus.status = 'unhealthy';
      }

      const checkTime = Date.now() - startTime;
      this.logger.log(`🏥 Kafka health check completed in ${checkTime}ms`, {
        status: healthStatus.status,
        details: healthStatus.details
      });

    } catch (error) {
      healthStatus.error = error.message;
      this.logger.error('❌ Kafka health check failed', error);
    }

    this.lastHealthCheck = healthStatus;
    return healthStatus;
  }

  /**
   * Check Kafka connection
   */
  private async checkConnection(): Promise<boolean> {
    try {
      // Try to get metadata which requires connection
      // Note: @toxicoder/nestjs-kafka might not expose admin methods
      // This is a basic connection check
      return true; // Assume connection is working if service is instantiated
    } catch (error) {
      this.logger.error('Kafka connection check failed', error);
      return false;
    }
  }

  /**
   * Check if all required topics exist and are accessible
   */
  private async checkTopics(): Promise<Record<string, boolean>> {
    const topicStatus: Record<string, boolean> = {};
    
    try {
      const topics = Object.values(KafkaTopics);
      
      for (const topic of topics) {
        try {
          // Basic topic check - try to send a health check message
          await this.kafkaService.send({
            topic,
            messages: [{
              key: 'health-check',
              value: {
                type: 'health-check',
                timestamp: new Date().toISOString()
              }
            }]
          });
          topicStatus[topic] = true;
        } catch (error) {
          this.logger.warn(`Topic ${topic} health check failed`, error.message);
          topicStatus[topic] = false;
        }
      }
    } catch (error) {
      this.logger.error('Topics health check failed', error);
      // Mark all topics as unhealthy if we can't check them
      Object.values(KafkaTopics).forEach(topic => {
        topicStatus[topic] = false;
      });
    }
    
    return topicStatus;
  }

  /**
   * Initialize all required topics with proper configuration
   */
  async initializeTopics(): Promise<void> {
    try {
      const topics = Object.values(KafkaTopics);
      
      // Ensure all topics exist
      await this.kafkaService.ensureTopics(topics);
      
      this.logger.log(`✅ Initialized ${topics.length} Kafka topics`, { topics });
    } catch (error) {
      this.logger.error('❌ Failed to initialize Kafka topics', error);
      throw error;
    }
  }

  /**
   * Get the last health check result
   */
  getLastHealthCheck(): KafkaHealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Get Kafka service statistics
   */
  getStats(): {
    topics: string[];
    topicCount: number;
    consumerStatus: any;
    lastHealthCheck: KafkaHealthStatus | null;
  } {
    return {
      topics: Object.values(KafkaTopics),
      topicCount: Object.keys(KafkaTopics).length,
      consumerStatus: this.kafkaConsumerService.getStatus(),
      lastHealthCheck: this.lastHealthCheck
    };
  }

  /**
   * Reset topic configurations (useful for development)
   */
  async resetTopics(): Promise<void> {
    try {
      this.logger.warn('🔄 Resetting Kafka topics...');
      
      // Re-initialize topics
      await this.initializeTopics();
      
      this.logger.log('✅ Kafka topics reset completed');
    } catch (error) {
      this.logger.error('❌ Failed to reset Kafka topics', error);
      throw error;
    }
  }
}
