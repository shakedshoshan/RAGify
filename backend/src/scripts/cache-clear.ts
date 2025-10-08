import { createClient } from 'redis';
import * as dotenv from 'dotenv';
import * as process from 'process';

// Load environment variables
dotenv.config();

async function clearCache() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const clearProjectsOnly = args.includes('--projects-only');

  // Create Redis client
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  // Error handling
  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
    process.exit(1);
  });

  try {
    // Connect to Redis
    await client.connect();
    console.log('✅ Connected to Redis');
    
    if (clearProjectsOnly) {
      // Clear only project keys
      const projectKeys = await client.keys('project:*');
      if (projectKeys.length > 0) {
        await client.del(projectKeys);
        console.log(`🗑️ Cleared ${projectKeys.length} project cache entries`);
      } else {
        console.log('ℹ️ No project cache entries found');
      }
    } else {
      // Clear all keys
      await client.flushDb();
      console.log('🗑️ Cleared all cache entries');
    }

  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
  } finally {
    // Disconnect client
    await client.disconnect();
    console.log('👋 Disconnected from Redis');
  }
}

// Run the function
clearCache();
