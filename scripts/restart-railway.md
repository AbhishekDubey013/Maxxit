# 🔄 Restart Railway Service

Your signal generator stopped 3.8 hours ago. Here's how to restart it:

## Option 1: Restart via Railway Dashboard (Easiest)

1. Go to: https://railway.app/dashboard
2. Click your **Maxxit** project
3. Click your service
4. Click **"Settings"** tab
5. Scroll down
6. Click **"Restart Service"** button
7. Wait 1-2 minutes for restart

## Option 2: Redeploy via Railway Dashboard

1. Go to: https://railway.app/dashboard
2. Click your **Maxxit** project
3. Click your service
4. Click **"Deployments"** tab
5. Click latest deployment
6. Click **"Redeploy"** button

## Option 3: Restart via CLI

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Restart
railway restart
```

## ✅ After Restart, Check Logs

```bash
railway logs --follow
```

Look for:
```
✅ Tweet Ingestion started (PID: XXX)
✅ Signal Generator started (PID: XXX)
✅ Trade Executor started (PID: XXX)
✅ Position Monitor started (PID: XXX)
🎉 All workers started successfully!
```

Within 5 minutes, you should see:
```
[SignalWorker] Starting signal generation...
[SignalWorker] Found X active deployed agents
```

## 🎯 Expected Result

After restart + 5 minutes:
- Tweet "arb is going to become 0.5 USD soon" gets classified
- Signal generated: LONG ARB for Ring agent
- Trade executes on your Safe
- Position tracked in database

---

**Restart the service and watch the magic happen!** 🚀

