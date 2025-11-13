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
├── Main API Server (Node.js)    ← All your API routes in one
├── Position Monitor Worker      ← Background monitoring
└── Frontend (React)             ← User interface

Plus Railway Add-ons:
├── PostgreSQL (managed)
└── Redis (managed)
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
│  ┌────────────────────┐         ┌────────────────────┐          │
│  │   Frontend         │         │   Main API         │          │
│  │   (React)          │────────→│   Server           │          │
│  │   Port: 3000       │         │   (Node.js)        │          │
│  │                    │         │   Port: 4000       │          │
│  │ • Landing page     │         │                    │          │
│  │ • Marketplace      │         │ • /api/agents      │          │
│  │ • Dashboards       │         │ • /api/signals     │          │
│  └────────────────────┘         │ • /api/execute     │          │
│                                 │ • /api/deployments │          │
│                                 │ • All V2 + V3 APIs │          │
│                                 └─────────┬──────────┘          │
│                                           │                     │
│  ┌────────────────────┐                  │                     │
│  │ Position Monitor   │                  │                     │
│  │ Worker             │                  │                     │
│  │ (Background)       │                  │                     │
│  │                    │                  │                     │
│  │ • 30s cycles       │                  │                     │
│  │ • Trailing stops   │                  │                     │
│  │ • PnL tracking     │                  │                     │
│  └────────────────────┘                  │                     │
│                                           │                     │
│  ┌─────────────────────────────────────  │  ─────────────────┐│
│  │  Managed Services                     │                   ││
│  │  ┌─────────────────┐  ┌──────────────┴─────────┐         ││
│  │  │  PostgreSQL     │  │  Redis                 │         ││
│  │  │  (Database)     │  │  (Cache + Queue)       │         ││
│  │  └─────────────────┘  └────────────────────────┘         ││
│  └─────────────────────────────────────────────────────────────┘│
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

## 🔧 Repository Organization (Monorepo)

**Purpose**: Better code organization for developers

```
maxxit/                          ← Your repo stays ONE repo
├── services/
│   ├── api/                     ← ALL Node.js API code here
│   │   ├── agent/              ← Agent service logic
│   │   ├── signal/             ← Signal service logic
│   │   ├── trade/              ← Trade execution logic
│   │   ├── deployment/         ← Deployment logic
│   │   ├── auth/               ← Auth logic
│   │   ├── safe-wallet/        ← Safe wallet logic
│   │   ├── notification/       ← Notification logic
│   │   ├── analytics/          ← Analytics logic
│   │   ├── billing/            ← Billing logic
│   │   └── gateway.ts          ← Main server (imports all)
│   │
│   ├── workers/
│   │   └── position-monitor/   ← Background worker
│   │
│   ├── python/                  ← Python services (on Render)
│   │   ├── hyperliquid/        ← Already deployed ✅
│   │   ├── ostium/             ← Already deployed ✅
│   │   └── twitter-proxy/      ← Already deployed ✅
│   │
│   └── frontend/                ← React app
│
└── packages/                    ← Shared libraries
    ├── common/                  ← Types, utils
    └── database/                ← Prisma client
```

---

## 🚀 Deployment Configuration

### Railway Services (3 services)

#### 1. **Main API Server**
```yaml
# railway.toml
[build]
  builder = "NIXPACKS"
  buildCommand = "npm install && npm run build"

[deploy]
  startCommand = "cd services/api && npm start"
  healthcheckPath = "/health"
  healthcheckTimeout = 100
  restartPolicyType = "ON_FAILURE"

[[services]]
  name = "maxxit-api"
  port = 4000
  
  [services.env]
    NODE_ENV = "production"
    PORT = "4000"
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
  startCommand = "cd services/workers/position-monitor && npm start"
  restartPolicyType = "ALWAYS"

[[services]]
  name = "maxxit-position-monitor"
  
  [services.env]
    NODE_ENV = "production"
```

#### 3. **Frontend**
```yaml
# railway.toml
[build]
  builder = "NIXPACKS"
  buildCommand = "cd services/frontend && npm install && npm run build"

[deploy]
  startCommand = "cd services/frontend && npm run preview"

[[services]]
  name = "maxxit-frontend"
  port = 3000
```

---

## 📦 Step-by-Step Migration

