import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule, KafkaService } from '@toxicoder/nestjs-kafka';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TextController } from './controllers/text.controller';
import { ProjectController } from './controllers/project.controller';
import { ChunkingController } from './controllers/chunking.controller';
import { EmbeddingController } from './controllers/embedding.controller';
import { GenerationController } from './controllers/generation.controller';
import { RagPrepareController } from './controllers/rag-prepare.controller';
import { FirestoreService } from './services/firestore.service';
import { ProjectService } from './services/project.service';
import { CsvService } from './services/csv.service';
import { PdfService } from './services/pdf.service';
import { ChunkingService } from './services/chunking.service';
import { EmbeddingService } from './services/embedding.service';
import { PineconeService } from './services/pinecone.service';
import { GenerationService } from './services/generation.service';
import { RetrievalService } from './services/retrieval.service';
import firebaseConfig from './config/firebase.config';
import pineconeConfig from './config/pinecone.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [firebaseConfig, pineconeConfig],
    }),
    KafkaModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      global: true,
      useFactory: (configService: ConfigService) => ({
        brokers: [configService.get<string>('KAFKA_BROKERS') || 'localhost:9092'],
        clientId: configService.get<string>('KAFKA_CLIENT_ID') || 'ragify-backend',
        topicAutoCreate: true,
        retry: {
          retries: 3,
          initialRetryTime: 300,
          maxRetryTime: 30000,
        },
      }),
    }),
  ],
  controllers: [AppController, TextController, ProjectController, ChunkingController, EmbeddingController, GenerationController, RagPrepareController],
  providers: [AppService, FirestoreService, ProjectService, CsvService, PdfService, ChunkingService, EmbeddingService, PineconeService, GenerationService, RetrievalService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly kafkaService: KafkaService) {}

  async onModuleInit() {
    try {
      // Initialize Kafka connection
      await this.kafkaService.connect();
      
      // Ensure topics exist
      await this.kafkaService.ensureTopics([
        'documents-chunked',
        'chunks-embedded', 
        'embeddings-ingested'
      ]);
      
      console.log('✅ Kafka service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Kafka service:', error.message);
      // Don't throw error - app can still work without Kafka
    }
  }
}
