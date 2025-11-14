# 🚀 Signal Generator Worker - Railway Deployment Guide

## 📋 Service Overview

**Service Name:** `signal-generator-worker`  
**Purpose:** Generates trading signals from classified tweets using LLM + LunarCrush  
**Port:** `5008` (health check)  
**Interval:** Every 5 minutes (300,000ms)

---

## 🛠️ Railway Configuration

### Step 1: Create New Service in Railway

1. Go to your Railway project dashboard
2. Click **"+ New Service"**
3. Select **"GitHub Repo"**
4. Choose your **Maxxit** repository
5. Select branch: **`Vprime`**

---

### Step 2: Configure Service Settings

| Setting | Value |
|---------|-------|
| **Service Name** | `signal-generator-worker` |
| **Root Directory** | `services/signal-generator-worker` |
| **Build Command** | `npm ci && npx prisma generate && npm run build` |
| **Start Command** | `npm start` |

#### How to Set Root Directory:
1. Click on your service → **Settings** tab
2. Scroll to **"Source"** section
3. Click **"Configure"** next to Root Directory
4. Enter: `services/signal-generator-worker`
5. Click **"Update"**

---

## 🔐 Environment Variables

Go to **Variables** tab and add these:

### ✅ REQUIRED

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

**👉 Use your existing DATABASE_URL from other services**

### 🤖 LLM API (Required - At Least ONE)

**⚠️ IMPORTANT:** You need at least ONE of these LLM keys. Without it, signals will use fallback logic only!

```bash
# Option 1: Perplexity (Recommended)
PERPLEXITY_API_KEY=pplx-your-key-here

# OR Option 2: OpenAI (Alternative)
OPENAI_API_KEY=sk-your-openai-key-here

# OR Option 3: Anthropic (Alternative)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```

**👉 Get your actual keys from the provider dashboards below**

**💡 Get New API Keys:**
- Perplexity: https://www.perplexity.ai/settings/api
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys

### 📊 Optional (LunarCrush for Market Sentiment)

```bash
# LunarCrush API (Optional but recommended for market sentiment scoring)
LUNARCRUSH_API_KEY=your-lunarcrush-key-here
```

**👉 Get from:** https://lunarcrush.com/developers/api

### ⚙️ Optional (Worker Configuration)

```bash
# Worker interval in milliseconds (default: 300000 = 5 minutes)
WORKER_INTERVAL=300000

# Health check port (default: 5008)
PORT=5008
```

---

## 🧪 Testing & Verification

### 1. Check Health Endpoint

Once deployed, Railway will give you a public URL like:
```
https://signal-generator-worker-production-XXXX.up.railway.app
```

Test health check:
```bash
curl https://your-railway-url.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "signal-generator-worker",
  "interval": 300000,
  "database": "connected",
  "isRunning": true,
  "timestamp": "2025-11-14T12:00:00.000Z"
}
```

### 2. Check Logs in Railway

Click **"Deployments"** → **"View Logs"**

**✅ Good Logs (Working):**
```
🚀 Signal Generator Worker starting...
⏱️  Interval: 300000ms (5 minutes)
🤖 LLM Signal Generator: ENABLED
📊 LunarCrush Scoring: ENABLED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 Signal Generator Worker - Starting cycle...
📊 Found 7 unprocessed signal candidate(s)
[Tweet 1234] Processing...
  ✅ Signal created: LONG ETH on HYPERLIQUID (85% confidence)
```

**⚠️ Warning Logs (API Key Issue):**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  SIGNAL GENERATOR LLM ERROR - USING FALLBACK!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provider: PERPLEXITY
Error: Perplexity API error: 401
❌ LIKELY CAUSE: API KEY INVALID OR CREDITS EXHAUSTED
   → Check your API key in Railway environment variables
   → Verify your API credits at the provider dashboard
⚠️  Using fallback rule-based signal generation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**👆 NOW YOU'LL SEE THIS CLEARLY IN LOGS!**

---

## 📊 Complete Service List (9 Services Total)

### API Services (3)
1. **agent-api** (Port 5001)
2. **signal-api** (Port 5002)
3. **deployment-api** (Port 5003)

### Worker Services (6)
4. **tweet-ingestion-worker** (Port 5004) - Ingest & classify tweets
5. **signal-generator-worker** (Port 5008) ← **THIS NEW ONE**
6. **trade-executor-worker** (Port 5005) - Execute trades
7. **position-monitor-worker** (Port 5006) - Monitor positions
8. **metrics-updater-worker** (Port 5007) - Update APR/metrics
9. **research-signal-worker** (Port 5009) - Research signals

---

## 🔄 Complete Pipeline Flow

```
1. tweet-ingestion-worker
   ↓ ingests + classifies with LLM
   ct_posts (is_signal_candidate = true)
   
2. signal-generator-worker ← YOU'RE DEPLOYING THIS
   ↓ LLM + LunarCrush scoring
   signals (with confidence, SL, TP)
   
3. trade-executor-worker
   ↓ calls Hyperliquid/Ostium
   positions (executed trades)
   
4. position-monitor-worker
   ↓ monitors performance
   updated positions
   
5. metrics-updater-worker
   ↓ calculates APR
   agent performance metrics
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Service deployed successfully on Railway
- [ ] Health endpoint returns `{"status": "ok"}`
- [ ] Logs show: `🤖 LLM Signal Generator: ENABLED`
- [ ] Logs show: `📊 LunarCrush Scoring: ENABLED`
- [ ] No prominent error messages about API keys
- [ ] After 5 minutes, check database for new signals:
  ```sql
  SELECT COUNT(*) FROM signals WHERE created_at > NOW() - INTERVAL '10 minutes';
  ```

---

## 🚨 Troubleshooting

### Issue: "LLM CLASSIFIER ERROR - FALLING BACK TO REGEX"

**Cause:** API key invalid or credits exhausted

**Fix:**
1. Get new API key from provider
2. Update in Railway environment variables
3. Redeploy service (click "Redeploy" in Railway)

### Issue: No signals being generated

**Check:**
1. Are there classified tweets? 
   ```sql
   SELECT COUNT(*) FROM ct_posts WHERE is_signal_candidate = true AND processed_for_signals = false;
   ```
2. Check worker logs for errors
3. Verify LLM API key is working

### Issue: Worker not running

**Check:**
1. Railway logs for startup errors
2. Database connection (check `DATABASE_URL`)
3. Build command completed successfully

---

## 🎉 You're Done!

Once this service is running, you'll have **complete automated trading pipeline**:
- ✅ Tweet ingestion with LLM classification
- ✅ Signal generation with LunarCrush scoring
- ✅ Trade execution on Hyperliquid/Ostium
- ✅ Position monitoring
- ✅ APR metrics updates

**And now you'll see clear errors in logs when API credits run out!** 🎯

