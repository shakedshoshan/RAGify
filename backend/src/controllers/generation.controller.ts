import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { GenerationService } from '../services/generation.service';
import { GenerationResponseDto, GenerationRequestDto } from '../dto/generation.dto';
import { RetrievalService } from '../services/retrieval.service';
import { RetrievalRequestDto } from '../dto/retrieval.dto';

@Controller('generation')
export class GenerationController {
  constructor(
    private readonly generationService: GenerationService,
    private readonly retrievalService: RetrievalService
  ) {}

  @Post('generate')
  async generateAnswer(@Body() requestDto: RetrievalRequestDto): Promise<GenerationResponseDto> {
    try {
      // Step 1: Use retrieval service to get context
      const retrievedData = await this.retrievalService.queryDocuments(requestDto);

      // Step 2: Generate response using the retrieved context
      const answer = await this.generationService.generateResponse(
        retrievedData,
        retrievedData.query
      );

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
