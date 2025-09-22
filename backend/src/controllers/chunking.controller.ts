import { 
  Controller, 
  Post, 
  Param, 
  Body,
  HttpException, 
  HttpStatus
} from '@nestjs/common';
import { ChunkingService } from '../services/chunking.service';
import { KafkaProducerService } from '../kafka/producers/kafka-producer.service';
import { DocumentsChunkedEventDto } from '../kafka/dto/kafka-event.dto';
import { v4 as uuidv4 } from 'uuid';

@Controller('chunking')
export class ChunkingController {
  constructor(
    private readonly chunkingService: ChunkingService,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  /**
   * Process all raw text documents for a project and chunk them.
   * By default, existing chunks for the project will be deleted first.
   * 
   * @param projectId The project ID to process
   * @param body Optional chunking parameters including:
   *   - chunkSize: Size of each chunk in characters (default: 500)
   *   - chunkOverlap: Overlap between chunks in characters (default: 15% of chunkSize)
   *   - deleteExisting: Whether to delete existing chunks (defaults to true)
   *   - chunkingStrategy: Strategy for chunking ('semantic', 'fixed', or 'hybrid')
   *     - semantic: Uses natural text boundaries like paragraphs and sentences (default)
   *     - fixed: Uses fixed-size chunks regardless of content
   *     - hybrid: Combines both approaches for balanced results
   */
  @Post('project/:projectId')
  async chunkProjectTexts(
    @Param('projectId') projectId: string,
    @Body() chunkingParams?: { 
      chunkSize?: number;           // Size of each chunk in characters (default: 500)
      chunkOverlap?: number;        // Overlap between chunks (default: 15% of chunkSize)
      deleteExisting?: boolean;     // Whether to delete existing chunks (default: true)
      chunkingStrategy?: 'semantic' | 'fixed' | 'hybrid'; // Chunking strategy to use (default: semantic)
    }
  ) {
    try {
      // Extract parameters with defaults
      const { 
        chunkSize, 
        chunkOverlap, 
        deleteExisting = true,
        chunkingStrategy = 'semantic'
      } = chunkingParams || {};
      
      // Always delete existing chunks by default (can be overridden by setting deleteExisting to false)
      const result = await this.chunkingService.chunkProjectTexts(
        projectId,
        { 
          chunkSize, 
          chunkOverlap,
          chunkingStrategy
        },
        deleteExisting
      );

      // Publish to documents-chunked topic
      await this.kafkaProducerService.publishDocumentsChunked({
        projectId,
        timestamp: new Date().toISOString(),
        processedTexts: result.processedTexts,
        totalChunks: result.totalChunks,
        chunkingStrategy: result.chunkingStrategy as 'semantic' | 'fixed' | 'hybrid',
        correlationId: uuidv4(),
        metadata: {
          processingTime: Date.now()
        }
      });
      
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
