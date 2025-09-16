import { useState, useCallback } from 'react';

// Types for CSV upload
export interface CsvUploadOptions {
  project_id: string;
  delimiter?: string;
  skipEmptyLines?: boolean;
  name?: string;
}

export interface CsvUploadResponse {
  success: boolean;
  id?: string;
  message: string;
  data?: {
    id: string;
    filename: string;
    size: number;
    rowCount: number;
    headers: string[];
    project_id: string;
    name: string;
  };
  error?: string;
}

// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const useCsvUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadCsv = useCallback(async (
    file: File, 
    options: CsvUploadOptions
  ): Promise<CsvUploadResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Build query parameters
      const queryParams = new URLSearchParams({
        project_id: options.project_id,
      });

      if (options.delimiter) {
        queryParams.append('delimiter', options.delimiter);
      }
      
      if (options.skipEmptyLines !== undefined) {
        queryParams.append('skipEmptyLines', options.skipEmptyLines.toString());
      }
      
      if (options.name) {
        queryParams.append('name', options.name);
      }

      const response = await fetch(`${API_BASE_URL}/text/upload-csv?${queryParams}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data: CsvUploadResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to upload CSV');
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
    uploadCsv,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
