import { useState, useCallback } from 'react';

// Types for the generation API
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerationRequest {
  prompt: string;
  projectId: string;
  topK?: number;
  conversationHistory?: ConversationMessage[];
}

export interface GenerationResponse {
  answer: string;
  query: string;
  conversationHistory: ConversationMessage[];
}

// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const useGeneration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (
    request: GenerationRequest,
    apiKey: string
  ): Promise<GenerationResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/generation/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: GenerationResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    generateResponse,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
