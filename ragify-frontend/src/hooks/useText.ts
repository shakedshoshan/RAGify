import { useState, useCallback } from 'react';

// Types for the text payload and response
export interface TextPayload {
  project_id: string;
  name: string;
  text: string;
}

export interface TextResponse {
  success: boolean;
  id?: string;
  message: string;
  data?: {
    id: string;
    project_id: string;
    name: string;
    text: string;
  };
  error?: string;
}

// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const useText = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createText = useCallback(async (textPayload: TextPayload): Promise<TextResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: TextResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to create text');
      }

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
    createText,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
