import { Module } from '@nestjs/common';
import { ChunkingConsumer } from './chunking.consumer';
import { EmbeddingConsumer } from './embedding.consumer';
import { IngestionConsumer } from './ingestion.consumer';
import { KafkaModule } from '../kafka.module';
import { KafkaErrorHandler } from '../error-handler/kafka-error.handler';
import { RagPrepareController } from '../../controllers/rag-prepare.controller';

@Module({
  imports: [KafkaModule],
  providers: [
    ChunkingConsumer,
    EmbeddingConsumer,
    IngestionConsumer,
    KafkaErrorHandler,
    RagPrepareController,
  ],
  exports: [
    ChunkingConsumer,
    EmbeddingConsumer,
    IngestionConsumer,
  ]
})
export class RagConsumersModule {}
