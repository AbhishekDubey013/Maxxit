# 🚂 Railway Root Directory Configuration

## ⚠️ The Issue

The tweet-ingestion-worker is still showing 404 errors even after multiple redeploys. This is because **Railway is building from the wrong directory**.

---

## 🔍 Root Cause

Railway needs to know which subdirectory to build from. Without setting the **Root Directory**, it builds from the project root and can't find the service files.

---

## ✅ The Fix

### **Configure Root Directory in Railway**

1. Go to Railway Dashboard: https://railway.app
2. Click on **`tweet-ingestion-worker`** service
3. Go to **Settings** tab
4. Scroll to **"Service"** section
5. Find **"Root Directory"** field
6. Set it to: **`services/tweet-ingestion-worker`**
7. Click **"Save"**
8. Go back to **Deployments** and click **"Redeploy"**

---

## 📋 Railway Configuration for Each Service

| Service | Root Directory |
|---------|---------------|
| **tweet-ingestion-worker** | `services/tweet-ingestion-worker` |
| **trade-executor-worker** | `services/trade-executor-worker` |
| **position-monitor-worker** | `services/position-monitor-worker` |
| **metrics-updater-worker** | `services/metrics-updater-worker` |
| **research-signal-worker** | `services/research-signal-worker` |

---

## 🏗️ Build & Start Commands

These should already be in `package.json`, but verify in Railway:

**Build Command:**
```bash
npm install && npx prisma generate && npm run build
```

**Start Command:**
```bash
npm start
```

---

## 🎯 Alternative: Use Railway.json

If you prefer configuration as code, create this file:

**`railway.json`** (in project root):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Then in each service, create:

**`services/tweet-ingestion-worker/railway.json`**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

---

## 🔍 How to Verify

After setting Root Directory and redeploying, check the logs. You should see:

```
🚀 Tweet Ingestion Worker starting...
⏱️  Interval: 300000ms (300s)
🔗 X API Proxy: https://maxxit.onrender.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Checking Twitter proxy at: https://maxxit.onrender.com
✅ Twitter proxy is available (client: ready)

[aixbt_agent] Processing...
[aixbt_agent] Fetching recent tweets...
[aixbt_agent] ✅ Fetched X new tweets  ← Should work now!
```

**NOT:**
```
[aixbt_agent] ❌ Error: Twitter proxy returned 404  ← Should be gone
```

---

## 🚨 If Still Not Working

### **Option 1: Check the actual deployed code**

Railway Build Logs will show what directory it's building from. Look for:
```
Building from: /app/services/tweet-ingestion-worker
```

If it says `/app` only, the Root Directory is not set.

### **Option 2: Check start command output**

Look for:
```
Error: Cannot find module 'dist/tweet-ingestion-worker/src/worker.js'
```

This means it's building from the wrong directory.

### **Option 3: Use absolute path in start command**

Update start command to:
```bash
node /app/services/tweet-ingestion-worker/dist/tweet-ingestion-worker/src/worker.js
```

But this is a workaround - setting Root Directory is the proper fix.

---

## 📝 Summary

**The code is correct.** The issue is Railway configuration. You need to:

1. Set **Root Directory** to `services/tweet-ingestion-worker`
2. Redeploy
3. Check logs

Without the Root Directory set, Railway can't find the service files and the old code keeps running.

---

**This is the missing configuration causing the persistent 404 error!**

