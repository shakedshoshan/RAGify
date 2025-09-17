import { useState, useCallback } from 'react';
import { type ProjectResponse } from '../../types/projects_types';

// Utility function to convert Firestore timestamp to ISO string
const convertFirestoreTimestamp = (timestamp: any): string | undefined => {
  if (!timestamp) return undefined;
  
  // Handle Firestore timestamp object with _seconds and _nanoseconds
  if (timestamp._seconds && timestamp._nanoseconds !== undefined) {
    const date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
    return date.toISOString();
  }
  
  // Handle Firestore timestamp object with toDate method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // Handle already converted string
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  // Fallback: try to create date from timestamp
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return undefined;
  }
};

// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const useGetProject = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getProjectById = useCallback(async (
    projectId: string
  ): Promise<ProjectResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
        method: 'GET',
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
        throw new Error(data.message || 'Failed to get project');
      }

      // Transform the response to match our expected structure
      if (data.data) {
        return {
          ...data,
          data: {
            ...data.data,
            // Convert Firestore timestamps to ISO strings if they exist
            createdAt: convertFirestoreTimestamp(data.data.createdAt),
            updatedAt: convertFirestoreTimestamp(data.data.updatedAt),
          }
        };
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
    getProjectById,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
