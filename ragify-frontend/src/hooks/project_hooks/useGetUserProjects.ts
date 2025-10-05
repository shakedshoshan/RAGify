import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { type ProjectListResponse, type Project } from '../../types/projects_types';

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

export const useGetUserProjects = () => {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const fetchUserProjects = useCallback(async (
    userId?: string
  ): Promise<ProjectListResponse | null> => {
    const userIdToUse = userId || currentUser?.uid;
    
    if (!userIdToUse) {
      setError('No user ID available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/projects/user/${userIdToUse}`, {
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
        throw new Error(data.message || 'Failed to get projects');
      }

      // Transform the response to match our expected structure
      if (data.data) {
        const transformedProjects = data.data.map(project => ({
          ...project,
          // Convert Firestore timestamps to ISO strings if they exist
          createdAt: convertFirestoreTimestamp(project.createdAt),
          updatedAt: convertFirestoreTimestamp(project.updatedAt),
        }));

        setProjects(transformedProjects);
        
        return {
          ...data,
          data: transformedProjects
        };
      }

      setProjects([]);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      setProjects(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  // Automatically fetch projects when user changes
  useEffect(() => {
    if (currentUser?.uid) {
      fetchUserProjects();
    } else {
      setProjects(null);
      setError(null);
    }
  }, [currentUser?.uid, fetchUserProjects]);

  const refetch = useCallback(() => {
    if (currentUser?.uid) {
      return fetchUserProjects();
    }
    return Promise.resolve(null);
  }, [currentUser?.uid, fetchUserProjects]);

  return {
    projects,
    isLoading,
    error,
    fetchUserProjects,
    refetch,
    clearError: () => setError(null),
  };
};
