import { useState, useCallback } from 'react';
import { type EditTextPayload, type EditTextResponse } from '../types/projects_types';



// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const useEditText = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editText = useCallback(async (
    textId: string,
    textPayload: EditTextPayload
  ): Promise<EditTextResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/text/${textId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(textPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: EditTextResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to edit text');
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
    editText,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
