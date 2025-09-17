import { useState, useCallback } from 'react';
import { type ProjectResponse } from '../../types/projects_types';

// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const useDeleteProject = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteProject = useCallback(async (
    projectId: string
  ): Promise<ProjectResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: ProjectResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete project');
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
    deleteProject,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
