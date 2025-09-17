import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCreateProject, useGetProjects, useDeleteProject } from '../hooks';
import type { Project, CreateProjectPayload } from '../types/projects_types';

const ProjectsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { createProject, isLoading: isCreating, error: createError } = useCreateProject();
  const { getProjectsByUserId, isLoading: isFetching, error: fetchError } = useGetProjects();
  const { deleteProject, isLoading: isDeleting, error: deleteError } = useDeleteProject();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load projects when component mounts or user changes
  useEffect(() => {
    if (currentUser?.uid) {
      loadProjects();
    }
  }, [currentUser?.uid]);

  const loadProjects = async () => {
    if (!currentUser?.uid) return;
    
    console.log('Loading projects for user:', currentUser.uid);
    const result = await getProjectsByUserId(currentUser.uid);
    console.log('Load projects result:', result);
    
    if (result?.data) {
      setProjects(result.data);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid || !newProjectName.trim()) return;

    setError(null);
    const projectPayload: CreateProjectPayload = {
      user_id: currentUser.uid,
      name: newProjectName.trim(),
    };

    console.log('Creating project with payload:', projectPayload);
    const result = await createProject(projectPayload);
    console.log('Create project result:', result);
    
    if (result?.data) {
      setProjects(prev => [result.data!, ...prev]);
      setNewProjectName('');
      setShowCreateForm(false);
    } else {
      setError(createError || 'Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    setError(null);
    const result = await deleteProject(projectId);
    if (result?.success) {
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } else {
      setError(deleteError || 'Failed to delete project');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isLoading = isCreating || isFetching || isDeleting;
  const displayError = error || createError || fetchError || deleteError;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
              <p className="mt-2 text-gray-600">
                Create and manage your text processing projects
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center"
            >
              <span className="mr-2">+</span>
              New Project
            </button>
          </div>
        </div>

        {/* Error Display */}
        {displayError && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{displayError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Project Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Project</h3>
                <form onSubmit={handleCreateProject}>
                  <div className="mb-4">
                    <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      id="projectName"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewProjectName('');
                        setError(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating || !newProjectName.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-md transition-colors duration-200"
                    >
                      {isCreating ? 'Creating...' : 'Create Project'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {isFetching ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Create your first project to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {project.name}
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-800 disabled:text-red-300 transition-colors duration-200"
                        title="Delete project"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="font-medium">Project ID:</span>
                      <span className="ml-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {project.project_id}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">Created:</span>
                      <span className="ml-2">{formatDate(project.createdAt)}</span>
                    </div>
                    {project.updatedAt && (
                      <div className="flex items-center">
                        <span className="font-medium">Updated:</span>
                        <span className="ml-2">{formatDate(project.updatedAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">
                {isCreating ? 'Creating project...' : 
                 isDeleting ? 'Deleting project...' : 
                 'Loading...'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage;
