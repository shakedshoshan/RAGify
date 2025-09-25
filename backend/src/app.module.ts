import { Module, OnModuleInit, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TextController } from './controllers/text.controller';
import { ProjectController } from './controllers/project.controller';
import { ChunkingController } from './controllers/chunking.controller';
import { EmbeddingController } from './controllers/embedding.controller';
import { GenerationController } from './controllers/generation.controller';
import { RagPrepareController } from './controllers/rag-prepare.controller';
import { KafkaHealthController } from './controllers/kafka-health.controller';
import { ApiKeyController } from './controllers/apikey.controller';
import { FirestoreService } from './services/firestore.service';
import { ProjectService } from './services/project.service';
import { CsvService } from './services/csv.service';
import { PdfService } from './services/pdf.service';
import { ChunkingService } from './services/chunking.service';
import { EmbeddingService } from './services/embedding.service';
import { PineconeService } from './services/pinecone.service';
import { GenerationService } from './services/generation.service';
import { RetrievalService } from './services/retrieval.service';
import { ApiKeyService } from './services/apikey.service';
import firebaseConfig from './config/firebase.config';
import pineconeConfig from './config/pinecone.config';
import { KafkaModule } from './kafka/kafka.module';
import { RagConsumersModule } from './kafka/consumers/rag-consumers.module';
import { KafkaHealthService } from './kafka/kafka-health.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [firebaseConfig, pineconeConfig],
    }),
    KafkaModule,
    RagConsumersModule,
  ],
  controllers: [AppController, TextController, ProjectController, ChunkingController, EmbeddingController, GenerationController, RagPrepareController, KafkaHealthController, ApiKeyController],
  providers: [AppService, FirestoreService, ProjectService, CsvService, PdfService, ChunkingService, EmbeddingService, PineconeService, GenerationService, RetrievalService, ApiKeyService],
  exports: [ChunkingService, EmbeddingService, PineconeService, FirestoreService, ProjectService, CsvService, PdfService, GenerationService, RetrievalService, ApiKeyService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly kafkaHealthService: KafkaHealthService) {}

  async onModuleInit() {
    try {
      // Initialize Kafka health monitoring
      await this.kafkaHealthService.initializeHealthMonitoring();
      
      // Perform initial health check
      const healthStatus = await this.kafkaHealthService.checkHealth();
      
      if (healthStatus.isHealthy) {
        console.log('✅ Kafka service initialized successfully');
      } else {
        console.warn('⚠️ Kafka service initialized with issues:', healthStatus.status);
      }
    } catch (error) {
      console.error('❌ Failed to initialize Kafka service:', error.message);
      // Don't throw error - app can still work without Kafka
    }
  }
}
