# 🏗️ Maxxit Services Architecture Guide

**For Junior Developers**  
**Last Updated:** November 14, 2025

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Services Breakdown](#services-breakdown)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Deployment Guide](#deployment-guide)
8. [Troubleshooting](#troubleshooting)

---

## 1. System Overview

Maxxit is an **AI-powered trading agent platform** that:
- Monitors Twitter for trading signals
- Uses LLM to classify tweets
- Generates trading signals with market data
- Executes trades on Hyperliquid/Ostium
- Monitors positions and manages risk

### 🎯 Key Concept: Agent Framework

```
Agent WHAT  →  What to trade? (Signal generation)
Agent HOW   →  How to trade? (Policy - future)
Agent WHERE →  Where to trade? (Venue selection)
```

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                           │
│  Next.js App - Agent creation, dashboard, deployments              │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ ↑
┌─────────────────────────────────────────────────────────────────────┐
│                    API SERVICES (Railway)                           │
├─────────────────────────────────────────────────────────────────────┤
│  1. agent-api        → Agent CRUD operations                        │
│  2. deployment-api   → Deployment management                        │
│  3. signal-api       → Signal queries & analytics                   │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ ↑
┌─────────────────────────────────────────────────────────────────────┐
│                   WORKER SERVICES (Railway)                         │
├─────────────────────────────────────────────────────────────────────┤
│  4. tweet-ingestion-worker    → Fetch tweets, classify with LLM    │
│     └── Runs every 5 minutes                                        │
│                                                                      │
│  5. signal-generator-worker   → Generate signals with LunarCrush   │
│     └── Runs every 5 minutes                                        │
│                                                                      │
│  6. trade-executor-worker     → Execute trades                      │
│     └── Runs every 2 minutes                                        │
│                                                                      │
│  7. position-monitor-worker   → Monitor open positions              │
│     └── Runs every 1 minute                                         │
│                                                                      │
│  8. metrics-updater-worker    → Update agent APR & metrics          │
│     └── Runs every 15 minutes                                       │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ ↑
┌─────────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES (Render)                        │
├─────────────────────────────────────────────────────────────────────┤
│  9. hyperliquid-service (Python) → Hyperliquid API wrapper         │
│  10. ostium-service (Python)     → Ostium API wrapper              │
│  11. twitter-proxy (Python)      → Twitter API proxy               │
└─────────────────────────────────────────────────────────────────────┘
                                ↓ ↑
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE (Railway)                             │
│                   PostgreSQL + Prisma ORM                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Services Breakdown

### 📦 API Services (User-Facing)

#### 3.1 agent-api

**Purpose:** Manage trading agents (create, read, update, delete)

**Port:** 5001

**Key Endpoints:**
- `GET /agents` - List all agents
- `GET /agents/:id` - Get agent details
- `POST /agents` - Create new agent
- `PUT /agents/:id` - Update agent
- `GET /agents/:id/routing-stats` - Agent routing analytics

**Database Tables Used:**
- `agents`
- `agent_accounts` (subscriptions)
- `agent_deployments`

**Environment Variables:**
```bash
DATABASE_URL=<PostgreSQL connection string>
PORT=5001
```

---

#### 3.2 deployment-api

**Purpose:** Manage agent deployments (Hyperliquid, Ostium)

**Port:** 5002

**Key Endpoints:**
- `GET /deployments` - List all deployments
- `GET /deployments/:id` - Get deployment details
- `POST /hyperliquid/create-deployment` - Deploy to Hyperliquid
- `POST /ostium/create-deployment` - Deploy to Ostium
- `PUT /deployments/:id/status` - Pause/activate deployment

**Database Tables Used:**
- `agent_deployments`
- `agents`
- `wallet_pool` (agent keys)

**Environment Variables:**
```bash
DATABASE_URL=<PostgreSQL connection string>
PORT=5002
```

---

#### 3.3 signal-api

**Purpose:** Query trading signals and analytics

**Port:** 5003

**Key Endpoints:**
- `GET /signals` - List signals (with filters)
- `GET /signals/:id` - Get signal details
- `GET /signals/agent/:agentId` - Signals for specific agent
- `GET /signals/stats` - Signal statistics

**Database Tables Used:**
- `signals`
- `agents`
- `ct_posts` (source tweets)

**Environment Variables:**
```bash
DATABASE_URL=<PostgreSQL connection string>
PORT=5003
```

---

### ⚙️ Worker Services (Background Jobs)

#### 3.4 tweet-ingestion-worker

**Purpose:** Fetch tweets from Twitter and classify with LLM

**Schedule:** Every 5 minutes

**Port:** 5004 (health check only)

**Flow:**
```
1. Query ct_accounts for active accounts
2. For each account:
   a. Fetch latest tweets from Twitter Proxy
   b. Check if tweet already in database (by tweet_id)
   c. If new → Classify with LLM (Perplexity/OpenAI)
   d. Extract tokens, determine side (LONG/SHORT)
   e. Store in ct_posts table
3. Sleep for 5 minutes
4. Repeat
```

**Database Tables Used:**
- `ct_accounts` (Twitter accounts to monitor)
- `ct_posts` (stored tweets)

**Environment Variables:**
```bash
DATABASE_URL=<PostgreSQL connection string>
TWITTER_PROXY_URL=https://maxxit.onrender.com
PERPLEXITY_API_KEY=<your key>
WORKER_INTERVAL=300000  # 5 minutes in milliseconds
PORT=5004
```

**LLM Classification:**
- Input: Tweet text
- Output:
  - `is_signal_candidate`: true/false
  - `extracted_tokens`: ['BTC', 'ETH']
  - `signal_type`: 'LONG' | 'SHORT' | null
  - `confidence_score`: 0-100

---

#### 3.5 signal-generator-worker

**Purpose:** Generate trading signals from classified tweets using LunarCrush

**Schedule:** Every 5 minutes

**Port:** 5008

**Flow:**
```
1. Query ct_posts WHERE:
   - is_signal_candidate = true
   - processed_for_signals = false
2. For each tweet:
   a. Find agents subscribed to that CT account
   b. For each agent:
      - Check if token available on agent's venue
      - Get LunarCrush market data
      - Calculate position size (0-10%)
      - Create signal
   c. Mark tweet as processed
3. Sleep for 5 minutes
4. Repeat
```

**Database Tables Used:**
- `ct_posts`
- `agent_accounts` (subscriptions)
- `agents`
- `venue_markets` (token availability)
- `signals` (output)

**Environment Variables:**
```bash
DATABASE_URL=<PostgreSQL connection string>
LUNARCRUSH_API_KEY=<your key>
WORKER_INTERVAL=300000  # 5 minutes
PORT=5008
```

**Position Sizing Logic:**
```javascript
// LunarCrush score: 0-10
// Position size: 0-10% of balance
const positionSizePercent = lunarcrushScore;

// Example:
// Score 0.17 → 0.17% position
// Score 5.00 → 5.00% position
// Score 9.50 → 9.50% position
```

---

#### 3.6 trade-executor-worker

**Purpose:** Execute trades on Hyperliquid/Ostium

**Schedule:** Every 2 minutes

**Port:** 5005

**Flow:**
```
1. Query signals WHERE:
   - created_at > last_check_time
   - Not yet executed
2. For each signal:
   a. Find active deployments for that agent
   b. For each deployment:
      - Check if position already exists (avoid duplicates)
      - Fetch agent private key from wallet_pool
      - Call Hyperliquid/Ostium service
      - If success → Create position record
      - If fail → Log error
3. Sleep for 2 minutes
4. Repeat
```

**Database Tables Used:**
- `signals`
- `agent_deployments`
- `wallet_pool` (agent private keys)
- `positions` (output)

**Environment Variables:**
```bash
DATABASE_URL=<PostgreSQL connection string>
HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com
WORKER_INTERVAL=120000  # 2 minutes
PORT=5005
```

**Trade Execution Example:**
```javascript
// For Hyperliquid:
POST /open-position
{
  "agentPrivateKey": "<from wallet_pool>",
  "coin": "ETH",
  "isBuy": true,
  "size": 0.005,
  "slippage": 0.01,
  "vaultAddress": "<user wallet>"
}

// For Ostium:
POST /open-position
{
  "agentAddress": "<from deployment>",
  "userAddress": "<user wallet>",
  "market": "ETH",
  "side": "long",
  "collateral": 10,
  "leverage": 3
}
```

---

#### 3.7 position-monitor-worker

**Purpose:** Monitor open positions and manage risk

**Schedule:** Every 1 minute

**Port:** 5006

**Flow:**
```
1. Query positions WHERE status = 'OPEN'
2. For each position:
   a. Fetch current price
   b. Calculate unrealized PnL
   c. Check stop loss (hardcoded 10%)
   d. Check trailing stop (activates at +3%, trails by 1%)
   e. If triggered → Close position
   f. Update position record
3. Sleep for 1 minute
4. Repeat
```

**Database Tables Used:**
- `positions`
- `agent_deployments`

**Environment Variables:**
```bash
DATABASE_URL=<PostgreSQL connection string>
HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com
WORKER_INTERVAL=60000  # 1 minute
PORT=5006
```

**Risk Management (Hardcoded):**
```javascript
// Stop Loss: 10%
if (unrealizedPnlPercent < -10) {
  closePosition();
}

// Trailing Stop:
// Activates when profit reaches +3%
// Then trails by 1% below highest price
if (highestPnlPercent >= 3) {
  trailingStopActivated = true;
  if (currentPnlPercent < highestPnlPercent - 1) {
    closePosition();
  }
}
```

---

#### 3.8 metrics-updater-worker

**Purpose:** Update agent APR and performance metrics

**Schedule:** Every 15 minutes

**Port:** 5007

**Flow:**
```
1. For each agent:
   a. Query all closed positions
   b. Calculate APR (30d, 90d, since inception)
   c. Calculate win rate
   d. Calculate total PnL
   e. Update agents table
2. Sleep for 15 minutes
3. Repeat
```

**Database Tables Used:**
- `agents`
- `positions`
- `agent_deployments`

**Environment Variables:**
```bash
DATABASE_URL=<PostgreSQL connection string>
WORKER_INTERVAL=900000  # 15 minutes
PORT=5007
```

---

### 🐍 External Services (Python on Render)

#### 3.9 hyperliquid-service

**Purpose:** Python wrapper for Hyperliquid API

**Language:** Python (Flask)

**Key Endpoints:**
- `POST /open-position` - Open position
- `POST /close-position` - Close position
- `GET /positions/:address` - Get positions
- `GET /balance/:address` - Get balance

**URL:** `https://hyperliquid-service.onrender.com`

---

#### 3.10 ostium-service

**Purpose:** Python wrapper for Ostium API

**Language:** Python (Flask)

**Key Endpoints:**
- `POST /open-position` - Open position
- `POST /close-position` - Close position
- `GET /positions/:address` - Get positions

**URL:** `https://maxxit-1.onrender.com`

---

#### 3.11 twitter-proxy

**Purpose:** Proxy for Twitter API (handles rate limits)

**Language:** Python (Flask)

**Key Endpoints:**
- `GET /tweets/:username` - Get user's tweets
- `GET /health` - Health check

**URL:** `https://maxxit.onrender.com`

---

## 4. Data Flow

### 🔄 Complete Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: TWEET INGESTION (Every 5 min)                     │
├─────────────────────────────────────────────────────────────┤
│ 1. tweet-ingestion-worker fetches tweets                    │
│ 2. LLM classifies: is it a signal?                          │
│ 3. Extract tokens: ["BTC", "ETH"]                           │
│ 4. Determine side: LONG or SHORT                            │
│ 5. Store in ct_posts                                        │
│    - is_signal_candidate: true                              │
│    - extracted_tokens: ["BTC"]                              │
│    - signal_type: "LONG"                                    │
│    - processed_for_signals: false                           │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: SIGNAL GENERATION (Every 5 min)                   │
├─────────────────────────────────────────────────────────────┤
│ 1. signal-generator-worker finds unprocessed tweets         │
│ 2. For each tweet:                                          │
│    - Find subscribed agents                                 │
│    - Check if token available on agent's venue             │
│    - Get LunarCrush score (0-10)                           │
│    - Calculate position size = LunarCrush score %          │
│    - Create signal                                          │
│ 3. Mark tweet as processed                                  │
│                                                              │
│ Output: signals table                                       │
│    - agent_id: <agent>                                      │
│    - token_symbol: "BTC"                                    │
│    - side: "LONG"                                           │
│    - venue: "HYPERLIQUID"                                   │
│    - size_model: { value: 5.2 } // 5.2% position           │
│    - lunarcrush_score: 5.2                                 │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: TRADE EXECUTION (Every 2 min)                     │
├─────────────────────────────────────────────────────────────┤
│ 1. trade-executor-worker finds new signals                  │
│ 2. For each signal:                                         │
│    - Find active deployments                                │
│    - Fetch agent private key from wallet_pool              │
│    - Call Hyperliquid/Ostium service                       │
│    - If success → Create position record                   │
│                                                              │
│ HTTP Request to Hyperliquid service:                        │
│ POST /open-position                                         │
│ {                                                            │
│   "agentPrivateKey": "0x...",                              │
│   "coin": "BTC",                                            │
│   "isBuy": true,                                            │
│   "size": 0.005,                                            │
│   "vaultAddress": "0x..."                                   │
│ }                                                            │
│                                                              │
│ Output: positions table                                     │
│    - signal_id: <signal>                                    │
│    - deployment_id: <deployment>                            │
│    - token_symbol: "BTC"                                    │
│    - side: "LONG"                                           │
│    - entry_price: 42000                                     │
│    - qty: 0.005                                             │
│    - status: "OPEN"                                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 4: POSITION MONITORING (Every 1 min)                 │
├─────────────────────────────────────────────────────────────┤
│ 1. position-monitor-worker finds open positions             │
│ 2. For each position:                                       │
│    - Fetch current price                                    │
│    - Calculate PnL                                          │
│    - Check stop loss (-10%)                                │
│    - Check trailing stop (+3% activation, -1% trail)       │
│    - If triggered → Close position                         │
│                                                              │
│ Risk Management:                                            │
│    Hard Stop Loss: -10%                                     │
│    Trailing Stop: Activates at +3%, trails by 1%           │
│                                                              │
│ Output: Update positions table                              │
│    - current_price: 43000                                   │
│    - pnl: 5.0                                               │
│    - status: "OPEN" or "CLOSED"                            │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 5: METRICS UPDATE (Every 15 min)                     │
├─────────────────────────────────────────────────────────────┤
│ 1. metrics-updater-worker aggregates data                   │
│ 2. Calculate APR (30d, 90d, since inception)               │
│ 3. Calculate win rate                                       │
│ 4. Update agents table                                      │
│                                                              │
│ Output: agents table                                        │
│    - apr_30d: 15.5                                          │
│    - apr_90d: 22.3                                          │
│    - apr_si: 18.9                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### Key Tables

#### agents
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  creator_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  venue venue_t NOT NULL,  -- HYPERLIQUID, OSTIUM, MULTI
  status agent_status_t DEFAULT 'PUBLIC',  -- PUBLIC, PRIVATE, DRAFT
  weights JSONB,
  apr_30d DECIMAL,
  apr_90d DECIMAL,
  apr_si DECIMAL,
  profit_receiver_address TEXT
);
```

#### agent_accounts (Subscriptions)
```sql
CREATE TABLE agent_accounts (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  ct_account_id UUID REFERENCES ct_accounts(id),
  weight INTEGER
);
```

#### ct_posts (Tweets)
```sql
CREATE TABLE ct_posts (
  id UUID PRIMARY KEY,
  ct_account_id UUID REFERENCES ct_accounts(id),
  tweet_id TEXT UNIQUE,
  tweet_text TEXT,
  tweet_created_at TIMESTAMP,
  is_signal_candidate BOOLEAN,
  extracted_tokens TEXT[],
  signal_type TEXT,  -- 'LONG', 'SHORT', null
  confidence_score FLOAT,
  processed_for_signals BOOLEAN DEFAULT false
);
```

#### signals
```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  token_symbol TEXT,
  venue venue_t,
  side TEXT,  -- 'LONG' or 'SHORT'
  size_model JSONB,
  risk_model JSONB,
  source_tweets TEXT[],
  lunarcrush_score FLOAT,
  created_at TIMESTAMP,
  UNIQUE (agent_id, token_symbol, bucket_6h_utc(created_at))
);
```

#### agent_deployments
```sql
CREATE TABLE agent_deployments (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  safe_wallet TEXT,  -- User's wallet
  hyperliquid_agent_address TEXT,  -- Agent's trading wallet
  status deployment_status_t,  -- ACTIVE, PAUSED, CANCELLED
  sub_started_at TIMESTAMP
);
```

#### wallet_pool (Agent Keys)
```sql
CREATE TABLE wallet_pool (
  id UUID PRIMARY KEY,
  address TEXT UNIQUE,
  private_key TEXT,
  assigned_to_user_wallet TEXT,
  created_at TIMESTAMP
);
```

#### positions
```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY,
  deployment_id UUID REFERENCES agent_deployments(id),
  signal_id UUID REFERENCES signals(id),
  token_symbol TEXT,
  venue venue_t,
  side TEXT,
  qty DECIMAL,
  entry_price DECIMAL,
  current_price DECIMAL,
  stop_loss DECIMAL,
  take_profit DECIMAL,
  status TEXT,  -- 'OPEN' or 'CLOSED'
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  pnl DECIMAL
);
```

#### venue_markets (Token Availability)
```sql
CREATE TABLE venue_markets (
  id UUID PRIMARY KEY,
  venue venue_t,
  token_symbol TEXT,
  market_name TEXT,
  is_active BOOLEAN,
  UNIQUE (venue, token_symbol)
);
```

---

## 6. API Endpoints

### Frontend → API Services

#### Agent Management
```
GET    /agents                    List all agents
GET    /agents/:id                Get agent details
POST   /agents                    Create agent
PUT    /agents/:id                Update agent
DELETE /agents/:id                Delete agent
GET    /agents/:id/routing-stats  Routing analytics
```

#### Deployment Management
```
GET    /deployments                     List deployments
GET    /deployments/:id                 Get deployment
POST   /hyperliquid/create-deployment   Deploy to Hyperliquid
POST   /ostium/create-deployment        Deploy to Ostium
PUT    /deployments/:id/status          Update status
```

#### Signal Queries
```
GET    /signals                   List signals
GET    /signals/:id               Get signal
GET    /signals/agent/:agentId    Agent signals
GET    /signals/stats             Statistics
```

### Workers → External Services

#### Hyperliquid Service
```
POST   /open-position     Open position
POST   /close-position    Close position
GET    /positions/:addr   Get positions
GET    /balance/:addr     Get balance
```

#### Ostium Service
```
POST   /open-position     Open position
POST   /close-position    Close position
GET    /positions/:addr   Get positions
```

#### Twitter Proxy
```
GET    /tweets/:username  Get tweets
GET    /health            Health check
```

---

## 7. Deployment Guide

### Railway Setup (8 Services)

#### Service 1: agent-api
```yaml
Root Directory: services/agent-api
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Environment Variables:
  DATABASE_URL: <Railway PostgreSQL>
  PORT: 5001
