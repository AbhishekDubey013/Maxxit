# 🚂 Railway Quick Start (5 Minutes)

Deploy your workers to Railway in 5 simple steps.

---

## Step 1: Create Railway Project (1 min)

1. Go to: https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select **"Maxxit"** repository
4. Railway starts building automatically

---

## Step 2: Add Database (30 sec)

1. Click **"+ New"** in your project
2. Select **"Database"** → **"PostgreSQL"**
3. Done! Railway auto-sets `DATABASE_URL`

---

## Step 3: Set Environment Variables (2 min)

Click your **Maxxit service** → **"Variables"** → Add these:

```bash
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
EXECUTOR_PRIVATE_KEY=<paste from your .env>
TRADING_MODULE_ADDRESS=0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb
```

**Optional** (if using Twitter GAME API):
```bash
GAME_API_KEY=<your game api key>
```

**Click "Add" after each variable**

---

## Step 4: Trigger Deployment (30 sec)

Railway auto-deploys when you:
- Push to GitHub (already done! ✅)
- Change environment variables

Or manually click **"Deploy"**

---

## Step 5: Verify Workers (1 min)

1. Click **"Deployments"** tab
2. Click latest deployment
3. Click **"View Logs"**

You should see:
```
✅ Tweet Ingestion started (PID: XXX)
✅ Signal Generator started (PID: XXX)
✅ Trade Executor started (PID: XXX)
✅ Position Monitor started (PID: XXX)
⏳ Container staying alive - workers running...
```

---

## ✅ Done!

**Your workers are now running 24/7 on Railway!**

Workers will:
- ✅ Fetch tweets every 2 minutes
- ✅ Generate signals every 5 minutes
- ✅ Execute trades every 5 minutes
- ✅ Monitor positions every 5 minutes
- ✅ Auto-close when trailing stop hits

---

## 🔍 Monitoring

### View Logs
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and link
railway login
railway link

# View logs
railway logs --follow
```

### Check Position Monitor
Watch for these in logs:
```
📊 ARB LONG [SPOT]:
   Entry: $0.33 | Current: $0.35
   P&L: $0.02 (6.06%)
   ✅ Position healthy
```

### Check Trade Execution
```
✅ Trade executed: LONG ARB
   Amount: 0.134 USDC
   TX: 0x890fbe...
```

---

## ⚠️ Important Notes

### Fund Executor Wallet

Your executor wallet needs ETH for gas:
```
Send 0.01 ETH (Arbitrum) to:
0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
```

Check balance:
```bash
cast balance 0x3828dFCBff64fD07B963Ef11BafE632260413Ab3 --rpc-url https://arb1.arbitrum.io/rpc
```

### Database Migrations

When you update Prisma schema:
```bash
# 1. Create migration locally
npx prisma migrate dev --name your_change

# 2. Commit and push
git add prisma/migrations
git commit -m "db: your change"
git push

# 3. Railway auto-applies migrations
```

---

## 🐛 Troubleshooting

### "Build failed"
- Check environment variables are set
- Look at build logs for specific error
- Run `npm run build` locally first

### "Workers not starting"
- Check `EXECUTOR_PRIVATE_KEY` is set
- Check `DATABASE_URL` is accessible
- View logs for specific error

### "No tweets ingested"
- Check `GAME_API_KEY` is set (if using GAME)
- Check Twitter API service is running
- Check CT accounts are configured

---

## 📊 Expected Resource Usage

**Memory**: 200-400 MB  
**CPU**: <5% average  
**Cost**: ~$10-15/month on Developer plan  

---

## 🎉 Success!

Once deployed, check in Railway logs:
```
✅ All workers started successfully!
Workers: 12345, 12346, 12347, 12348
⏳ Container staying alive - workers running in background...
```

**Your automated trading system is live! 🚀**

For detailed guide, see: `RAILWAY_DEPLOYMENT.md`

