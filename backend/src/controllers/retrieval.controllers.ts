import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { EmbeddingService } from '../services/embedding.service';
import { PineconeService } from '../services/pinecone.service';
import { RetrievalRequestDto, RetrievalResponseDto, RetrievalResult } from '../dto/retrieval.dto';
import { GenerationRequestDto } from '../dto/generation.dto';

@Controller('retrieval')
export class RetrievalController {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly pineconeService: PineconeService
  ) {}

  @Post('query')
  async queryDocuments(@Body() requestDto: RetrievalRequestDto): Promise<GenerationRequestDto> {
    console.log('Raw request body:', JSON.stringify(requestDto, null, 2));
    const { prompt, projectId, topK = 5 } = requestDto;
    console.log('Destructured prompt:', prompt);

    // Additional validation (DTO validation should handle most cases)
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
        retrievedData: {
          query: prompt,
          totalResults: 0,
          context: "",
          instruction: "You are a helpful assistant. Use ONLY the provided context to answer the question. If the answer is not in the context, say \"I don't have enough information to answer that question based on the provided context.\""
        }
      };
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
      retrievedData: {
        query: prompt,
        totalResults: results.length,
        context: context,
        instruction: "You are a helpful assistant. Use ONLY the provided context to answer the question. If the answer is not in the context, say \"I don't have enough information to answer that question based on the provided context.\""
      }
    };
  }
}
