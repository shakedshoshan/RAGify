import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { GenerationService } from '../services/generation.service';
import { GenerationResponseDto, GenerationRequestDto } from '../dto/generation.dto';

@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('generate')
  async generateAnswer(@Body() requestDto: any): Promise<GenerationResponseDto> {
    
    // Extract the fields, with fallbacks for undefined values
    const query = requestDto.query || '';
    const context = requestDto.context || '';
    const instruction = requestDto.instruction || '';
    
    // Validate required fields
    if (!query || !context) {
      throw new BadRequestException('Query and context are required');
    }

    try {
      const retrievedData = {
        query,
        context,
        instruction,
      };

      const answer = await this.generationService.generateResponse(
        retrievedData,
        query
      );

      return {
        answer,
        query
      };
    } catch (error) {
      console.error('Generation error:', error);
      throw new BadRequestException(`Failed to generate answer: ${error.message}`);
    }
  }
}
