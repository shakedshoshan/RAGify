import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule as NestKafkaModule } from '@toxicoder/nestjs-kafka';
import { KafkaProducerService } from './producers/kafka-producer.service';
import { KafkaConsumerService } from './consumers/kafka-consumer.service';
import { KafkaHealthService } from './kafka-health.service';

@Global()
@Module({
  imports: [
    NestKafkaModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        brokers: [configService.get<string>('KAFKA_BROKERS') || 'localhost:9092'],
        clientId: configService.get<string>('KAFKA_CLIENT_ID') || 'ragify-backend',
        topicAutoCreate: true,
        retry: {
          retries: 3,
          initialRetryTime: 300,
          maxRetryTime: 30000,
        },
        // Connection timeout
        connectionTimeout: 10000,
        // Authentication timeout  
        authenticationTimeout: 10000,
        // Request timeout
        requestTimeout: 30000,
        // Producer configuration
        producerConfig: {
          allowAutoTopicCreation: true,
          transactionTimeout: 30000,
          idempotent: true,
          maxInFlightRequests: 1,
          acks: 'all',
          compression: 'gzip',
          batchSize: 16384,
          lingerMs: 100,
        },
        // Consumer configuration
        consumerConfig: {
          groupId: configService.get<string>('KAFKA_CONSUMER_GROUP') || 'ragify-consumers',
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
          maxWaitTimeInMs: 5000,
          allowAutoTopicCreation: true,
          enableAutoCommit: true,
          autoCommitInterval: 5000,
        }
      }),
    }),
  ],
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    KafkaHealthService,
  ],
  exports: [
    KafkaProducerService,
    KafkaConsumerService,
    KafkaHealthService,
  ],
})
export class KafkaModule {}
