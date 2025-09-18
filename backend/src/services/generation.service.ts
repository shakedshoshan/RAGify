import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class GenerationService {
  private openai: OpenAI;
  private readonly defaultModel = 'gpt-3.5-turbo';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Format retrieved data for LLM prompt
   */
  private formatContextForLLM(retrievedData: any): string {
    // Use pre-formatted context if available, otherwise format it
    if (retrievedData.context) {
      return retrievedData.context;
    }
    
    const context = retrievedData.results
      .map((result: any, index: number) => 
        `[${index + 1}] ${result.content}`
      )
      .join('\n\n');
    
    return context;
  }

  /**
   * Generate response using retrieved context
   */
  async generateResponse(retrievedData: any, originalQuery: string): Promise<string> {
    try {
      const context = this.formatContextForLLM(retrievedData);
      
      // Use pre-defined instruction if available, otherwise use default
      const instruction = retrievedData.instruction || 
        "You are a helpful assistant. Use ONLY the provided context to answer the question. If the answer is not in the context, say \"I don't have enough information to answer that question based on the provided context.\"";
      
      const prompt = `${instruction}

Context:
${context}

Original Query: ${originalQuery}

Answer:`;

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      throw new BadRequestException(`Failed to generate response: ${error.message}`);
    }
  }
}