### Phase 1: Reorganize Code (1-2 weeks)
```bash
# Run the reorganization script
chmod +x scripts/reorganize-to-monorepo.sh
./scripts/reorganize-to-monorepo.sh

# This creates the new structure
# BUT doesn't break anything!
```

**What changes**:
- ✅ Code is organized into services/
- ✅ Easier to find and edit code
- ✅ Better for team development

**What stays the same**:
- ✅ Python services still on Render
- ✅ Deployment still works
- ✅ All APIs still work

### Phase 2: Move Code Gradually (2-3 weeks)

**Week 1**: Move Agent + Signal services
```bash
# Move agent API routes
mv pages/api/agents/* services/api/agent/controllers/
mv lib/metrics-updater.ts services/api/agent/services/

# Move signal API routes
mv pages/api/signals/* services/api/signal/controllers/
mv lib/signal-generator.ts services/api/signal/services/
```

**Week 2**: Move Trade + Deployment services
```bash
# Move trade execution
mv pages/api/execute/* services/api/trade/controllers/
mv lib/trade-executor.ts services/api/trade/services/
mv lib/v3/* services/api/trade/services/v3/

# Move deployments
mv pages/api/deployments/* services/api/deployment/controllers/
```

**Week 3**: Move remaining services
```bash
# Move auth, safe-wallet, notifications, etc.
# Test everything works
```

### Phase 3: Test & Deploy (1 week)
```bash
# Test locally
cd services/api
npm run dev
# Test all APIs work

# Deploy to Railway
railway up
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

Railway (Node.js):
├── Main API:        $10/month
├── Position Monitor: $10/month
├── Frontend:         $10/month
├── PostgreSQL:       $5/month
└── Redis:            $5/month
────────────────────────────
Total:               $61/month
```

**Increase**: $40/month ($61 - $21)

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

## 🎯 Quick Start

### 1. Reorganize Repository (5 mins)
```bash
cd /Users/abhishekdubey/Downloads/Maxxit
chmod +x scripts/reorganize-to-monorepo.sh
./scripts/reorganize-to-monorepo.sh
```

### 2. Test Locally (10 mins)
```bash
# Start API server
cd services/api
npm install
npm run dev

# Start Position Monitor
cd services/workers/position-monitor
npm install
npm run dev

# Start Frontend
cd services/frontend
npm install
npm run dev
```

### 3. Deploy to Railway (20 mins)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Add PostgreSQL & Redis
railway add --plugin postgresql
railway add --plugin redis

# Deploy API
railway up --service maxxit-api

# Deploy Worker
railway up --service maxxit-position-monitor

# Deploy Frontend
railway up --service maxxit-frontend
```

### 4. Connect to Python Services (2 mins)
```bash
# In Railway dashboard, set environment variables:
HYPERLIQUID_SERVICE_URL=https://your-hyperliquid.onrender.com
OSTIUM_SERVICE_URL=https://your-ostium.onrender.com
TWITTER_PROXY_URL=https://your-twitter.onrender.com
```

### 5. Done! ✅
```bash
# Your app is now running:
# - Python services on Render (unchanged)
# - Node.js services on Railway (new)
# - One repo, clean organization
```

---

## ❓ FAQ

### Q: Do I need to change my Python services on Render?
**A**: No! They stay exactly as they are. No changes needed.

### Q: Will my existing deployment break?
**A**: No! The reorganization is just moving code files. Everything still works.

### Q: Can I still run everything locally?
**A**: Yes! Even easier now. Each service has clear npm scripts.

### Q: Do I need to deploy all 15 services separately?
**A**: No! You run them as 3 Railway services (API, Worker, Frontend) + 3 Render services (Python).

### Q: What if I want to split services later?
**A**: Easy! The code is already organized by service. Just change the deployment config.

### Q: How long does migration take?
**A**: 
- Code reorganization: 5 minutes (automated script)
- Moving code: 2-3 weeks (gradual, no rush)
- Testing & deploy: 1 week

---

## 📞 Next Steps

1. **Review** this guide
2. **Run** the reorganization script
3. **Test** locally
4. **Deploy** to Railway
5. **Monitor** and iterate

**Ready to start?** Run the script! 🚀

```bash
chmod +x scripts/reorganize-to-monorepo.sh
./scripts/reorganize-to-monorepo.sh
```

