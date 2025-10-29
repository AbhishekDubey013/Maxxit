# 🚂 Railway UI Step-by-Step Guide

Visual walkthrough of Railway deployment with exact UI steps.

---

## 🎯 Before You Start

**You need**:
- ✅ GitHub account with Maxxit repo
- ✅ Railway account (sign up free)
- ✅ Executor wallet private key
- ✅ ~0.01 ETH in executor wallet (Arbitrum)

---

## Step 1️⃣: Create New Project

### 1.1 Go to Railway Dashboard
URL: https://railway.app/dashboard

### 1.2 Click "New Project"
Big button in top right corner

### 1.3 Select "Deploy from GitHub repo"
Options:
- Deploy from GitHub repo ← **Click this**
- Provision PostgreSQL
- Provision Redis
- Empty Project

### 1.4 Authorize GitHub (if first time)
- Click "Configure GitHub App"
- Select your repositories
- Grant Railway access to Maxxit repo

### 1.5 Select Maxxit Repository
Search for "Maxxit" and click it

### 1.6 Click "Deploy Now"
Railway will:
- Clone your repo
- Detect Node.js
- Run `npm install`
- Generate Prisma client
- Start build

**Wait 2-3 minutes for first build** ☕

---

## Step 2️⃣: Add PostgreSQL Database

### 2.1 Click "+ New" Button
In your project, top right corner

### 2.2 Select "Database"
Options:
- GitHub Repo
- Docker Image
- Database ← **Click this**
- Empty Service

### 2.3 Select "Add PostgreSQL"
Railway provisions database instantly

### 2.4 Wait for Green Checkmark
Database shows as "Active" with green dot

**That's it!** `DATABASE_URL` is automatically added to your service

---

## Step 3️⃣: Configure Environment Variables

### 3.1 Click Your Service
The one named "Maxxit" (not the database)

### 3.2 Go to "Variables" Tab
Top navigation:
- Deployments
- Settings
- Metrics
- Variables ← **Click this**

### 3.3 Click "Add Variable" Button

### 3.4 Add Each Variable

**Variable 1: ARBITRUM_RPC**
```
Variable Name: ARBITRUM_RPC
Variable Value: https://arb1.arbitrum.io/rpc
```
Click **"Add"**

**Variable 2: EXECUTOR_PRIVATE_KEY**
```
Variable Name: EXECUTOR_PRIVATE_KEY
Variable Value: 0x... (paste your private key)
```
⚠️ **Keep this secret!**
Click **"Add"**

**Variable 3: TRADING_MODULE_ADDRESS**
```
Variable Name: TRADING_MODULE_ADDRESS
Variable Value: 0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb
```
Click **"Add"**

**Optional Variable 4: GAME_API_KEY** (if using Twitter)
```
Variable Name: GAME_API_KEY
Variable Value: (your GAME API key)
```
Click **"Add"**

### 3.5 Verify Variables Added
You should see:
- ✅ DATABASE_URL (auto-added by Railway)
- ✅ ARBITRUM_RPC
- ✅ EXECUTOR_PRIVATE_KEY
- ✅ TRADING_MODULE_ADDRESS
- ✅ GAME_API_KEY (if added)

---

## Step 4️⃣: Trigger Deployment

Railway auto-redeploys when you add variables.

### 4.1 Check Deployment Status
Click **"Deployments"** tab

You'll see:
- Latest deployment with timestamp
- Status: "Building" → "Deploying" → "Active"

### 4.2 Wait for "Active" Status
Green checkmark = deployment successful

**Takes 2-3 minutes**

---

## Step 5️⃣: View Logs & Verify

### 5.1 Click Latest Deployment
In "Deployments" tab, click the top one

### 5.2 Click "View Logs"
Big button near top

### 5.3 Look for Success Messages

You should see:
```bash
🚂 Starting Maxxit Workers on Railway...
📦 Connecting to Python Proxy at: http://localhost:8001

✅ Tweet Ingestion started (PID: 123, every 2 min)
✅ Signal Generator started (PID: 124, every 5 min)
✅ Trade Executor started (PID: 125, every 5 min)
✅ Position Monitor started (PID: 126, every 5 min)

🎉 All workers started successfully!
Workers: 123, 124, 125, 126
⏳ Container staying alive - workers running in background...
```

### 5.4 Verify Workers Running

After 2 minutes, you should see:
```bash
[Timestamp] Running tweet-ingestion...
[Timestamp] tweet-ingestion complete. Sleeping for 120 seconds...
```

