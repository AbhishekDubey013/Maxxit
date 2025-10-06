# Maxxit CT Posts - Complete System Flow

## 🎯 End-to-End Flow Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 1: AGENT CREATION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User creates agent via /create-agent wizard:                        │
│                                                                       │
│    Step 1: Basic Info (name, description)                            │
│       ↓                                                               │
│    Step 2: Venue Selection (SPOT/GMX/HYPERLIQUID)                    │
│       ↓                                                               │
│    Step 3: Strategy Weights (8 indicators)                           │
│       ↓                                                               │
│  ┌─────────────────────────────────────────────────┐                │
│  │ Step 4: CT ACCOUNT SELECTION ⭐ NEW!            │                │
│  │                                                  │                │
│  │ - Browse CT accounts (@Abhishe42402615, etc)    │                │
│  │ - Search by username                            │                │
│  │ - Select multiple accounts (checkboxes)         │                │
│  │ - Add new CT accounts inline                    │                │
│  │                                                  │                │
│  │ API: GET /api/ct_accounts (loads accounts)      │                │
│  │ API: POST /api/ct_accounts (adds new ones)      │                │
│  └─────────────────────────────────────────────────┘                │
│       ↓                                                               │
│    Step 5: Wallet Configuration                                      │
│       ↓                                                               │
│    Step 6: Review & Submit                                           │
│       ↓                                                               │
│  POST /api/agents (creates agent)                                    │
│       ↓                                                               │
│  POST /api/agents/{id}/accounts (links CT accounts)                  │
│       ↓                                                               │
│  ✅ Agent created with CT accounts linked!                           │
│                                                                       │
│  Database Tables:                                                    │
│    - agents (new agent record)                                       │
│    - agent_accounts (junction: agent ↔ ct_accounts)                  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   STEP 2: TWEET INGESTION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Trigger: Manual or Automatic (every 6 hours)                        │
│                                                                       │
│  ┌──────────────────────────────────────────────┐                   │
│  │ Manual: GET /api/admin/ingest-tweets         │                   │
│  │ Auto: BullMQ worker (tweetIngest.processor)  │                   │
│  └──────────────────────────────────────────────┘                   │
│                   ↓                                                   │
│  ┌──────────────────────────────────────────────┐                   │
│  │ Multi-Method X API Client (x-api-multi.ts)   │                   │
│  │                                               │                   │
│  │ Priority:                                     │                   │
│  │  1. GAME API Proxy (localhost:8001) ✅        │                   │
│  │  2. Direct GAME API (if key provided)        │                   │
│  │  3. Standard X API Bearer Token              │                   │
│  │  4. Mock tweets (fallback)                   │                   │
│  └──────────────────────────────────────────────┘                   │
│                   ↓                                                   │
│  🐍 Python Proxy Server (port 8001)                                  │
│     - Uses virtuals_tweepy library                                   │
│     - GAME_API_KEY: apx-090643fe359939fd...                          │
│     - GET /tweets/{username}?max_results=50                          │
│                   ↓                                                   │
│  📡 Fetches tweets from X (Twitter) API                              │
│     - Gets last 50 tweets from @Abhishe42402615                      │
│     - Only new tweets (sinceId tracking)                             │
│     - Full tweet content + metadata                                  │
│                   ↓                                                   │
│  💾 Creates ct_posts records:                                        │
│     {                                                                 │
│       ctAccountId: "uuid",                                            │
│       tweetId: "1909423901983047876",                                │
│       tweetText: "$BTC breaking out! Target $50k...",                │
│       tweetCreatedAt: "2025-01-04T...",                               │
│       isSignalCandidate: false,  ← Will be updated                   │
│       extractedTokens: []  ← Will be populated                       │
│     }                                                                 │
│                   ↓                                                   │
│  🔔 Enqueues classify job for each tweet                             │
│     classifyQueue.add({ ctPostId })                                  │
│                   ↓                                                   │
│  ✅ Tweet ingestion complete!                                         │
│                                                                       │
│  Database Tables:                                                    │
│    - ct_posts (new tweet records)                                    │
│    - ct_accounts (lastSeenAt updated)                                │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  STEP 3: LLM CLASSIFICATION                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Trigger: Automatic (from classify queue)                            │
│                                                                       │
│  ┌──────────────────────────────────────────────┐                   │
│  │ BullMQ Worker: classify.processor.ts         │                   │
│  └──────────────────────────────────────────────┘                   │
│                   ↓                                                   │
│  📖 Loads ct_post from database                                      │
│     tweetText: "$BTC breaking out! Target $50k..."                   │
│                   ↓                                                   │
│  ┌──────────────────────────────────────────────┐                   │
│  │ LLM Classifier (llm-classifier.ts)            │                   │
│  │                                               │                   │
│  │ Provider Priority:                            │                   │
│  │  1. Perplexity AI (sonar model) ✅            │                   │
│  │  2. OpenAI (gpt-4o-mini)                     │                   │
│  │  3. Anthropic (claude-3-haiku)               │                   │
│  │  4. Regex fallback (no API key needed)       │                   │
│  └──────────────────────────────────────────────┘                   │
│                   ↓                                                   │
│  🤖 Perplexity AI analyzes tweet:                                    │
│                                                                       │
│     Prompt: "You are an expert crypto trading signal analyst..."     │
│                                                                       │
│     Input: "$BTC breaking out! Target $50k. Very bullish setup!"     │
│                   ↓                                                   │
│     Output: {                                                         │
│       isSignalCandidate: true,                                        │
│       extractedTokens: ["BTC"],                                       │
│       sentiment: "bullish",                                           │
│       confidence: 0.90,                                               │
│       reasoning: "Clear breakout signal with price target..."         │
│     }                                                                 │
│                   ↓                                                   │
│  💾 Updates ct_post:                                                 │
│     - isSignalCandidate = true                                       │
│     - extractedTokens = ["BTC"]                                      │
│                   ↓                                                   │
│  ✅ If signal candidate:                                              │
│     signalCreateQueue.add({                                          │
│       ctPostId,                                                       │
│       sentiment: "bullish",                                           │
│       confidence: 0.90                                                │
│     })                                                                │
│                   ↓                                                   │
│  ❌ If NOT signal candidate: Skip                                     │
│                                                                       │
│  Database Tables:                                                    │
│    - ct_posts (isSignalCandidate, extractedTokens updated)           │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   STEP 4: SIGNAL CREATION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Trigger: Automatic (from signalCreate queue)                        │
│                                                                       │
│  ┌──────────────────────────────────────────────┐                   │
│  │ BullMQ Worker: signalCreate.processor.ts     │                   │
│  └──────────────────────────────────────────────┘                   │
│                   ↓                                                   │
│  📖 Loads ct_post and finds linked agents:                           │
│     - Get ct_post by ID                                              │
│     - Get ctAccountId from ct_post                                   │
│     - Find agents via agent_accounts junction table                  │
│                   ↓                                                   │
│  🎯 For each agent using this CT account:                            │
│                   ↓                                                   │
│  📊 Fetch market indicators:                                         │
│     - market_indicators_6h table                                     │
│     - Token: BTC                                                     │
│     - Latest 6-hour window                                           │
│                   ↓                                                   │
│  ⚖️ Calculate final signal:                                          │
│     - Agent's strategy weights (8 indicators)                        │
│     - Market indicators (RSI, MACD, volume, etc.)                    │
│     - CT sentiment & confidence from LLM                             │
│     - Weighted score calculation                                     │
│                   ↓                                                   │
│  💾 Creates signal record:                                           │
│     {                                                                 │
│       agentId: "uuid",                                                │
│       tokenSymbol: "BTC",                                             │
│       venue: "SPOT",                                                  │
│       side: "BUY",                                                    │
│       sizeModel: { type: "FIXED", amount: 100 },                     │
│       riskModel: { stopLoss: 0.05, takeProfit: 0.15 },               │
│       sourceTweets: ["1909423901983047876"],                         │
│       createdAt: now                                                  │
│     }                                                                 │
│                   ↓                                                   │
│  🔔 Enqueues trade execution job                                     │
│     executeTrade.add({ signalId })                                   │
│                   ↓                                                   │
│  ✅ Signal created!                                                   │
│                                                                       │
│  Database Tables:                                                    │
│    - signals (new signal record)                                     │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   STEP 5: TRADE EXECUTION                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Trigger: Automatic (from executeTrade queue)                        │
│                                                                       │
│  ┌──────────────────────────────────────────────┐                   │
│  │ BullMQ Worker: executeTrade.processor.ts     │                   │
│  └──────────────────────────────────────────────┘                   │
│                   ↓                                                   │
│  📖 Loads signal + agent + deployment info                           │
│                   ↓                                                   │
│  🏦 Checks agent deployment:                                         │
│     - Is agent deployed (ACTIVE)?                                    │
│     - Has Safe wallet address?                                       │
│     - Has sufficient balance?                                        │
│                   ↓                                                   │
│  🔐 Risk checks:                                                      │
│     - Position size limits                                           │
│     - Max drawdown                                                   │
│     - Daily trade limits                                             │
│                   ↓                                                   │
│  📡 Executes trade via venue adapter:                                │
│     - SPOT → spot.adapter.ts                                         │
│     - GMX → gmx.adapter.ts                                           │
│     - HYPERLIQUID → hyperliquid.adapter.ts                           │
│                   ↓                                                   │
│  💾 Creates position record:                                         │
│     {                                                                 │
│       signalId: "uuid",                                               │
│       agentId: "uuid",                                                │
│       tokenSymbol: "BTC",                                             │
│       venue: "SPOT",                                                  │
│       side: "BUY",                                                    │
│       status: "OPEN",                                                 │
│       entryPrice: 45000,                                              │
│       size: 0.01,                                                     │
│       stopLoss: 42750,                                                │
│       takeProfit: 51750,                                              │
│       openedAt: now                                                   │
│     }                                                                 │
│                   ↓                                                   │
│  🔔 Enqueues risk monitoring job                                     │
│     riskExit.add({ positionId })                                     │
│                   ↓                                                   │
│  ✅ Trade executed!                                                   │
│                                                                       │
│  Database Tables:                                                    │
│    - positions (new position record)                                 │
│    - signals (status updated)                                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  STEP 6: POSITION MONITORING                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Continuous monitoring until position closed                         │
│                                                                       │
│  🔄 Every 1 minute:                                                   │
│     - Check current price                                            │
│     - Compare vs stop loss / take profit                             │
│     - Check time-based exit rules                                    │
│     - Monitor risk limits                                            │
│                   ↓                                                   │
│  🚨 If exit condition met:                                           │
│     - Execute closing trade                                          │
│     - Update position (status=CLOSED)                                │
│     - Calculate P&L                                                  │
│     - Update agent metrics                                           │
│                   ↓                                                   │
│  ✅ Position closed!                                                  │
│                                                                       │
│  Database Tables:                                                    │
│    - positions (status, exitPrice, pnl updated)                      │
│    - agents (performance metrics updated)                            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Data Flow Summary

