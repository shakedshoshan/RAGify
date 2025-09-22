/**
 * Kafka Event Interface
 * Defines the structure for all Kafka events in the system
 */
export interface KafkaEvent<T = any> {
  key: string;
  value: T;
  partition?: number;
  timestamp?: number;
  headers?: Record<string, string | Buffer>;
}

/**
 * Kafka Message Interface
 * Structure for messages sent to Kafka topics
 */
export interface KafkaMessage<T = any> {
  topic: string;
  messages: KafkaEvent<T>[];
}

/**
 * Kafka Producer Options
 */
export interface KafkaProducerOptions {
  topic: string;
  key?: string;
  partition?: number;
  headers?: Record<string, string | Buffer>;
  timestamp?: number;
}

/**
 * Kafka Consumer Options
 */
export interface KafkaConsumerOptions {
  groupId: string;
  topics: string[];
  fromBeginning?: boolean;
  sessionTimeout?: number;
  heartbeatInterval?: number;
  maxWaitTimeInMs?: number;
  minBytes?: number;
  maxBytes?: number;
  maxBytesPerPartition?: number;
}

/**
 * Event Handler Interface
 */
export interface EventHandler<T = any> {
  handle(event: KafkaEvent<T>): Promise<void>;
}

/**
 * Event Processing Result
 */
export interface EventProcessingResult {
  success: boolean;
  error?: string;
  processingTime?: number;
  metadata?: Record<string, any>;
}
