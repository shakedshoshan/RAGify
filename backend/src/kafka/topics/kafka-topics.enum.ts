/**
 * Kafka Topics Enumeration
 * Centralized definition of all Kafka topics used in the RAGify application
 * Following Apache Kafka naming conventions: service.domain.event-type
 */
export enum KafkaTopics {
  // RAG Preparation Flow Topics
  DOCUMENTS_CHUNKED = 'ragify.documents.chunked',
  CHUNKS_EMBEDDED = 'ragify.chunks.embedded',
  EMBEDDINGS_INGESTED = 'ragify.embeddings.ingested',
  
  // Query Processing Flow Topics
  QUERIES_RECEIVED = 'ragify.queries.received',
  CONTEXTS_RETRIEVED = 'ragify.contexts.retrieved',
  RESPONSES_GENERATED = 'ragify.responses.generated',
  
  // Error and Monitoring Topics
  PROCESSING_ERRORS = 'ragify.processing.errors',
  SYSTEM_METRICS = 'ragify.system.metrics'
}

/**
 * Topic Configuration
 * Defines partitions, replication factor, and other settings for each topic
 */
export const KAFKA_TOPIC_CONFIG = {
  [KafkaTopics.DOCUMENTS_CHUNKED]: {
    partitions: 3,
    replicationFactor: 1,
    configs: {
      'retention.ms': '604800000', // 7 days
      'compression.type': 'gzip'
    }
  },
  [KafkaTopics.CHUNKS_EMBEDDED]: {
    partitions: 3,
    replicationFactor: 1,
    configs: {
      'retention.ms': '604800000', // 7 days
      'compression.type': 'gzip'
    }
  },
  [KafkaTopics.EMBEDDINGS_INGESTED]: {
    partitions: 3,
    replicationFactor: 1,
    configs: {
      'retention.ms': '2592000000', // 30 days
      'compression.type': 'gzip'
    }
  },
  [KafkaTopics.QUERIES_RECEIVED]: {
    partitions: 5,
    replicationFactor: 1,
    configs: {
      'retention.ms': '2592000000', // 30 days
      'compression.type': 'gzip'
    }
  },
  [KafkaTopics.CONTEXTS_RETRIEVED]: {
    partitions: 5,
    replicationFactor: 1,
    configs: {
      'retention.ms': '2592000000', // 30 days
      'compression.type': 'gzip'
    }
  },
  [KafkaTopics.RESPONSES_GENERATED]: {
    partitions: 5,
    replicationFactor: 1,
    configs: {
      'retention.ms': '2592000000', // 30 days
      'compression.type': 'gzip'
    }
  },
  [KafkaTopics.PROCESSING_ERRORS]: {
    partitions: 2,
    replicationFactor: 1,
    configs: {
      'retention.ms': '7776000000', // 90 days
      'compression.type': 'gzip'
    }
  },
  [KafkaTopics.SYSTEM_METRICS]: {
    partitions: 2,
    replicationFactor: 1,
    configs: {
      'retention.ms': '2592000000', // 30 days
      'compression.type': 'gzip'
    }
  }
};
