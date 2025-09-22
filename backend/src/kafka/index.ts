// Kafka Module
export { KafkaModule } from './kafka.module';

// Services
export { KafkaProducerService } from './producers/kafka-producer.service';
export { KafkaConsumerService } from './consumers/kafka-consumer.service';
export { KafkaHealthService } from './kafka-health.service';

// Topics and Configuration
export { KafkaTopics, KAFKA_TOPIC_CONFIG } from './topics/kafka-topics.enum';

// DTOs
export * from './dto/kafka-event.dto';

// Interfaces
export * from './events/kafka-event.interface';

