import React from 'react';
import { UserProfile } from '../components/auth/UserProfile';

export const ProfilePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto">
        <UserProfile />
      </div>
    </div>
  );
};
