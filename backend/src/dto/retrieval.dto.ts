import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class RetrievalRequestDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsOptional()
  @IsNumber()
  topK?: number; // Optional: number of results to return, default: 5
}

export class RetrievalResponseDto {
  query: string;
  results: RetrievalResult[];
  totalResults: number;
}

export class RetrievalResult {
  content: string;
  score: number;
  metadata: {
    source: string;
    chunkId?: string;
    chunkIndex?: number;
    startIndex?: number;
    endIndex?: number;
    [key: string]: any;
  };
}
