# Manual Workflow Guide (No Redis Required)

**Current Setup:** Manual triggering for development  
**Future:** Switch to Redis when scaling

---

## Quick Start

### Single Command (Recommended)
```bash
bash scripts/ingest-and-classify.sh
```

This will:
1. ✅ Fetch tweets from X (via GAME API)
2. ✅ Store them in database
3. ✅ Classify with LLM
4. ✅ Show you trading signals found

---

## Manual Two-Step Process

If you prefer to run steps separately:

### Step 1: Ingest Tweets
```bash
curl http://localhost:5000/api/admin/ingest-tweets
```

### Step 2: Classify Tweets
```bash
curl -X POST http://localhost:5000/api/admin/classify-all-tweets
```

---

## View Results

### See All Trading Signals
```bash
curl -s "http://localhost:5000/api/db/ct_posts?isSignalCandidate=true&_limit=50" \
  | jq '.[] | {text: .tweetText[0:100], tokens: .extractedTokens}'
```

### Count Signals by Token
```bash
curl -s "http://localhost:5000/api/db/ct_posts?isSignalCandidate=true" \
  | jq '[.[] | .extractedTokens[]] | group_by(.) | map({token: .[0], count: length}) | sort_by(-.count)'
```

### See Recent Tweets from Specific Account
```bash
# Replace with account username
curl -s "http://localhost:5000/api/db/ct_posts?_limit=20" \
  | jq '.[] | select(.ctAccount.xUsername == "AltcoinGordon") | {text: .tweetText[0:80], signal: .isSignalCandidate}'
```

---

## Schedule with Cron (Optional)

To run automatically every 6 hours:

```bash
# Open crontab
crontab -e

# Add this line (runs at 00:00, 06:00, 12:00, 18:00)
0 */6 * * * cd /Users/abhishekdubey/Downloads/Maxxit && bash scripts/ingest-and-classify.sh >> logs/ingest.log 2>&1
```

Or create a simple loop script:

```bash
# Create logs directory
mkdir -p logs

# Run every 6 hours
while true; do
  echo "$(date): Running ingestion..." >> logs/ingest.log
  bash scripts/ingest-and-classify.sh >> logs/ingest.log 2>&1
  echo "$(date): Sleeping for 6 hours..." >> logs/ingest.log
  sleep 21600  # 6 hours
done
```

---

## When to Switch to Redis?

Consider Redis + automatic workers when:

| Metric | Manual OK | Need Redis |
|--------|-----------|------------|
| Tweets/day | < 500 | > 500 |
| CT Accounts | < 10 | > 10 |
| Update frequency | Every 6-24h | Hourly or more |
| Agents | 1-5 | 5+ |
| Team size | Solo dev | Team |

---

## Current Performance

With manual approach:
- **Ingestion:** ~1-2 mins for 7 accounts (350 tweets)
- **Classification:** ~3-5 mins for 100 tweets
- **Total:** ~5-7 mins end-to-end
- **Cost:** ~$0.10 per 100 tweet classifications (Perplexity)

---

## Transition to Redis (Later)

When you're ready to scale:

### 1. Install Redis
```bash
brew install redis
brew services start redis
```

### 2. Update Environment
```bash
# Add to .env
REDIS_URL=redis://localhost:6379
```

### 3. Start Workers
```bash
# In a separate terminal
npx tsx server.old/workers/index.ts
```

### 4. Update Ingestion
The ingestion endpoint will automatically enqueue classification jobs.

### 5. Monitor Queue
Visit: `http://localhost:3000/admin/queues` (with NestJS backend)

---

## Troubleshooting

### No new tweets fetched
```bash
# Check last ingestion time
curl -s "http://localhost:5000/api/ct-accounts" \
  | jq '.[] | {username: .xUsername, lastSeen: .lastSeenAt}'
```

### Classification too slow
- Use Perplexity (fastest, cheapest)
- Reduce batch size in classify-all-tweets.ts
- Consider caching common classifications

### Too many false positives
- Adjust confidence threshold in LLM prompt
- Add post-processing filters
- Use stricter classification rules

---

## Best Practices

1. **Run during low-traffic hours** - Classification takes time
2. **Check logs** - Monitor server output for errors  
3. **Verify signals** - Manually review top signals periodically
4. **Tune the LLM** - Adjust prompts based on results
5. **Track costs** - Monitor API usage for Perplexity

---

## Quick Reference

```bash
# Servers must be running first!
# Terminal 1: Python proxy for GAME API
bash run-twitter-proxy.sh > twitter-proxy.log 2>&1 &

# Terminal 2: Main server
npm run dev

# Then run ingestion + classification:
bash scripts/ingest-and-classify.sh

# Or schedule it:
# Every 6 hours via cron or loop script
```

---

**You're all set!** 🚀

Start with manual triggering, tune the classifier, then migrate to Redis when you're ready to scale.
