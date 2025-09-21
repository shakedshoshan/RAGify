import { Injectable, NotFoundException } from '@nestjs/common';
import { ChunkDto } from '../dto/chunk.dto';
import { FirestoreService } from './firestore.service';

@Injectable()
export class ChunkingService {
  constructor(private readonly firestoreService: FirestoreService) {}

  /**
   * Recursive character text splitting implementation
   */
  private recursiveCharacterTextSplit(
    text: string,
    chunkSize: number,
    chunkOverlap: number,
    separators: string[]
  ): Array<{ content: string; startIndex: number; endIndex: number }> {
    const chunks: Array<{ content: string; startIndex: number; endIndex: number }> = [];
    
    // Start the recursive splitting process
    this.splitTextRecursively(text, 0, separators, chunkSize, chunkOverlap, chunks);
    
    return chunks;
  }

  /**
   * Recursively split text using the hierarchy of separators
   */
  private splitTextRecursively(
    text: string,
    startOffset: number,
    separators: string[],
    chunkSize: number,
    chunkOverlap: number,
    chunks: Array<{ content: string; startIndex: number; endIndex: number }>
  ): void {
    // Base case: if text is small enough, add it as a chunk
    if (text.length <= chunkSize) {
      if (text.trim().length > 0) {
        chunks.push({
          content: text,
          startIndex: startOffset,
          endIndex: startOffset + text.length,
        });
      }
      return;
    }

    // Find the best separator to use
    let bestSeparator = '';
    let bestSeparatorIndex = -1;

    for (const separator of separators) {
      if (separator === '') {
        // Empty string means character-by-character splitting
        bestSeparator = separator;
        bestSeparatorIndex = 0;
        break;
      }

      const index = text.indexOf(separator);
      if (index !== -1) {
        bestSeparator = separator;
        bestSeparatorIndex = index;
        break;
      }
    }

    // If no separator found, use character splitting
    if (bestSeparatorIndex === -1) {
      bestSeparator = '';
    }

    // Split the text
    let textParts: string[];
    if (bestSeparator === '') {
      // Character-by-character splitting
      textParts = this.splitByCharacter(text, chunkSize);
    } else {
      // Split by separator
      textParts = text.split(bestSeparator);
    }

    // Merge parts into chunks with overlap
    this.mergePartsIntoChunks(
      textParts,
      bestSeparator,
      startOffset,
      chunkSize,
      chunkOverlap,
      separators,
      chunks
    );
  }