After 5 minutes:
```bash
[Timestamp] Running signal-generator...
[Timestamp] Running trade-executor...
[Timestamp] Running position-monitor...
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Deployment shows "Active" with green checkmark
- [ ] Logs show "🎉 All workers started successfully!"
- [ ] All 4 workers showing PID numbers
- [ ] No error messages in logs
- [ ] Database connection successful
- [ ] Tweet ingestion running every 2 min
- [ ] Position monitor running every 5 min

---

## 🎯 What Happens Now?

Railway will:
- ✅ Keep workers running 24/7
- ✅ Auto-restart if any worker crashes
- ✅ Auto-redeploy when you push to GitHub
- ✅ Auto-apply Prisma migrations
- ✅ Scale resources as needed

---

## 📊 Monitoring Your Deployment

### View Real-Time Logs

**In Railway UI**:
1. Click your service
2. "Deployments" → Latest → "View Logs"
3. Logs auto-refresh

**Using CLI** (recommended):
```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Tail logs (live)
railway logs --follow
```

### Check Metrics

Click **"Metrics"** tab to see:
- CPU usage
- Memory usage
- Network traffic
- Request count

### Check Database

Click **PostgreSQL service** → **"Data"** tab:
- View tables
- Run SQL queries
- Export data

---

## 🔧 Making Changes

### Update Code

```bash
# 1. Make changes locally
# 2. Test locally first
npm run dev

# 3. Commit and push
git add .
git commit -m "fix: your change"
git push origin main

# 4. Railway auto-redeploys
# 5. Check logs for success
```

### Update Environment Variables

1. Railway Dashboard → Your Service
2. "Variables" tab
3. Click variable to edit
4. Save changes
5. Railway auto-redeploys

### Update Database Schema

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_field

# 3. Commit migration
git add prisma/migrations
git commit -m "db: add field"
git push

# 4. Railway auto-applies migration
```

---

## 🐛 Common Issues

### Issue: "Build Failed"

**Symptoms**: Red X on deployment

**Check**:
1. Click deployment → View Logs
2. Look for error message
3. Common causes:
   - Missing dependencies
   - TypeScript errors
   - Prisma generation failed

**Fix**:
```bash
# Test build locally
npm run build

# If it works locally, try:
git push --force origin main
```

### Issue: "Workers Not Starting"

**Symptoms**: Logs show errors, no worker PIDs

**Check**:
1. Environment variables all set?
2. DATABASE_URL accessible?
3. EXECUTOR_PRIVATE_KEY correct format?

**Fix**:
- Re-check all variables
- Look at specific error in logs
- Try redeploying manually

### Issue: "Database Connection Failed"

**Symptoms**: Logs show Prisma connection error

**Check**:
1. PostgreSQL service is Active?
2. DATABASE_URL variable exists?

**Fix**:
- Click PostgreSQL → "Connect"
- Copy DATABASE_URL
- Manually add to Variables

### Issue: "Out of Memory"

**Symptoms**: Workers crash, "FATAL ERROR" in logs

**Fix**:
1. Click Service → "Settings"
2. Scroll to "Resources"
3. Increase memory limit
4. Redeploy

---

## 💰 Cost Tracking

### View Current Usage

1. Railway Dashboard → Your Project
2. Click "Usage" in sidebar
3. See:
   - Current month cost
   - Resource breakdown
   - Usage graphs

### Estimated Monthly Cost

**Hobby Plan** ($5 credit):
- Not enough for 24/7 workers

**Developer Plan** ($20/month):
- $20 credit included
- Workers: ~$8-12/month
- Database: ~$5/month
- **Total: ~$13-17/month**

### Reduce Costs

1. **Increase worker intervals**:
   Edit `workers/start-railway.sh`:
   ```bash
   # Change from 120 to 300 seconds
   run_worker_loop "tweet-ingestion" "..." 300
   ```

2. **Use public RPC** (already doing this ✅)

3. **Optimize database queries**

---

## 🎉 You're Done!

Your deployment should now show:
- ✅ Green "Active" status
- ✅ All workers running
- ✅ Logs flowing smoothly
- ✅ No errors

**Your automated trading system is live on Railway! 🚀**

---

## 📞 Need Help?

**Railway Support**:
- Discord: https://discord.gg/railway
- Docs: https://docs.railway.app
- Status: https://status.railway.app

**Check Logs First**:
```bash
railway logs --follow
```

Most issues show up in logs with clear error messages!

