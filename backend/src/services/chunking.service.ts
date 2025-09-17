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
   * Get overlap text from the end of a chunk
   */
  private getOverlapText(text: string, overlapSize: number): string {
    if (overlapSize >= text.length) {
      return text;
    }
    
    // Try to find a natural break point within the overlap region
    const overlapText = text.slice(-overlapSize);
    const naturalBreaks = ['\n\n', '\n', '. ', '! ', '? ', ', '];
    
    for (const breakPoint of naturalBreaks) {
      const lastBreak = overlapText.lastIndexOf(breakPoint);
      if (lastBreak !== -1) {
        return text.slice(-(overlapSize - lastBreak));
      }
    }
    
    // If no natural break found, use the specified overlap size
    return overlapText;
  }

  /**
   * Save chunks to Firestore for later use
   */
  async saveChunks(chunks: ChunkDto[], collectionName: string = 'textChunks'): Promise<string[]> {
    const chunkIds: string[] = [];
    
    for (const chunk of chunks) {
      const docRef = await this.firestoreService.addDocument(collectionName, chunk);
      chunkIds.push(docRef.id);
    }
    
    return chunkIds;
  }

  /**
   * Process all raw text documents for a project and chunk them
   */
  async chunkProjectTexts(
    projectId: string,
    chunkingParams?: { chunkSize?: number; chunkOverlap?: number }
  ): Promise<{
    projectId: string;
    processedTexts: number;
    totalChunks: number;
    chunkIds: string[];
  }> {
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
      const chunkSize = chunkingParams?.chunkSize || 1000;
      const chunkOverlap = chunkingParams?.chunkOverlap || 200;
      const separators = ['\n\n', '\n', '.', '!', '?', ',', ' ', ''];

      // Perform chunking
      const chunks = this.recursiveCharacterTextSplit(
        originalText,
        chunkSize,
        chunkOverlap,
        separators
      );

      // Convert to ChunkDto objects with project reference
      const chunkDtos: ChunkDto[] = chunks.map((chunk, index) => ({
        content: chunk.content,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        sourceId: textId,
        sourceName: textName,
        chunkIndex: index,
        totalChunks: chunks.length,
        project_id: projectId,
      } as ChunkDto & { project_id: string }));

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
    };
  }
}
