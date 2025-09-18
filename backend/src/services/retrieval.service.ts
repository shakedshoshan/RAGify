import { Injectable, BadRequestException } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { PineconeService } from './pinecone.service';
import { RetrievalRequestDto, RetrievalResult } from '../dto/retrieval.dto';
import { GenerationRequestDto } from '../dto/generation.dto';

@Injectable()
export class RetrievalService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly pineconeService: PineconeService
  ) {}

  async queryDocuments(requestDto: RetrievalRequestDto): Promise<GenerationRequestDto> {
    const { prompt, projectId, topK = 5 } = requestDto;

    // Validation
    if (!prompt || prompt.trim() === '') {
      throw new BadRequestException('Query prompt cannot be empty');
    }

    // Validate projectId
    if (!projectId || projectId.trim() === '') {
      throw new BadRequestException('Project ID is required');
    }

    // Step 1: Embed the query using the same model used for documents
    let queryEmbeddings;
    try {
      queryEmbeddings = await this.embeddingService.generateEmbeddings(
        [prompt.trim()], 
        'text-embedding-3-small'
      );
      
      if (!queryEmbeddings || queryEmbeddings.length === 0) {
        throw new BadRequestException('Failed to generate embeddings for the query');
      }
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new BadRequestException(`Error processing query: ${error.message}`);
    }
    
    const queryVector = queryEmbeddings[0];

    // Step 2: Perform vector search in Pinecone
    let searchResults;
    try {
      searchResults = await this.pineconeService.queryVectors(
        projectId,
        queryVector,
        topK
      );
    } catch (error) {
      console.error('Error querying Pinecone:', error);
      throw new BadRequestException(`Error retrieving results: ${error.message}`);
    }

    // Step 3: Format results with metadata
    if (!searchResults.matches || searchResults.matches.length === 0) {
      return {
        query: prompt,
        context: "",
        instruction: "You are a helpful assistant. Use ONLY the provided context to answer the question. If the answer is not in the context, say \"I don't have enough information to answer that question based on the provided context.\""
      }
    }
    
    const results: RetrievalResult[] = searchResults.matches.map(match => ({
      content: match.metadata?.content || '',
      score: match.score || 0,
      metadata: {
        source: match.metadata?.source || '',
        chunkId: match.metadata?.chunkId,
        chunkIndex: match.metadata?.chunkIndex,
        startIndex: match.metadata?.startIndex,
        endIndex: match.metadata?.endIndex,
        ...(match.metadata || {})
      }
    }));

    // Format context for RAG
    const context = results
      .map((result, index) => `[${index + 1}] ${result.content}`)
      .join('\n\n');

    // Return data formatted for generation service
    return {
      query: prompt,
      context: context,
      instruction: "You are a helpful assistant. Use ONLY the provided context to answer the question. If the answer is not in the context, say \"I don't have enough information to answer that question based on the provided context.\""
    }
  }
}