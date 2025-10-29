# 🚂 Railway Deployment Guide

Complete guide to deploy Maxxit workers to Railway for 24/7 automated trading.

---

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Connected**: Connect your GitHub account to Railway
3. **Database**: PostgreSQL database (Railway provides one)
4. **Twitter API Service**: Python proxy running (separate service)

---

## 🚀 Quick Deploy

### Step 1: Create New Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your **Maxxit** repository
5. Railway will auto-detect and start building

### Step 2: Add PostgreSQL Database

1. In your project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will provision a database
4. Copy the **`DATABASE_URL`** from Variables tab

### Step 3: Configure Environment Variables

Click on your service → **"Variables"** tab → Add these:

#### Required Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:...@...railway.app:5432/railway

# Blockchain
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
EXECUTOR_PRIVATE_KEY=0x... # Your executor wallet private key
TRADING_MODULE_ADDRESS=0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb

# Twitter API (if using GAME SDK)
GAME_API_KEY=... # Your GAME API key
GAME_API_URL=... # Optional: custom proxy URL

# Optional
NODE_ENV=production
```

#### How to Get These Values

**`EXECUTOR_PRIVATE_KEY`**:
- This is the wallet that pays gas for trades
- Must have ~0.01 ETH on Arbitrum
- **NEVER** commit this to git!

**`TRADING_MODULE_ADDRESS`**:
- Use: `0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb` (V3 on Arbitrum)

**`DATABASE_URL`**:
- Automatically set if you added PostgreSQL database
- Format: `postgresql://user:pass@host:port/dbname`

### Step 4: Deploy

1. Railway auto-deploys when you push to GitHub
2. Or click **"Deploy"** manually
3. Wait ~3-5 minutes for first build
4. Check **"Deployments"** tab for status

### Step 5: Verify Workers Running

```bash
# Check Railway logs
railway logs

# Or in dashboard: Click your service → "Deployments" → Latest → "View Logs"
```

You should see:
```
✅ Tweet Ingestion started (PID: XXX, every 2 min)
✅ Signal Generator started (PID: XXX, every 5 min)
✅ Trade Executor started (PID: XXX, every 5 min)
✅ Position Monitor started (PID: XXX, every 5 min)
```

---

## 🔧 Configuration Files

