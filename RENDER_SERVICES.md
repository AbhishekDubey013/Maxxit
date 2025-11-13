# Render Services - Production URLs

## ✅ Your Active Render Services

| Service | URL | Status | Purpose |
|---------|-----|--------|---------|
| **Hyperliquid** | https://hyperliquid-service.onrender.com | ✅ Running | Hyperliquid trading (220 pairs) |
| **X API Proxy** | https://maxxit.onrender.com | ✅ Running | Twitter/X API proxy for tweet ingestion |
| **Ostium** | https://maxxit-1.onrender.com | ✅ Running | Ostium trading (41 pairs) |

---

## 🔍 Service Details

### 1. Hyperliquid Service
**URL**: `https://hyperliquid-service.onrender.com`

**Endpoints**:
```bash
# Health check
GET /health

# Get available markets
GET /api/markets

# Place order
POST /api/order
{
  "agent_address": "0x...",
  "agent_key": "encrypted_key",
  "symbol": "BTC",
  "side": "BUY",
  "size": "0.5",
  "leverage": 3
}

# Get positions
POST /api/positions
{
  "agent_address": "0x..."
}

# Close position
POST /api/close
{
  "agent_address": "0x...",
  "agent_key": "encrypted_key",
  "symbol": "BTC"
}
```

**Used By**:
- Trade Executor Worker (`workers/trade-executor-worker.ts`)
- Position Monitor Worker (`workers/position-monitor-hyperliquid.ts`)
- Venue Router (`lib/v3/venue-router.ts`)

---

### 2. X API Proxy (Twitter)
**URL**: `https://maxxit.onrender.com`

**Endpoints**:
```bash
# Health check
GET /health

# Get user tweets
GET /tweets/{username}?count=100

# Search tweets
GET /search?q=bitcoin&count=50
```

**Used By**:
- Tweet Ingestion Worker (`workers/tweet-ingestion-worker.ts`)
- X API Client (`lib/x-api-multi.ts`)

**Purpose**:
- Fetches tweets from monitored CT accounts
- Handles rate limiting
- Bypasses CORS issues
- Caches responses

---

### 3. Ostium Service
**URL**: `https://maxxit-1.onrender.com`

**Endpoints**:
```bash
# Health check
GET /health

# Get available markets
GET /api/markets

# Place order
POST /api/order
{
  "agent_address": "0x...",
  "agent_key": "encrypted_key",
  "symbol": "BTC",
  "side": "BUY",
  "size": "0.5",
  "leverage": 3
}

# Get positions
POST /api/positions
{
  "agent_address": "0x..."
}

# Close position
POST /api/close
{
  "agent_address": "0x...",
  "agent_key": "encrypted_key",
  "symbol": "BTC"
}
```

**Used By**:
- Trade Executor Worker (`workers/trade-executor-worker.ts`)
- Position Monitor Worker (`workers/position-monitor-ostium.ts`)
- Venue Router (`lib/v3/venue-router.ts`)

---

