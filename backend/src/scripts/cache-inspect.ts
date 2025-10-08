import { createClient } from 'redis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function inspectCache() {
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
    
    // Get all keys
    const keys = await client.keys('*');
    console.log(`\n📋 Total keys in cache: ${keys.length}`);

    // Get project keys
    const projectKeys = await client.keys('project:*');
    console.log(`📁 Project keys: ${projectKeys.length}`);

    if (projectKeys.length > 0) {
      console.log('\n📊 Cached Projects:');
      console.log('--------------------------------------------------');
      console.log('| Project ID                | TTL (sec) | Size (KB) |');
      console.log('--------------------------------------------------');

      // Get details for each project key
      for (const key of projectKeys) {
        const projectId = key.replace('project:', '');
        const ttl = await client.ttl(key);
        const value = await client.get(key);
        const size = value ? (Buffer.from(value).length / 1024).toFixed(2) : '0';

        console.log(`| ${projectId.padEnd(25)} | ${String(ttl).padEnd(9)} | ${String(size).padEnd(9)} |`);
      }
      console.log('--------------------------------------------------');
    }

    // Check for other key patterns
    const otherKeys = keys.filter(key => !key.startsWith('project:'));
    if (otherKeys.length > 0) {
      console.log('\n🔑 Other Keys:');
      for (const key of otherKeys) {
        const ttl = await client.ttl(key);
        console.log(`- ${key} (TTL: ${ttl}s)`);
      }
    }

    // Provide some useful commands
    console.log('\n💡 Useful Commands:');
    console.log('- npm run cache:clear          # Clear all cache');
    console.log('- npm run cache:clear-projects # Clear only project cache');

  } catch (error) {
    console.error('❌ Error inspecting cache:', error.message);
  } finally {
    // Disconnect client
    await client.disconnect();
    console.log('\n👋 Disconnected from Redis');
  }
}

// Run the function
inspectCache();
