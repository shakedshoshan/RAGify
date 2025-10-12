/**
 * Elasticsearch Serverless Configuration
 * 
 * For Elasticsearch Serverless, you need:
 * 1. Cloud ID from your deployment
 * 2. API Key for authentication
 * 
 * Environment variables required:
 * - ELASTICSEARCH_CLOUD_ID: Your serverless deployment cloud ID
 * - ELASTICSEARCH_API_KEY: Base64-encoded API key
 * 
 * For local development:
 * - ELASTICSEARCH_URL: http://localhost:9200 (no auth needed)
 */
export default () => ({
  elasticsearch: {
    // For Serverless: Use cloud ID, for local: use node URL
    ...(process.env.ELASTICSEARCH_CLOUD_ID 
      ? { cloud: { id: process.env.ELASTICSEARCH_CLOUD_ID } }
      : { node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' }
    ),
    
    // Authentication for Serverless (required)
    ...(process.env.ELASTICSEARCH_API_KEY && {
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY
      }
    }),
    
    // Client configuration
    maxRetries: 5,
    requestTimeout: 60000,
    sniffOnStart: false,
    
    // Serverless-specific settings
    ...(process.env.ELASTICSEARCH_CLOUD_ID && {
      ssl: {
        rejectUnauthorized: true, // Enforce SSL for serverless
      },
      compression: true, // Enable compression for better performance
    }),
  },
});

