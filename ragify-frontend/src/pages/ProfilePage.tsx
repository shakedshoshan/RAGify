import React, { useState } from 'react';
import { UserProfile } from '../components/auth/UserProfile';
import { ApiKeyManagement } from '../components/auth/ApiKeyManagement';

type TabType = 'profile' | 'apikeys';

export const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  return (
    <div className="min-h-screen bg-gradient-to-r from-indigo-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <nav className="flex border-b border-gray-200 bg-gray-100">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 text-sm font-medium transition-colors duration-300 ${
                activeTab === 'profile'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('apikeys')}
              className={`px-6 py-4 text-sm font-medium transition-colors duration-300 ${
                activeTab === 'apikeys'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              API Keys
            </button>
          </nav>
          <div className="p-6 bg-gray-50">
            {activeTab === 'profile' ? <UserProfile /> : <ApiKeyManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};
