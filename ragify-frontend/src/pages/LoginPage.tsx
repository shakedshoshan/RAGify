import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();

  // If user is already logged in, redirect to intended page or home
  if (currentUser) {
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <LoginForm />
      </div>
    </div>
  );
};