### `railway.json` (Already Created)

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate"
  },
  "deploy": {
    "numReplicas": 1,
    "startCommand": "bash workers/start-railway.sh",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### `workers/start-railway.sh` (Already Created)

Runs all 4 workers in background:
- Tweet Ingestion (every 2 min)
- Signal Generator (every 5 min)
- Trade Executor (every 5 min)
- Position Monitor (every 5 min)

---

## 📊 Architecture on Railway

```
┌─────────────────────────────────────────┐
│         Railway Project                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Maxxit Workers Service          │  │
│  │  (Node.js)                       │  │
│  │  • Tweet Ingestion               │  │
│  │  • Signal Generator              │  │
│  │  • Trade Executor                │  │
│  │  • Position Monitor              │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  PostgreSQL Database             │  │
│  │  (Railway Provisioned)           │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘

External:
  • Arbitrum RPC (public or Alchemy)
  • Twitter API / GAME SDK
  • Uniswap V3 (on-chain)
```

---

## 🔍 Monitoring

### View Logs

**In Railway Dashboard**:
1. Click your service
2. Go to **"Deployments"** tab
3. Click latest deployment
4. Click **"View Logs"**

**Using Railway CLI**:
```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# View logs
railway logs
railway logs --follow  # Live tail
```

### Check Worker Health

Create a health check endpoint (optional):
```typescript
// pages/api/workers/health.ts
export default function handler(req, res) {
  res.json({
    status: 'ok',
    workers: {
      'tweet-ingestion': 'running',
      'signal-generator': 'running',
      'trade-executor': 'running',
      'position-monitor': 'running'
    },
    timestamp: new Date().toISOString()
  });
}
```

Then monitor:
```bash
curl https://your-app.railway.app/api/workers/health
```

---

## 🐛 Troubleshooting

### Workers Not Starting

**Check logs** for errors:
```bash
railway logs | grep ERROR
```

**Common Issues**:

1. **Missing Environment Variables**
   ```
   Error: EXECUTOR_PRIVATE_KEY not configured
   ```
   **Fix**: Add in Railway Variables tab

2. **Database Connection Failed**
   ```
   Error: P1001: Can't reach database
   ```
   **Fix**: Check `DATABASE_URL` is correct

3. **Prisma Client Not Generated**
   ```
   Error: @prisma/client did not initialize yet
   ```
   **Fix**: Add to build command: `npx prisma generate`

4. **Out of Memory**
   ```
   FATAL ERROR: Ineffective mark-compacts
   ```
   **Fix**: Upgrade Railway plan (need more RAM)

### Workers Keep Restarting

Check restart policy:
```json
{
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**If hitting retry limit**: Fix the underlying error first

### Slow Performance

**Optimize intervals** in `workers/start-railway.sh`:
```bash
# Current (aggressive)
run_worker_loop "tweet-ingestion" "workers/tweet-ingestion-worker.ts" 120

# Slower (less resource usage)
run_worker_loop "tweet-ingestion" "workers/tweet-ingestion-worker.ts" 300
```

---

## 💰 Cost Estimates

### Railway Pricing (as of 2024)

**Hobby Plan** (Free):
- $5/month credit
- Good for testing
- May not be enough for 24/7 workers

**Developer Plan** ($20/month):
- $20 credit included
- ~$10-15/month estimated for Maxxit workers
- Recommended for production

**Resources Used**:
- Worker service: ~$8-12/month
- PostgreSQL: ~$5/month
- Bandwidth: ~$1-2/month

### Optimization Tips

1. **Increase worker intervals** to reduce CPU usage
2. **Use Railway's PostgreSQL** (included in plan)
3. **Use public RPCs** instead of paid (Alchemy/Infura)
4. **Combine workers** into single process if needed

---

## 🔐 Security Best Practices

### Environment Variables

✅ **DO**:
- Store all secrets in Railway Variables
- Use different executor keys for dev/prod
- Rotate keys periodically
- Use Railway's encryption

❌ **DON'T**:
- Commit `.env` files to git
- Share executor private keys
- Use production keys in development
- Log sensitive values

### Executor Wallet

The `EXECUTOR_PRIVATE_KEY` wallet should:
- Have **minimal ETH** (~0.01-0.05 ETH)
- Be **dedicated** to this purpose only
- Have **no other valuable assets**
- Be **monitored** for balance

**Fund it regularly** to keep gas tank full.

---

## 🚀 Deployment Workflow

### Initial Deployment

```bash
# 1. Commit all changes
git add .
git commit -m "feat: railway deployment config"
git push origin main

# 2. Railway auto-deploys
# 3. Check logs
railway logs --follow
```

### Updates

```bash
# 1. Make changes locally
# 2. Test locally first
bash workers/start-workers.sh  # Test

# 3. Commit and push
git push origin main

# 4. Railway auto-redeploys
# 5. Monitor logs for issues
```

### Rollback

If deployment fails:

**In Railway Dashboard**:
1. Go to **"Deployments"**
2. Find previous working deployment
3. Click **"..."** → **"Redeploy"**

**Using CLI**:
```bash
railway rollback
```

---

## 📈 Scaling

### Horizontal Scaling (Multiple Instances)

Railway supports replicas:
```json
{
  "deploy": {
    "numReplicas": 2  // Run 2 instances
  }
}
```

⚠️ **Warning**: Workers are NOT designed for multiple instances!
- Each worker manages global state
- Running 2+ instances will cause conflicts
- Keep `numReplicas: 1`

### Vertical Scaling (More Resources)

If workers are slow:
1. Railway Dashboard → Service Settings
2. Increase memory/CPU allocation
3. Costs increase proportionally

---

## 🔄 Maintenance

### Database Migrations

When Prisma schema changes:

```bash
# 1. Update schema.prisma
# 2. Generate migration
npx prisma migrate dev --name add_new_field

# 3. Commit migration files
git add prisma/migrations
git commit -m "db: add new field"
git push

# 4. Railway auto-runs migrations on deploy
```

### Prisma Studio on Railway

Can't run Prisma Studio on Railway workers, but you can:

**Option 1: Local connection**
```bash
# Use Railway's DATABASE_URL locally
DATABASE_URL="postgresql://..." npx prisma studio
```

**Option 2: Railway Postgres UI**
- Railway Dashboard → PostgreSQL service
- Click "Data" tab
- Built-in query editor

---

## ✅ Post-Deployment Checklist

After deploying to Railway:

- [ ] Workers showing as "Running" in logs
- [ ] Database connected (check for Prisma errors)
- [ ] Environment variables all set
- [ ] Executor wallet has ETH for gas
- [ ] Tweet ingestion fetching tweets (check logs)
- [ ] Signals being generated (check database)
- [ ] Trades executing (check Arbiscan)
- [ ] Positions being monitored (check logs)
- [ ] No error loops in logs
- [ ] Memory/CPU usage acceptable
- [ ] Cost tracking enabled

---

## 📞 Support

**Railway Issues**:
- [Railway Discord](https://discord.gg/railway)
- [Railway Docs](https://docs.railway.app)
- [Railway Status](https://status.railway.app)

**Maxxit Issues**:
- Check logs: `railway logs`
- Database: `npx prisma studio` (locally)
- Workers: `bash workers/status-workers.sh` (locally)

---

## 🎉 Success!

Once deployed, your system will:
- ✅ Automatically ingest tweets every 2 minutes
- ✅ Generate signals every 5 minutes
- ✅ Execute trades every 5 minutes
- ✅ Monitor positions every 5 minutes
- ✅ Close positions when conditions met
- ✅ Run 24/7 without manual intervention

**You're now running a fully automated trading system! 🚀**

