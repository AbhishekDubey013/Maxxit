# X (Twitter) API Setup Guide

This guide explains how to set up X API integration for fetching crypto Twitter posts.

## Prerequisites

1. A Twitter/X Developer Account
2. An X API project with elevated access (for user timeline endpoints)

## Getting Your X API Credentials

### Step 1: Create a Twitter Developer Account

1. Go to [https://developer.twitter.com](https://developer.twitter.com)
2. Sign in with your Twitter account
3. Apply for a developer account
4. Fill out the application form (select "Hobbyist" → "Exploring the API" for testing)

### Step 2: Create an App

1. Navigate to the [Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Click "Create Project" or use an existing project
3. Create an App within the project
4. Give your app a name (e.g., "Maxxit Trading Bot")

### Step 3: Get Your Bearer Token

1. In your app's dashboard, navigate to "Keys and tokens"
2. Under "Bearer Token", click "Generate" or "Regenerate"
3. **Copy the Bearer Token** - you'll need this for the environment variable
4. Store it securely (it won't be shown again)

### Step 4: Set Environment Variables

Add the following to your `.env` file:

```bash
# X (Twitter) API Configuration
X_API_BEARER_TOKEN=your_bearer_token_here

# Alternative variable names (any will work)
# X_API_KEY=your_bearer_token_here
# TWITTER_BEARER_TOKEN=your_bearer_token_here
```

## API Access Levels

### Free Tier (Basic)
- 500,000 tweets/month
- Access to v2 endpoints
- **Limited**: Cannot access user timelines without elevated access

### Elevated Access (Recommended)
- Required for fetching user timelines (`/users/:id/tweets`)
- Apply for elevated access in the Developer Portal
- Usually approved within a few hours to days

### To Apply for Elevated Access:
1. Go to your Developer Portal
2. Click on your project
3. Navigate to the "Products" tab
4. Apply for "Elevated" access
5. Fill out the form explaining your use case

## Features Enabled with X API

Once configured, the system will:

1. **Automatically fetch tweets** from selected CT accounts every 6 hours
2. **Extract token symbols** (e.g., $BTC, $ETH) from tweets
3. **Classify tweets** as potential trading signals using sentiment analysis
4. **Update follower counts** and impact factors for CT accounts
5. **Generate trading signals** based on CT posts combined with technical indicators

## Testing Your Integration

### Test the X API Connection

Create a test script (`test-x-api.ts`):

```typescript
import { createXApiClient } from './lib/x-api';

async function test() {
  const client = createXApiClient();
  
  if (!client) {
    console.error('X API client not configured!');
    return;
  }

  // Test fetching user info
  const user = await client.getUserByUsername('elonmusk');
  console.log('User:', user);

  // Test fetching tweets
  const tweets = await client.getUserTweets('elonmusk', { maxResults: 5 });
  console.log('Tweets:', tweets);
}

test();
```

Run with: `npx tsx test-x-api.ts`

## Fallback Behavior

If X API is not configured or fails:
- The system will use **mock tweets** for testing
- All other functionality will work normally
- You'll see warnings in the logs about X API not being available

## Rate Limits

X API v2 rate limits (per 15-minute window):

- **User timeline**: 1,500 requests (Basic), 1,500 requests (Elevated)
- **User lookup**: 300 requests
- **Search tweets**: 450 requests (Basic), 450 requests (Elevated)

The system is designed to stay well within these limits:
- Fetches tweets every 6 hours per account
- Fetches max 50 tweets per request
- Caches user information

## Troubleshooting

### Error: "Forbidden" (403)
- You need **Elevated Access** to fetch user timelines
- Apply for elevated access in the Developer Portal

### Error: "Unauthorized" (401)
- Your Bearer Token is invalid or expired
- Regenerate your Bearer Token in the Developer Portal
- Make sure the token is correctly set in your `.env` file

### Error: "Too Many Requests" (429)
- You've hit the rate limit
- The system will automatically retry after the rate limit window
- Consider reducing the frequency of tweet ingestion

### No Tweets Being Fetched
- Check that the X API client is properly configured
- Verify the username exists and is public
- Check logs for errors: `[TweetIngest]` and `[X API]`

## Cost Considerations

- **Free Tier**: Completely free, 500k tweets/month
- **Basic Tier**: $100/month, 10k tweets/month read access
- **Pro Tier**: $5,000/month for higher limits

For most use cases, the **Free Tier with Elevated Access** is sufficient.

## Security Best Practices

1. **Never commit** your Bearer Token to version control
2. Store credentials in `.env` file (add to `.gitignore`)
3. Use environment variables in production
4. Rotate Bearer Tokens periodically
5. Use separate API keys for development and production

## Next Steps

After setting up X API:

1. Add CT accounts through the agent creation flow
2. The system will automatically start ingesting tweets
3. Monitor the logs for successful tweet ingestion
4. Tweets will be classified and turned into trading signals
5. View signals in the agent dashboard

## Support

For X API issues:
- [X API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [X Developer Community](https://twittercommunity.com/)

For Maxxit-specific issues:
- Check the logs for `[X API]` and `[TweetIngest]` entries
- Ensure CT accounts are properly linked to agents
- Verify database connections are working

