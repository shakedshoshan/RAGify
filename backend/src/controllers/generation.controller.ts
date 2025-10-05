import { Controller, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { GenerationService } from '../services/generation.service';
import { GenerationResponseDto, GenerationRequestDto } from '../dto/generation.dto';
import { RetrievalService } from '../services/retrieval.service';
import { RetrievalRequestDto } from '../dto/retrieval.dto';
import { KafkaProducerService } from '../kafka/producers/kafka-producer.service';
import {
  QueryReceivedEventDto,
  ContextRetrievedEventDto,
  ResponseGeneratedEventDto
} from '../kafka/dto/kafka-event.dto';
import { v4 as uuidv4 } from 'uuid';
import { ApiKeyGuard } from '../guards/api-key.guard';

@Controller('generation')
export class GenerationController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly retrievalService: RetrievalService,
    private readonly kafkaProducerService: KafkaProducerService
  ) {}

  @Post('generate')
  @UseGuards(ApiKeyGuard)
  async generateAnswer(@Body() requestDto: RetrievalRequestDto): Promise<GenerationResponseDto> {
    const correlationId = uuidv4();
    const startTime = Date.now();

    try {
      // Step 1: Publish received query
      await this.kafkaProducerService.publishQueryReceived({
        projectId: requestDto.projectId,
        timestamp: new Date().toISOString(),
        query: requestDto.prompt,
        correlationId,
        metadata: {
          queryLength: requestDto.prompt.length,
          source: 'generation-controller'
        }
      });

      // Step 2: Use retrieval service to get context
      const retrievedData = await this.retrievalService.queryDocuments(requestDto);

      // Step 3: Publish retrieved context
      await this.kafkaProducerService.publishContextRetrieved({
        projectId: requestDto.projectId,
        timestamp: new Date().toISOString(),
        query: retrievedData.query,
        context: retrievedData.context,
        correlationId,
        metadata: {
          retrievedChunks: (retrievedData as any).chunks?.length || 0,
          retrievalTime: Date.now() - startTime
        }
      });

      // Step 4: Generate response using the retrieved context
      const generationStartTime = Date.now();
      const answer = await this.generationService.generateResponse(
        retrievedData,
        retrievedData.query
      );

      // Step 5: Publish generated response
      await this.kafkaProducerService.publishResponseGenerated({
        projectId: requestDto.projectId,
        timestamp: new Date().toISOString(),
        query: retrievedData.query,
        answer,
        correlationId,
        metadata: {
          generationTime: Date.now() - generationStartTime,
          modelUsed: 'gpt-4' // This should come from config
        }
      });

      return {
        answer,
        query: retrievedData.query
      };
    } catch (error) {
      console.error('Generation error:', error);
      
      // Publish error event
      await this.kafkaProducerService.publishProcessingError({
        projectId: requestDto.projectId,
        timestamp: new Date().toISOString(),
        errorType: 'GENERATION_ERROR',
        errorMessage: error.message,
        service: 'GenerationController',
        operation: 'generateAnswer',
        correlationId,
        errorDetails: {
          query: requestDto.prompt,
          processingTime: Date.now() - startTime
        }
      });

      throw new BadRequestException(`Failed to generate answer: ${error.message}`);
    }
  }
}
