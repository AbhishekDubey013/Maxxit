# Vercel (Frontend) + Railway (Workers) Deployment Guide

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Render:   Hyperliquid Python Service                       │
│ Vercel:   Next.js Frontend + API Routes                    │
│ Railway:  Background Workers                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🟢 STEP 1: Deploy to Vercel (Frontend)

### 1.1 Deploy

1. Go to **vercel.com**
2. Click **"Import Project"**
3. Select GitHub repo: `AbhishekDubey013/Maxxit`
4. Click **"Import"**
5. Vercel will auto-detect Next.js

### 1.2 Environment Variables

Go to **Settings → Environment Variables** and add:

#### 🔵 Frontend (Public)
```bash
NEXT_PUBLIC_HYPERLIQUID_TESTNET=true
```

#### 🔴 Backend/API (Server-side)
```bash
DATABASE_URL=postgresql://user:password@host:5432/database

HYPERLIQUID_SERVICE_URL=https://your-service.onrender.com

AGENT_WALLET_ENCRYPTION_KEY=8c53c86d65aa4e404ef0673d806d53f6a2a8bed83c9a50e3c1c8e123e7b89e83

LUNARCRUSH_API_KEY=tt6l3p9qa3otztg3rik6gf2ofdmhhl3ndd4b4psvl

# Choose ONE LLM provider
PERPLEXITY_API_KEY=your_key
# OR
OPENAI_API_KEY=your_key
# OR
ANTHROPIC_API_KEY=your_key

# For tweet fetching via API routes
GAME_API_KEY=apx-31d308e580e9a3b0efc45eb02db1f977

# Optional: Safe Wallet (if using SPOT/GMX)
PRIVATE_KEY=your_ethereum_private_key
INFURA_API_KEY=your_infura_key
```

### 1.3 Deploy

Click **"Deploy"** - Vercel will build and deploy your frontend!

Your app will be live at: `https://your-app.vercel.app`

---

## 🟣 STEP 2: Deploy to Railway (Workers Only)

### 2.1 Deploy

1. Go to **railway.app**
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select: `AbhishekDubey013/Maxxit`
4. Railway will detect your repo

### 2.2 Configure Start Command

Railway needs to know to run workers only, not the web server.

**Option A: Via Railway Dashboard (Recommended)**

1. Go to your service → **Settings**
2. Find **"Start Command"** (or "Custom Start Command")
3. Set it to:
   ```bash
   bash workers/start-railway-workers-only.sh
   ```

**Option B: Via railway.json**

Railway will read this file if present (already in your repo):
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "bash workers/start-railway-workers-only.sh"
  }
}
```

### 2.3 Environment Variables

Add these in Railway → Variables:

```bash
# Database (CRITICAL - same as Vercel)
DATABASE_URL=postgresql://user:password@host:5432/database

# Hyperliquid Service
HYPERLIQUID_SERVICE_URL=https://your-service.onrender.com

# Agent Wallet Encryption (MUST be same as Vercel!)
AGENT_WALLET_ENCRYPTION_KEY=8c53c86d65aa4e404ef0673d806d53f6a2a8bed83c9a50e3c1c8e123e7b89e83

# LunarCrush
LUNARCRUSH_API_KEY=tt6l3p9qa3otztg3rik6gf2ofdmhhl3ndd4b4psvl

# LLM Provider (Choose ONE - same as Vercel)
PERPLEXITY_API_KEY=your_key
# OR
OPENAI_API_KEY=your_key
# OR
ANTHROPIC_API_KEY=your_key

# Twitter/X API
GAME_API_KEY=apx-31d308e580e9a3b0efc45eb02db1f977

# Optional: Safe Wallet
PRIVATE_KEY=your_ethereum_private_key
INFURA_API_KEY=your_infura_key

# Environment
NODE_ENV=production
```

### 2.4 Deploy

Click **"Deploy"** - Railway will:
1. Install dependencies
2. Generate Prisma client
3. Start all 4 workers (no web server!)

---

## ✅ STEP 3: Verify Everything Works

### 3.1 Check Vercel Frontend

1. Visit: `https://your-app.vercel.app`
2. Should see Maxxit homepage
3. Try creating an agent
4. Check agent marketplace

### 3.2 Check Railway Workers

1. Go to Railway → Your service → **Logs**
2. You should see:
   ```
   ✅ All workers started successfully!
   Tweet Worker PID: ...
   Signal Worker PID: ...
   Executor Worker PID: ...
   Monitor Worker PID: ...
   ```

### 3.3 Test Complete Flow

1. **Create Agent** on Vercel UI
2. **Post a Tweet** (or use synthetic tweet script)
3. **Check Railway logs** - should see:
   - Tweet detected
   - Signal generated
   - Trade executed
   - Position monitored
4. **Check Vercel UI** - positions should appear

---

## 🔗 Critical: Same Environment Variables

**These MUST be identical on both Vercel and Railway:**

- ✅ `DATABASE_URL` (so both access same data)
- ✅ `AGENT_WALLET_ENCRYPTION_KEY` (so both can decrypt agent keys)
- ✅ `HYPERLIQUID_SERVICE_URL` (so both connect to same service)

---

## 🐛 Troubleshooting

### Workers not starting on Railway?

**Check logs for errors:**
```bash
railway logs
```

**Common issues:**
- Missing `DATABASE_URL`
- Prisma client not generated → Railway should auto-generate
- Start command not set → Check Settings → Start Command

### Frontend works but no trades executing?

**Check:**
1. Railway workers are running (check logs)
2. `DATABASE_URL` is same on both Vercel and Railway
3. `HYPERLIQUID_SERVICE_URL` points to Render
4. Agent wallet created and whitelisted on Hyperliquid

### API routes timing out on Vercel?

- Vercel API routes timeout: 10s (Hobby) or 60s (Pro)
- Long operations should be moved to Railway workers
- Use database for communication between services

---

## 📊 Monitoring

### Vercel
- **Dashboard** → Your project → **Analytics**
- Check page views, API route usage
- Monitor errors in **Functions** tab

### Railway
- **Dashboard** → Your service → **Metrics**
- Check CPU, Memory usage
- **Logs** for worker activity

---

## 💰 Costs

### Vercel
- **Hobby (Free)**: 100 GB bandwidth/month
- **Pro ($20/month)**: Unlimited bandwidth, 60s timeout

### Railway
- **Free Trial**: $5 credit
- **Pay-as-you-go**: ~$5-20/month for workers
- **Pro ($20/month)**: Better resource limits

**Total estimated cost:** $0-40/month depending on tier

---

## 🎯 Summary

```
✅ Render:  Hyperliquid Python service
✅ Vercel:  Frontend + API routes (fast CDN)
✅ Railway: Background workers (continuous processing)

This gives you:
- Fast global frontend (Vercel CDN)
- Reliable automation (Railway workers)
- Isolated Python service (Render)
```

Perfect architecture for your use case! 🚀

