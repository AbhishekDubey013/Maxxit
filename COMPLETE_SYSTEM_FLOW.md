# Maxxit - Complete System Flow

## 🔄 Full End-to-End Trading Flow

This document shows the **complete flow** from tweet ingestion to profit distribution.

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SOURCES                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Twitter/X                Research Institutes           Market Data    │
│   • CT accounts           • Research signals             • Prices       │
│   • Verified traders      • Analysis reports             • Volumes      │
│   • Alpha sources         • Recommendations              • Volatility   │
│                                                                           │
└────────┬───────────────────────────┬──────────────────────────┬──────────┘
         │                           │                          │
         ↓                           ↓                          ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         INGESTION LAYER (Workers)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   [1] TWEET INGESTION WORKER                   Every 5 minutes          │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   • Fetches tweets from Twitter Proxy service (Render)                  │
│   • Extracts token mentions, sentiment                                   │
│   • Uses LLM (GPT-4/Claude) for classification                          │
│   • Stores in ct_posts table                                             │
│                                                                           │
│   Output: ct_posts.is_signal = true/false                               │
│           ct_posts.tokens = ['BTC', 'ETH', ...]                         │
│           ct_posts.sentiment = 'BULLISH'/'BEARISH'                      │
│                                                                           │
└────────┬──────────────────────────────────────────────────────┬──────────┘
         │                                                       │
         ↓                                                       │
┌─────────────────────────────────────────────────────────────────────────┐
│                       SIGNAL GENERATION LAYER (Workers)                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   [2] SIGNAL GENERATOR WORKER                   Every 1 minute          │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   • Reads classified tweets (ct_posts.is_signal = true)                 │
│   • Matches to agents' subscribed CT accounts                           │
│   • Generates signal: {token, side, size, confidence}                   │
│   • Adds LunarCrush score (social metrics)                              │
│   • Stores in signals/signals_v3 table                                  │
│                                                                           │
│   [3] RESEARCH SIGNAL GENERATOR                  Every 2 minutes        │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   • Fetches research institute signals                                   │
│   • Parses recommendations                                               │
│   • Generates signals similar to tweet-based                            │
│                                                                           │
│   Output: signals_v3 {                                                   │
│             token_symbol: 'BTC',                                         │
│             side: 'LONG',                                                │
│             size_model: { percentage: 10, leverage: 3 },                │
│             confidence: 75,                                              │
│             requested_venue: 'MULTI',  // ← Agent Where!                │
│             status: 'PENDING'                                            │
│           }                                                              │
│                                                                           │
└────────┬──────────────────────────────────────────────────────┬──────────┘
         │                                                       │
         ↓                                                       │
┌─────────────────────────────────────────────────────────────────────────┐
│                       EXECUTION LAYER (Workers)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   [4] TRADE EXECUTOR WORKER                      Every 30 seconds       │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   • Reads PENDING signals from signals_v3                               │
│   • For V3 agents: Runs AGENT WHERE routing                             │
│                                                                           │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │  AGENT WHERE ROUTING (V3 Feature!)                             │    │
│   ├───────────────────────────────────────────────────────────────┤    │
│   │                                                                 │    │
│   │  IF requested_venue = 'MULTI':                                 │    │
│   │    1. Check Hyperliquid markets (220 pairs)                   │    │
│   │       • GET /api/info endpoint                                 │    │
│   │       • Is BTC-USD available?                                  │    │
│   │                                                                 │    │
│   │    2. If YES → Route to HYPERLIQUID                            │    │
│   │       • Best liquidity (220 pairs)                            │    │
│   │       • Lower fees                                             │    │
│   │       • Faster execution                                       │    │
│   │                                                                 │    │
│   │    3. If NO → Check Ostium markets (41 pairs)                 │    │
│   │       • GET /api/markets endpoint                              │    │
│   │       • Is token available?                                    │    │
│   │                                                                 │    │
│   │    4. If YES → Route to OSTIUM                                 │    │
│   │       • Synthetic perpetuals                                   │    │
│   │       • Alternative markets                                    │    │
│   │                                                                 │    │
│   │    5. Log routing decision:                                    │    │
│   │       • venue_routing_history_v3.selected_venue                │    │
│   │       • venue_routing_history_v3.routing_reason                │    │
│   │       • venue_routing_history_v3.routing_duration_ms           │    │
│   │                                                                 │    │
│   │    6. Update signal:                                           │    │
│   │       • signals_v3.requested_venue = 'HYPERLIQUID'/'OSTIUM'   │    │
│   │                                                                 │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                           │
│   • Places order via Hyperliquid/Ostium service (Render)                │
│   • Creates position record in positions_v3                             │
│   • Updates signal status to 'EXECUTED'                                 │
│                                                                           │
│   Output: positions_v3 {                                                 │
│             token_symbol: 'BTC',                                         │
│             side: 'LONG',                                                │
│             qty: 0.5,                                                    │
│             entry_price: 50000,                                          │
│             venue: 'HYPERLIQUID',  // ← Actual venue used!              │
│             status: 'OPEN',                                              │
│             created_at: NOW()                                            │
│           }                                                              │
│                                                                           │
└────────┬──────────────────────────────────────────────────────┬──────────┘
         │                                                       │
         ↓                                                       │
