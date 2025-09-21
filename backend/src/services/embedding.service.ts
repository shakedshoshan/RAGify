import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from '@toxicoder/nestjs-kafka';
import OpenAI from 'openai';
import { FirestoreService } from './firestore.service';

@Injectable()
export class EmbeddingService {
  private openai: OpenAI;
  private readonly defaultModel = 'text-embedding-3-small';
  private readonly defaultDimensions = 512;

  constructor(
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
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
   * Generate embeddings for texts using OpenAI's API
   */
  async generateEmbeddings(texts: string[], modelName: string): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      throw new BadRequestException('No texts provided for embedding');
    }

    // Validate input - ensure no empty strings or null values
    const validTexts = texts.filter(text => text && text.trim() !== '');
    
    if (validTexts.length === 0) {
      throw new BadRequestException('No valid text content for embedding');
    }

    try {
      const response = await this.openai.embeddings.create({
        model: modelName || this.defaultModel,
        input: validTexts,
        encoding_format: 'float',
        dimensions: this.defaultDimensions,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new BadRequestException(
        `Failed to generate embeddings: ${error.message}`
      );
    }
  }


  /**
   * Get chunks by project ID from Firestore
   */
  async getChunksByProjectId(projectId: string): Promise<any[]> {
    const chunks = await this.firestoreService.getChunksByProjectId(projectId);
    
    if (!chunks || chunks.length === 0) {
      throw new NotFoundException(`No chunks found for project ${projectId}`);
    }
    
    return chunks;
  }

  /**
   * Get chunks by their IDs (made public for controller access)
   */
  async getChunksByIds(chunkIds: string[]): Promise<any[]> {
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
    
    if (chunks.length === 0) {
      throw new NotFoundException(`No chunks found for the provided chunk IDs`);
    }
    
    return chunks;
  }

  /**
   * Publish embeddings ingested event to Kafka
   */
  async publishEmbeddingsIngested(projectId: string, vectorCount: number, success: boolean): Promise<void> {
    try {
      await this.kafkaService.send({
        topic: 'embeddings-ingested',
        messages: {
          key: projectId,
          value: {
            projectId,
            vectorCount,
            success,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Failed to publish embeddings-ingested event:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }
}
