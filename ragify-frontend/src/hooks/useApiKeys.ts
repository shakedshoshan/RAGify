import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  description: string;
  key_prefix: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiKeyWithSecret extends ApiKey {
  api_key: string;
}

interface ApiKeyResponse {
  success: boolean;
  message?: string;
  data?: ApiKey | ApiKey[] | ApiKeyWithSecret;
  error?: string;
}

export const useApiKeys = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const baseUrl = import.meta.env.DEV_URL || 'http://localhost:5000';

  const getApiKeys = async (): Promise<ApiKey[]> => {
    if (!currentUser?.uid) throw new Error('No user logged in');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/apikey/user/${currentUser.uid}`);
      const result: ApiKeyResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch API keys');
      }
      
      return result.data as ApiKey[];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async (name: string): Promise<ApiKeyWithSecret | null> => {
    if (!currentUser?.uid) throw new Error('No user logged in');
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/apikey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser.uid,
          name,
        }),
      });
      
      const result: ApiKeyResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create API key');
      }
      
      return result.data as ApiKeyWithSecret;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const revokeApiKey = async (keyId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/apikey/${keyId}/revoke`, {
        method: 'PUT',
      });
      
      const result: ApiKeyResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to revoke API key');
      }
      
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteApiKey = async (keyId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/apikey/${keyId}`, {
        method: 'DELETE',
      });
      
      const result: ApiKeyResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete API key');
      }
      
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getApiKeys,
    createApiKey,
    revokeApiKey,
    deleteApiKey,
  };
};