┌─────────────────────────────────────────────────────────────────────────┐
│                       MONITORING LAYER (Workers)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   [5] POSITION MONITOR WORKER                    Every 1 minute         │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   • Reads all OPEN positions from positions_v3                          │
│   • Fetches current prices from Hyperliquid/Ostium                      │
│   • Calculates unrealized PnL                                            │
│   • Applies trailing stop logic (1% default)                            │
│                                                                           │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │  TRAILING STOP LOGIC                                           │    │
│   ├───────────────────────────────────────────────────────────────┤    │
│   │                                                                 │    │
│   │  Example:                                                       │    │
│   │    Entry: $50,000                                              │    │
│   │    Peak:  $52,000 (+4%)                                        │    │
│   │    Trail: $51,480 (1% below peak)                              │    │
│   │                                                                 │    │
│   │    If current price drops to $51,480:                          │    │
│   │      → Close position                                          │    │
│   │      → Realized PnL: +$1,480 (+2.96%)                          │    │
│   │                                                                 │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                           │
│   • Places close order via Hyperliquid/Ostium                           │
│   • Updates position:                                                    │
│       - closed_at = NOW()                                                │
│       - pnl = realized PnL                                               │
│       - status = 'CLOSED'                                                │
│                                                                           │
│   • Records PnL snapshot in pnl_snapshots                               │
│                                                                           │
└────────┬──────────────────────────────────────────────────────┬──────────┘
         │                                                       │
         ↓                                                       │
┌─────────────────────────────────────────────────────────────────────────┐
│                       ANALYTICS LAYER (Workers)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   [6] METRICS UPDATER WORKER                     Every 1 hour           │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│   • Reads all closed positions for each agent                           │
│   • Calculates performance metrics:                                     │
│                                                                           │
│   ┌───────────────────────────────────────────────────────────────┐    │
│   │  METRICS CALCULATED                                            │    │
│   ├───────────────────────────────────────────────────────────────┤    │
│   │                                                                 │    │
│   │  APR (Annual Percentage Return):                               │    │
│   │    • APR 30d  = (PnL / Capital) × (365/30) × 100               │    │
│   │    • APR 90d  = (PnL / Capital) × (365/90) × 100               │    │
│   │    • APR SI   = Since Inception                                │    │
│   │                                                                 │    │
│   │  Sharpe Ratio:                                                 │    │
│   │    • Risk-adjusted return                                      │    │
│   │    • Sharpe = AvgReturn / StdDeviation                         │    │
│   │                                                                 │    │
│   │  Impact Factor (for X accounts):                               │    │
│   │    • Win rate × Average PnL                                    │    │
│   │    • Measures signal quality                                   │    │
│   │                                                                 │    │
│   │  Win Rate:                                                      │    │
│   │    • % of profitable trades                                    │    │
│   │                                                                 │    │
│   │  Total PnL:                                                     │    │
│   │    • Sum of all realized PnL                                   │    │
│   │                                                                 │    │
│   └───────────────────────────────────────────────────────────────┘    │
│                                                                           │
│   • Updates agents_v3:                                                   │
│       - apr_30d, apr_90d, apr_si                                         │
│       - sharpe_30d                                                       │
│       - total_pnl                                                        │
│       - win_rate                                                         │
│                                                                           │
│   • Updates ct_accounts:                                                 │
│       - impact_factor                                                    │
│                                                                           │
└────────┬──────────────────────────────────────────────────────┬──────────┘
         │                                                       │
         ↓                                                       │
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (Vercel)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   Next.js Frontend + API Routes                                         │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                           │
│   Pages:                                                                 │
│   • / (homepage)          → Display V3 agents with metrics              │
│   • /v3                   → V3 agent showcase                           │
│   • /agent/[id]           → Agent detail page                           │
│   • /create-agent         → Create new agent                            │
│   • /my-deployments       → User's deployed agents                      │
│                                                                           │
│   API Endpoints:                                                         │
│   • /api/v3/agents/list   → List V3 agents                              │
│   • /api/v3/agents/create → Create V3 agent                             │
│   • /api/v3/agents/deploy → Deploy V3 agent                             │
│   • /api/v3/signals/generate → Generate signal                          │
│   • /api/v3/execute/trade → Execute trade                               │
│   • /api/v3/stats/overview → System stats                               │
│   • /api/v3/stats/routing-history → Agent Where history                │
│                                                                           │
│   Agent Card Displays:                                                   │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  Agent Name: "Crypto CT Alpha"                    V3 BADGE       │  │
│   │  Venue: MULTI (Auto-routing)                                     │  │
│   │  ──────────────────────────────────────────────────────────────  │  │
│   │  Performance:                                                     │  │
│   │    APR 30d:    +45.2%                                            │  │
│   │    APR 90d:    +38.7%                                            │  │
│   │    Sharpe:     1.89                                              │  │
│   │    Win Rate:   68%                                               │  │
│   │  ──────────────────────────────────────────────────────────────  │  │
│   │  Venue Breakdown:                                                 │  │
│   │    Hyperliquid: 78% of trades                                    │  │
│   │    Ostium:      22% of trades                                    │  │
│   │  ──────────────────────────────────────────────────────────────  │  │
│   │  Sources:                                                         │  │
│   │    • @cryptotrader_x (IF: 8.2)                                   │  │
│   │    • @alpha_whale (IF: 7.9)                                      │  │
│   │    • Messari Research                                            │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## ⏱️ Complete Timeline (Example Trade)

