import { ConversationMessage } from './retrieval.dto';

export class GenerationRequestDto {
  query: string;
  context: string;
  instruction: string;
}

export class GenerationResponseDto {
  answer: string;
  query: string;
  conversationHistory?: ConversationMessage[];
}
