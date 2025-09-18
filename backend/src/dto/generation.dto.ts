export class GenerationRequestDto {
  retrievedData: {
    query: string;
    totalResults: number;
    context: string;
    instruction: string;
  };
}

export class GenerationResponseDto {
  answer: string;
  query: string;
  sourcesUsed: number;
}