```
T=0:00:00   Tweet posted by @cryptotrader_x: "Bullish on $BTC, breaking resistance"
            ↓
T=0:02:30   [TWEET INGESTION] Worker runs
            • Fetches tweet via Twitter Proxy
            • LLM classifies: is_signal=true, token='BTC', sentiment='BULLISH'
            • Stores in ct_posts
            ↓
T=0:03:15   [SIGNAL GENERATOR] Worker runs
            • Reads ct_post
            • Finds agents subscribed to @cryptotrader_x
            • Generates signal: LONG BTC, 10% of fund, confidence 75%
            • requested_venue = 'MULTI' (V3 agent)
            • Stores in signals_v3, status='PENDING'
            ↓
T=0:03:45   [TRADE EXECUTOR] Worker runs
            • Reads PENDING signal
            • Runs AGENT WHERE routing:
              - Check Hyperliquid: BTC-USD available ✅
              - Selected venue: HYPERLIQUID
              - Routing reason: "Hyperliquid: pair available"
              - Routing duration: 245ms
            • Logs to venue_routing_history_v3
            • Places order via Hyperliquid service (Render)
            • Order filled: 0.5 BTC @ $50,000
            • Creates position in positions_v3, status='OPEN'
            • Updates signal to 'EXECUTED'
            ↓
T=0:05:00   [POSITION MONITOR] First check
            • Current price: $50,200 (+0.4%)
            • Unrealized PnL: +$100
            • Trail stop: $49,702 (1% below peak)
            • Action: Hold
            ↓
T=0:15:00   [POSITION MONITOR] Price rises
            • Current price: $52,000 (+4%)
            • Unrealized PnL: +$1,000
            • New peak: $52,000
            • Trail stop updated: $51,480 (1% below new peak)
            • Action: Hold
            ↓
T=0:22:00   [POSITION MONITOR] Price drops slightly
            • Current price: $51,400 (-1.15%)
            • Hit trail stop: $51,480
            • Action: Close position!
            • Places close order via Hyperliquid
            • Order filled: 0.5 BTC @ $51,400
            • Updates position: closed_at=NOW(), pnl=+$700, status='CLOSED'
            • Records in pnl_snapshots
            ↓
T=1:00:00   [METRICS UPDATER] Runs hourly
            • Reads closed position: +$700 PnL
            • Updates agent metrics:
              - New APR 30d: +45.2%
              - New Sharpe: 1.89
              - Win rate: 68%
            • Updates ct_accounts impact_factor for @cryptotrader_x
            ↓
T=1:00:05   [USER INTERFACE] Agent card updates
            • User visits homepage
            • Sees updated APR: +45.2%
            • Sees recent trade in history
            • Sees venue breakdown: Hyperliquid 78%, Ostium 22%
```

