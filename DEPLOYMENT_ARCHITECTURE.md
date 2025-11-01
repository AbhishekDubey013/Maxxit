# Deployment Architecture - Render + Railway

## Current Services Overview

### Python Services (1)
1. **`services/hyperliquid-service.py`**
   - Hyperliquid trading service
   - Uses official Hyperliquid Python SDK
   - Endpoints: `/open-position`, `/close-position`, `/positions`, `/balance`, `/market-info`
   - Port: 5001 (default)

### TypeScript Workers (5)
1. **`workers/tweet-ingestion-worker.ts`**
   - X/Twitter tweet scanner and collector
   - Monitors CT accounts
   - Classifies tweets with LLM
   - Creates signal candidates

2. **`workers/signal-generator.ts`**
   - Generates trading signals from tweet candidates
   - Applies agent weights and venue logic
   - Creates signals in database

3. **`workers/trade-executor-worker.ts`**
   - Executes pending signals
   - Routes to appropriate venue (SPOT/GMX/HYPERLIQUID)
   - Creates positions in database

4. **`workers/position-monitor-v2.ts`**
   - Monitors SPOT and GMX positions
   - Real-time price tracking
   - Risk management (stop loss, trailing stop, take profit)

5. **`workers/position-monitor-hyperliquid.ts`**
   - Monitors Hyperliquid positions
   - Smart position discovery
   - Risk management for Hyperliquid

---

## Recommended Deployment Architecture

### 🔵 RENDER - Python Services Only

**What to Deploy**:
```
✅ services/hyperliquid-service.py
```

**Why Render**:
- Native Python support
- Auto-scaling for API services
- Better for long-running HTTP services
- Free tier available

**Render Setup**:
```yaml
# render.yaml
services:
  - type: web
    name: hyperliquid-service
    env: python
    buildCommand: "cd services && pip install -r requirements-hyperliquid.txt"
    startCommand: "cd services && python3 hyperliquid-service.py"
    envVars:
      - key: HYPERLIQUID_TESTNET
        value: true  # or false for mainnet
      - key: HYPERLIQUID_SERVICE_PORT
        value: 5001
```

**Render Environment Variables**:
```bash
HYPERLIQUID_TESTNET=true
HYPERLIQUID_SERVICE_PORT=5001
```

---

### 🟢 RAILWAY - TypeScript Workers + Next.js

**What to Deploy**:
```
✅ Next.js App (main web service)
✅ workers/tweet-ingestion-worker.ts (X scanner)
✅ workers/signal-generator.ts
✅ workers/trade-executor-worker.ts
✅ workers/position-monitor-v2.ts
✅ workers/position-monitor-hyperliquid.ts
```

**Why Railway**:
- Full Node.js/TypeScript support
- Better for Next.js + workers combo
- Integrated database
- Better for monorepo architecture

**Railway Services**:

1. **Main Web Service** (Next.js)
   ```bash
   npm run build && npm start
   ```

2. **Tweet Ingestion Worker** (Cron or continuous)
   ```bash
   npx tsx workers/tweet-ingestion-worker.ts
   ```

3. **Signal Generator** (Cron - every 5 min)
   ```bash
   npx tsx workers/signal-generator.ts
   ```

4. **Trade Executor** (Cron - every 5 min)
   ```bash
   npx tsx workers/trade-executor-worker.ts
   ```

5. **Position Monitor** (Continuous - every 60s)
   ```bash
   npx tsx workers/position-monitor-v2.ts
   ```

6. **Hyperliquid Monitor** (Continuous - every 60s)
   ```bash
   npx tsx workers/position-monitor-hyperliquid.ts
   ```

**Railway Environment Variables**:
```bash
# Database
DATABASE_URL=postgresql://...

# Hyperliquid
AGENT_WALLET_ENCRYPTION_KEY=<your-key>
HYPERLIQUID_SERVICE_URL=https://your-render-service.onrender.com
HYPERLIQUID_TESTNET=true

# X/Twitter
X_API_KEY=...
X_API_SECRET=...
TWITTER_BEARER_TOKEN=...

# Other services
# ... all your existing env vars
```

---

## 🚨 Important Notes

### About Tweet Scanner

**Current Implementation**:
- ❌ There is NO Python service for X/Twitter scanning
- ✅ Tweet scanning is done by `workers/tweet-ingestion-worker.ts` (TypeScript)

**Your Options**:

**Option A: Keep on Railway (Recommended)**
- Tweet ingestion worker stays on Railway
- No code changes needed
- Already integrated with database

**Option B: Create Python Service for Render**
- Would need to create a new Python service for tweet scanning
- Requires rewriting `workers/tweet-ingestion-worker.ts` in Python
- More complex deployment

**Recommendation**: Keep tweet scanner on Railway (Option A)

---

### Hyperliquid Service

**Is it required?**

**YES** ✅ - Hyperliquid service IS required if:
- You want to trade on Hyperliquid
- You want automated signal execution for Hyperliquid
- You want position monitoring for Hyperliquid