```

#### Service 2: deployment-api
```yaml
Root Directory: services/deployment-api
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Environment Variables:
  DATABASE_URL: <Railway PostgreSQL>
  PORT: 5002
```

#### Service 3: signal-api
```yaml
Root Directory: services/signal-api
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Environment Variables:
  DATABASE_URL: <Railway PostgreSQL>
  PORT: 5003
```

#### Service 4: tweet-ingestion-worker
```yaml
Root Directory: services/tweet-ingestion-worker
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Environment Variables:
  DATABASE_URL: <Railway PostgreSQL>
  TWITTER_PROXY_URL: https://maxxit.onrender.com
  PERPLEXITY_API_KEY: <your key>
  WORKER_INTERVAL: 300000
  PORT: 5004
```

#### Service 5: signal-generator-worker
```yaml
Root Directory: services/signal-generator-worker
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Environment Variables:
  DATABASE_URL: <Railway PostgreSQL>
  LUNARCRUSH_API_KEY: <your key>
  WORKER_INTERVAL: 300000
  PORT: 5008
```

#### Service 6: trade-executor-worker
```yaml
Root Directory: services/trade-executor-worker
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Environment Variables:
  DATABASE_URL: <Railway PostgreSQL>
  HYPERLIQUID_SERVICE_URL: https://hyperliquid-service.onrender.com
  OSTIUM_SERVICE_URL: https://maxxit-1.onrender.com
  WORKER_INTERVAL: 120000
  PORT: 5005
