import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration
// Use environment variables with fallback to hardcoded values for development
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBJf-Gu2krwFZugYis5B2bBJ8_zpy_LCRg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ragify-491a7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ragify-491a7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ragify-491a7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "992593678328",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:992593678328:web:b9770fb94168b2b7e8500d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QKFLX7GEWE"
};

// Validate configuration
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingFields = requiredFields.filter(field => 
    !firebaseConfig[field as keyof typeof firebaseConfig] || 
    firebaseConfig[field as keyof typeof firebaseConfig].includes('your-')
  );
  
  if (missingFields.length > 0) {
    console.warn(
      'Firebase configuration is incomplete. Missing or placeholder values for:',
      missingFields.join(', ')
    );
    console.warn('Please update your environment variables or firebase config.');
  }
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Connect to emulator in development (optional)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('Connected to Firebase Auth Emulator');
  } catch (error) {
    console.warn('Failed to connect to Firebase Auth Emulator:', error);
  }
}

// Validate configuration on initialization
validateFirebaseConfig();

export default app;
