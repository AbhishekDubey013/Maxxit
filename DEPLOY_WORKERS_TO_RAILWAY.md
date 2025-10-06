# 🚀 Deploy Workers to Railway (Cloud)

**Time:** ~5 minutes  
**Cost:** Free tier (enough for this use case)

---

## Why Railway?

✅ Free tier with generous limits  
✅ Auto-restart on failure  
✅ Easy environment variable management  
✅ Built-in logging  
✅ Runs 24/7 (no need for your Mac to be on)  

---

## 📋 Step-by-Step Deployment

### **Step 1: Create Railway Account (1 min)**

1. Go to: **https://railway.app**
2. Click **"Start a New Project"**
3. Sign up with **GitHub** (easiest)

---

### **Step 2: Connect GitHub Repository (2 min)**

**Option A: If code is on GitHub:**
1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `maxxit` repository
4. Railway will auto-detect and deploy

**Option B: Deploy from local (no GitHub needed):**
1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Initialize project:
   ```bash
   railway init
   ```

4. Link to new project:
   ```bash
   railway link
   ```

---

### **Step 3: Add Environment Variables (2 min)**

In Railway dashboard:
1. Click your project
2. Go to **"Variables"** tab
3. Add these variables (copy from your `.env`):

```bash
DATABASE_URL=postgresql://user:password@host/database
PERPLEXITY_API_KEY=pplx-your-key-here
GAME_API_KEY=apx-your-key-here
EXECUTOR_PRIVATE_KEY=your-private-key-here
MODULE_ADDRESS=0x-your-module-address-here
```

---

### **Step 4: Deploy (Automatic)**

Railway will automatically:
- ✅ Install dependencies
- ✅ Start workers
- ✅ Keep them running 24/7
- ✅ Auto-restart on crash

---

## 🎯 Alternative: Quick Deploy with Railway CLI

If you have Railway CLI installed:

```bash
# From your project directory
cd /Users/abhishekdubey/Downloads/Maxxit

# Login to Railway
railway login

# Initialize and link
railway init

# Add environment variables (do this in Railway dashboard)

# Deploy
railway up

# Check status
railway status

# View logs
railway logs
```

---

## 📊 After Deployment

### **Verify Workers Are Running**

In Railway dashboard:
1. Go to **"Deployments"**
2. Click latest deployment
3. Click **"View Logs"**
4. You should see:
   ```
   ✅ Signal Generator started (PID: xxx)
   ✅ Trade Executor started (PID: xxx)
   ✅ Position Monitor started (PID: xxx)
   ```

---

## 🔧 Managing Workers on Railway

### View Logs
```bash
railway logs
```

Or in Railway dashboard → Deployments → View Logs

### Restart Workers
```bash
railway restart
```

Or in Railway dashboard → Click "Redeploy"

### Stop Workers (if needed)
Just pause the service in Railway dashboard

---

## 💰 Railway Pricing

**Free Tier Includes:**
- $5 credit per month
- Enough for running workers 24/7
- No credit card required initially

**Worker Usage:**
- Very low resource usage
- Estimate: ~$1-2 per month
- Well within free tier

---

## 🆚 Railway vs Local Comparison

| Feature | Local (Current) | Railway (Cloud) |
|---------|----------------|-----------------|
| Cost | Free | Free tier |
| Runs when? | Mac must be on | 24/7 always |
| Auto-restart | No | Yes |
| Logs | Local files | Cloud dashboard |
| Setup time | Done ✅ | 5 minutes |
| Production ready | ⚠️ No | ✅ Yes |

---

## ✅ After Railway Deployment

Once deployed to Railway:

1. **Stop local workers:**
   ```bash
   bash workers/stop-workers.sh
   bash scripts/daemon-control.sh stop
   ```

2. **System will work 24/7:**
   - ✅ Workers run in cloud
   - ✅ No need for Mac to be on
   - ✅ Auto-restart on failure
   - ✅ Production ready

---

## 🚨 Troubleshooting

### Workers not starting?
Check Railway logs for errors:
```bash
railway logs
```

### Environment variables missing?
Add them in Railway dashboard → Variables tab

### Need to restart?
```bash
railway restart
```

---

## 🎉 That's It!

Your workers will now run 24/7 in the cloud, independent of your local machine!

**Next:** Just visit your Vercel site and workers will handle everything automatically in the background! 🚀

