import React from 'react';
import { RegisterForm } from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
  const { currentUser } = useAuth();

  // If user is already logged in, redirect to home
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <RegisterForm />
      </div>
    </div>
  );
};
