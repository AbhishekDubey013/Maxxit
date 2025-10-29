# 🚀 Deploy to Railway - Complete Guide

**Status**: ✅ Ready to deploy!  
**Time**: 5 minutes  
**Cost**: ~$15/month

---

## 🎯 Three Ways to Deploy

Choose your guide based on experience level:

### 1. **Quick Start** (5 minutes) 👈 START HERE
`RAILWAY_QUICKSTART.md`
- Simple 5-step guide
- Minimal explanation
- Get running ASAP

### 2. **UI Walkthrough** (10 minutes)
`RAILWAY_UI_STEPS.md`
- Visual step-by-step
- Shows exact UI buttons
- Troubleshooting included

### 3. **Complete Guide** (Read later)
`RAILWAY_DEPLOYMENT.md`
- Architecture details
- Security best practices
- Advanced configuration

---

## ✅ Pre-Deployment Checklist

Run this first:
```bash
bash scripts/railway-deploy-checklist.sh
```

Should show:
```
✅ Ready for Railway deployment!
```

---

## 🚂 Railway Deployment Steps

### 1. Open Railway
Go to: **https://railway.app/new**

### 2. Deploy from GitHub
- Click "Deploy from GitHub repo"
- Select **Maxxit**
- Click "Deploy Now"

### 3. Add Database
- Click "+ New" → "Database" → "PostgreSQL"
- Done! (DATABASE_URL auto-configured)

### 4. Set Environment Variables
Click service → "Variables" → Add these:

```bash
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
EXECUTOR_PRIVATE_KEY=<your executor wallet key>
TRADING_MODULE_ADDRESS=0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb
```

**Optional** (for Twitter):
```bash
GAME_API_KEY=<your game api key>
```

### 5. Verify Deployment
Click "Deployments" → Latest → "View Logs"

Should see:
```
✅ Tweet Ingestion started (PID: XXX)
✅ Signal Generator started (PID: XXX)
✅ Trade Executor started (PID: XXX)
✅ Position Monitor started (PID: XXX)
🎉 All workers started successfully!
```

---

## 📊 What Gets Deployed

### 4 Workers Running 24/7:

| Worker | Frequency | Purpose |
|--------|-----------|---------|
| **Tweet Ingestion** | Every 2 min | Fetch tweets from X accounts |
| **Signal Generator** | Every 5 min | Classify tweets → signals |
| **Trade Executor** | Every 5 min | Execute trades via Safe module |
| **Position Monitor** | Every 5 min | Track P&L, auto-close positions |

### Resources:
- **Memory**: 200-400 MB
- **CPU**: <5% average
- **Storage**: PostgreSQL database
- **Network**: Minimal (API calls only)

---

## 💰 Cost Breakdown

### Developer Plan ($20/month)
- Includes $20 credit
- Workers: ~$8-12/month
- Database: ~$5/month
- **Net cost: ~$0-5/month** (covered by credit!)

### What You're Paying For:
- ✅ 24/7 uptime
- ✅ Auto-scaling
- ✅ Automatic deploys
- ✅ Database backups
- ✅ Monitoring & logs

**Way cheaper than running a VPS!** 🎉

---

## 🔐 Security Checklist

Before deploying:

- [ ] Executor wallet has **only** 0.01-0.05 ETH
- [ ] Executor wallet is **dedicated** (no other funds)
- [ ] Private key **never** committed to git
- [ ] Environment variables set in Railway (not .env)
- [ ] `.gitignore` includes `.env*`

---

## 📈 After Deployment

### Monitor Logs (CLI)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# Tail logs
railway logs --follow
```

### Check Workers Working
Look for these in logs:
```
[Timestamp] Running tweet-ingestion...
[Timestamp] Running signal-generator...
[Timestamp] Running trade-executor...
[Timestamp] Running position-monitor...
```

### Verify Trades
After a signal is generated:
```
✅ Trade executed: LONG ARB
   Amount: 0.134 USDC
   TX: 0x890fbe...
```

### Watch Position Monitor
Every 5 minutes:
```
📊 ARB LONG [SPOT]:
   Entry: $0.33 | Current: $0.35
   P&L: $0.02 (6.06%)
   ✅ Position healthy
```

---

## 🎯 Success Criteria

After 30 minutes, you should see:

1. ✅ All 4 workers running (check logs)
2. ✅ Tweets being ingested (if CT accounts configured)
3. ✅ Positions being monitored (if any open)
4. ✅ No errors in logs
5. ✅ Memory/CPU usage normal

---

## 🐛 Troubleshooting

### Workers Not Starting
```bash
# Check environment variables
railway variables

# Should show all required vars
```

### Database Connection Failed
```bash
# Check database is running
railway status

# Both services should be "Active"
```

### Trades Not Executing
```bash
# Check executor wallet balance
cast balance 0x3828dFCBff64fD07B963Ef11BafE632260413Ab3 \
  --rpc-url https://arb1.arbitrum.io/rpc

# Should have > 0.005 ETH
```

---

## 🔄 Updating After Deployment

### Code Changes
```bash
# 1. Make changes locally
# 2. Test locally
npm run dev

# 3. Push to GitHub
git push origin main

# 4. Railway auto-redeploys
```

### Database Changes
```bash
# 1. Update schema.prisma
# 2. Create migration
npx prisma migrate dev --name your_change

# 3. Push to GitHub
git push origin main

# 4. Railway auto-applies migration
```

---

## 📞 Support

**Stuck?** Try in this order:

1. **Check logs**: `railway logs --follow`
2. **Read error**: Most errors are self-explanatory
3. **Check variables**: `railway variables`
4. **Railway Discord**: https://discord.gg/railway
5. **Detailed docs**: See `RAILWAY_DEPLOYMENT.md`

---

## 🎉 Ready to Deploy!

Everything is prepared:
- ✅ `railway.json` configured
- ✅ `workers/start-railway.sh` ready
- ✅ Environment variables documented
- ✅ Guides written
- ✅ Code pushed to GitHub

**Just follow the steps above and you'll be live in 5 minutes! 🚀**

---

## 📚 Documentation Index

| File | Purpose | Time |
|------|---------|------|
| `DEPLOY_TO_RAILWAY.md` | This file (overview) | 2 min |
| `RAILWAY_QUICKSTART.md` | Quick 5-step deploy | 5 min |
| `RAILWAY_UI_STEPS.md` | Visual UI walkthrough | 10 min |
| `RAILWAY_DEPLOYMENT.md` | Complete detailed guide | 30 min |
| `RAILWAY_ENV_VARS.txt` | Environment variables list | 1 min |
| `PRODUCTION_READY.md` | Full system documentation | 15 min |

**Start with `RAILWAY_QUICKSTART.md` →**

