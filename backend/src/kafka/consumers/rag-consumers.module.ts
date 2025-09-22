import { Module } from '@nestjs/common';
import { ChunkingConsumer } from './chunking.consumer';
import { EmbeddingConsumer } from './embedding.consumer';
import { IngestionConsumer } from './ingestion.consumer';
import { KafkaModule } from '../kafka.module';
import { KafkaErrorHandler } from '../error-handler/kafka-error.handler';

@Module({
  imports: [KafkaModule],
  providers: [
    ChunkingConsumer,
    EmbeddingConsumer,
    IngestionConsumer,
    KafkaErrorHandler,
  ],
  exports: [
    ChunkingConsumer,
    EmbeddingConsumer,
    IngestionConsumer,
  ]
})
export class RagConsumersModule {}
