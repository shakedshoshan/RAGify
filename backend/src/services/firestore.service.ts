import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Firestore, Query } from 'firebase-admin/firestore';

@Injectable()
export class FirestoreService {
  private firestore: Firestore;

  constructor(private configService: ConfigService) {
    // Initialize Firebase Admin SDK if not already initialized
    if (!admin.apps.length) {
      try {
        const firebaseConfig = this.configService.get('firebase');
        
        if (!firebaseConfig) {
          throw new Error('Firebase configuration is missing');
        }
        
        console.log('Firebase config available:', !!firebaseConfig);
        console.log('Project ID:', firebaseConfig.projectId || 'MISSING');
        
        if (firebaseConfig.projectId && firebaseConfig.privateKey && firebaseConfig.clientEmail) {
          // Use individual environment variables
          try {
            admin.initializeApp({
              credential: admin.credential.cert({
                projectId: firebaseConfig.projectId,
                privateKey: firebaseConfig.privateKey,
                clientEmail: firebaseConfig.clientEmail,
              }),
            });
            console.log('Firebase initialized with service account credentials');
          } catch (error) {
            console.error('Failed to initialize Firebase with service account credentials:', error);
            
            // Try a different approach if the error is related to the private key or project ID
            if (error.message?.includes('Failed to parse private key') || 
                error.message?.includes('Unable to detect a Project Id')) {
              console.log('Attempting alternative initialization method...');
              
              // Try with application default credentials
              try {
                admin.initializeApp({
                  projectId: firebaseConfig.projectId
                });
                console.log('Firebase initialized with application default credentials');
              } catch (adcError) {
                console.error('ADC initialization failed:', adcError);
                
                // Last resort - try with no arguments
                try {
                  admin.initializeApp();
                  console.log('Firebase initialized with no arguments');
                } catch (fallbackError) {
                  console.error('All initialization methods failed:', fallbackError);
                  throw fallbackError;
                }
              }
            } else {
              throw error;
            }
          }
        } else {
          // Use application default credentials (for production/cloud deployment)
          try {
            admin.initializeApp({
              credential: admin.credential.applicationDefault(),
              projectId: firebaseConfig.projectId || undefined
            });
            console.log('Firebase initialized with application default credentials');
          } catch (error) {
            console.error('Failed to initialize Firebase with application default credentials:', error);
            
            // Last resort - try with no arguments
            try {
              admin.initializeApp();
              console.log('Firebase initialized with no arguments');
            } catch (fallbackError) {
              console.error('All initialization methods failed:', fallbackError);
              throw fallbackError;
            }
          }
        }
      } catch (error) {
        console.error('Error during Firebase initialization:', error);
        throw error;
      }
    }
    
    try {
      this.firestore = admin.firestore();
      console.log('Firestore initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firestore:', error);
      throw error;
    }
  }

  /**
   * Get a reference to a Firestore collection
   * @param collectionName The name of the collection
   * @returns A reference to the collection
   */
  getCollection(collectionName: string) {
    return this.firestore.collection(collectionName);
  }

  /**
   * Add a document to a collection
   * @param collectionName The name of the collection
   * @param data The data to add
   * @returns A promise that resolves to the document reference
   */
  async addDocument(collectionName: string, data: any) {
    const collection = this.getCollection(collectionName);
    const docRef = await collection.add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return docRef;
  }

  /**
   * Get a document by ID
   * @param collectionName The name of the collection
   * @param id The document ID
   * @returns A promise that resolves to the document data
   */
  async getDocument(collectionName: string, id: string) {
    const docRef = this.getCollection(collectionName).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Update a document
   * @param collectionName The name of the collection
   * @param id The document ID
   * @param data The data to update
   * @returns A promise that resolves when the update is complete
   */
  async updateDocument(collectionName: string, id: string, data: any) {
    const docRef = this.getCollection(collectionName).doc(id);
    await docRef.update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return docRef;
  }

  /**
   * Delete a document
   * @param collectionName The name of the collection
   * @param id The document ID
   * @returns A promise that resolves when the deletion is complete
   */
  async deleteDocument(collectionName: string, id: string) {
    const docRef = this.getCollection(collectionName).doc(id);
    await docRef.delete();
    
    return true;
  }

  /**
   * Query documents in a collection
   * @param collectionName The name of the collection
   * @param filters Optional filters to apply to the query
   * @returns A promise that resolves to the query results
   */
  async queryDocuments(collectionName: string, filters?: Record<string, any>) {
    let query: Query = this.getCollection(collectionName); 
    
    if (filters) {
      Object.entries(filters).forEach(([field, value]: [string, any]) => {
        query = query.where(field, '==', value);
      });
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}
