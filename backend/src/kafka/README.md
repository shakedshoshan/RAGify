# RAGify Kafka Integration

This directory contains the organized Kafka integration for the RAGify backend application, following Apache Kafka best practices and clean architecture principles.

## 📁 Structure

```
kafka/
├── consumers/           # Kafka consumers for processing events
├── producers/          # Kafka producers for publishing events  
├── topics/            # Topic definitions and configurations
├── dto/               # Data Transfer Objects for events
├── events/            # Event interfaces and types
├── kafka.module.ts    # Main Kafka module
├── kafka-health.service.ts  # Health monitoring service
└── index.ts          # Exports for easy importing
```

## 🚀 Key Features

### 1. **Organized Topic Management**
- Centralized topic definitions in `topics/kafka-topics.enum.ts`
- Proper naming convention: `ragify.domain.event-type`
- Configurable partitions, replication, and retention policies

### 2. **Type-Safe Event System**
- Strongly typed DTOs for all events
- Validation using class-validator decorators
- Base event class with common fields (projectId, timestamp, correlationId)

### 3. **Producer Service**
- Dedicated `KafkaProducerService` for publishing events
- Error handling and retry logic
- Automatic correlation ID generation
- Health check capabilities

### 4. **Consumer Framework** 
- Event handler registration system
- Automatic message processing with error handling
- Graceful shutdown support
- Performance monitoring

### 5. **Health Monitoring**
- Comprehensive health checks for connections, topics, and services
- Status reporting (healthy/degraded/unhealthy)
- Statistics and metrics collection

## 📊 Event Flows

### RAG Preparation Flow
```
documents-chunked → chunks-embedded → embeddings-ingested
```

### Query Processing Flow  
```
queries-received → contexts-retrieved → responses-generated
```

### Error Handling
```
processing-errors (for all error events)
system-metrics (for monitoring data)
```

## 🔧 Usage Examples

### Publishing Events
```typescript
import { KafkaProducerService } from './kafka/producers/kafka-producer.service';

// In your service/controller
constructor(private readonly kafkaProducer: KafkaProducerService) {}

// Publish a document chunked event
await this.kafkaProducer.publishDocumentsChunked({
  projectId: 'project-123',
  timestamp: new Date().toISOString(),
  processedTexts: 5,
  totalChunks: 150,
  chunkingStrategy: 'semantic',
  correlationId: uuidv4()
});
```

### Health Monitoring
```typescript
import { KafkaHealthService } from './kafka/kafka-health.service';

// Check Kafka health
const health = await this.kafkaHealthService.checkHealth();
console.log(health.status); // 'healthy', 'degraded', or 'unhealthy'
```

### Event Handling
```typescript
import { KafkaConsumerService } from './kafka/consumers/kafka-consumer.service';

// Register custom event handler
this.kafkaConsumerService.registerHandler(KafkaTopics.DOCUMENTS_CHUNKED, {
  handle: async (event) => {
    console.log('Processing chunked documents:', event.value);
    // Your custom logic here
  }
});
```

## 📈 Topics Configuration

| Topic | Partitions | Retention | Description |
|-------|------------|-----------|-------------|
| `ragify.documents.chunked` | 3 | 7 days | Document chunking completion |
| `ragify.chunks.embedded` | 3 | 7 days | Embedding generation completion |
| `ragify.embeddings.ingested` | 3 | 30 days | Vector storage completion |
| `ragify.queries.received` | 5 | 30 days | User queries |
| `ragify.contexts.retrieved` | 5 | 30 days | Retrieved contexts |
| `ragify.responses.generated` | 5 | 30 days | Generated responses |
| `ragify.processing.errors` | 2 | 90 days | Error events |
| `ragify.system.metrics` | 2 | 30 days | System metrics |

## 🛡️ Error Handling

The system includes comprehensive error handling:

1. **Producer Errors**: Automatic retry with exponential backoff
2. **Consumer Errors**: Dead letter queue pattern (planned)
3. **Connection Errors**: Health monitoring and alerting
4. **Processing Errors**: Structured error events with full context

## 🔍 Monitoring Endpoints

Access these endpoints for monitoring:

- `GET /kafka/health` - Current health status
- `GET /kafka/stats` - Service statistics  
- `GET /kafka/health/last` - Last health check result
- `GET /kafka/topics/reset` - Reset topics (development only)

## 🚦 Environment Variables

Configure these environment variables:

```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ragify-backend
KAFKA_CONSUMER_GROUP=ragify-consumers
```

## 🔄 Migration from Old Implementation

The old implementation in controllers has been refactored:

### Before
```typescript
// Direct Kafka service usage
await this.kafkaService.send({
  topic: 'documents-chunked',
  messages: { key: projectId, value: data }
});
```

### After  
```typescript
// Organized producer service
await this.kafkaProducerService.publishDocumentsChunked({
  projectId,
  timestamp: new Date().toISOString(),
  // ... typed event data
});
```

## 📚 References

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [@toxicoder/nestjs-kafka](https://www.npmjs.com/package/@toxicoder/nestjs-kafka)
- [Kafka Best Practices](https://kafka.apache.org/documentation/#bestpractices)

## 🤝 Contributing

When adding new events:

1. Define the topic in `topics/kafka-topics.enum.ts`
2. Create the DTO in `dto/kafka-event.dto.ts`
3. Add producer method in `producers/kafka-producer.service.ts`
4. Register consumer handler in `consumers/kafka-consumer.service.ts`
5. Update this README with the new event flow
