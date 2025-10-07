import { useState } from 'react';
import axios from 'axios';
import { type RagPrepareParams, type RagPrepareResponse, type RagStatusResponse } from '../types/rag_prepare_types';

export const useRagPrepare = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RagStatusResponse['data'] | null>(null);

  const API_BASE_URL = 'http://localhost:5000';

  const prepareRag = async (projectId: string, params?: RagPrepareParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post<RagPrepareResponse>(
        `${API_BASE_URL}/rag/prepare/${projectId}`,
        params
      );
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to prepare RAG';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getRagStatus = async (projectId: string, correlationId: string) => {
    try {
      const response = await axios.get<RagStatusResponse>(
        `${API_BASE_URL}/rag/status/${projectId}/${correlationId}`
      );
      setStatus(response.data.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get RAG status';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    prepareRag,
    getRagStatus,
    isLoading,
    error,
    status,
  };
};
