import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { GenerationService } from '../services/generation.service';
import { GenerationRequestDto, GenerationResponseDto } from '../dto/generation.dto';

@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('generate')
  async generateAnswer(@Body() requestDto: GenerationRequestDto): Promise<GenerationResponseDto> {
    const { retrievedData } = requestDto;

    if (!retrievedData || !retrievedData.query || !retrievedData.context) {
      throw new BadRequestException('Invalid retrieved data provided');
    }

    try {
      const answer = await this.generationService.generateResponse(
        retrievedData,
        retrievedData.query
      );

      return {
        answer,
        query: retrievedData.query,
        sourcesUsed: retrievedData.totalResults
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate answer: ${error.message}`);
    }
  }
}
