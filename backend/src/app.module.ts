import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TextController } from './controllers/text.controller';
import { S3Service } from './services/s3.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, TextController],
  providers: [AppService, S3Service],
})
export class AppModule {}
