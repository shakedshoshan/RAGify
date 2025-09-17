import { 
  Controller, 
  Post,
  Param, 
  Body,
  HttpException, 
  HttpStatus
} from '@nestjs/common';
import { EmbeddingService } from '../services/embedding.service';
import { 
  EmbeddingRequestDto, 
  EmbeddingResponseDto
} from '../dto/embedding.dto';

@Controller('embedding')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  /**
   * Generate embeddings for all chunks in a project
   * @param projectId The project ID to process
   * @param body Embedding request parameters
   */
  @Post('project/:projectId')
  async embedProjectChunks(
    @Param('projectId') projectId: string,
    @Body() body?: { modelName?: string; chunkIds?: string[] }
  ): Promise<{ success: boolean; message: string; data: EmbeddingResponseDto }> {
    try {
      const request: EmbeddingRequestDto = {
        projectId,
        modelName: body?.modelName || 'text-embedding-3-small',
        chunkIds: body?.chunkIds,
      };

      const result = await this.embeddingService.embedProjectChunks(request);
      
      return {
        success: true,
        message: 'Project chunks embedded successfully',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to embed project chunks',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
