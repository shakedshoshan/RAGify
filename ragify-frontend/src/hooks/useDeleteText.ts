import { useState, useCallback } from 'react';

// Types for the delete response
export interface DeleteTextResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    deletedAt: string;
  };
  error?: string;
}

// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const useDeleteText = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteText = useCallback(async (textId: string): Promise<DeleteTextResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/text/${textId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: DeleteTextResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete text');
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
    deleteText,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
