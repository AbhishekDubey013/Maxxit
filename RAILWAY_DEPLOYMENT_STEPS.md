# 🚂 Railway Deployment Guide (GitHub Integration)

## **Step-by-Step: Deploy Workers to Railway**

### **1. Create Railway Account & Connect GitHub**

1. Go to **https://railway.app**
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select **`AbhishekDubey013/Maxxit`**

---

### **2. Railway Auto-Detects Configuration**

Railway will automatically detect:
- ✅ `railway.json` (defines 3 services)
- ✅ `Procfile` (defines start commands)
- ✅ `package.json` (dependencies)

---

### **3. Configure Environment Variables**

After project is created, for **EACH service** (signal-generator, trade-executor, position-monitor):

1. Click the service name
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add these variables:

```bash
# Copy these from your local .env file:

DATABASE_URL=your_neon_database_url_here

PERPLEXITY_API_KEY=your_perplexity_api_key_here

GAME_API_KEY=your_game_api_key_here

EXECUTOR_PRIVATE_KEY=your_executor_private_key_here

MODULE_ADDRESS=your_module_address_here

SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
```

> **Tip**: You can copy/paste all at once using "Raw Editor" in Railway

---

### **4. Deploy!**

Railway will automatically:
- ✅ Install dependencies (`npm install`)
- ✅ Generate Prisma client (`npx prisma generate`)
- ✅ Start all 3 workers (as defined in `Procfile`)
- ✅ Keep them running 24/7

---

### **5. Monitor Workers**

In Railway dashboard:
- **Deployments** tab: See deployment logs
- **Metrics** tab: CPU, Memory, Network usage
- **Logs** tab: Real-time worker logs

---

## ✅ **Expected Result**

All 3 workers running 24/7:
- 🔄 **Signal Generator**: Every 6 hours
- 💰 **Trade Executor**: Every 30 minutes  
- 📊 **Position Monitor**: Every 5 minutes

---

## 🔄 **Future Updates**

When you push to GitHub `main` branch:
1. Railway auto-detects changes
2. Automatically redeploys
3. Zero downtime! 🎉

