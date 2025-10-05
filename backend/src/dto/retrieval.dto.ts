import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export class ConversationMessage {
  @IsEnum(MessageRole)
  @IsNotEmpty()
  role: MessageRole;

  @IsString()
  @IsNotEmpty()
  content: string;
}

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
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessage)
  conversationHistory?: ConversationMessage[];
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