## 🌐 Complete Architecture with Real URLs

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VERCEL (Frontend + API)                      │
│                     https://your-app.vercel.app                      │
├─────────────────────────────────────────────────────────────────────┤
│  Next.js Application                                                 │
│  • Frontend pages (/, /v3, /agent/[id])                             │
│  • API Routes (/api/v3/*)                                           │
└─────┬───────────────────────────────────────────────┬───────────────┘
      │                                               │
      ↓                                               ↓
┌─────────────────────────────────────────┐  ┌──────────────────────┐
│   RAILWAY (Workers + PostgreSQL)        │  │  RENDER (Python)     │
├─────────────────────────────────────────┤  ├──────────────────────┤
│                                         │  │                      │
│  Continuous Worker (6 workers):        │  │  [1] Hyperliquid     │
│  1. Tweet Ingestion    (5 min)  ───────┼──┼─→ maxxit.onrender   │
│  2. Signal Generator   (1 min)         │  │     .com             │
│  3. Research Signals   (2 min)         │  │                      │
│  4. Trade Executor     (30 sec) ───────┼──┼─→ [2] Hyperliquid    │
│  5. Position Monitor   (1 min)  ───────┼──┼─→     Service        │
│  6. Metrics Updater    (1 hour)        │  │     hyperliquid-     │
│                                         │  │     service.on       │
│  PostgreSQL Database:                  │  │     render.com       │
│  • 8 V3 tables                         │  │                      │
│  • 24 V2 tables                        │  │  [3] Ostium          │
│  • 12 shared tables                    │  │     maxxit-1.on      │
│                                         │  │     render.com       │
└─────────────────────────────────────────┘  └──────────────────────┘
```

---

## 🔧 Environment Variables

### For Vercel (Frontend + API)
```bash
# Python Services on Render
HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com
TWITTER_PROXY_URL=https://maxxit.onrender.com

# Database (from Railway)
DATABASE_URL=postgresql://...

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LUNARCRUSH_API_KEY=...
GAME_API_KEY=...
```

### For Railway (Workers)
```bash
# Python Services on Render
HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com
TWITTER_PROXY_URL=https://maxxit.onrender.com

# Database (auto-filled)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Vercel App URL
VERCEL_APP_URL=https://your-app.vercel.app

# API Keys (same as Vercel)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LUNARCRUSH_API_KEY=...
GAME_API_KEY=...
```

---

## 🧪 Health Check Commands

Test all your Render services:

```bash
# 1. Test Hyperliquid Service
curl https://hyperliquid-service.onrender.com/health
# Expected: {"status": "healthy", "service": "hyperliquid"}

# 2. Test X API Proxy
curl https://maxxit.onrender.com/health
# Expected: {"status": "healthy", "client_initialized": true}

# 3. Test Ostium Service
curl https://maxxit-1.onrender.com/health
# Expected: {"status": "healthy", "service": "ostium"}
```

---

## 📊 Service Usage in Workers

### Tweet Ingestion Worker
```typescript
// Uses: https://maxxit.onrender.com
const TWITTER_PROXY_URL = process.env.TWITTER_PROXY_URL || 'https://maxxit.onrender.com';
const response = await fetch(`${TWITTER_PROXY_URL}/tweets/${username}`);
```

### Trade Executor Worker
```typescript
// For V3 agents with Agent Where routing:

// Step 1: Check Hyperliquid
const hlResponse = await fetch(
  'https://hyperliquid-service.onrender.com/api/markets'
);

// Step 2: If not available, try Ostium
const ostiumResponse = await fetch(
  'https://maxxit-1.onrender.com/api/markets'
);
```

### Position Monitor Worker
```typescript
// Monitors both venues:

// Hyperliquid positions
const hlPositions = await fetch(
  'https://hyperliquid-service.onrender.com/api/positions',
  { method: 'POST', body: JSON.stringify({ agent_address }) }
);

// Ostium positions
const ostiumPositions = await fetch(
  'https://maxxit-1.onrender.com/api/positions',
  { method: 'POST', body: JSON.stringify({ agent_address }) }
);
```

---

## 💰 Render Cost Breakdown

| Service | Tier | Cost | Resources |
|---------|------|------|-----------|
| Hyperliquid | Starter | $7/month | Python Flask |
| X API Proxy | Starter | $7/month | Python Flask |
| Ostium | Starter | $7/month | Python Flask |
| **Total** | | **$21/month** | |

---

## 🚀 Complete System Cost

| Platform | Services | Cost |
|----------|----------|------|
| Vercel | Next.js (Frontend + API) | **$0** (FREE) |
| Railway | 6 Workers + PostgreSQL | $20/month |
| Render | 3 Python services | $21/month |
| **TOTAL** | | **$41/month** |

---

## 📝 Notes

1. **Render Services are Persistent**: ✅ Already running, no changes needed
2. **Free Tier Limitations**: Render free tier spins down after inactivity
3. **Paid Tier Benefits**: 
   - Always on (no spin down)
   - Better performance
   - Dedicated resources
4. **Health Checks**: All services support `/health` endpoint for monitoring

---

🎉 **All Render services are production-ready!**

Just add these URLs to your Vercel and Railway environment variables.

