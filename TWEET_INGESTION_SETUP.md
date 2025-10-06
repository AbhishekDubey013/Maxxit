# Tweet Ingestion Setup Guide

## ✅ Quick Start (No Redis Required)

### 1. Add Your X API Credentials

Add to your `.env` file (any of these variable names work):

```bash
# X (Twitter) API - Choose one:
X_API_BEARER_TOKEN=your_bearer_token_here
# OR
X_API_KEY=your_bearer_token_here
# OR
TWITTER_BEARER_TOKEN=your_bearer_token_here
```

**Get your Bearer Token from**: https://developer.twitter.com/en/portal/dashboard

### 2. Restart the Next.js Server

```bash
# Kill existing server (Ctrl+C or)
pkill -f "next dev"

# Restart
bash start-next.sh
```

### 3. Test Tweet Ingestion Manually

```bash
# Ingest tweets from all CT accounts (including @Abhishe42402615)
curl http://localhost:5000/api/admin/ingest-tweets

# Or for specific account only
curl "http://localhost:5000/api/admin/ingest-tweets?ctAccountId=2a85b842-61d0-48bd-97ef-52d674004493"
```

**Expected Response:**
```json
{
  "success": true,
  "processed": 1,
  "results": [
    {
      "accountId": "2a85b842-61d0-48bd-97ef-52d674004493",
      "username": "Abhishe42402615",
      "fetched": 15,
      "created": 15,
      "skipped": 0
    }
  ]
}
```

### 4. Verify Tweets Were Saved

```bash
# Query ct_posts to see fetched tweets
curl "http://localhost:5000/api/db/ct_posts?limit=10"
```

---

## 🔄 Option 2: Automatic Cron (Requires Redis)

For **automatic** tweet ingestion every 6 hours, you need to:

### 1. Set Up Redis

**Local Development:**
```bash
# Install Redis (macOS)
brew install redis

# Start Redis
brew services start redis

# Or run manually
redis-server
```