```

#### Service 7: position-monitor-worker
```yaml
Root Directory: services/position-monitor-worker
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Environment Variables:
  DATABASE_URL: <Railway PostgreSQL>
  HYPERLIQUID_SERVICE_URL: https://hyperliquid-service.onrender.com
  OSTIUM_SERVICE_URL: https://maxxit-1.onrender.com
  WORKER_INTERVAL: 60000
  PORT: 5006
```

#### Service 8: metrics-updater-worker
```yaml
Root Directory: services/metrics-updater-worker
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
Environment Variables:
  DATABASE_URL: <Railway PostgreSQL>
  WORKER_INTERVAL: 900000
  PORT: 5007
```

---

## 8. Troubleshooting

### Common Issues

#### Worker Not Processing
```bash
# Check logs
Railway → Service → Logs

# Look for:
✅ "Worker starting..."
✅ "Database connected"
✅ "Processing X items..."

# If not found:
1. Check DATABASE_URL is set
2. Check service is deployed
3. Check for errors in logs
```

#### Trade Not Executing
```bash
# Check trade-executor-worker logs for:
❌ "Hyperliquid service error: 404"
   → Wrong endpoint or service URL

❌ "Agent address not found in wallet_pool"
   → Add agent to wallet_pool table

❌ "Order must have minimum value of $10"
   → Increase position size

❌ "Order could not immediately match"
   → Low liquidity, try different token
```

#### Signal Not Generated
```bash
# Check signal-generator-worker logs for:
❌ "No active agents subscribed"
   → Add agent_accounts subscription

❌ "Token not available on HYPERLIQUID"
   → Add to venue_markets table

❌ "LunarCrush API error"
   → Check LUNARCRUSH_API_KEY
```

### Health Checks

All workers expose `/health` endpoint:

```bash
# Check worker health
curl https://<service-url>/health

# Response:
{
  "status": "ok",
  "service": "trade-executor-worker",
  "database": "connected",
  "isRunning": true
}
```

---

## 📚 Learning Resources

### Understanding the Flow
1. Read this guide top to bottom
2. Study the Architecture Diagram
3. Follow the Data Flow section
4. Review Database Schema

### Debugging
1. Check Railway logs for each service
2. Use health check endpoints
3. Query database to trace data flow
4. Test individual services with curl

### Making Changes
1. Always create a new branch
2. Test locally first
3. Deploy to Railway
4. Monitor logs for errors
5. Verify with health checks

---

**Questions?** Contact the senior team!

**Last Updated:** November 14, 2025  
**Version:** 1.0
