# Telegram Worker

Unified microservice that handles BOTH:
1. **Channels/Groups**: Fetches messages from Telegram channels/groups
2. **Individual DMs**: Processes and classifies DM messages from alpha users

Both are classified using LLM and stored in the same `telegram_posts` table.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Telegram Channels/Groups                       │
│  (via telegram_sources)                          │
└──────────────┬──────────────────────────────────┘
               │ Bot API (getUpdates)
               ▼
┌─────────────────────────────────────────────────┐
│  Telegram Worker (this service)                  │
│  • Fetches channel messages                      │
│  • Processes unclassified DM messages             │
│  • Classifies with LLM                           │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  telegram_posts (classified)                    │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  Signal Generator Worker                         │
│  • Picks up is_signal_candidate = true          │
│  • Generates signals for agents                 │
└─────────────────────────────────────────────────┘
```

## Flow

### Part 1: Channel/Group Messages
1. **Worker fetches** → Calls Telegram API to get new messages from channels/groups
2. **Worker stores** → Saves messages to `telegram_posts` with `source_id`
3. **Worker classifies** → Uses LLM immediately
4. **Worker updates** → Sets classification results

### Part 2: Individual DM Messages
1. **Webhook receives DM** → Stores in `telegram_posts` with `alpha_user_id` and `is_signal_candidate = null`
2. **Worker polls database** → Finds unprocessed DM messages (`is_signal_candidate IS NULL`)
3. **Worker classifies** → Uses LLM to determine if message is a signal
4. **Worker updates** → Sets `is_signal_candidate`, `extracted_tokens`, `confidence_score`, `signal_type`
5. **Signal Generator** → Picks up messages where `is_signal_candidate = true`

## Setup

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=...  # Or OPENAI_API_KEY or ANTHROPIC_API_KEY

# Optional
TELEGRAM_BOT_TOKEN=...  # Required for channel ingestion (optional for DM processing)
PORT=5006
WORKER_INTERVAL=120000  # 2 minutes (default)
```

### Installation

```bash
cd services/telegram-worker
npm install
npx prisma generate
npm run build
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Health Check

```bash
curl http://localhost:5006/health
```

Response:
```json
{
  "status": "ok",
  "service": "telegram-worker",
  "interval": 120000,
  "database": "connected",
  "isRunning": true,
  "timestamp": "2025-11-18T..."
}
```

## Processing Logic

### Channels/Groups:
1. **Fetches messages** from active `telegram_sources`
2. **Stores** new messages with `source_id`
3. **Classifies** immediately with LLM
4. **Updates** `last_fetched_at` on source

### Individual DMs:
1. **Finds unprocessed messages**:
   - `alpha_user_id IS NOT NULL` (from individual DMs)
   - `is_signal_candidate IS NULL` (not yet classified)
   - From active alpha users

2. **Pre-filters** (skips LLM):
   - Messages < 20 chars without tokens
   - Common chatter (gm, gn, hello, etc.)

3. **LLM Classification**:
   - Extracts tokens (BTC, ETH, etc.)
   - Determines sentiment (bullish/bearish)
   - Calculates confidence score

4. **Updates database**:
   - Sets `is_signal_candidate`
   - Sets `extracted_tokens`
   - Sets `confidence_score`
   - Sets `signal_type` (LONG/SHORT)

## Monitoring

Check logs for:
- Messages processed per run
- Signals detected
- Errors encountered

Example log output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📱 TELEGRAM ALPHA INGESTION WORKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Found 5 unprocessed message(s) to classify

[@abhidavinci] Processing: "🚀 $BTC breaking out above $90k!..."
[@abhidavinci] ✅ Signal detected: BTC - bullish (confidence: 85%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PROCESSING SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Messages Processed: 5
  Signals Detected: 3
  Errors: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Deployment

### Railway

Add to `railway.json` or deploy as separate service:

```json
{
  "services": {
    "telegram-worker": {
      "build": {
        "builder": "NIXPACKS"
      },
      "deploy": {
        "startCommand": "cd services/telegram-worker && npm start"
      }
    }
  }
}
```

### Docker

```dockerfile
FROM node:20
WORKDIR /app
COPY services/telegram-worker/package*.json ./
RUN npm install
COPY services/telegram-worker/ ./
RUN npm run build
CMD ["npm", "start"]
```

## Troubleshooting

### No messages being processed

1. Check if messages exist:
   ```sql
   SELECT COUNT(*) FROM telegram_posts 
   WHERE alpha_user_id IS NOT NULL 
   AND is_signal_candidate IS NULL;
   ```

2. Check if alpha users are active:
   ```sql
   SELECT * FROM telegram_alpha_users WHERE is_active = true;
   ```

### LLM classification failing

1. Check API key is set
2. Check API credits/quota
3. Check logs for specific error messages

### Messages stuck in queue

- Worker might be down
- Check health endpoint
- Restart worker service

