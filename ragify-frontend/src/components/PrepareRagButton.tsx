import React, { useState } from 'react';
import { useRagPrepare } from '../hooks/useRagPrepare';
import { type PrepareRagButtonProps} from '../types/rag_prepare_types';



export const PrepareRagButton: React.FC<PrepareRagButtonProps> = ({
  projectId,
  onPrepareSuccess,
  className = '',
}) => {
  const { prepareRag, isLoading, error } = useRagPrepare();
  const [showError, setShowError] = useState(false);

  const handlePrepare = async () => {
    try {
      const result = await prepareRag(projectId, {
        chunkingStrategy: 'semantic',
        modelName: 'text-embedding-3-small'
      });
      
      if (result.success && onPrepareSuccess) {
        onPrepareSuccess(result.data.correlationId);
      }
    } catch (err) {
      setShowError(true);
      setTimeout(() => setShowError(false), 5000); // Hide error after 5 seconds
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handlePrepare}
        disabled={isLoading}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm 
          ${isLoading 
            ? 'bg-blue-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'} 
          text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
          transition-colors duration-200 ${className}`}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {isLoading ? 'Preparing...' : 'Prepare RAG'}
      </button>

      {/* Error Toast */}
      {showError && error && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md">
          <div className="flex">
            <div className="py-1">
              <svg
                className="h-6 w-6 text-red-500 mr-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
