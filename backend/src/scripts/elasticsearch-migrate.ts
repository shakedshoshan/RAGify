/**
 * Elasticsearch Migration Script
 * 
 * Purpose:
 * This script migrates all existing rawText documents from Firestore to Elasticsearch.
 * It's designed to be run once after initial Elasticsearch setup, or whenever you need
 * to re-index all documents (e.g., after changing index mappings).
 * 
 * Usage:
 * npm run elastic:migrate
 * 
 * Requirements:
 * - Firestore must be properly configured with credentials in .env
 * - Elasticsearch must be running and accessible
 * - ELASTICSEARCH_NODE environment variable must be set
 * 
 * What it does:
 * 1. Connects to Firebase/Firestore
 * 2. Connects to Elasticsearch
 * 3. Fetches ALL rawText documents from Firestore
 * 4. Bulk indexes them to Elasticsearch in batches of 100
 * 5. Reports progress and any errors
 * 
 * Note: This script is idempotent - running it multiple times will update existing
 * documents rather than create duplicates.
 */

import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { Client } from '@elastic/elasticsearch';

// Load environment variables from .env file
dotenv.config();

/**
 * Main migration function
 * Orchestrates the entire migration process from Firestore to Elasticsearch
 */
async function migrateRawTexts() {
  console.log('🚀 Starting Elasticsearch migration...');

  // ==========================================
  // STEP 1: Initialize Firebase Admin SDK
  // ==========================================
  // We need Firebase to read all documents from the rawText collection
  try {
    // Check if Firebase is already initialized (prevents re-initialization errors)
    if (!admin.apps.length) {
      // Read Firebase credentials from environment variables
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Validate that all required credentials are present
      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            // Replace escaped newlines with actual newlines in private key
            // This is necessary because .env files store multi-line keys as single lines
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail,
          }),
        });
        console.log('✅ Firebase initialized successfully');
      } else {
        throw new Error('Firebase credentials not found in environment variables');
      }
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error.message);
    process.exit(1); // Exit with error code
  }

  // ==========================================
  // STEP 2: Initialize Elasticsearch Client
  // ==========================================
  // Configure Elasticsearch client with authentication
  
  // Helper function to determine authentication method
  function getClientAuthConfig() {
    if (process.env.ELASTICSEARCH_API_KEY) {
      return {
        apiKey: process.env.ELASTICSEARCH_API_KEY,
      };
    } else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
      return {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      };
    }
    return undefined;
  }
  
  // Connection URL or Cloud ID
  const esUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
  const cloudId = process.env.ELASTICSEARCH_CLOUD_ID;
  
  const esClient = new Client({
    // Connection - use either direct URL or Cloud ID
    node: esUrl,
    cloud: cloudId ? { id: cloudId } : undefined,
    
    // Authentication - use either API key or username/password
    auth: getClientAuthConfig(),
    
    // Client options
    maxRetries: 5,
    requestTimeout: 60000,
  });
  
  // Define the index name
  const indexName = process.env.ELASTICSEARCH_INDEX_NAME || 'search-ragify';

  try {
    // Test Elasticsearch connection with a simple ping
    await esClient.ping();
    console.log('✅ Connected to Elasticsearch');
    console.log(`Using index: ${indexName}`);
  } catch (error) {
    console.error('❌ Failed to connect to Elasticsearch:', error.message);
    console.error('Make sure Elasticsearch is running on:', esUrl);
    process.exit(1);
  }

  try {
    // ==========================================
    // STEP 3: Fetch All Documents from Firestore
    // ==========================================
    // Get reference to Firestore database and rawText collection
    const firestore = admin.firestore();
    const rawTextCollection = firestore.collection('rawText');

    console.log('📥 Fetching all rawText documents from Firestore...');
    // Get() fetches ALL documents in the collection - be careful with large collections
    const snapshot = await rawTextCollection.get();
    
    // Handle case where collection is empty
    if (snapshot.empty) {
      console.log('ℹ️ No documents found in rawText collection');
      console.log('Migration complete - nothing to migrate!');
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents to migrate`);

    // ==========================================
    // STEP 4: Transform Firestore Documents for Elasticsearch
    // ==========================================
    // Prepare documents array in the format Elasticsearch expects
    const documents: Array<{ id: string; doc: any }> = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        id: doc.id, // Use Firestore document ID as Elasticsearch document ID
        doc: {
          project_id: data.project_id,
          name: data.name,
          text: data.text,
          // Convert Firestore timestamps to ISO strings
          // Firestore timestamps need .toDate() before .toISOString()
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        },
      });
    });

    // ==========================================
    // STEP 5: Bulk Index to Elasticsearch
    // ==========================================
    // Process documents in batches to avoid memory issues and timeouts
    const batchSize = 100; // Process 100 documents at a time
    let totalIndexed = 0;

    // Loop through documents in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      // Extract current batch (100 documents or remaining documents)
      const batch = documents.slice(i, i + batchSize);
      
      // Prepare bulk operations array
      // Elasticsearch bulk API requires alternating action/document pairs
      // Format: [action, document, action, document, ...]
      const operations = batch.flatMap(({ id, doc }) => [
        { index: { _index: indexName, _id: id } }, // Action: index this document
        doc,                                         // Document: the actual data
      ]);

      console.log(`📤 Indexing batch ${Math.floor(i / batchSize) + 1} (${batch.length} documents)...`);

      // Execute bulk indexing operation
      const bulkResponse = await esClient.bulk({
        refresh: true, // Make documents searchable immediately (slower but safer for migration)
        operations,
      });

      // Check for errors in bulk operation
      // Bulk operations can partially succeed - some documents may fail while others succeed
      if (bulkResponse.errors) {
        const erroredDocuments: any[] = [];
        // Iterate through response items to find which documents failed
        bulkResponse.items.forEach((action: any, idx: number) => {
          const operation = Object.keys(action)[0];
          if (action[operation].error) {
            erroredDocuments.push({
              id: batch[idx].id,
              status: action[operation].status,
              error: action[operation].error,
            });
          }
        });
        console.error(`⚠️ Some documents failed to index:`, erroredDocuments);
        // Note: We continue processing even if some documents fail
      }

      // Update progress counter
      totalIndexed += batch.length;
      console.log(`✅ Progress: ${totalIndexed}/${documents.length} documents indexed`);
    }

    console.log(`🎉 Migration completed successfully! ${totalIndexed} documents indexed to Elasticsearch`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // ==========================================
    // STEP 6: Cleanup
    // ==========================================
    // Always close the Elasticsearch client to free resources
    await esClient.close();
    console.log('👋 Disconnected from Elasticsearch');
  }
}

// Execute the migration function
// This is the entry point when running: npm run elastic:migrate
migrateRawTexts();

