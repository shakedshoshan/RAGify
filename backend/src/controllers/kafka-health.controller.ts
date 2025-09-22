import { Controller, Get } from '@nestjs/common';
import { KafkaHealthService, KafkaHealthStatus } from '../kafka/kafka-health.service';

@Controller('kafka')
export class KafkaHealthController {
  constructor(private readonly kafkaHealthService: KafkaHealthService) {}

  /**
   * Get Kafka health status
   */
  @Get('health')
  async getHealth(): Promise<KafkaHealthStatus> {
    return await this.kafkaHealthService.checkHealth();
  }

  /**
   * Get Kafka service statistics
   */
  @Get('stats')
  async getStats() {
    return this.kafkaHealthService.getStats();
  }

  /**
   * Get last health check result
   */
  @Get('health/last')
  getLastHealthCheck(): KafkaHealthStatus | null {
    return this.kafkaHealthService.getLastHealthCheck();
  }

  /**
   * Reset topics (development only)
   */
  @Get('topics/reset')
  async resetTopics() {
    await this.kafkaHealthService.resetTopics();
    return { message: 'Topics reset successfully' };
  }
}
