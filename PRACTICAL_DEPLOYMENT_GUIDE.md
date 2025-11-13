# Maxxit - Practical Deployment Guide

## 🎯 Your Current & Recommended Setup

### What You Have Now (Render)
```
Render:
├── Hyperliquid Service (Python) ✅ Already running
├── Ostium Service (Python)      ✅ Already running  
└── Twitter Proxy (Python)       ✅ Already running
```

### What to Add (Railway)
```
Railway:
├── Main API Server (Node.js + Next.js)  ← All your API routes + Frontend
└── Position Monitor Worker              ← Background monitoring

Plus Railway Add-on:
└── PostgreSQL (managed)
```

---

## 📊 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         USERS                                     │
│                       (Browser)                                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│                    RAILWAY DEPLOYMENT                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │   Main Application (Next.js + Node.js)                     │ │
│  │   Port: 3000                                               │ │
│  │                                                            │ │
│  │   Frontend (Next.js):                                      │ │
│  │   • Landing page, Marketplace, Dashboards                  │ │
│  │   • /pages/*.tsx → SSR pages                               │ │
│  │                                                            │ │
│  │   API Routes (pages/api/*):                                │ │
│  │   • /api/agents      • /api/v3/agents                      │ │
│  │   • /api/signals     • /api/v3/signals                     │ │
│  │   • /api/execute     • /api/v3/execute                     │ │
│  │   • /api/deployments • /api/safe                           │ │
│  │   • All V2 + V3 APIs in one Next.js app                    │ │
│  └────────────────────────┬───────────────────────────────────┘ │
│                            │                                     │
│  ┌────────────────────────┴─────────────────────────────────┐  │
│  │ Position Monitor Worker                                   │  │
│  │ (Background Process)                                      │  │
│  │                                                           │  │
│  │ • 30s monitoring cycles                                   │  │
│  │ • Trailing stops & PnL tracking                           │  │
│  │ • Calls Main App APIs for trade execution                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Managed Service                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │  PostgreSQL (Database)                              │ │  │
│  │  │  • All V2 + V3 tables                               │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             │ HTTP Calls
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│                    RENDER DEPLOYMENT                              │
│              (Already Running - No Changes!)                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Hyperliquid     │  │ Ostium          │  │ Twitter Proxy   │ │
│  │ Service         │  │ Service         │  │ Service         │ │
│  │ (Python/Flask)  │  │ (Python/Flask)  │  │ (Python/Flask)  │ │
│  │ Port: 5001      │  │ Port: 5002      │  │ Port: 5003      │ │
│  │                 │  │                 │  │                 │ │
│  │ • 220 pairs     │  │ • 41 pairs      │  │ • Fetch tweets  │ │
│  │ • Place orders  │  │ • Place orders  │  │ • Rate limits   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Current Repository Structure

**Your existing Next.js app** (already perfect!)

```
maxxit/                          ← Your existing repo (no changes needed!)
├── pages/                       ← Next.js pages (Frontend)
│   ├── index.tsx               ← Landing page
│   ├── create-agent.tsx        ← Agent creation
│   ├── my-deployments.tsx      ← User dashboards
│   └── api/                    ← API Routes (Backend)
│       ├── agents/             ← Agent API endpoints
│       ├── signals/            ← Signal API endpoints
│       ├── execute/            ← Trade execution
│       ├── deployments/        ← Deployment management
│       ├── v3/                 ← V3 APIs
│       └── ...
│
├── lib/                         ← Business logic libraries
│   ├── trade-executor.ts       ← Trade execution
│   ├── signal-generator.ts     ← Signal generation
│   ├── venue-router.ts         ← Venue routing
│   ├── v3/                     ← V3 logic
│   └── adapters/               ← Venue adapters
│
├── workers/                     ← Background workers
│   ├── position-monitor-hyperliquid.ts
│   ├── position-monitor-ostium.ts
│   └── signal-generator.ts
│
├── services/                    ← Python services (on Render)
│   ├── hyperliquid-service.py  ← Already deployed ✅
│   ├── ostium-service.py       ← Already deployed ✅
│   └── twitter-proxy.py        ← Already deployed ✅
│
├── components/                  ← React components
├── prisma/                      ← Database schema
└── package.json                 ← Next.js app
```

---

## 🚀 Deployment Configuration

### Railway Services (2 services)

#### 1. **Main Application (Next.js)**
```yaml
# railway.toml
[build]
  builder = "NIXPACKS"
  buildCommand = "npm install && npm run build"

[deploy]
  startCommand = "npm start"
  healthcheckPath = "/api/health"
  healthcheckTimeout = 100
  restartPolicyType = "ON_FAILURE"

[[services]]
  name = "maxxit-app"
  port = 3000
  
  [services.env]
    NODE_ENV = "production"
    PORT = "3000"
    # Connect to Python services on Render
    HYPERLIQUID_SERVICE_URL = "https://your-hyperliquid.onrender.com"
    OSTIUM_SERVICE_URL = "https://your-ostium.onrender.com"
    TWITTER_PROXY_URL = "https://your-twitter.onrender.com"
```

#### 2. **Position Monitor Worker**
```yaml
# railway.toml
[build]
  builder = "NIXPACKS"

[deploy]
  startCommand = "npx tsx workers/position-monitor-combined.ts"
  restartPolicyType = "ALWAYS"

[[services]]
  name = "maxxit-position-monitor"
  
  [services.env]
    NODE_ENV = "production"
    # Connect to main app for trade execution
    MAIN_APP_URL = "https://your-app.up.railway.app"
```

---

## 📦 Deployment Steps

### No Reorganization Needed! ✅

Your repo already has the perfect Next.js structure. Just deploy it to Railway.

### Phase 1: Test Locally (5 mins)
```bash
# Your Next.js app already works
npm install
npm run dev

# Test all pages and APIs
open http://localhost:3000
```

### Phase 2: Deploy to Railway (15 mins)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add PostgreSQL
railway add --plugin postgresql

# Set environment variables in Railway dashboard
# (DATABASE_URL, HYPERLIQUID_SERVICE_URL, etc.)

# Deploy main app
railway up

# Deploy position monitor as separate service
railway up --service maxxit-position-monitor
```

### Phase 3: Verify (5 mins)
```bash
# Check main app
curl https://your-app.up.railway.app/health

# Check pages work
open https://your-app.up.railway.app

# Monitor logs
railway logs --service maxxit-app
```

---

## 💰 Cost Breakdown

### Current (Render Only)
```
Hyperliquid Service:  $7/month
Ostium Service:       $7/month
Twitter Proxy:        $7/month
────────────────────────────
Total:               $21/month
```

### After Adding Railway
```
Render (Python - no changes):
├── Hyperliquid:      $7/month
├── Ostium:           $7/month
└── Twitter Proxy:    $7/month

Railway (Node.js + Next.js):
├── Main App:        $10/month  (Next.js + API routes)
├── Position Monitor: $10/month  (Background worker)
└── PostgreSQL:       $5/month   (Managed database)
────────────────────────────
Total:               $46/month
```

**Increase**: $25/month ($46 - $21)

---

## ✅ Benefits of This Approach

### For Development
- ✅ **Clean code organization**: Know exactly where each feature is
- ✅ **Easier onboarding**: New devs find code quickly
- ✅ **Better git history**: Changes grouped by service
- ✅ **Independent work**: Frontend team, trading team work in parallel

### For Deployment
- ✅ **No big changes**: Python services stay on Render
- ✅ **Simple Railway setup**: Just 3 services
- ✅ **Easy to scale later**: Can split services if needed
- ✅ **Cost effective**: Only $40/month increase

### For Operations
- ✅ **Better monitoring**: Each service has health checks
- ✅ **Faster deploys**: Only deploy what changed
- ✅ **Easier debugging**: Know which service has issues
- ✅ **Flexibility**: Can move services between providers

---

## 🎯 Quick Start (25 mins total!)

### 1. Test Locally (5 mins)
```bash
cd /Users/abhishekdubey/Downloads/Maxxit

# Your Next.js app already works!
npm install
npm run dev
# Opens on http://localhost:3000

# Test it works
open http://localhost:3000
```

### 2. Deploy to Railway (15 mins)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Add PostgreSQL database
railway add --plugin postgresql

# Deploy your Next.js app
railway up
```

### 3. Set Environment Variables (3 mins)
```bash
# In Railway dashboard, add these:
DATABASE_URL=<auto-filled by PostgreSQL plugin>
HYPERLIQUID_SERVICE_URL=https://your-hyperliquid.onrender.com
OSTIUM_SERVICE_URL=https://your-ostium.onrender.com
TWITTER_PROXY_URL=https://your-twitter.onrender.com
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
EXECUTOR_PRIVATE_KEY=0x...
# ... (copy from your existing .env)
```

### 4. Deploy Position Monitor (2 mins)
```bash
# Create separate service for worker
railway up --service maxxit-position-monitor

# Set start command in Railway dashboard:
# npx tsx workers/position-monitor-combined.ts
```

### 5. Done! ✅
```bash
# Your app is now live:
# ✅ Next.js app on Railway: https://your-app.up.railway.app
# ✅ Position Monitor running
# ✅ Python services on Render (unchanged)

# Total cost: $46/month
```

---

## ❓ FAQ

### Q: Do I need to change my Python services on Render?
**A**: No! They stay exactly as they are. No changes needed.

### Q: Do I need to reorganize my code?
**A**: No! Your Next.js structure is already perfect. Just deploy it.

### Q: Can I still run everything locally?
**A**: Yes! `npm run dev` runs your Next.js app with all API routes.

### Q: Do I need Redis?
**A**: No! We removed Redis. You only need PostgreSQL.

### Q: Do I need to deploy 15 separate services?
**A**: No! You deploy:
- 1 Next.js app (Frontend + API)
- 1 Position Monitor worker
- Total: 2 Railway services

### Q: How long does deployment take?
**A**: ~25 minutes total for first deployment

### Q: What's the monthly cost?
**A**: 
- Render (Python): $21/month (existing)
- Railway: $25/month (new)
- Total: $46/month

---

## 📞 Next Steps

1. ✅ **Python services on Render** - Keep running (no changes)
2. 🚀 **Deploy to Railway** - Follow Quick Start guide above
3. 💰 **Cost**: Only $25/month more ($46 total)

**Ready to deploy?** Start now! 🚀

```bash
# Test locally first
npm run dev

# Then deploy
railway init
railway up
```