**Cloud Redis (Recommended for Production):**
- [Upstash](https://upstash.com/) - Free tier available
- [Redis Cloud](https://redis.com/try-free/) - Free tier
- [Railway](https://railway.app/) - Redis template

### 2. Add Redis URL to .env

```bash
# Local Redis
REDIS_URL=redis://localhost:6379

# OR Cloud Redis (example)
REDIS_URL=redis://default:password@redis-xxxx.upstash.io:6379
```

### 3. Run the Combined Server (with Workers)

Instead of just Next.js, run the full backend with workers:

```bash
# Option A: Run NestJS backend with workers
npx tsx server.old/main-combined.ts

# Option B: Start workers separately
# Terminal 1: Next.js
bash start-next.sh

# Terminal 2: Workers only
npx tsx -e "import('./server.old/workers/index').then(m => m.startWorkers())"
```

### 4. Verify Workers Are Running

Check the logs - you should see:
```
🚀 Starting BullMQ workers...
⏰ Setting up CRON jobs...
[TweetIngest] Setting up CRON for 4 CT accounts
[TweetIngest] Scheduled CRON for account Abhishe42402615 (2a85b842-61d0-48bd-97ef-52d674004493)
✅ All workers started successfully
📋 Active workers: tweetIngest, classify, indicators, signalCreate, executeTrade, riskExit, metrics, billing
```

### 5. Monitor the Queue Dashboard

Visit: `http://localhost:3000/admin/queues` (if using NestJS backend)

---

## 🎯 Recommended Workflow

### For Development (Right Now):
1. ✅ **Use Manual Testing** (Option 1)
   - No Redis required
   - Instant results
   - Easy to debug
   - Test X API integration

2. **Call the endpoint whenever you need fresh tweets:**
   ```bash
   curl http://localhost:5000/api/admin/ingest-tweets
   ```

### For Production:
1. Set up Redis
2. Use automatic cron (Option 2)
3. Tweets fetched every 6 hours automatically
4. Monitor via Bull Board dashboard

---

## 📋 Tweet Ingestion Flow

```
1. Cron triggers (every 6h) OR Manual API call
   ↓
2. Fetch CT accounts from database
   ↓
3. For each account:
   - Call X API with username
   - Get last 50 tweets (since last fetch)
   - Update follower count
   ↓
4. Save to ct_posts table
   - Skip duplicates (by tweet_id)
   - Create CtPost records
   ↓
5. Trigger Classify Worker
   - LLM analyzes tweet
   - Extracts tokens ($BTC, $ETH)
   - Marks as signal candidate
   ↓
6. If signal candidate → Create Signal
   ↓
7. Execute trades based on signal + indicators
```

---

## 🧪 Testing Your X API Credentials

Create a quick test file:

```typescript
// test-x-api.ts
import { createXApiClient } from './lib/x-api';

async function test() {
  const client = createXApiClient();
  
  if (!client) {
    console.error('❌ X API not configured! Add X_API_BEARER_TOKEN to .env');
    return;
  }

  console.log('✅ X API client created');
  
  // Test with your account
  const tweets = await client.getUserTweets('Abhishe42402615', { maxResults: 5 });
  console.log(`📝 Found ${tweets.length} tweets`);
  
  tweets.forEach((tweet, i) => {
    console.log(`\n${i + 1}. Tweet ID: ${tweet.id}`);
    console.log(`   Text: ${tweet.text.substring(0, 80)}...`);
    console.log(`   Created: ${tweet.created_at}`);
  });
}

test();
```

Run: `npx tsx test-x-api.ts`

---

## 🐛 Troubleshooting

### "X API not configured"
- Add `X_API_BEARER_TOKEN` to your `.env` file
- Restart the server

### "Forbidden (403)" from X API
- You need **Elevated Access** from Twitter
- Apply at: https://developer.twitter.com/en/portal/dashboard

### "No tweets fetched"
- Check if the Twitter account exists and is public
- Verify Bearer Token is valid
- Check rate limits (450 requests per 15 min)

### Tweets show up but not saved
- Check database connection
- Look for Prisma errors in logs
- Verify `ct_accounts` table has the account

### Workers not starting
- Check Redis is running: `redis-cli ping` (should return "PONG")
- Verify `REDIS_URL` in `.env`
- Check logs for worker errors

---

## 📊 Monitoring

### Check Saved Tweets
```bash
# Count tweets per account
curl "http://localhost:5000/api/db/ct_posts?ct_account_id=eq.2a85b842-61d0-48bd-97ef-52d674004493"

# Get recent tweets
curl "http://localhost:5000/api/db/ct_posts?order=tweet_created_at.desc&limit=10"
```

### Check Last Ingestion Time
```bash
curl "http://localhost:5000/api/db/ct_accounts?id=eq.2a85b842-61d0-48bd-97ef-52d674004493"
```

Look for `last_seen_at` timestamp.

---

## 🎯 Next Steps After Tweet Ingestion

Once tweets are in `ct_posts`:

1. **Classify Worker** analyzes them (LLM)
2. Extracts token symbols (`$BTC`, `$ETH`)
3. Marks as `is_signal_candidate`
4. **Signal Creation** combines:
   - CT post sentiment
   - Technical indicators (RSI, MACD)
   - Agent weights
5. **Trade Execution** happens based on signals

---

## 💡 Pro Tips

1. **Rate Limits**: X API has 450 requests per 15 min window. Fetching every 6h keeps you well within limits.

2. **Mock Data**: If X API fails, system automatically uses mock tweets for testing.

3. **Incremental Fetching**: Uses `sinceId` to only fetch new tweets, saving API calls.

4. **Batch Processing**: Can ingest all accounts with one API call.

5. **Manual Trigger**: Use the admin endpoint for testing/debugging without waiting for cron.

---

**Ready to test?** Just add your `X_API_BEARER_TOKEN` to `.env` and call the ingestion endpoint!

