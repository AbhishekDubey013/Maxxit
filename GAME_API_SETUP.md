# GAME API Setup Guide

## Overview

GAME API (via Virtuals Protocol) provides an alternative to standard Twitter API bearer tokens. It uses simple API key authentication without requiring elevated access or dealing with rate limits.

**Architecture**: Since `virtuals_tweepy` is Python-only, we use a lightweight Python proxy server that your Node.js app calls.

## Quick Start

### 1. Add API Key to .env

```bash
# Your GAME API key (used by Python proxy)
GAME_API_KEY=apx-090643fe359939fd167201c7183dc2dc

# Optional: If you deploy the proxy elsewhere
# GAME_API_URL=https://your-deployed-proxy.com
```

### 2. Start the Python Proxy Server

```bash
# In a new terminal window
bash run-twitter-proxy.sh
```

This will:
- Create a Python virtual environment
- Install required packages (`fastapi`, `uvicorn`, `virtuals_tweepy`)
- Start the proxy on `http://localhost:8001`

### 3. Verify It's Working

```bash
# Health check
curl http://localhost:8001/health

# Fetch tweets
curl http://localhost:8001/tweets/Abhishe42402615?max_results=5
```

### 2. How It Works

The system will automatically:
1. **Try GAME API first** - Fast, no rate limits, simple auth
2. **Fallback to Bearer Token** - If GAME API fails or not configured
3. **Use Mock Data** - If both methods are unavailable (development only)

## API Priority

```typescript
Priority Order:
1. GAME_API_KEY (if set) → Uses Virtuals Protocol API
2. X_API_BEARER_TOKEN (if set) → Uses standard Twitter API v2
3. Mock data (development fallback)
```

## Testing

### Test GAME API Connection

```bash
# Test tweet ingestion with GAME API
curl http://localhost:5000/api/admin/ingest-tweets
```

### Check Which Method Is Being Used

Look for these log messages:
- `[X API] Using GAME API method` - GAME API is working
- `[X API] Using standard bearer token method` - Fallback to bearer token
- `[X API] No authentication method available` - No credentials found

## Advantages of GAME API

✅ **Simple Authentication** - Just an API key, no OAuth or bearer token setup
✅ **No Rate Limits** - More generous limits than standard Twitter API
✅ **No Elevated Access** - Works immediately without Twitter approval
✅ **Full Tweet Content** - Handles long tweets and retweets properly
✅ **Free Tier Available** - Good for development and testing

## API Reference

Based on `virtuals_tweepy` Python library:
- **Source**: https://github.com/abxglia/tweets-fetcher/blob/main/twitter_api.py
- **Endpoint Pattern**: `{BASE_URL}/twitter/user/{username}/tweets`
- **Authentication**: `X-API-Key` header with your API key
- **Response Format**: Standard Twitter API v2 compatible

## Endpoints Used

### Get User Tweets
```
GET {BASE_URL}/twitter/user/{username}/tweets?max_results=50&since_id=xxx
Headers:
  X-API-Key: apx-xxx...
  Content-Type: application/json
```

### Get User Info
```
GET {BASE_URL}/twitter/user/{username}
Headers:
  X-API-Key: apx-xxx...
  Content-Type: application/json
```

## Implementation Files

- **`lib/x-api-multi.ts`** - Multi-method X API client
- **`server.old/workers/tweetIngest.processor.ts`** - Background tweet ingestion worker
- **`pages/api/admin/ingest-tweets.ts`** - Manual ingestion endpoint

## Troubleshooting

### "GAME API error: 401"
- Check that `GAME_API_KEY` is correct in `.env`
- Verify the API key hasn't expired

### "No tweets fetched"
- Ensure username is correct (e.g., `@Abhishe42402615`)
- Check that the account has recent tweets
- Look at logs for specific error messages

### "Using mock data"
- Neither GAME_API_KEY nor X_API_BEARER_TOKEN is set
- Check your `.env` file exists and is loaded properly

## Environment Variables Summary

```bash
# .env file

# Option 1: GAME API (Recommended)
GAME_API_KEY=apx-090643fe359939fd167201c7183dc2dc

# Option 2: Standard Twitter API (Fallback)
X_API_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAMLheAAAAAAA0%2BuSeid...

# Both can be set - GAME API will be tried first!
```

## Next Steps

1. ✅ Add `GAME_API_KEY` to `.env`
2. 🧪 Test with: `curl http://localhost:5000/api/admin/ingest-tweets`
3. 🎯 Monitor logs to see which method is used
4. 🚀 Enjoy unlimited tweet fetching!

