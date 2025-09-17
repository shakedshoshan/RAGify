import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  GithubAuthProvider,
  FacebookAuthProvider,
  TwitterAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import type { User, UserCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

// Types
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  // Authentication methods
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  // Social authentication
  loginWithGoogle: (useRedirect?: boolean) => Promise<UserCredential>;
  loginWithGithub: (useRedirect?: boolean) => Promise<UserCredential>;
  loginWithFacebook: (useRedirect?: boolean) => Promise<UserCredential>;
  loginWithTwitter: (useRedirect?: boolean) => Promise<UserCredential>;
  // Redirect result handler
  handleRedirectResult: () => Promise<UserCredential | null>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Props
interface AuthProviderProps {
  children: React.ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Register function
  const register = async (email: string, password: string, displayName?: string): Promise<UserCredential> => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    
    return result;
  };

  // Login function
  const login = async (email: string, password: string): Promise<UserCredential> => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  // Logout function
  const logout = async (): Promise<void> => {
    return await signOut(auth);
  };

  // Reset password function
  const resetPassword = async (email: string): Promise<void> => {
    return await sendPasswordResetEmail(auth, email);
  };

  // Update user profile
  const updateUserProfile = async (displayName: string): Promise<void> => {
    if (currentUser) {
      return await updateProfile(currentUser, { displayName });
    }
    throw new Error('No user is currently signed in');
  };

  // Google sign-in
  const loginWithGoogle = async (useRedirect = false): Promise<UserCredential> => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    if (useRedirect) {
      await signInWithRedirect(auth, provider);
      // Redirect will happen, so we return a promise that never resolves
      return new Promise(() => {});
    }
    
    return await signInWithPopup(auth, provider);
  };

  // GitHub sign-in
  const loginWithGithub = async (useRedirect = false): Promise<UserCredential> => {
    const provider = new GithubAuthProvider();
    provider.addScope('user:email');
    
    if (useRedirect) {
      await signInWithRedirect(auth, provider);
      return new Promise(() => {});
    }
    
    return await signInWithPopup(auth, provider);
  };

  // Facebook sign-in
  const loginWithFacebook = async (useRedirect = false): Promise<UserCredential> => {
    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    
    if (useRedirect) {
      await signInWithRedirect(auth, provider);
      return new Promise(() => {});
    }
    
    return await signInWithPopup(auth, provider);
  };

  // Twitter sign-in
  const loginWithTwitter = async (useRedirect = false): Promise<UserCredential> => {
    const provider = new TwitterAuthProvider();
    
    if (useRedirect) {
      await signInWithRedirect(auth, provider);
      return new Promise(() => {});
    }
    
    return await signInWithPopup(auth, provider);
  };

  // Handle redirect result
  const handleRedirectResult = async (): Promise<UserCredential | null> => {
    return await getRedirectResult(auth);
  };

  // Set up auth state observer and handle redirect results
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Handle redirect results on app initialization
    const handleInitialRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User successfully signed in via redirect
          console.log('Sign-in via redirect successful:', result.user);
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
      }
    };

    handleInitialRedirect();

    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  // Context value
  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    register,
    logout,
    resetPassword,
    updateUserProfile,
    loginWithGoogle,
    loginWithGithub,
    loginWithFacebook,
    loginWithTwitter,
    handleRedirectResult,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
