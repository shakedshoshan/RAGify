import { 
  Controller, 
  Post, 
  Param, 
  Body,
  HttpException, 
  HttpStatus
} from '@nestjs/common';
import { ChunkingService } from '../services/chunking.service';

@Controller('chunking')
export class ChunkingController {
  constructor(private readonly chunkingService: ChunkingService) {}

  /**
   * Process all raw text documents for a project and chunk them
   * @param projectId The project ID to process
   * @param body Optional chunking parameters
   */
  @Post('project/:projectId')
  async chunkProjectTexts(
    @Param('projectId') projectId: string,
    @Body() chunkingParams?: { chunkSize?: number; chunkOverlap?: number }
  ) {
    try {
      const result = await this.chunkingService.chunkProjectTexts(
        projectId,
        chunkingParams
      );
      
      return {
        success: true,
        message: 'Project texts chunked and saved successfully',
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to chunk project texts',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
