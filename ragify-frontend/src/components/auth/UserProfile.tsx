import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const UserProfile: React.FC = () => {
  const { currentUser, logout, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updateUserProfile(displayName.trim());
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleCancel = () => {
    setDisplayName(currentUser?.displayName || '');
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <span className="text-3xl font-semibold text-blue-600">
              {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <h2 className="text-3xl font-bold text-gray-900">User Profile</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500">
            {currentUser.email}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Email cannot be changed
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Display Name
          </label>
          {isEditing ? (
            <form onSubmit={handleUpdateProfile}>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your display name"
                required
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md flex-1">
                {currentUser.displayName || 'No display name set'}
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="ml-2 text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Created
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500">
            {currentUser.metadata.creationTime 
              ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
              : 'Unknown'
            }
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Sign In
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500">
            {currentUser.metadata.lastSignInTime 
              ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString()
              : 'Unknown'
            }
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Verified
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              currentUser.emailVerified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {currentUser.emailVerified ? 'Verified' : 'Not Verified'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};
