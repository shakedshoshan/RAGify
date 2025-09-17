import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TextController } from './controllers/text.controller';
import { ProjectController } from './controllers/project.controller';
import { ChunkingController } from './controllers/chunking.controller';
import { EmbeddingController } from './controllers/embedding.controller';
import { FirestoreService } from './services/firestore.service';
import { ProjectService } from './services/project.service';
import { CsvService } from './services/csv.service';
import { ChunkingService } from './services/chunking.service';
import { EmbeddingService } from './services/embedding.service';
import firebaseConfig from './config/firebase.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [firebaseConfig],
    }),
  ],
  controllers: [AppController, TextController, ProjectController, ChunkingController, EmbeddingController],
  providers: [AppService, FirestoreService, ProjectService, CsvService, ChunkingService, EmbeddingService],
})
export class AppModule {}
