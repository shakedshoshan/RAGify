import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

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
   * Generate response using retrieved context and conversation history
   */
  async generateResponse(retrievedData: any, originalQuery: string): Promise<string> {
    try {
      const context = this.formatContextForLLM(retrievedData);
      
      // Use pre-defined instruction if available, otherwise use default
      const instruction = retrievedData.instruction || 
        "You are a helpful assistant. Use ONLY the provided context to answer the question. If the answer is not in the context, say \"I don't have enough information to answer that question based on the provided context.\"";
      
      // Build messages array for the OpenAI chat completion
      const messages: ChatCompletionMessageParam[] = [];
      
      // Add system instruction
      messages.push({
        role: 'system',
        content: instruction
      });
      
      // Add conversation history if available
      if (retrievedData.conversationHistory && retrievedData.conversationHistory.length > 0) {
        // Add previous conversation turns (limit to last 10 for context window management)
        const recentHistory = retrievedData.conversationHistory.slice(-10);
        
        // Map to OpenAI message format
        recentHistory.forEach(message => {
          messages.push({
            role: message.role.toLowerCase(),
            content: message.content
          });
        });
      }
      
      // Add context and current query as the final user message
      messages.push({
        role: 'user',
        content: `I need information based on this context:
${context}

My question is: ${originalQuery}`
      });

      const response = await this.openai.chat.completions.create({
        model: this.defaultModel,
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      let answer = response.choices[0]?.message?.content || 'No response generated';
      
      // Check if the answer indicates insufficient context
      if (answer.includes("I don't have enough information to answer that question based on the provided context") && 
          retrievedData.conversationHistory && 
          retrievedData.conversationHistory.length > 0) {
        
        // Fall back to conversation history only
        const conversationOnlyMessages: ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: 'You are a helpful assistant. Use the conversation history to provide the best possible answer. If you truly don\'t know, acknowledge that you don\'t have enough information.'
          }
        ];
        
        // Add conversation history
        const recentHistory = retrievedData.conversationHistory.slice(-10);
        recentHistory.forEach(message => {
          conversationOnlyMessages.push({
            role: message.role.toLowerCase(),
            content: message.content
          });
        });
        
        // Add current query
        conversationOnlyMessages.push({
          role: 'user',
          content: originalQuery
        });
        
        // Generate new response based only on conversation history
        const fallbackResponse = await this.openai.chat.completions.create({
          model: this.defaultModel,
          messages: conversationOnlyMessages,
          max_tokens: 1000,
          temperature: 0.7,
        });
        
        answer = fallbackResponse.choices[0]?.message?.content || answer;
      }

      return answer;
    } catch (error) {
      throw new BadRequestException(`Failed to generate response: ${error.message}`);
    }
  }
}
