import { useState, useCallback } from 'react';

// Types for PDF upload
export interface PdfUploadOptions {
  project_id: string;
  name?: string;
}

export interface PdfUploadResponse {
  success: boolean;
  id?: string;
  message: string;
  data?: {
    id: string;
    filename: string;
    size: number;
    pageCount: number;
    textContent: string;
    project_id: string;
    name: string;
  };
  error?: string;
}

// API configuration
const API_BASE_URL = 'http://localhost:5000';

export const usePdfUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPdf = useCallback(async (
    file: File, 
    options: PdfUploadOptions
  ): Promise<PdfUploadResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Log file information for debugging
      console.log('Uploading PDF file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      });

      // Build query parameters
      const queryParams = new URLSearchParams({
        project_id: options.project_id,
      });

      if (options.name) {
        queryParams.append('name', options.name);
      }

      const response = await fetch(`${API_BASE_URL}/text/upload-pdf?${queryParams}`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it automatically with the correct boundary for FormData
      });

      if (!response.ok) {
        console.error('PDF upload failed with status:', response.status);
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        
        throw new Error(errorMessage);
      }

      const data: PdfUploadResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to upload PDF');
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
    uploadPdf,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
