# 🚂 Railway Redeployment Guide - Tweet Ingestion Fix

## ⚠️ Issue
The tweet-ingestion-worker is still showing 404 errors because it's running **old code**. The fix has been committed to GitHub but Railway needs to pull and redeploy the changes.

---

## ✅ Fix is Ready in `Vprime` Branch

**Commit:** `062ef7d` - "fix: Update tweet-ingestion-worker start script path"

**What was fixed:**
1. ✅ Changed endpoint from `/fetch-tweets` to `/tweets/<username>`
2. ✅ Updated response parsing from `data.tweets` to `data.data`
3. ✅ Fixed start script path to `dist/tweet-ingestion-worker/src/worker.js`

---

## 🚀 How to Redeploy on Railway

### **Option 1: Automatic Redeploy (If Connected to GitHub)**

1. Go to Railway Dashboard: https://railway.app
2. Find your **tweet-ingestion-worker** service
3. Click on the service
4. Click **"Deploy"** dropdown → **"Redeploy"**
5. Railway will pull latest code from `Vprime` branch and rebuild

---

### **Option 2: Manual Trigger**

If Railway doesn't auto-detect the changes:

1. Go to Railway Dashboard
2. Click on **tweet-ingestion-worker** service
3. Go to **Settings** tab
4. Find **"Service"** section
5. Click **"Redeploy"** or **"Trigger Deploy"**
6. Wait for build to complete (~2-3 minutes)

---

### **Option 3: Force Rebuild**

If Railway is still not picking up changes:

1. Go to Railway Dashboard
2. Click on **tweet-ingestion-worker** service
3. Go to **Deployments** tab
4. Click the **3 dots (⋯)** on the latest deployment
5. Select **"Redeploy"**
6. Or go to **Settings** → **"Service"** → **"Redeploy"**

---

## 🔍 Verify the Deployment

After redeploying, check the logs:

### **1. Check Railway Logs**
```
Railway Dashboard → tweet-ingestion-worker → Logs
```

**Look for:**
```
✅ Twitter proxy is available (client: ready)
📋 Found X active CT account(s) to process
[aixbt_agent] Fetching recent tweets...
[aixbt_agent] ✅ Fetched X new tweets
```

**Should NOT see:**
```
❌ [aixbt_agent] ❌ Error: Twitter proxy returned 404
```

---

### **2. Test the Endpoint Manually**

```bash
curl "https://maxxit.onrender.com/tweets/aixbt_agent?max_results=5"
```

**Expected response:**
```json
{
  "username": "aixbt_agent",
  "count": 5,
  "data": [...]
}
```

---

## 📋 Railway Environment Variables

Make sure these are set in your **tweet-ingestion-worker** service:

```bash
# Required
DATABASE_URL=postgresql://...
TWITTER_PROXY_URL=https://maxxit.onrender.com
# or
X_API_PROXY_URL=https://maxxit.onrender.com

# Optional (for interval)
WORKER_INTERVAL=300000  # 5 minutes
PORT=5003
```

---

## 🏗️ Build & Start Commands

Railway should use these commands (already in `package.json`):

**Build Command:**
```bash
npm install && npx prisma generate && npm run build
```

**Start Command:**
```bash
npm start
```

Which runs: `node dist/tweet-ingestion-worker/src/worker.js`

---

## ✅ Expected Output After Fix

```
🚀 Tweet Ingestion Worker starting...
⏱️  Interval: 300000ms (300s)
🔗 X API Proxy: https://maxxit.onrender.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Checking Twitter proxy at: https://maxxit.onrender.com
✅ Twitter proxy is available (client: ready)

📋 Found 2 active CT account(s) to process

[aixbt_agent] Processing...
[aixbt_agent] Fetching recent tweets...
[aixbt_agent] Last seen: 1989037926311989704
[aixbt_agent] ✅ Fetched 5 new tweets
[aixbt_agent] ✅ Stored 5 tweets

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Cycle complete
   Total fetched: 5
   Total stored: 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🚨 Troubleshooting

### **Still showing 404?**

1. **Check Railway deployment logs:**
   - Make sure build completed successfully
   - Look for any TypeScript errors
   - Verify start command is correct

2. **Check which branch Railway is using:**
   - Go to Settings → Service
   - Ensure it's connected to `Vprime` branch (not `main`)
   - Update branch if needed

3. **Clear Railway cache:**
   - Go to Settings → Service
   - Find "Clear Build Cache"
   - Click and redeploy

4. **Verify environment variables:**
   - TWITTER_PROXY_URL or X_API_PROXY_URL is set
   - DATABASE_URL is set

---

## 📝 Quick Checklist

- [ ] Latest code is in `Vprime` branch on GitHub
- [ ] Railway service is connected to `Vprime` branch
- [ ] Triggered redeploy on Railway
- [ ] Build completed successfully (check logs)
- [ ] Service restarted (check logs for "Worker starting...")
- [ ] No 404 errors in logs
- [ ] Tweets are being fetched successfully

---

## 🎯 Summary

**The fix is ready**, you just need to:
1. Go to Railway Dashboard
2. Find `tweet-ingestion-worker` service
3. Click **"Redeploy"**
4. Wait for build to complete
5. Check logs for success ✅

---

**Questions?**
- Check the service logs on Railway
- Verify the branch is `Vprime`
- Make sure environment variables are set

