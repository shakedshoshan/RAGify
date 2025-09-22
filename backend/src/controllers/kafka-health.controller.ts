import { Controller, Get, Logger } from '@nestjs/common';
import { KafkaHealthService } from '../kafka/kafka-health.service';

@Controller('health/kafka')
export class KafkaHealthController {
  private readonly logger = new Logger(KafkaHealthController.name);

  constructor(private readonly kafkaHealthService: KafkaHealthService) {}

  /**
   * Check Kafka producer health
   */
  @Get('producer')
  async checkProducerHealth() {
    const isHealthy = await this.kafkaHealthService.checkProducerHealth();
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'kafka-producer',
      details: {
        isConnected: isHealthy
      }
    };
  }

  /**
   * Check Kafka consumer health
   */
  @Get('consumer')
  async checkConsumerHealth() {
    const status = await this.kafkaHealthService.checkConsumerHealth();
    
    return {
      status: status.isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'kafka-consumer',
      details: {
        isConsuming: status.isConsuming,
        activeTopics: status.topics,
        activeHandlers: status.handlerCount
      }
    };
  }

  /**
   * Check overall Kafka health
   */
  @Get()
  async checkKafkaHealth() {
    const producerHealth = await this.kafkaHealthService.checkProducerHealth();
    const consumerHealth = await this.kafkaHealthService.checkConsumerHealth();
    const isHealthy = producerHealth && consumerHealth.isHealthy;
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      components: {
        producer: {
          status: producerHealth ? 'healthy' : 'unhealthy',
        },
        consumer: {
          status: consumerHealth.isHealthy ? 'healthy' : 'unhealthy',
          details: {
            isConsuming: consumerHealth.isConsuming,
            activeTopics: consumerHealth.topics.length,
            activeHandlers: consumerHealth.handlerCount
          }
        }
      }
    };
  }
}