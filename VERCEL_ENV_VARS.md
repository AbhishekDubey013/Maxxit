# Vercel Environment Variables

## ⚠️ IMPORTANT: Vercel Limitations

Vercel **DOES NOT** support long-running workers. If you deploy to Vercel:
- ✅ Frontend works perfectly
- ✅ API routes work (with 10s timeout on Hobby, 60s on Pro)
- ❌ Workers CANNOT run on Vercel

**You MUST deploy workers separately** (Railway, Render, etc.)

---

## 🔵 Frontend Variables (NEXT_PUBLIC_*)

These are exposed to the browser:

```bash
NEXT_PUBLIC_HYPERLIQUID_TESTNET=true
```

---

## 🔴 Backend/API Variables (Server-side only)

```bash
# Database (Required for API routes)
DATABASE_URL=postgresql://user:password@host:5432/database

# Hyperliquid Service Connection
HYPERLIQUID_SERVICE_URL=https://your-service.onrender.com

# Agent Wallet Encryption
AGENT_WALLET_ENCRYPTION_KEY=8c53c86d65aa4e404ef0673d806d53f6a2a8bed83c9a50e3c1c8e123e7b89e83

# LLM Provider (Choose ONE - for API routes)
PERPLEXITY_API_KEY=your_key
# OR
OPENAI_API_KEY=your_key
# OR
ANTHROPIC_API_KEY=your_key

# LunarCrush (for signal generation API)
LUNARCRUSH_API_KEY=tt6l3p9qa3otztg3rik6gf2ofdmhhl3ndd4b4psvl

# Twitter/X API (for tweet fetching API routes)
GAME_API_KEY=apx-31d308e580e9a3b0efc45eb02db1f977

# Optional: Safe Wallet (if using SPOT/GMX)
PRIVATE_KEY=your_ethereum_private_key
INFURA_API_KEY=your_infura_key
```

---

## ⚠️ WHAT WON'T WORK ON VERCEL

These features require long-running workers (deploy separately):

❌ **Tweet Ingestion Worker** - Continuous scanning for new tweets
❌ **Signal Generator Worker** - Processing tweets into signals
❌ **Trade Executor Worker** - Executing trades automatically
❌ **Position Monitor Worker** - Monitoring open positions

---

## 🏗️ RECOMMENDED ARCHITECTURE WITH VERCEL

```
┌─────────────────────────────────────────────────────────────┐
│ Render:   Hyperliquid Python Service                       │
│ Vercel:   Next.js Frontend + API Routes                    │
│ Railway:  All Workers (separate deployment)                │
└─────────────────────────────────────────────────────────────┘
```

### Workers on Railway:

Deploy a separate Railway service JUST for workers:

1. Use `workers/start-all-workers.sh` as entry point
2. Set environment variables (same as above)
3. No need for PORT or web server
4. Just runs workers continuously

---

## 📋 How to Add on Vercel

1. Go to vercel.com
2. Import your GitHub repo: `AbhishekDubey013/Maxxit`
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - Variable Name
   - Value
   - Select Environment: Production, Preview, Development
5. Click **"Save"**
6. Redeploy

---

## ✅ TEST VERCEL DEPLOYMENT

After deployment:

```bash
# Test frontend
curl https://your-app.vercel.app

# Test API health
curl https://your-app.vercel.app/api/health

# Test agent creation API
curl https://your-app.vercel.app/api/agents
```

---

## 🎯 RECOMMENDATION

**Use Railway for simplicity!**

Railway = One service with Next.js + Workers together

Vercel = More complex (3 separate services), but better CDN/performance for frontend

Choose based on your priority:
- **Simplicity** → Railway
- **Performance/Global CDN** → Vercel + Railway workers

