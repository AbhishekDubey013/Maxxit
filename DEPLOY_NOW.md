# 🚀 DEPLOY NOW - Step-by-Step Guide

**Status:** Ready to deploy in < 30 minutes  
**Date:** October 6, 2025

---

## 📋 What You'll Deploy

1. ✅ Frontend + Backend → **Vercel** (Free tier, auto-scaling)
2. ✅ Database → **Neon** (Free PostgreSQL)
3. ✅ Workers → Same server (for now)
4. ✅ Python Proxy → Same server (for now)

---

## 🎯 Phase 1: Database (5 minutes)

### Option A: Neon (Recommended - Free)

1. **Go to:** https://neon.tech
2. **Sign up** with GitHub
3. **Create new project:** "Maxxit Production"
4. **Copy connection string** (looks like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb`)
5. **Save it** - you'll need this!

### Option B: Supabase (Alternative - Free)

1. **Go to:** https://supabase.com
2. **Sign up** with GitHub
3. **New project:** "Maxxit"
4. **Go to Settings** → Database → Connection String
5. **Copy the connection string**

---

## 🎯 Phase 2: Vercel Deployment (10 minutes)

### Step 1: Install Vercel CLI

```bash
npm i -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```
(Opens browser, login with GitHub)

### Step 3: Link Project

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
vercel link
```

Answer the prompts:
- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- What's your project's name? **maxxit** (or your choice)
- In which directory is your code located? **./** (press Enter)

### Step 4: Add Environment Variables

You can add them via CLI OR Vercel Dashboard (easier):

#### Via Vercel Dashboard (Recommended):

1. Go to https://vercel.com/dashboard
2. Click your **maxxit** project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```bash
# Database (from Neon/Supabase)
DATABASE_URL=postgresql://...

# X/Twitter API
X_BEARER_TOKEN=your_bearer_token
GAME_API_KEY=your_game_api_key

# LLM
PERPLEXITY_API_KEY=your_perplexity_key

# Blockchain
SEPOLIA_RPC=https://ethereum-sepolia.publicnode.com
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
BASE_RPC=https://mainnet.base.org

# Execution Keys
EXECUTOR_PRIVATE_KEY=your_executor_private_key
DEPLOYER_PRIVATE_KEY=your_deployer_private_key

# Safe Module (Sepolia for now)
MODULE_ADDRESS=0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE

# Platform Config
PLATFORM_FEE_RECEIVER=your_fee_receiver_address
```

#### Via CLI (Alternative):

```bash
vercel env add DATABASE_URL
# Paste your database URL when prompted
# Select "Production"

# Repeat for each variable
```

### Step 5: Deploy!

```bash
vercel --prod
```

This will:
- ✅ Build your Next.js app
- ✅ Deploy frontend + backend
- ✅ Give you a production URL (e.g., `maxxit.vercel.app`)

**Wait 2-3 minutes...**

---

## 🎯 Phase 3: Setup Database Schema (5 minutes)

### After Vercel Deploy:

```bash
# Run migrations on production database
npx prisma migrate deploy

# Seed initial data (tokens, venues)
npx tsx scripts/seed.ts
```

Or do it from Vercel:

```bash
# SSH into Vercel (or use their dashboard)
vercel env pull .env.production
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

---

## 🎯 Phase 4: Test Production (5 minutes)

### Visit Your Site

```
https://your-project.vercel.app
```

### Test Key Endpoints

```bash
# Health check
curl https://your-project.vercel.app/api/health

# Agents list
curl https://your-project.vercel.app/api/agents

# Should return empty array or seeded data
```

### Create Test Agent

1. Go to your production URL
2. Click "Create Agent"
3. Go through the wizard
4. Deploy with test Safe wallet

---

## 🎯 Phase 5: Deploy Workers (Optional - For Full Automation)

### Option A: Keep Workers on Local Server (For Now)

Workers can keep running on your local machine for testing:

```bash
# Workers are already running!
bash workers/status-workers.sh
```

### Option B: Deploy Workers to Railway (Recommended for Production)

1. **Go to:** https://railway.app
2. **Sign up** with GitHub
3. **New Project** → Deploy from GitHub repo
4. **Add these services:**
   - Service 1: "Maxxit Workers"
   - Service 2: "Python Proxy"

**Configure Workers Service:**
```bash
Start Command: bash workers/start-workers.sh
Environment Variables: (copy from Vercel)
```

**Configure Python Proxy:**
```bash
Start Command: python twitter_api_proxy.py
Environment Variables: GAME_API_KEY
Port: 8001
```

### Option C: Deploy Workers to VPS

If you have a VPS (DigitalOcean, AWS, etc):

```bash
# SSH to your server
ssh user@your-server.com

# Clone repo
git clone https://github.com/yourusername/maxxit.git
cd maxxit

# Install dependencies
npm install

# Start workers
bash workers/start-workers.sh

# Setup systemd (auto-restart on reboot)
# See PRODUCTION_DEPLOYMENT.md for full instructions
```

---

## ✅ Deployment Checklist

### Must Have (Critical):
- [ ] Database deployed (Neon/Supabase)
- [ ] Vercel project created
- [ ] Environment variables added
- [ ] `vercel --prod` completed
- [ ] Database migrations run
- [ ] Site accessible at production URL
- [ ] Health check returns `{"status": "ok"}`

### Nice to Have (Can do later):
- [ ] Workers deployed to Railway/VPS
- [ ] Python proxy deployed
- [ ] Custom domain configured
- [ ] Monitoring setup (Sentry)
- [ ] Mainnet smart contracts deployed

---

## 🚨 Troubleshooting

### Build Failed on Vercel

**Error:** "Cannot find module '@prisma/client'"

**Fix:**
```bash
# Add postinstall script to package.json
"scripts": {
  "postinstall": "prisma generate"
}
```

**Redeploy:**
```bash
vercel --prod
```

### Database Connection Failed

**Error:** "Can't reach database server"

**Fix:**
- Check DATABASE_URL in Vercel environment variables
- Make sure it includes `?sslmode=require` for Neon
- Example: `postgresql://user:pass@host/db?sslmode=require`

### API Routes 404

**Error:** "404 Not Found" for `/api/agents`

**Fix:**
- Check build logs in Vercel dashboard
- Make sure Next.js build succeeded
- Verify `pages/api` directory exists in deployment

---

## 🎉 Post-Deployment

### Your Production URLs

```
Frontend: https://your-project.vercel.app
API: https://your-project.vercel.app/api
Health: https://your-project.vercel.app/api/health
```

### Update GAME API Proxy

If you deployed Python proxy separately, update the backend to point to it:

In Vercel environment variables:
```
GAME_API_URL=https://your-python-proxy.railway.app
```

### Monitor Your App

1. **Vercel Dashboard:** Monitor traffic, errors, build logs
2. **Database:** Monitor queries in Neon/Supabase dashboard
3. **Workers:** Check logs with `tail -f logs/*.log`

---

## 🚀 You're Live!

Your DeFi AI trading platform is now **deployed and accessible worldwide**!

### What Works Now:
- ✅ Users can create agents
- ✅ Connect Safe wallets
- ✅ View performance dashboards
- ✅ API endpoints responding
- ✅ Database storing data

### What Needs Workers (Optional):
- ⏳ Automated signal generation
- ⏳ Automated trade execution
- ⏳ Automated position monitoring

Workers can run on your local machine for now, or deploy them to Railway/VPS when ready.

---

## 📞 Need Help?

**Common Issues:**
1. Build fails → Check `package.json` scripts
2. Database errors → Verify connection string
3. API 500 errors → Check Vercel function logs

**Resources:**
- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Next.js Docs: https://nextjs.org/docs

---

**Ready to deploy?** Run:

```bash
vercel login
vercel link
vercel --prod
```

🎉 **You'll be live in 5 minutes!**