### 1. Input: User Action
- User creates agent
- Selects CT accounts (@Abhishe42402615)
- Agent links to CT accounts

### 2. Automated Pipeline
```
CT Account → Tweet Ingestion (GAME API) → ct_posts table
     ↓
ct_posts → LLM Classification (Perplexity) → Updated ct_posts
     ↓
Signal Candidates → Signal Creation → signals table
     ↓
signals → Trade Execution → positions table
     ↓
positions → Risk Monitoring → Closed positions
```

### 3. Output: Trading Results
- Positions opened/closed
- P&L calculated
- Agent performance tracked

---

## 📊 Key Database Tables

| Table | Purpose | Links |
|-------|---------|-------|
| `agents` | Trading agent configuration | → agent_accounts → ct_accounts |
| `ct_accounts` | Twitter accounts to monitor | ← agent_accounts |
| `agent_accounts` | Junction: agent ↔ ct_accounts | Both |
| `ct_posts` | Ingested tweets | → ct_accounts |
| `signals` | Generated trading signals | → agents, references ct_posts |
| `positions` | Active/closed trades | → signals → agents |
| `market_indicators_6h` | Market data for signals | Used by signal creation |

---

## 🚀 System Status

### ✅ Fully Operational
1. **Agent Creation Flow** - 6-step wizard with CT selection
2. **CT Account Management** - Add, search, select accounts
3. **GAME API Integration** - Python proxy fetching real tweets
4. **Tweet Ingestion** - Automatic/manual via X API
5. **LLM Classification** - Perplexity AI analyzing tweets (90% confidence!)
6. **Signal Creation** - Existing worker processes
7. **Trade Execution** - Existing venue adapters

### 🔧 Configuration Required
- **GAME API Proxy**: Running on port 8001 ✅
- **Perplexity API**: Configured and working ✅
- **Redis**: Required for background workers (queues)
- **Agent Deployment**: Users need to deploy agents with Safe wallets

---

## 🧪 Testing the Complete Flow

### End-to-End Test
```bash
# 1. Check proxy is running
curl http://localhost:8001/health

# 2. Ingest tweets
curl http://localhost:5000/api/admin/ingest-tweets

# 3. Test classification
curl -X POST http://localhost:5000/api/admin/classify-tweet \
  -H "Content-Type: application/json" \
  -d '{"tweetText": "$BTC breaking out! Target $50k 🚀"}'

# 4. Check database
curl http://localhost:5000/api/db/ct_posts?limit=5

# 5. View signals (when created)
curl http://localhost:5000/api/db/signals?limit=5
```

---

## 📝 Next Steps for Production

1. **Deploy Python Proxy** to a cloud service (Railway, Render, Fly.io)
2. **Start Redis Workers** for automated processing
3. **Configure Rate Limiting** for GAME API calls
4. **Set up Monitoring** for tweet ingestion & classification
5. **Add Webhooks** for real-time tweet notifications (optional)

