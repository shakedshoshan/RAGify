import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: RedisClientType;
  private readonly defaultTTL = 3600; // 1 hour in seconds

  async onModuleInit() {
    try {
      // Create Redis client - you can configure this with your Redis Cloud connection string
      this.client = createClient({
        // For Redis Cloud, use your connection URL:
        // url: 'redis://username:password@host:port'
        // For local development:
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      // Set up error handling
      this.client.on('error', (err) => {
        this.logger.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        this.logger.log('Connected to Redis');
      });

      this.client.on('disconnect', () => {
        this.logger.warn('Disconnected from Redis');
      });

      // Connect to Redis
      await this.client.connect();
      this.logger.log('✅ Redis cache service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Redis cache service:', error.message);
      // Don't throw error - app can still work without cache
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.disconnect();
        this.logger.log('Redis client disconnected');
      }
    } catch (error) {
      this.logger.error('Error disconnecting Redis client:', error.message);
    }
  }

  /**
   * Get a value from cache
   * @param key The cache key
   * @returns The cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        this.logger.warn('Redis client not available, skipping cache get');
        return null;
      }

      const value = await this.client.get(key);
      if (value) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(value);
      }
      
      this.logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Time to live in seconds (optional, defaults to 1 hour)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      if (!this.client || !this.client.isOpen) {
        this.logger.warn('Redis client not available, skipping cache set');
        return;
      }

      const serializedValue = JSON.stringify(value);
      const expiration = ttl || this.defaultTTL;
      
      await this.client.setEx(key, expiration, serializedValue);
      this.logger.debug(`Cached key: ${key} with TTL: ${expiration}s`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error.message);
    }
  }

  /**
   * Delete a value from cache
   * @param key The cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.client || !this.client.isOpen) {
        this.logger.warn('Redis client not available, skipping cache delete');
        return;
      }

      await this.client.del(key);
      this.logger.debug(`Deleted cache key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error.message);
    }
  }

  /**
   * Delete multiple keys with a pattern
   * @param pattern The pattern to match keys (e.g., 'project:*')
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (!this.client || !this.client.isOpen) {
        this.logger.warn('Redis client not available, skipping cache pattern delete');
        return;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.debug(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting cache pattern ${pattern}:`, error.message);
    }
  }

  /**
   * Check if Redis client is connected
   * @returns True if connected, false otherwise
   */
  isConnected(): boolean {
    return this.client && this.client.isOpen;
  }

  /**
   * Generate a cache key for projects
   * @param projectId The project ID
   * @returns Formatted cache key
   */
  generateProjectKey(projectId: string): string {
    return `project:${projectId}`;
  }

  /**
   * Ping Redis to check connection
   * @returns Pong response or null if error
   */
  async ping(): Promise<string | null> {
    try {
      if (!this.client || !this.client.isOpen) {
        return null;
      }
      return await this.client.ping();
    } catch (error) {
      this.logger.error('Error pinging Redis:', error.message);
      return null;
    }
  }
}
