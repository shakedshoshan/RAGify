import { Injectable, Logger } from '@nestjs/common';
import { KafkaProducerService } from './producers/kafka-producer.service';
import { KafkaConsumerService } from './consumers/kafka-consumer.service';

@Injectable()
export class KafkaHealthService {
  private readonly logger = new Logger(KafkaHealthService.name);

  constructor(
    private readonly kafkaProducerService: KafkaProducerService,
    private readonly kafkaConsumerService: KafkaConsumerService,
  ) {}

  /**
   * Check Kafka producer health
   * @returns boolean indicating if producer is healthy
   */
  async checkProducerHealth(): Promise<boolean> {
    try {
      return await this.kafkaProducerService.healthCheck();
    } catch (error) {
      this.logger.error('Failed to check Kafka producer health', error);
      return false;
    }
  }

  /**
   * Check Kafka consumer health
   * @returns object with consumer health status
   */
  async checkConsumerHealth(): Promise<{
    isHealthy: boolean;
    isConsuming: boolean;
    topics: string[];
    handlerCount: number;
  }> {
    try {
      const status = this.kafkaConsumerService.getStatus();
      
      return {
        isHealthy: status.isConsuming && status.handlerCount > 0,
        isConsuming: status.isConsuming,
        topics: status.topics,
        handlerCount: status.handlerCount
      };
    } catch (error) {
      this.logger.error('Failed to check Kafka consumer health', error);
      
      return {
        isHealthy: false,
        isConsuming: false,
        topics: [],
        handlerCount: 0
      };
    }
  }

  /**
   * Check overall Kafka health
   * @returns health status object
   */
  async checkHealth(): Promise<{ isHealthy: boolean; status: string }> {
    const producerHealth = await this.checkProducerHealth();
    const consumerHealth = await this.checkConsumerHealth();
    const isHealthy = producerHealth && consumerHealth.isHealthy;
    
    return {
      isHealthy,
      status: isHealthy ? 'healthy' : 'unhealthy'
    };
  }
  
  /**
   * Initialize Kafka health monitoring
   * Note: Topic initialization should be handled by Kafka admin tools or infrastructure
   */
  async initializeHealthMonitoring(): Promise<void> {
    try {
      this.logger.log('Initializing Kafka health monitoring...');
      
      // Perform initial health checks
      const producerHealth = await this.checkProducerHealth();
      const consumerHealth = await this.checkConsumerHealth();
      
      if (producerHealth && consumerHealth.isHealthy) {
        this.logger.log('✅ Kafka health monitoring initialized successfully');
      } else {
        this.logger.warn('⚠️ Kafka health monitoring initialized with issues');
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize Kafka health monitoring:', error);
      // Don't throw error - health monitoring can still work
    }
  }
}