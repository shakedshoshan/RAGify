import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { GenerationService } from '../services/generation.service';
import { GenerationResponseDto, GenerationRequestDto } from '../dto/generation.dto';
import { RetrievalService } from '../services/retrieval.service';
import { RetrievalRequestDto } from '../dto/retrieval.dto';
import { KafkaService } from '@toxicoder/nestjs-kafka';

@Controller('generation')
export class GenerationController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly retrievalService: RetrievalService,
    private readonly kafkaService: KafkaService
  ) {}

  @Post('generate')
  async generateAnswer(@Body() requestDto: RetrievalRequestDto): Promise<GenerationResponseDto> {
    try {
      // Step 1: Publish received query
      await this.kafkaService.send({
        topic: 'queries-received',
        messages: [{
          key: Buffer.from(requestDto.projectId),
          value: Buffer.from(JSON.stringify({
            query: requestDto.prompt,
            projectId: requestDto.projectId,
            timestamp: new Date().toISOString()
          }))
        }]
      });

      // Step 2: Use retrieval service to get context
      const retrievedData = await this.retrievalService.queryDocuments(requestDto);

      // Step 3: Publish retrieved context
      await this.kafkaService.send({
        topic: 'contexts-retrieved',
        messages: [{
          key: Buffer.from(requestDto.projectId),
          value: Buffer.from(JSON.stringify({
            query: retrievedData.query,
            context: retrievedData.context,
            timestamp: new Date().toISOString()
          }))
        }]
      });

      // Step 4: Generate response using the retrieved context
      const answer = await this.generationService.generateResponse(
        retrievedData,
        retrievedData.query
      );

      // Step 5: Publish generated response
      await this.kafkaService.send({
        topic: 'responses-generated',
        messages: [{
          key: Buffer.from(requestDto.projectId),
          value: Buffer.from(JSON.stringify({
            query: retrievedData.query,
            answer,
            timestamp: new Date().toISOString()
          }))
        }]
      });

      return {
        answer,
        query: retrievedData.query
      };
    } catch (error) {
      console.error('Generation error:', error);
      throw new BadRequestException(`Failed to generate answer: ${error.message}`);
    }
  }
}