**Total time from tweet to closed position: ~22 minutes**

---

## 🎯 Key Features Highlighted in Flow

### 1. **Agent Where Routing** (V3)
- Venue-agnostic signal generation
- Intelligent routing: Hyperliquid first (220 pairs), Ostium fallback (41 pairs)
- Full transparency: Routing history logged
- Performance tracking per venue

### 2. **Complete Automation**
- No manual intervention required
- All workers run on schedules
- Self-healing: Continues even if one worker fails

### 3. **Real-time Monitoring**
- 1-minute position checks
- Dynamic trailing stops
- Automatic profit taking

### 4. **Performance Analytics**
- Hourly APR updates
- Risk-adjusted returns (Sharpe)
- Source quality scoring (Impact Factor)
- Venue performance breakdown

### 5. **Scalability**
- Handles multiple agents simultaneously
- Parallel signal processing
- Independent workers
- Database-driven (no state in workers)

---

## 🔧 Worker Dependencies

```
Tweet Ingestion
  ↓ (requires: Twitter Proxy, OpenAI/Anthropic)
Signal Generator
  ↓ (requires: Tweet Ingestion output)
Trade Executor
  ↓ (requires: Signal Generator output, Hyperliquid/Ostium services)
Position Monitor
  ↓ (requires: Trade Executor output, Hyperliquid/Ostium services)
Metrics Updater
  ↓ (requires: Position Monitor output)
Frontend/API
  ↓ (requires: Metrics Updater output)
```

**Critical Path**:
1. ✅ Tweet Ingestion MUST run first
2. ✅ Signal Generator MUST run after Tweet Ingestion
3. ✅ Trade Executor MUST run after Signal Generator
4. ✅ Position Monitor MUST run after Trade Executor
5. ✅ Metrics Updater runs independently (uses historical data)

---

## 💾 Database Tables Used

| Table | Used By | Purpose |
|-------|---------|---------|
| `ct_posts` | Tweet Ingestion | Store classified tweets |
| `ct_accounts` | Tweet Ingestion, Metrics Updater | CT account data + Impact Factor |
| `agents_v3` | Signal Generator, Metrics Updater | Agent config + performance |
| `agent_deployments_v3` | All workers | User deployments |
| `signals_v3` | Signal Generator, Trade Executor | Trading signals |
| `positions_v3` | Trade Executor, Position Monitor | Open/closed positions |
| `venue_routing_history_v3` | Trade Executor | Agent Where routing logs |
| `venue_routing_config_v3` | Trade Executor | Routing preferences |
| `pnl_snapshots` | Position Monitor | PnL history |

---

## 🌐 External Services

| Service | Platform | Used By | Purpose |
|---------|----------|---------|---------|
| Twitter Proxy | Render (Python) | Tweet Ingestion | Fetch tweets from X API |
| Hyperliquid Service | Render (Python) | Trade Executor, Position Monitor | Place/close orders, fetch positions |
| Ostium Service | Render (Python) | Trade Executor, Position Monitor | Place/close orders, fetch positions |
| OpenAI/Anthropic API | Cloud | Tweet Ingestion, Signal Generator | LLM classification, signal reasoning |
| LunarCrush API | Cloud | Signal Generator | Social metrics |

---

## 🚀 Quick Start Commands

```bash
# Deploy all workers to Railway
railway up
# Start command: node workers/continuous-runner.js

# Deploy frontend to Vercel
vercel

# View logs
railway logs --service maxxit-workers

# Check database
railway connect Postgres
```

---

## 📊 System Health Check

```bash
# Check all workers are running
curl https://your-railway-app.up.railway.app/health

# Check recent signals
psql $DATABASE_URL -c "SELECT COUNT(*) FROM signals_v3 WHERE created_at > NOW() - INTERVAL '1 hour';"

# Check recent trades
psql $DATABASE_URL -c "SELECT COUNT(*) FROM positions_v3 WHERE created_at > NOW() - INTERVAL '1 hour';"

# Check Agent Where routing
psql $DATABASE_URL -c "SELECT selected_venue, COUNT(*) FROM venue_routing_history_v3 GROUP BY selected_venue;"
```

---

🎉 **Your complete trading system is now running 24/7!**

