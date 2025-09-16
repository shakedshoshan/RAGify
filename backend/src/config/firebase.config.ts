import { registerAs } from '@nestjs/config';

export default registerAs('firebase', () => {
  // Clean up private key - remove quotes, fix newlines, and ensure proper PEM format
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  
  // Remove quotes, commas, and other unwanted characters
  privateKey = privateKey.replace(/["',]/g, '');
  
  // Fix newline characters (handles both \n and \a)
  privateKey = privateKey.replace(/\\[na]/g, '\n');
  
  // Ensure the key has proper PEM format
  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey;
  }
  
  if (!privateKey.includes('-----END PRIVATE KEY-----')) {
    privateKey = privateKey + '\n-----END PRIVATE KEY-----';
  }
  
  // Ensure project ID is properly formatted (no spaces, quotes, etc.)
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim().replace(/["']/g, '') || '';
  
  return {
    type: 'service_account',
    projectId: projectId,
    privateKey: privateKey,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim(),
  };
});
