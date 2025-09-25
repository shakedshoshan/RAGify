import React, { useState, useEffect } from 'react';
import { useApiKeys } from '../../hooks/useApiKeys';
import { ApiKeyPopup } from './ApiKeyPopup';

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

export const ApiKeyManagement: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyWithSecret | null>(null);
  const { loading, error, getApiKeys, createApiKey, revokeApiKey, deleteApiKey } = useApiKeys();

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    const keys = await getApiKeys();
    setApiKeys(keys);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const result = await createApiKey(newKeyName);
    if (result) {
      setNewlyCreatedKey(result);
      setNewKeyName('');
      loadApiKeys();
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (await revokeApiKey(keyId)) {
      loadApiKeys();
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (window.confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      if (await deleteApiKey(keyId)) {
        loadApiKeys();
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Create New API Key</h2>
        <form onSubmit={handleCreateKey} className="space-y-4">
          <div>
            <label htmlFor="keyName" className="block text-sm font-medium text-gray-700">
              Key Name
            </label>
            <input
              type="text"
              id="keyName"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Enter a name for your API key"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !newKeyName.trim()}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Create API Key
          </button>
        </form>
      </div>

      {newlyCreatedKey && (
        <ApiKeyPopup
          apiKey={newlyCreatedKey.api_key}
          onClose={() => setNewlyCreatedKey(null)}
        />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Your API Keys</h2>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No API keys found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {apiKeys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {key.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(key.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          key.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {key.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {key.is_active && (
                        <button
                          onClick={() => handleRevokeKey(key.id)}
                          className="text-yellow-600 hover:text-yellow-900 mr-4"
                        >
                          Revoke
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