  /**
   * Split text character by character when no separator works
   */
  private splitByCharacter(text: string, chunkSize: number): string[] {
    const parts: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      parts.push(text.slice(i, i + chunkSize));
    }
    return parts;
  }
  
  /**
   * Fixed-size chunking without respecting semantic boundaries
   * This is useful for very structured data or when semantic boundaries are not important
   */
  private fixedSizeChunking(
    text: string, 
    chunkSize: number, 
    chunkOverlap: number
  ): Array<{ content: string; startIndex: number; endIndex: number }> {
    const chunks: Array<{ content: string; startIndex: number; endIndex: number }> = [];
    const step = chunkSize - chunkOverlap;
    
    // Ensure step is at least 1 to avoid infinite loop
    const safeStep = Math.max(1, step);
    
    for (let i = 0; i < text.length; i += safeStep) {
      // Don't go beyond the end of the text
      const end = Math.min(i + chunkSize, text.length);
      const chunk = text.slice(i, end);
      
      // Only add non-empty chunks
      if (chunk.trim().length > 0) {
        chunks.push({
          content: chunk,
          startIndex: i,
          endIndex: end
        });
      }
      
      // If we've reached the end of the text, break
      if (end === text.length) break;
    }
    
    return chunks;
  }
  
  /**
   * Hybrid chunking that balances semantic and fixed-size approaches
   * This first tries to chunk at paragraph/sentence level, then falls back to fixed-size if chunks are too large
   */
  private hybridChunking(
    text: string,
    chunkSize: number,
    chunkOverlap: number
  ): Array<{ content: string; startIndex: number; endIndex: number }> {
    const chunks: Array<{ content: string; startIndex: number; endIndex: number }> = [];
    
    // First, split by paragraphs
    const paragraphs = text.split(/\n\n+/);
    let currentIndex = 0;
    
    for (const paragraph of paragraphs) {
      const paragraphLength = paragraph.length;
      
      // If paragraph is small enough, add it directly
      if (paragraphLength <= chunkSize) {
        if (paragraph.trim().length > 0) {
          chunks.push({
            content: paragraph,
            startIndex: currentIndex,
            endIndex: currentIndex + paragraphLength
          });
        }
        currentIndex += paragraphLength + 2; // +2 for the '\n\n' separator
        continue;
      }
      
      // For larger paragraphs, split by sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let currentChunk = '';
      let chunkStartIndex = currentIndex;
      
      for (const sentence of sentences) {
        // If adding this sentence would exceed chunk size and we already have content
        if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
          // Add current chunk
          chunks.push({
            content: currentChunk.trim(),
            startIndex: chunkStartIndex,
            endIndex: chunkStartIndex + currentChunk.length
          });
          
          // Calculate overlap
          const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
          const overlapLength = overlapText.length;
          
          // Start new chunk with overlap
          currentChunk = overlapText + sentence;
          chunkStartIndex = chunkStartIndex + currentChunk.length - overlapLength;
        } else {
          // Add sentence to current chunk
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
      
      // Add the last chunk if it has content
      if (currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          startIndex: chunkStartIndex,
          endIndex: chunkStartIndex + currentChunk.length
        });
      }
      
      currentIndex += paragraphLength + 2; // +2 for the '\n\n' separator
    }
    
    return chunks;
  }

  /**
   * Merge text parts into chunks with proper overlap handling
   */
  private mergePartsIntoChunks(
    parts: string[],
    separator: string,
    startOffset: number,
    chunkSize: number,
    chunkOverlap: number,
    separators: string[],
    chunks: Array<{ content: string; startIndex: number; endIndex: number }>
  ): void {
    let currentChunk = '';
    let currentChunkStartOffset = startOffset;
    let currentOffset = startOffset;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partWithSeparator = i === parts.length - 1 ? part : part + separator;
      
      // Check if adding this part would exceed chunk size
      if (currentChunk.length + partWithSeparator.length > chunkSize && currentChunk.length > 0) {
        // Add current chunk
        chunks.push({
          content: currentChunk.trim(),
          startIndex: currentChunkStartOffset,
          endIndex: currentOffset,
        });

        // Calculate overlap for next chunk
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        const overlapLength = overlapText.length;
        
        // Start new chunk with overlap
        currentChunk = overlapText + partWithSeparator;
        currentChunkStartOffset = currentOffset - overlapLength;
      } else {
        // Add part to current chunk
        currentChunk += partWithSeparator;
        if (currentChunk.length === partWithSeparator.length) {
          // This is the first part of the chunk
          currentChunkStartOffset = currentOffset;
        }
      }

      currentOffset += partWithSeparator.length;
    }

    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      // If the chunk is still too large, recursively split it
      if (currentChunk.length > chunkSize) {
        this.splitTextRecursively(
          currentChunk,
          currentChunkStartOffset,
          separators.slice(1), // Use next level of separators
          chunkSize,
          chunkOverlap,
          chunks
        );
      } else {
        chunks.push({
          content: currentChunk.trim(),
          startIndex: currentChunkStartOffset,
          endIndex: currentOffset,
        });
      }
    }
  }

  /**
   * Get overlap text from the end of a chunk with improved natural break detection
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (overlapSize >= text.length) {
      return text;
    }
    
    // Get the potential overlap text
    const overlapText = text.slice(-overlapSize);
    
    // Enhanced list of natural breaks in order of preference
    const naturalBreaks = [
      '\n\n\n', // Triple line break (section boundary)
      '\n\n',   // Double line break (paragraph boundary)
      '\n',     // Single line break
      '. ',     // End of sentence with space (to avoid breaking decimals)
      '! ',     // End of exclamation sentence
      '? ',     // End of question sentence
      ': ',     // Colon (often introduces lists or explanations)
      '; ',     // Semicolon (often separates related clauses)
      ', ',     // Comma with space (to avoid breaking numbers)
    ];
    
    // Try to find the best natural break point
    for (const breakPoint of naturalBreaks) {
      const lastBreak = overlapText.lastIndexOf(breakPoint);
      if (lastBreak !== -1) {
        // Include the break point in the overlap for better context
        const overlappedText = text.slice(-(overlapSize - lastBreak));
        
        // Ensure we're not returning an empty string
        if (overlappedText.trim().length > 0) {
          return overlappedText;
        }
      }
    }
    
    // If no suitable natural break found, try to at least break at a word boundary
    const lastSpace = overlapText.lastIndexOf(' ');
    if (lastSpace !== -1 && lastSpace > overlapSize * 0.5) {
      // Only use word boundary if it's at least halfway through the overlap
      return text.slice(-(overlapSize - lastSpace));
    }
    
    // If no good break point found, use the specified overlap size
    return overlapText;
  }

  /**
   * Save chunks to Firestore for later use
   */
  async saveChunks(chunks: ChunkDto[], collectionName: string = 'textChunks'): Promise<string[]> {
    const chunkIds: string[] = [];
    
    // First save all chunks to get their IDs
    for (const chunk of chunks) {
      const docRef = await this.firestoreService.addDocument(collectionName, chunk);
      chunkIds.push(docRef.id);
    }
    
    // Then update chunks with previous and next chunk IDs for better context linking
    if (chunkIds.length > 1) {
      for (let i = 0; i < chunkIds.length; i++) {
        const updates: Partial<ChunkDto> = {};
        
        // Set previous chunk ID if not the first chunk
        if (i > 0) {
          updates.previousChunkId = chunkIds[i - 1];
        }
        
        // Set next chunk ID if not the last chunk
        if (i < chunkIds.length - 1) {
          updates.nextChunkId = chunkIds[i + 1];
        }
        
        // Update the chunk with the new references if we have updates
        if (Object.keys(updates).length > 0) {
          await this.firestoreService.updateDocument(collectionName, chunkIds[i], updates);
        }
      }
    }
    
    return chunkIds;
  }

  /**
   * Delete all existing chunks for a project
   * @param projectId The project ID to delete chunks for
   * @returns The number of deleted chunks
   */
  async deleteExistingChunks(projectId: string): Promise<number> {
    return this.firestoreService.deleteChunksByProjectId(projectId);
  }

  /**
   * Process all raw text documents for a project and chunk them
   * @param projectId The project ID to process
   * @param chunkingParams Optional chunking parameters
   * @param deleteExisting Whether to delete existing chunks before processing (default: false)
   */
  async chunkProjectTexts(
    projectId: string,
    chunkingParams?: { 
      chunkSize?: number; 
      chunkOverlap?: number;
      chunkingStrategy?: 'semantic' | 'fixed' | 'hybrid';
    },
    deleteExisting: boolean = false
  ): Promise<{
    projectId: string;
    processedTexts: number;
    totalChunks: number;
    chunkIds: string[];
    deletedChunks?: number;
    chunkingStrategy?: string;
  }> {
    let deletedChunks = 0;
    
    // Delete existing chunks if requested
    if (deleteExisting) {
      deletedChunks = await this.deleteExistingChunks(projectId);
    }
    
    // Get all raw text documents for the project
    const rawTexts = await this.firestoreService.getRawTextsByProjectId(projectId);
    
    if (!rawTexts || rawTexts.length === 0) {
      throw new NotFoundException(`No raw text documents found for project ${projectId}`);
    }

    const allChunkIds: string[] = [];
    let totalChunks = 0;

    // Process each text document
    for (const rawText of rawTexts) {
      const textId = rawText.id;
      const textName = rawText.name || 'Unknown';
      const originalText = rawText.text;

      // Use default values if not provided in params
      // Smaller chunk size (500) is optimal for RAG systems based on research
      const chunkSize = chunkingParams?.chunkSize || 500;
      // Overlap of 15% of chunk size for better context preservation
      const chunkOverlap = chunkingParams?.chunkOverlap || Math.floor(chunkSize * 0.15);
      // Get the chunking strategy (default to semantic)
      const chunkingStrategy = chunkingParams?.chunkingStrategy || 'semantic';
      
      let chunks: Array<{ content: string; startIndex: number; endIndex: number }>;
      
      // Choose chunking strategy based on parameter
      switch (chunkingStrategy) {
        case 'fixed':
          // Fixed-size chunking without respecting semantic boundaries
          chunks = this.fixedSizeChunking(originalText, chunkSize, chunkOverlap);
          break;
          
        case 'hybrid':
          // Hybrid approach that balances semantic and fixed-size chunking
          chunks = this.hybridChunking(originalText, chunkSize, chunkOverlap);
          break;
          
        case 'semantic':
        default:
          // Semantic chunking with enhanced separator hierarchy
          // Order matters: from largest semantic units to smallest
          const separators = [
            '\n\n\n', // Multiple paragraph breaks (sections)
            '\n\n',   // Paragraph breaks
            '\n',     // Line breaks
            '. ',     // Sentences (with space to avoid breaking decimals)
            '! ',     // Exclamation sentences
            '? ',     // Question sentences
            ': ',     // Colons (often introduce lists or explanations)
            '; ',     // Semicolons (often separate related clauses)
            ', ',     // Commas (with space to avoid breaking numbers)
            ' ',      // Words
            ''        // Characters (last resort)
          ];
          
          // Perform semantic chunking
          chunks = this.recursiveCharacterTextSplit(
            originalText,
            chunkSize,
            chunkOverlap,
            separators
          );
          break;
      }

      // Convert to ChunkDto objects with project reference and enhanced metadata
      const chunkDtos: ChunkDto[] = chunks.map((chunk, index) => {
        // Extract the first 50 characters or less for the content prefix
        const contentPrefix = chunk.content.substring(0, 50).trim();
        
        // Determine content type based on the separators used
        let contentType = 'text';
        if (chunk.content.includes('\n\n')) {
          contentType = 'paragraph';
        } else if (chunk.content.includes('\n')) {
          contentType = 'line';
        } else if (chunk.content.includes('. ')) {
          contentType = 'sentence';
        }
        
        // Extract simple keywords (basic implementation - could be enhanced)
        const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'of'];
        const words = chunk.content
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 3 && !stopWords.includes(word));
        
        // Count word frequency and get top keywords
        const wordFreq: Record<string, number> = {};
        words.forEach(word => {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        });
        
        // Get top 5 keywords
        const keywords = Object.entries(wordFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word]) => word);
        
        return {
          content: chunk.content,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          sourceId: textId,
          sourceName: textName,
          chunkIndex: index,
          totalChunks: chunks.length,
          project_id: projectId,
          
          // Enhanced metadata
          chunkSize: chunkSize,
          chunkOverlap: chunkOverlap,
          createdAt: new Date(),
          contentPrefix: contentPrefix,
          contentType: contentType,
          keywords: keywords,
          // previousChunkId and nextChunkId will be populated after saving
        } as ChunkDto & { project_id: string };
      });

      // Save chunks to Firestore
      const chunkIds = await this.saveChunks(chunkDtos, 'textChunks');
      allChunkIds.push(...chunkIds);
      totalChunks += chunks.length;
    }

    return {
      projectId: projectId,
      processedTexts: rawTexts.length,
      totalChunks: totalChunks,
      chunkIds: allChunkIds,
      deletedChunks: deletedChunks,
      chunkingStrategy: chunkingParams?.chunkingStrategy || 'semantic',
    };
  }
}
