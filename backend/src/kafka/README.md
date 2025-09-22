# RAGify Kafka Architecture

## Overview

RAGify uses Apache Kafka for reliable, asynchronous communication between services in the RAG (Retrieval Augmented Generation) pipeline. This document describes the Kafka-based architecture and how it's implemented.

## Architecture

The RAG preparation flow is now fully event-driven, with each step triggered by events published to Kafka topics:

1. **Document Chunking**: Initiated by API request, chunks documents and publishes a `DOCUMENTS_CHUNKED` event
2. **Embedding Generation**: Triggered by `DOCUMENTS_CHUNKED` events, generates embeddings and publishes a `CHUNKS_EMBEDDED` event
3. **Vector Storage**: Triggered by `CHUNKS_EMBEDDED` events, stores vectors in Pinecone and publishes an `EMBEDDINGS_INGESTED` event
4. **Cleanup**: Triggered by `EMBEDDINGS_INGESTED` events, cleans up temporary chunks from Firebase

This decoupled architecture provides several benefits:
- **Resilience**: Each step can fail and retry independently
- **Scalability**: Steps can be scaled independently based on load
- **Monitoring**: Events provide visibility into the pipeline's progress
- **Asynchronous Processing**: Long-running tasks don't block the API

## Kafka Topics

| Topic | Description | Partitions | Retention |
|-------|-------------|------------|-----------|
| `ragify.documents.chunked` | Published when documents are chunked | 3 | 7 days |
| `ragify.chunks.embedded` | Published when embeddings are generated | 3 | 7 days |
| `ragify.embeddings.ingested` | Published when vectors are stored | 3 | 30 days |
| `ragify.queries.received` | Published when queries are received | 5 | 30 days |
| `ragify.contexts.retrieved` | Published when context is retrieved | 5 | 30 days |
| `ragify.responses.generated` | Published when responses are generated | 5 | 30 days |
| `ragify.processing.errors` | Published when errors occur | 2 | 90 days |
| `ragify.system.metrics` | Published for system metrics | 2 | 30 days |

## Consumer Services

The system includes dedicated consumer services for each step of the RAG preparation flow:

1. **ChunkingConsumer**: Listens for `DOCUMENTS_CHUNKED` events and generates embeddings
2. **EmbeddingConsumer**: Listens for `CHUNKS_EMBEDDED` events and stores vectors in Pinecone
3. **IngestionConsumer**: Listens for `EMBEDDINGS_INGESTED` events and cleans up temporary chunks

## Error Handling and Retry Logic

The system includes robust error handling and retry logic:

- **Exponential Backoff**: Failed operations are retried with increasing delays
- **Configurable Retries**: Each operation can have custom retry configurations
- **Error Tracking**: All errors are published to the `ragify.processing.errors` topic
- **Correlation IDs**: All events include correlation IDs to track related events

## Health Monitoring

The system includes health check endpoints for monitoring Kafka connectivity:

- `GET /health/kafka`: Overall Kafka health
- `GET /health/kafka/producer`: Kafka producer health
- `GET /health/kafka/consumer`: Kafka consumer health

## Usage

### Starting RAG Preparation

```http
POST /rag/prepare/:projectId
{
  "chunkSize": 1000,
  "chunkOverlap": 200,
  "chunkingStrategy": "semantic",
  "modelName": "text-embedding-3-small"
}
```

This initiates the RAG preparation flow by chunking documents and publishing a `DOCUMENTS_CHUNKED` event. The rest of the flow is handled asynchronously by Kafka consumers.

### Checking RAG Preparation Status

```http
GET /rag/status/:projectId/:correlationId
```

This returns the status of the RAG preparation flow for a specific project and correlation ID.

## Implementation Details

### Controllers

- **RagPrepareController**: Initiates the RAG preparation flow and provides status endpoints
- **KafkaHealthController**: Provides health check endpoints for Kafka connectivity

### Consumers

- **ChunkingConsumer**: Processes `DOCUMENTS_CHUNKED` events
- **EmbeddingConsumer**: Processes `CHUNKS_EMBEDDED` events
- **IngestionConsumer**: Processes `EMBEDDINGS_INGESTED` events

### Services

- **KafkaProducerService**: Publishes events to Kafka topics
- **KafkaConsumerService**: Consumes events from Kafka topics
- **KafkaErrorHandler**: Handles errors and implements retry logic
- **KafkaHealthService**: Provides health check functionality

## Configuration

Kafka configuration is managed through environment variables:

```
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ragify-backend
KAFKA_GROUP_ID=ragify-consumers
```

## Deployment

For production deployments, consider:

1. Using a managed Kafka service (e.g., Confluent Cloud, AWS MSK)
2. Setting appropriate retention periods based on storage needs
3. Configuring proper replication for fault tolerance
4. Monitoring Kafka metrics for performance and health