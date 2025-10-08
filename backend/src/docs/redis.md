# Redis Cache Setup

This project uses Redis for caching project data to improve API performance.

## Configuration

### Environment Variables

Set the `REDIS_URL` environment variable to configure your Redis connection:

```bash
# For local development (default)
REDIS_URL=redis://localhost:6379

# For Redis Cloud
REDIS_URL=redis://username:password@host:port
```

### Redis Cloud Setup

1. Sign up for a free Redis Cloud account at [redis.com](https://redis.com)
2. Create a new database
3. Copy your connection string from the Redis Cloud dashboard
4. Set the `REDIS_URL` environment variable with your connection string

Example Redis Cloud connection string:
```
redis://default:your_password@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345
```

### Local Redis Setup

For local development, you can run Redis using Docker:

```bash
docker run -d -p 6379:6379 redis:alpine
```

## Features

### Project Caching

The `getProjectById` API endpoint now includes Redis caching:

- **Cache Hit**: Returns data from Redis (faster response)
- **Cache Miss**: Fetches from database and caches the result
- **Cache TTL**: 1 hour (3600 seconds)
- **Cache Invalidation**: Automatically clears cache when project is deleted

### Cache Keys

Projects are cached using the pattern: `project:{projectId}`

### Monitoring

The cache service includes logging for:
- Cache hits and misses
- Connection status
- Error handling

## API Behavior

- If Redis is unavailable, the API falls back to database queries
- No breaking changes to existing API endpoints
- Transparent caching implementation

## Performance Benefits

- Faster response times for frequently accessed projects
- Reduced database load
- Improved user experience
