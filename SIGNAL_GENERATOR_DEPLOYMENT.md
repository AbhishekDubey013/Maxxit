# Signal Generator Worker Deployment Guide

## 🚀 Service Overview

**signal-generator-worker** - Automatically generates trading signals from classified tweets using LLM + LunarCrush scoring.

## 📊 Complete Pipeline

```
tweet-ingestion-worker → ct_posts (classified tweets)
                              ↓
                   signal-generator-worker → signals (with LunarCrush scores)
                              ↓
                   trade-executor-worker → positions (executed trades)
```

## 🎯 What It Does

1. **Polls** for classified tweets (`is_signal_candidate = true`, `processed_for_signals = false`)
2. **Identifies** agents subscribed to each CT account
3. **Generates** trading signals using:
   - LLM (Perplexity/OpenAI/Anthropic) for entry/exit levels
   - LunarCrush for market sentiment scoring
   - Tweet confidence + market indicators
4. **Creates** signal records in database
5. **Marks** tweets as processed

Runs every **5 minutes** by default (configurable via `WORKER_INTERVAL`).

---

## 🛠️ Railway Configuration

### Service 9: signal-generator-worker

| Setting | Value |
|---------|-------|
| **Root Directory** | `services/signal-generator-worker` |
| **Build Command** | `npm ci && npx prisma generate && npm run build` |
| **Start Command** | `npm start` |
| **Port** | `5008` (for health checks) |

---

## 🔐 Environment Variables

### Required (Database)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
```

### Optional (LLM - at least ONE for signal generation)
```bash
# Perplexity (Recommended)
PERPLEXITY_API_KEY=your_perplexity_key

# OR OpenAI
OPENAI_API_KEY=your_openai_key

# OR Anthropic
ANTHROPIC_API_KEY=your_anthropic_key
```

### Optional (LunarCrush - for market sentiment)
```bash
LUNARCRUSH_API_KEY=your_lunarcrush_key
```

### Optional (Worker Configuration)
```bash
# Polling interval in milliseconds (default: 300000 = 5 minutes)
WORKER_INTERVAL=300000

# Health check port (default: 5008)
PORT=5008
```

---

## 🧪 Testing

### Health Check
```bash
curl https://signal-generator-worker.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "signal-generator-worker",
  "interval": 300000,
  "database": "connected",
  "isRunning": true,
  "timestamp": "2025-11-14T06:55:00.000Z"
}
```

### Check Logs
```bash
# In Railway dashboard, look for:
[SignalGenerator] 🔍 Starting cycle...
[SignalGenerator] 📊 Found 3 unprocessed signal candidate(s)
[Tweet 1234] Processing...
[Tweet 1234] ✅ Signal created: LONG ETH on HYPERLIQUID (85% confidence)
```

---

## 📋 Complete Service List (Now 9 Services)

### API Services (3)
1. **agent-api** (Port 5001) - Agent management
2. **signal-api** (Port 5002) - Signal queries
3. **deployment-api** (Port 5003) - Deployment management

### Worker Services (6)
4. **tweet-ingestion-worker** (Port 5004) - Ingest & classify tweets
5. **trade-executor-worker** (Port 5005) - Execute trades
6. **position-monitor-worker** (Port 5006) - Monitor positions
7. **metrics-updater-worker** (Port 5007) - Update APR/metrics
8. **research-signal-worker** (Port 5009) - Research signals (placeholder)
9. **signal-generator-worker** (Port 5008) - **NEW** - Generate signals from tweets

### External Services (Already Running on Render)
- Hyperliquid Service: `https://hyperliquid-service.onrender.com`
- Ostium Service: `https://maxxit-1.onrender.com`
- Twitter Proxy: `https://maxxit.onrender.com`

---

## 🔄 Flow Check

After deploying, verify the complete flow:

1. **Check tweet ingestion:**
   ```bash
   curl https://tweet-ingestion-worker.railway.app/health
   # Should show "processingAccounts" > 0
   ```

2. **Verify classified tweets in DB:**
   ```sql
   SELECT COUNT(*) FROM ct_posts WHERE is_signal_candidate = true;
   ```

3. **Check signal generation:**
   ```bash
   curl https://signal-generator-worker.railway.app/health
   # Should show "isRunning": true
   ```

4. **Verify signals in DB:**
   ```sql
   SELECT COUNT(*) FROM signals WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

5. **Check trade execution:**
   ```bash
   curl https://trade-executor-worker.railway.app/health
   # Should show "isRunning": true
   ```

---

## 🎉 Success Metrics

After 10-15 minutes of running:
- Tweets ingested and classified ✅
- Signals generated with LLM + LunarCrush ✅
- Trades executed on Hyperliquid/Ostium ✅
- Positions monitored ✅
- APR metrics updated ✅

**Complete end-to-end automated trading pipeline!** 🚀

