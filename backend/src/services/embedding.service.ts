import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { 
  EmbeddingDto, 
  EmbeddingRequestDto, 
  EmbeddingResponseDto,
  ProjectEmbeddingDocumentDto
} from '../dto/embedding.dto';
import { FirestoreService } from './firestore.service';

@Injectable()
export class EmbeddingService {
  private openai: OpenAI;
  private readonly defaultModel = 'text-embedding-3-small';
  private readonly defaultDimensions = 1536;

  constructor(
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Process chunks for a project and generate embeddings
   */
  async embedProjectChunks(
    request: EmbeddingRequestDto
  ): Promise<EmbeddingResponseDto> {
    const { projectId, modelName = this.defaultModel, chunkIds } = request;

    // Create initial project embedding document
    const projectEmbeddingDoc: ProjectEmbeddingDocumentDto = {
      projectId,
      embeddingIds: [],
      processedChunks: 0,
      totalEmbeddings: 0,
      modelUsed: modelName,
      dimensions: this.defaultDimensions,
      status: 'processing',
      createdAt: new Date(),
    };

    // Save initial project document
    const projectDocRef = await this.firestoreService.addDocument('projectEmbeddings', projectEmbeddingDoc);
    const projectDocumentId = projectDocRef.id;

    try {
      // Get chunks to embed
      let chunks;
      if (chunkIds && chunkIds.length > 0) {
        // Get specific chunks by IDs
        chunks = await this.getChunksByIds(chunkIds);
      } else {
        // Get all chunks for the project
        chunks = await this.firestoreService.getChunksByProjectId(projectId);
      }

      if (!chunks || chunks.length === 0) {
        // Update project document with failed status
        await this.firestoreService.updateDocument('projectEmbeddings', projectDocumentId, {
          status: 'failed',
          updatedAt: new Date(),
        });
        throw new NotFoundException(`No chunks found for project ${projectId}`);
      }

      // Extract text content from chunks
      const texts = chunks.map(chunk => chunk.content);
      
      // Generate embeddings in batch
      const embeddings = await this.generateEmbeddings(texts, modelName);

      // Create embedding documents with metadata
      const embeddingDtos: EmbeddingDto[] = chunks.map((chunk, index) => ({
        vector: embeddings[index],
        metadata: {
          content: chunk.content,
          source: chunk.sourceName || chunk.sourceId,
          projectId: projectId,
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
        },
        createdAt: new Date(),
      }));

      // Save embeddings to Firestore
      const embeddingIds = await this.saveEmbeddings(embeddingDtos, 'embeddings');

      // Update project document with completed status and results
      await this.firestoreService.updateDocument('projectEmbeddings', projectDocumentId, {
        embeddingIds,
        processedChunks: chunks.length,
        totalEmbeddings: embeddingIds.length,
        status: 'completed',
        updatedAt: new Date(),
      });

      return {
        projectId,
        projectDocumentId,
        processedChunks: chunks.length,
        totalEmbeddings: embeddingIds.length,
        embeddingIds,
        modelUsed: modelName,
        dimensions: this.defaultDimensions,
      };
    } catch (error) {
      // Update project document with failed status
      await this.firestoreService.updateDocument('projectEmbeddings', projectDocumentId, {
        status: 'failed',
        updatedAt: new Date(),
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for texts using OpenAI's API
   */
  private async generateEmbeddings(texts: string[], modelName: string): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new BadRequestException('No texts provided for embedding');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: modelName,
        input: texts,
        encoding_format: 'float',
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate embeddings: ${error.message}`
      );
    }
  }

  /**
   * Save embeddings to Firestore
   */
  private async saveEmbeddings(
    embeddings: EmbeddingDto[], 
    collectionName: string = 'embeddings'
  ): Promise<string[]> {
    const embeddingIds: string[] = [];
    
    for (const embedding of embeddings) {
      const docRef = await this.firestoreService.addDocument(collectionName, embedding);
      embeddingIds.push(docRef.id);
    }
    
    return embeddingIds;
  }

  /**
   * Get chunks by their IDs
   */
  private async getChunksByIds(chunkIds: string[]): Promise<any[]> {
    const chunks: any[] = [];
    
    for (const chunkId of chunkIds) {
      try {
        const chunk = await this.firestoreService.getDocument('textChunks', chunkId);
        if (chunk) {
          chunks.push(chunk);
        }
      } catch (error) {
        console.warn(`Failed to get chunk ${chunkId}:`, error.message);
      }
    }
    
    return chunks;
  }

  /**
   * Get project embedding documents by project ID
   */
  async getProjectEmbeddingDocuments(projectId: string): Promise<any[]> {
    return this.firestoreService.queryDocuments('projectEmbeddings', { projectId });
  }

  /**
   * Get a specific project embedding document by ID
   */
  async getProjectEmbeddingDocument(documentId: string): Promise<any> {
    return this.firestoreService.getDocument('projectEmbeddings', documentId);
  }
}
