# Maxxit - Complete Deployment Guide (All Services)

## 🎯 Complete System Architecture

Your Maxxit system has **3 deployment platforms** and **8 background workers**:

---

## 📊 Full Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         USERS (Browser)                           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend + API)                        │
├──────────────────────────────────────────────────────────────────┤
│  Next.js Application (Serverless)                   FREE!        │
│  • Frontend pages (SSR + Static)                                 │
│  • API Routes (/api/*)                                           │
│  • /api/agents, /api/v3/agents                                   │
│  • /api/signals, /api/execute                                    │
│  • All V2 + V3 endpoints                                         │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│                    RAILWAY (Workers + Database)                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Service 1: All-In-One Worker (continuous-runner.js)  $10       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Runs 5 workers on scheduled intervals:                    │ │
│  │                                                             │ │
│  │  1. Tweet Ingestion      (every 5 mins)                    │ │
│  │     • Fetch tweets from X accounts                         │ │
│  │     • LLM classification                                   │ │
│  │     • Store in ct_posts table                              │ │
│  │                                                             │ │
│  │  2. Signal Generator     (every 1 min)                     │ │
│  │     • Process classified tweets                            │ │
│  │     • Generate trading signals                             │ │
│  │     • Both V2 and V3 signals                               │ │
│  │                                                             │ │
│  │  3. Research Signals     (every 2 mins)                    │ │
│  │     • Process research institute signals                   │ │
│  │     • Generate signals from research                       │ │
│  │                                                             │ │
│  │  4. Trade Executor       (every 30 sec)                    │ │
│  │     • Execute pending signals                              │ │
│  │     • V3 Agent Where routing                               │ │
│  │     • Place orders via Hyperliquid/Ostium                  │ │
│  │                                                             │ │
│  │  5. Position Monitor     (every 1 min)                     │ │
│  │     • Monitor open positions                               │ │
│  │     • Trailing stops (1%)                                  │ │
│  │     • Close profitable positions                           │ │
│  │     • Update PnL                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Service 2: Metrics Updater (cron job)                $5         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • APR calculation (30d, 90d, SI)                          │ │
│  │  • Sharpe ratio updates                                    │ │
│  │  • Impact Factor scores                                    │ │
│  │  • Runs every 1 hour                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Service 3: PostgreSQL Database                        $5        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • All V2 + V3 tables                                      │ │
│  │  • 19 tables total                                         │ │
│  │  • Accessed by Vercel API + Workers                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ↓
┌──────────────────────────────────────────────────────────────────┐
│                    RENDER (Python Services)                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Service 1: Hyperliquid Service (Python/Flask)     $7           │
│  • Place/cancel orders on Hyperliquid                           │
│  • Agent delegation                                             │
│  • 220 trading pairs                                            │
│  • Position fetching                                            │
│                                                                   │
│  Service 2: Ostium Service (Python/Flask)          $7           │
│  • Place/cancel orders on Ostium                                │
│  • 41 trading pairs                                             │
│  • Position fetching                                            │
│  • Synthetic perpetuals                                         │
│                                                                   │
│  Service 3: Twitter Proxy (Python/Flask)           $7           │
│  • Fetch tweets from X API                                      │
│  • Rate limit management                                        │
│  • Data extraction                                              │
│  • Used by Tweet Ingestion worker                               │
└──────────────────────────────────────────────────────────────────┘

Total Monthly Cost: $41/month
```

---

## 💰 Complete Cost Breakdown

| Platform | Service | Cost | Purpose |
|----------|---------|------|---------|
| **Vercel** | Next.js App | **$0** (FREE) | Frontend + API Routes |
| **Railway** | All Workers | $10/month | 5 background workers |
| **Railway** | Metrics Updater | $5/month | APR/Sharpe calculations |
| **Railway** | PostgreSQL | $5/month | Database |
| **Render** | Hyperliquid | $7/month | Python service ✅ |
| **Render** | Ostium | $7/month | Python service ✅ |
| **Render** | Twitter Proxy | $7/month | Python service ✅ |
| **TOTAL** | | **$41/month** | |

---

## 🔄 All Background Workers Explained

### 1. **Tweet Ingestion Worker** 📥
**File**: `workers/tweet-ingestion-worker.ts`
**Frequency**: Every 5 minutes
**Purpose**: Fetch and classify tweets

**What it does**:
1. Fetches tweets from monitored X accounts
2. Uses LLM (OpenAI/Anthropic) to classify tweets
3. Extracts token mentions, sentiment
4. Stores in `ct_posts` table
5. Calls Twitter Proxy service on Render

**Dependencies**:
- Twitter Proxy service (Render)
- OpenAI/Anthropic API
- Database connection

---

### 2. **Signal Generator Worker** 📡
**File**: `workers/signal-generator.ts`
**Frequency**: Every 1 minute
**Purpose**: Generate trading signals from tweets

**What it does**:
1. Reads classified tweets from `ct_posts`
2. Matches tweets to agents' subscribed accounts
3. Generates trading signals
4. Stores in `signals` table (V2) or `signals_v3` (V3)
5. Considers market indicators, LunarCrush scores

**Dependencies**:
- Tweet Ingestion (must run first)
- Database connection
- LunarCrush API (optional)

---

### 3. **Research Signal Generator** 🔬
**File**: `workers/research-signal-generator.ts`
**Frequency**: Every 2 minutes
**Purpose**: Generate signals from research institutes

**What it does**:
1. Fetches signals from research institutes
2. Parses research reports
3. Generates trading signals
4. Stores in `signals` table

**Dependencies**:
- Research institute APIs (if configured)
- Database connection

---

### 4. **Trade Executor Worker** ⚡
**File**: `workers/trade-executor-worker.ts`
**Frequency**: Every 30 seconds
**Purpose**: Execute pending signals

**What it does**:
1. Reads pending signals from `signals` table
2. For V3 signals: Runs **Agent Where** routing
   - Checks Hyperliquid (220 pairs)
   - Falls back to Ostium (41 pairs)
   - Logs routing decision
3. Places orders via Hyperliquid/Ostium services
4. Creates position records in `positions` table
5. Handles profit share distribution

**Dependencies**:
- Hyperliquid Service (Render)
- Ostium Service (Render)
- Signal Generator (must run first)
- Database connection

---

### 5. **Position Monitor Worker** 👁️
**File**: `workers/position-monitor-combined.ts`
**Frequency**: Every 1 minute
**Purpose**: Monitor and close positions

**What it does**:
1. Fetches all open positions
2. Checks current prices via Hyperliquid/Ostium
3. Applies trailing stop logic (1% default)
4. Closes profitable positions
5. Updates PnL in `positions` table
6. Records in `pnl_snapshots`

**Dependencies**:
- Hyperliquid Service (Render)
- Ostium Service (Render)
- Trade Executor (must run first)
- Database connection

---

### 6. **Metrics Updater** 📊
**File**: `lib/metrics-updater.ts`
**Frequency**: Every 1 hour (cron job)
**Purpose**: Update agent performance metrics

**What it does**:
1. Calculates APR (30d, 90d, since inception)
2. Calculates Sharpe ratios
3. Updates Impact Factor scores for X accounts
4. Updates `agents` and `agents_v3` tables
5. Generates leaderboard data

**Dependencies**:
- Database connection
- Closed positions data

---

### 7. **V3 Signal Worker** (Optional) 🆕
**File**: `workers/v3-signal-worker.ts`
**Frequency**: On-demand or scheduled
**Purpose**: V3-specific signal processing

**What it does**:
1. Processes V3 agent signals
2. Ensures venue-agnostic signal generation
3. Prepares signals for Agent Where routing

---

### 8. **Monitoring Worker** (Optional) 🔍
**File**: `workers/monitoring-worker.ts`
**Frequency**: Every 10 minutes
**Purpose**: System health checks

**What it does**:
1. Health checks for all services
2. Database connectivity tests
3. Python service availability
4. Alerting (if configured)

---

## 🚀 Complete Deployment Steps

### Step 1: Deploy Python Services to Render (Already Done ✅)

You already have these running:
- ✅ Hyperliquid Service
- ✅ Ostium Service
- ✅ Twitter Proxy

**No changes needed!**

---

### Step 2: Deploy Frontend to Vercel (5 mins)

```bash
# Option A: Via Vercel Dashboard (Easiest)
1. Go to vercel.com/new
2. Import from GitHub: abhishekdubey013/Maxxit
3. Vercel auto-detects Next.js
4. Add environment variables (see below)
5. Click Deploy!

# Option B: Via CLI
npm i -g vercel
vercel login
vercel
```

**Environment Variables for Vercel**:
```env
# Database (you'll get this from Railway in Step 3)
DATABASE_URL=postgresql://...

# Python Services on Render
HYPERLIQUID_SERVICE_URL=https://your-hyperliquid.onrender.com
OSTIUM_SERVICE_URL=https://your-ostium.onrender.com
TWITTER_PROXY_URL=https://your-twitter.onrender.com

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LUNARCRUSH_API_KEY=...

# Blockchain
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
EXECUTOR_PRIVATE_KEY=0x...
SAFE_MODULE_ADDRESS=0x...

# Twitter/X API (for Game client)
GAME_API_KEY=...

# Telegram
TELEGRAM_BOT_TOKEN=...
```

---

### Step 3: Deploy Workers to Railway (15 mins)

#### 3.1: Create Railway Project
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Name it: maxxit-workers
```

#### 3.2: Add PostgreSQL
```bash
railway add --plugin postgresql
```

**Copy the DATABASE_URL** and add it to Vercel environment variables!

#### 3.3: Deploy All-In-One Worker
```bash
# Deploy the project
railway up

# In Railway dashboard, set start command:
node workers/continuous-runner.js
```

**Environment Variables for Railway Workers**:
```env
# Database (auto-filled by PostgreSQL plugin)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Vercel App URL (for API calls)
VERCEL_APP_URL=https://your-app.vercel.app

# Python Services on Render
HYPERLIQUID_SERVICE_URL=https://your-hyperliquid.onrender.com
OSTIUM_SERVICE_URL=https://your-ostium.onrender.com
TWITTER_PROXY_URL=https://your-twitter.onrender.com

# API Keys (same as Vercel)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LUNARCRUSH_API_KEY=...
GAME_API_KEY=...

# Worker Intervals (optional, these are defaults)
TWEET_INGESTION_INTERVAL=300000      # 5 mins
SIGNAL_GENERATION_INTERVAL=60000     # 1 min
RESEARCH_SIGNAL_INTERVAL=120000      # 2 mins
TRADE_EXECUTION_INTERVAL=30000       # 30 sec
POSITION_MONITOR_INTERVAL=60000      # 1 min

# Blockchain
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
EXECUTOR_PRIVATE_KEY=0x...
```

#### 3.4: Add Metrics Updater (Optional but Recommended)
```bash
# Create second Railway service for metrics
railway up --service maxxit-metrics-updater

# Set start command in Railway dashboard:
# Run every hour
while true; do npx tsx lib/metrics-updater.ts; sleep 3600; done
```

---

### Step 4: Verify Everything Works (5 mins)

#### 4.1: Check Vercel App
```bash
# Open your app
open https://your-app.vercel.app

# Test API endpoints
curl https://your-app.vercel.app/api/health
curl https://your-app.vercel.app/api/v3/agents/list
```

#### 4.2: Check Railway Workers
```bash
# View worker logs
railway logs --service maxxit-workers

# You should see:
# ✅ Tweet Ingestion Worker running
# ✅ Signal Generator running
# ✅ Trade Executor running
# ✅ Position Monitor running
# ✅ Research Signal Generator running
```

#### 4.3: Check Database
```bash
# Connect to Railway PostgreSQL
railway connect Postgres

# Check tables
\dt

# Check recent signals
SELECT * FROM signals_v3 ORDER BY created_at DESC LIMIT 5;

# Check recent positions
SELECT * FROM positions_v3 ORDER BY created_at DESC LIMIT 5;
```

#### 4.4: Check Python Services (Render)
```bash
# Test Hyperliquid service
curl https://your-hyperliquid.onrender.com/health

# Test Ostium service
curl https://your-ostium.onrender.com/health

# Test Twitter Proxy
curl https://your-twitter.onrender.com/health
```

---

## 📋 Deployment Checklist

### Render (Python Services)
- [ ] Hyperliquid Service running
- [ ] Ostium Service running
- [ ] Twitter Proxy running
- [ ] All health checks passing

### Vercel (Frontend + API)
- [ ] Next.js app deployed
- [ ] All environment variables set
- [ ] Frontend pages loading
- [ ] API routes responding
- [ ] `/api/v3/agents/list` works

### Railway (Workers + Database)
- [ ] PostgreSQL created
- [ ] DATABASE_URL copied to Vercel
- [ ] All-In-One Worker deployed
- [ ] Worker logs show all 5 workers running
- [ ] Metrics Updater running (optional)

### System Integration
- [ ] Workers can connect to Vercel API
- [ ] Workers can connect to Python services
- [ ] Signals being generated
- [ ] Trades being executed
- [ ] Positions being monitored
- [ ] APR/metrics being updated

---

## 🔍 Monitoring & Logs

### Vercel Logs
```bash
# Real-time logs
vercel logs --follow

# Or in Vercel dashboard → Logs
```

### Railway Logs
```bash
# Workers
railway logs --service maxxit-workers

# Metrics
railway logs --service maxxit-metrics-updater

# Database
railway logs --service Postgres
```

### Render Logs
```bash
# In Render dashboard:
# Your Services → Select service → Logs tab
```

---

## 🐛 Troubleshooting

### Workers Not Running
```bash
# Check Railway logs
railway logs --service maxxit-workers

# Common issues:
# - DATABASE_URL not set
# - Python services unreachable
# - API keys missing
```

### No Signals Generated
```bash
# Check if tweets are being ingested
# In PostgreSQL:
SELECT COUNT(*) FROM ct_posts WHERE created_at > NOW() - INTERVAL '1 hour';

# Check if accounts are active
SELECT * FROM ct_accounts WHERE is_active = true;
```

### Trades Not Executing
```bash
# Check if signals exist
SELECT * FROM signals_v3 WHERE executed_at IS NULL;

# Check worker logs for errors
railway logs --service maxxit-workers | grep "Trade Executor"
```

### Position Monitor Not Working
```bash
# Check open positions
SELECT * FROM positions_v3 WHERE closed_at IS NULL;

# Check worker logs
railway logs --service maxxit-workers | grep "Position Monitor"
```

---

## 💡 Quick Reference

### Worker Execution Flow

```
1. Tweet Ingestion (5 mins)
   ↓
   Fetches tweets → Classifies with LLM → Stores in ct_posts

2. Signal Generator (1 min)
   ↓
   Reads ct_posts → Generates signals → Stores in signals_v3

3. Trade Executor (30 sec)
   ↓
   Reads signals_v3 → Agent Where routing → Places orders

4. Position Monitor (1 min)
   ↓
   Reads positions_v3 → Checks prices → Closes if profitable

5. Metrics Updater (1 hour)
   ↓
   Reads positions_v3 → Calculates APR/Sharpe → Updates agents_v3
```

---

## 🎯 Final System Overview

**3 Platforms**:
1. ✅ Vercel - Frontend + API (FREE!)
2. ✅ Railway - Workers + Database ($20/month)
3. ✅ Render - Python Services ($21/month)

**8 Background Processes**:
1. ✅ Tweet Ingestion
2. ✅ Signal Generator
3. ✅ Research Signals
4. ✅ Trade Executor
5. ✅ Position Monitor
6. ✅ Metrics Updater
7. ✅ V3 Signal Worker (optional)
8. ✅ Monitoring Worker (optional)

**Total Cost**: **$41/month**

---

🎉 **Your complete trading system is now deployed!**

