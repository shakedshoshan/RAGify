import { 
  Controller, 
  Post,
  Get,
  Param, 
  Body,
  HttpException, 
  HttpStatus
} from '@nestjs/common';
import { KafkaService } from '@toxicoder/nestjs-kafka';
import { EmbeddingService } from '../services/embedding.service';
import { 
  EmbeddingRequestDto, 
  EmbeddingResponseDto,
  EmbeddingDto
} from '../dto/embedding.dto';
import { PineconeService } from '../services/pinecone.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('embedding')
export class EmbeddingController {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly pineconeService: PineconeService,
    private readonly kafkaService: KafkaService,
  ) {}

  /**
   * Generate embeddings for all chunks in a project and save to Pinecone
   * @param projectId The project ID to process
   * @param body Embedding request parameters
   */
  @Post('project/:projectId')
  async embedProjectChunks(
    @Param('projectId') projectId: string,
    @Body() body?: { modelName?: string; chunkIds?: string[]; skipDeletion?: boolean }
  ): Promise<{ success: boolean; message: string; data: EmbeddingResponseDto }> {
    try {
      const modelName = body?.modelName || 'text-embedding-3-small';
      const specificChunkIds = body?.chunkIds || [];
      const skipDeletion = body?.skipDeletion || false;

      // First, delete existing vectors for this project from Pinecone
      let deletedCount = 0;
      if (!skipDeletion) {
        console.log(`Deleting existing vectors for project ${projectId}...`);
        const deleteResult = await this.pineconeService.deleteVectorsByProjectId(projectId);
        deletedCount = deleteResult.deleted;
        console.log(`Deleted ${deletedCount} existing vectors for project ${projectId}`);
      }

      // Get text chunks by project ID from Firestore
      let chunks;
      if (specificChunkIds.length > 0) {
        // Get specific chunks by IDs if provided
        chunks = await this.embeddingService.getChunksByIds(specificChunkIds);
      } else {
        // Get all chunks for the project from Firestore
        chunks = await this.embeddingService.getChunksByProjectId(projectId);
      }

      if (!chunks || chunks.length === 0) {
        throw new HttpException(
          {
            success: false,
            message: `No text chunks found for project ${projectId}`,
            error: 'No chunks available for embedding',
          },
          HttpStatus.NOT_FOUND
        );
      }

      // Generate embeddings for the chunk contents
      const embeddings = await this.embeddingService.generateEmbeddings(
        chunks.map(chunk => chunk.content),
        modelName
      );

      // Prepare vectors for Pinecone with proper metadata
      const vectors = chunks.map((chunk, index) => ({
        id: chunk.id || uuidv4(),
        values: embeddings[index],
        metadata: {
          content: chunk.content,
          source: chunk.sourceName || chunk.sourceId || projectId,
          projectId, // Store projectId directly in metadata (no nested object)
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
        }
      }));

      // Save embeddings to Pinecone
      const pineconeResult = await this.pineconeService.batchUpsertVectors(
        projectId,
        vectors,
        100
      );

      // Publish embeddings ingested event
      await this.embeddingService.publishEmbeddingsIngested(
        projectId, 
        pineconeResult.totalUpserted, 
        true
      );

      // Prepare response data
      const result: EmbeddingResponseDto = {
        projectId,
        processedChunks: chunks.length,
        totalEmbeddings: pineconeResult.totalUpserted,
        embeddingIds: vectors.map(v => v.id),
        modelUsed: modelName,
        dimensions: embeddings[0]?.length || 512,
        deletedVectors: deletedCount,
      };

      // Publish to chunks-embedded topic
      await this.kafkaService.send({
        topic: 'chunks-embedded',
        messages: {
          key: projectId,
          value: {
            projectId,
            processedChunks: chunks.length,
            totalEmbeddings: pineconeResult.totalUpserted,
            modelUsed: modelName,
            dimensions: embeddings[0]?.length || 512,
            timestamp: new Date().toISOString(),
          },
        },
      });
      
      return {
        success: true,
        message: `Project chunks embedded successfully. ${deletedCount > 0 ? `Deleted ${deletedCount} existing vectors. ` : ''}Added ${pineconeResult.totalUpserted} new vectors.`,
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