# 🔵 Vercel GitHub Integration Guide

## **Connect Your Vercel Deployment to GitHub**

### **Option A: Link Existing Deployment to GitHub (Recommended)**

1. Go to **https://vercel.com/dashboard**
2. Click on your **`maxxit`** project
3. Go to **Settings** → **Git**
4. Click **"Connect Git Repository"**
5. Select **`AbhishekDubey013/Maxxit`**
6. Click **"Connect"**

✅ **Done!** Now every push to `main` will auto-deploy to Vercel.

---

### **Option B: Create New Vercel Project from GitHub**

If Option A doesn't work, create a fresh deployment:

1. Go to **https://vercel.com/new**
2. Click **"Import Git Repository"**
3. Select **`AbhishekDubey013/Maxxit`**
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add **Environment Variables** (same as before):

```bash
# Copy these from your local .env file:

DATABASE_URL=your_neon_database_url_here

PERPLEXITY_API_KEY=your_perplexity_api_key_here

GAME_API_KEY=your_game_api_key_here

EXECUTOR_PRIVATE_KEY=your_executor_private_key_here

MODULE_ADDRESS=your_module_address_here

SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
```

6. Click **"Deploy"**

---

## ✅ **Benefits of GitHub Integration**

1. **Auto-Deploy**: Push to `main` → Vercel auto-deploys
2. **Preview Deployments**: Every PR gets a preview URL
3. **Rollback**: Easy rollback to previous versions
4. **CI/CD**: Automatic builds and deployments

---

## 🔄 **Deployment Flow (After Setup)**

```
Local Changes
    ↓
git push origin main
    ↓
GitHub (AbhishekDubey013/Maxxit)
    ├→ Vercel (Frontend/Backend) ✅ Auto-deploy
    └→ Railway (Workers) ✅ Auto-deploy
```

---

## 📝 **Quick Test**

Make a small change and push:

```bash
# Make a change (e.g., update README.md)
echo "# Updated from GitHub!" >> README.md

# Commit and push
git add README.md
git commit -m "Test auto-deploy"
git push origin main
```

Watch both Vercel and Railway auto-deploy! 🚀