**How it works**:
```
Railway Worker → HTTP Request → Render Python Service → Hyperliquid API
```

**Without Hyperliquid service**:
- ❌ No Hyperliquid trading
- ❌ No Hyperliquid position monitoring
- ✅ SPOT and GMX still work

---

## Deployment Strategy Summary

### 📦 Render Deployment

```yaml
Service: Hyperliquid Python Service
Type: Web Service
Build: pip install -r services/requirements-hyperliquid.txt
Start: python3 services/hyperliquid-service.py
Port: 5001
Scaling: Auto (1-2 instances)
```

### 📦 Railway Deployment

```yaml
Services:
  1. Next.js Web App (main service)
  2. Tweet Ingestion Worker (cron/continuous)
  3. Signal Generator (cron every 5min)
  4. Trade Executor (cron every 5min)
  5. Position Monitor (continuous)
  6. Hyperliquid Monitor (continuous)
```

---

## Environment Variable Checklist

### Render (Hyperliquid Service)
- [ ] `HYPERLIQUID_TESTNET` (true/false)
- [ ] `HYPERLIQUID_SERVICE_PORT` (5001)

### Railway (Main App + Workers)
- [ ] `DATABASE_URL`
- [ ] `AGENT_WALLET_ENCRYPTION_KEY` (critical!)
- [ ] `HYPERLIQUID_SERVICE_URL` (Render service URL)
- [ ] `HYPERLIQUID_TESTNET`
- [ ] `X_API_KEY`
- [ ] `X_API_SECRET`
- [ ] `TWITTER_BEARER_TOKEN`
- [ ] All other existing env vars

---

## Networking

**Railway → Render Communication**:
```
Railway Worker
  ↓ (HTTP POST)
  ↓ https://your-hyperliquid-service.onrender.com/open-position
  ↓
Render Python Service
  ↓ (SDK call)
  ↓
Hyperliquid Exchange API
```

**Set on Railway**:
```bash
HYPERLIQUID_SERVICE_URL=https://your-hyperliquid-service.onrender.com
```

---

## Cost Optimization

### Render (Python Service)
- **Free Tier**: 750 hours/month
- **Paid**: $7/month for 24/7 uptime
- **Recommendation**: Start with free tier, upgrade if needed

### Railway
- **Hobby Plan**: $5/month + usage
- **Developer Plan**: $20/month + usage
- **Recommendation**: Developer plan for 6 workers + web app

### Total Estimated Cost
- **Minimum**: $25/month (Railway Developer + Render Free)
- **Recommended**: $32/month (Railway Developer + Render Paid)

---

## Startup Scripts

### For Render (services/start-render.sh)
```bash
#!/bin/bash
cd services
pip install -r requirements-hyperliquid.txt
python3 hyperliquid-service.py
```

### For Railway (workers/start-railway-workers.sh)
```bash
#!/bin/bash

# Start all workers in background
npx tsx workers/tweet-ingestion-worker.ts &
npx tsx workers/signal-generator.ts &
npx tsx workers/trade-executor-worker.ts &
npx tsx workers/position-monitor-v2.ts &
npx tsx workers/position-monitor-hyperliquid.ts &

# Keep script running
wait
```

---

## Testing Checklist

### Before Deploying to Render
- [ ] Test Hyperliquid service locally
- [ ] Verify all endpoints work
- [ ] Check testnet vs mainnet settings

### Before Deploying to Railway
- [ ] Test tweet ingestion worker
- [ ] Verify database connection
- [ ] Test signal generation
- [ ] Test trade execution
- [ ] Test position monitoring

### After Deployment
- [ ] Verify Render service is accessible from Railway
- [ ] Check worker logs on Railway
- [ ] Monitor position execution
- [ ] Verify environment variables

---

## Troubleshooting

### Issue: Railway can't connect to Render service
**Solution**: Check `HYPERLIQUID_SERVICE_URL` points to your Render service URL

### Issue: Tweet worker not finding tweets
**Solution**: Verify X/Twitter API credentials in Railway env vars

### Issue: Hyperliquid trades not executing
**Solutions**:
1. Check Render service is running
2. Verify `AGENT_WALLET_ENCRYPTION_KEY` on Railway
3. Check agent approvals on Hyperliquid

### Issue: Workers consuming too much memory
**Solution**: Increase Railway plan or optimize worker intervals

---

## Next Steps

1. **Deploy Hyperliquid service to Render**
   - Create new web service
   - Add environment variables
   - Deploy from GitHub

2. **Update Railway configuration**
   - Add `HYPERLIQUID_SERVICE_URL` env var
   - Point to Render service URL
   - Restart workers

3. **Test end-to-end flow**
   - Create test signal
   - Verify execution on Hyperliquid
   - Monitor position

---

**Last Updated**: November 1, 2025
**Architecture Version**: 1.0.0

