import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProject } from '../hooks/project_hooks/useGetProject';
import { useDeleteText } from '../hooks/useDeleteText';
import type { Project } from '../types/projects_types';

const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { getProjectById, isLoading, error } = useGetProject();
  const { deleteText, error: deleteError } = useDeleteText();
  const [project, setProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;
    
    console.log('Loading project details for ID:', projectId);
    const result = await getProjectById(projectId);
    console.log('Project details result:', result);
    
    if (result?.data) {
      setProject(result.data);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    // Handle Firestore timestamp objects
    if (timestamp._seconds && timestamp._nanoseconds !== undefined) {
      const date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
    
    // Handle Firestore timestamp objects with toDate method
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
    
    // Handle string timestamps
    if (typeof timestamp === 'string') {
      return formatDate(timestamp);
    }
    
    return 'Invalid Date';
  };

  const handleBack = () => {
    navigate('/projects');
  };

  const handleDeleteText = async (textId: string) => {
    setDeletingId(textId);
    try {
      const result = await deleteText(textId);
      if (result?.success) {
        // Reload project data to reflect the deletion
        await loadProject();
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete text:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (textId: string) => {
    setShowDeleteConfirm(textId);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-700 text-lg">Loading project details...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error || 'Project not found'}</p>
                  {deleteError && <p className="mt-2">Delete Error: {deleteError}</p>}
                </div>
                <div className="mt-4">
                  <button
                    onClick={handleBack}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  >
                    Back to Projects
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={handleBack}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200 mb-4"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Projects
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <p className="mt-2 text-gray-600">Project Details</p>
            </div>
          </div>
        </div>

        {/* Project Information Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Basic Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project Name</label>
                    <p className="mt-1 text-sm text-gray-900 font-medium">{project.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Document ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded break-all">
                      {project.id}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 px-3 py-2 rounded break-all">
                      {project.user_id}
                    </p>
                  </div>
                  
                  {/* Documents Summary */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Associated Documents</label>
                    <div className="mt-1 flex items-center">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mr-2">
                        {project.rawTextDocuments?.length || 0}
                      </span>
                      <span className="text-sm text-gray-700">
                        {project.rawTextDocuments?.length === 1 
                          ? '1 document' 
                          : `${project.rawTextDocuments?.length || 0} documents`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Timestamps</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created At</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(project.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 font-mono">
                      Raw: {JSON.stringify(project.createdAt)}
                    </p>
                  </div>
                  
                  {project.updatedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Updated At</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(project.updatedAt)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 font-mono">
                        Raw: {JSON.stringify(project.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Associated Raw Text Documents */}
            {project.rawTextDocuments && project.rawTextDocuments.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Associated Documents ({project.rawTextDocuments.length})
                </h2>
                <div className="space-y-4">
                  {project.rawTextDocuments.map((doc) => (
                    <div key={doc.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                      <div className="px-4 py-4 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-md font-medium text-gray-900 truncate">{doc.name}</h3>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              {formatTimestamp(doc.createdAt)}
                            </span>
                            <button
                              onClick={() => confirmDelete(doc.id)}
                              disabled={deletingId === doc.id}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Delete document"
                            >
                              {deletingId === doc.id ? (
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              ) : (
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span className="truncate">ID: {doc.id}</span>
                        </div>
                      </div>
                      <div className="px-4 py-3 sm:px-6">
                        <div className="max-h-60 overflow-y-auto">
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words bg-gray-50 p-3 rounded">
                            {typeof doc.text === 'string' && doc.text.length > 500 
                              ? `${doc.text.substring(0, 500)}...` 
                              : doc.text}
                          </pre>
                        </div>
                        {typeof doc.text === 'string' && doc.text.length > 500 && (
                          <div className="mt-2 text-right">
                            <button 
                              className="text-sm text-blue-600 hover:text-blue-800"
                              onClick={() => window.alert("Full text view will be implemented in a future update")}
                            >
                              View Full Text
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Delete Confirmation Dialog */}
                      {showDeleteConfirm === doc.id && (
                        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-sm text-red-800 font-medium">
                                Are you sure you want to delete this document?
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={cancelDelete}
                                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors duration-200"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteText(doc.id)}
                                disabled={deletingId === doc.id}
                                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex space-x-4">
                <button
                  onClick={handleBack}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Back to Projects
                </button>
                <button
                  onClick={loadProject}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsPage;
