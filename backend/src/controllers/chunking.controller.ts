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
   * Process all raw text documents for a project and chunk them.
   * By default, existing chunks for the project will be deleted first.
   * @param projectId The project ID to process
   * @param body Optional chunking parameters including:
   *   - chunkSize: Size of each chunk in characters
   *   - chunkOverlap: Overlap between chunks in characters
   *   - deleteExisting: Whether to delete existing chunks (defaults to true)
   */
  @Post('project/:projectId')
  async chunkProjectTexts(
    @Param('projectId') projectId: string,
    @Body() chunkingParams?: { 
      chunkSize?: number; 
      chunkOverlap?: number;
      deleteExisting?: boolean;
    }
  ) {
    try {
      // Extract parameters
      const { chunkSize, chunkOverlap, deleteExisting = true } = chunkingParams || {};
      
      // Always delete existing chunks by default (can be overridden by setting deleteExisting to false)
      const result = await this.chunkingService.chunkProjectTexts(
        projectId,
        { chunkSize, chunkOverlap },
        deleteExisting
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
