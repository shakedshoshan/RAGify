# Redis Cache Inspection Tools

This document describes the tools available for inspecting and managing the Redis cache in the RAGify application.

## Available Commands

### Inspect Cache

View all cached items and their details:

```bash
npm run cache:inspect
```

This command will show:
- Total number of keys in the cache
- Number of project keys
- Detailed information about each cached project:
  - Project ID
  - Time-to-live (TTL) in seconds
  - Size in KB
- Any other keys in the cache

### Clear All Cache

Remove all items from the cache:

```bash
npm run cache:clear
```

This command will flush the entire Redis database.

### Clear Only Project Cache

Remove only project-related items from the cache:

```bash
npm run cache:clear-projects
```

This command will only delete keys that match the pattern `project:*`.

## Example Output

```
✅ Connected to Redis

📋 Total keys in cache: 5
📁 Project keys: 3

📊 Cached Projects:
--------------------------------------------------
| Project ID                | TTL (sec) | Size (KB) |
--------------------------------------------------
| abc123                    | 3245      | 12.45     |
| def456                    | 1893      | 8.72      |
| ghi789                    | 3541      | 15.33     |
--------------------------------------------------

🔑 Other Keys:
- system:stats (TTL: 600s)
- user:lastLogin (TTL: 86400s)

💡 Useful Commands:
- npm run cache:clear          # Clear all cache
- npm run cache:clear-projects # Clear only project cache

👋 Disconnected from Redis
```

## Cache Key Patterns

The application uses the following key patterns:

- `project:{projectId}` - Cached project data

## Environment Variables

The cache inspection tools use the same Redis connection as the main application:

```
REDIS_URL=redis://localhost:6379
```

You can override this in your `.env` file or by setting the environment variable directly.

## Troubleshooting

If you encounter connection errors:

1. Ensure Redis is running
2. Verify the `REDIS_URL` environment variable is correct
3. Check network connectivity to the Redis server

For Redis Cloud users, make sure your IP address is whitelisted in the Redis Cloud console.
