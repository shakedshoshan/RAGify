import { useState, useCallback } from 'react';
import { type ProjectListResponse } from '../../types/projects_types';

// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const useGetAllProjects = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAllProjects = useCallback(async (): Promise<ProjectListResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: ProjectListResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get all projects');
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
    getAllProjects,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
