# API Key Authentication

This document explains how to use API key authentication with the RAGify API.

## Obtaining an API Key

API keys can be created through the `/apikey` endpoint:

```
POST /apikey
{
  "user_id": "your-user-id",
  "name": "My API Key",
  "description": "Used for my application"
}
```

The response will include your API key. Store this securely as it will only be shown once.

## Using Your API Key

When making requests to protected endpoints (like `/generation/generate`), include your API key in one of the following ways:

### 1. Authorization Header (Recommended)

```
Authorization: Bearer rk_your_api_key
```

### 2. Custom Header

```
X-API-Key: rk_your_api_key
```

### 3. Query Parameter

```
GET /some-endpoint?api_key=rk_your_api_key
```

## Example Request

```bash
curl -X POST \
  http://localhost:3000/generation/generate \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer rk_your_api_key' \
  -d '{
    "projectId": "your-project-id",
    "prompt": "Your query here"
  }'
```

## Security Notes

- API keys are prefixed with `rk_` (RAGify Key)
- Keys are stored as secure SHA-256 hashes in the database
- Never share your API key or commit it to version control
- You can revoke keys at any time through the API
