import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TextController } from './controllers/text.controller';
import { ProjectController } from './controllers/project.controller';
import { ChunkingController } from './controllers/chunking.controller';
import { EmbeddingController } from './controllers/embedding.controller';
import { GenerationController } from './controllers/generation.controller';
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
  ],
  controllers: [AppController, TextController, ProjectController, ChunkingController, EmbeddingController, GenerationController],
  providers: [AppService, FirestoreService, ProjectService, CsvService, PdfService, ChunkingService, EmbeddingService, PineconeService, GenerationService, RetrievalService],
})
export class AppModule {}
