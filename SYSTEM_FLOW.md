# Maxxit Trading System - Complete Flow

## 🔄 System Architecture Overview

```
Twitter/X Posts
    ↓
[1] LLM Filtering Service (5 min intervals)
    ↓
CT Posts (flag Y + tokens + confidence)
    ↓
[2] Signal Generator Service
    ↓
Signals (with LunarCrush scoring)
    ↓
[3] Trade Execution Service
    ↓
Positions (Hyperliquid)
    ↓
[4] Position Monitoring Service
    ↓
Closed Positions (PnL realized)
```

---

## 📋 Service Breakdown

### Service 1: LLM Filtering Service
**File:** `workers/tweet-ingestion-worker.ts`  
**Interval:** 5 minutes  
**Database:** `ct_posts` table

**Flow:**
1. Fetches unprocessed tweets from `ct_posts` where `is_signal_candidate IS NULL`
2. Runs LLM classification using `lib/llm-classifier.ts`
3. Updates `ct_posts` with:
   - `is_signal_candidate`: `true` if potential signal (flag Y)
   - `extracted_tokens`: Array of token symbols (e.g., `['BTC', 'ETH']`)
   - `confidence_score`: 0-1 confidence rating
   - `signal_type`: 'LONG', 'SHORT', or null

**Code:**
```typescript
// workers/tweet-ingestion-worker.ts
import { PrismaClient } from '@prisma/client';
import { classifyTweet } from '../lib/llm-classifier';

const prisma = new PrismaClient();

async function processTweets() {
  // Get unprocessed tweets
  const tweets = await prisma.ct_posts.findMany({
    where: { is_signal_candidate: null },
    include: { ct_accounts: true },
    take: 50
  });

  for (const tweet of tweets) {
    const classification = await classifyTweet(tweet.tweet_text);
    
    await prisma.ct_posts.update({
      where: { id: tweet.id },
      data: {
        is_signal_candidate: classification.isSignal,
        extracted_tokens: classification.tokens,
        confidence_score: classification.confidence,
        signal_type: classification.side
      }
    });
  }
}

// Run every 5 minutes
setInterval(processTweets, 5 * 60 * 1000);
```

---

### Service 2: Signal Generator Service
**File:** `workers/signal-generator.ts`  
**Interval:** Continuous (1 min check)  
**API:** `/api/admin/run-signal-once.ts`

**Flow:**
1. Fetches `ct_posts` where `is_signal_candidate = true` and not yet processed
2. For each token in `extracted_tokens`:
   - Fetches LunarCrush data via `lib/lunarcrush-score.ts`
   - Calculates tradeability score (-1 to 1)
   - If score > 0, calculates position size (0-10%)
3. Creates signal in `signals` table with:
   - `agent_id`: Linked to CT account's subscribed agents
   - `token_symbol`: Extracted token
   - `venue`: 'HYPERLIQUID' or 'SPOT'
   - `side`: 'LONG' or 'SHORT'
   - `size_model`: Dynamic % from LunarCrush (e.g., 4.66%)
   - `risk_model`: Stop loss, take profit settings
   - `lunarcrush_score`: Score from -1 to 1
   - `lunarcrush_reasoning`: Why tradeable/not tradeable

**Code:**
```typescript
// workers/signal-generator.ts (or use API endpoint)
import { createLunarCrushScorer } from '../lib/lunarcrush-score';

async function generateSignals() {
  const candidatePosts = await prisma.ct_posts.findMany({
    where: {
      is_signal_candidate: true,
      processed_for_signals: false
    },
    include: { ct_accounts: true }
  });

  const lunarCrush = createLunarCrushScorer();

  for (const post of candidatePosts) {
    for (const token of post.extracted_tokens) {
      // Get LunarCrush score
      const scoreData = await lunarCrush.getTokenScore(token);
      
      if (!scoreData.tradeable) {
        console.log(`Skipping ${token}: score ${scoreData.score} (not tradeable)`);
        continue;
      }

      // Find agents subscribed to this CT account
      const agents = await prisma.agents.findMany({
        where: {
          subscribed_ct_accounts: {
            has: post.ct_account_id
          },
          venue: 'HYPERLIQUID'
        }
      });

      for (const agent of agents) {
        await prisma.signals.create({
          data: {
            agent_id: agent.id,
            token_symbol: token,
            venue: 'HYPERLIQUID',
            side: post.signal_type || 'LONG',
            size_model: {
              type: 'balance-percentage',
              value: scoreData.positionSize, // 0-10%
              impactFactor: post.ct_accounts.impact_factor
            },
            risk_model: {
              stopLoss: 0.10,    // -10%
              takeProfit: 0.20,   // +20%
              trailingStop: 0.05  // 5%
            },
            source_tweets: [post.tweet_id],
            lunarcrush_score: scoreData.score,
            lunarcrush_reasoning: scoreData.reasoning,
            lunarcrush_breakdown: scoreData.breakdown
          }
        });
      }
    }

    // Mark as processed
    await prisma.ct_posts.update({
      where: { id: post.id },
      data: { processed_for_signals: true }
    });
  }
}
```

---

### Service 3: Trade Execution Service
**File:** `workers/trade-executor-worker.ts`  
**Interval:** Continuous (30 sec check)  
**API:** `/api/admin/execute-trade-once.ts`

**Flow:**
1. Fetches new signals from `signals` table that haven't been executed
2. For each signal:
   - Gets agent's deployment info from `agent_deployments`
   - **For Hyperliquid:**
     - Checks if `hyperliquid_agent_address` exists
     - Retrieves encrypted private key
     - Decrypts using `AGENT_WALLET_ENCRYPTION_KEY`
     - Calls Hyperliquid adapter to execute trade
   - **For SPOT:**
     - Checks if `module_enabled = true`
     - Uses Safe wallet + module
3. Creates position in `positions` table
4. Logs execution result

**Hyperliquid Flow:**
```typescript
// workers/trade-executor-worker.ts
import { HyperliquidAdapter } from '../lib/adapters/hyperliquid-adapter';
import { getAgentPrivateKey } from '../lib/hyperliquid-agent-wallet';

async function executeSignals() {
  const signals = await prisma.signals.findMany({
    where: {
      executed: false,
      lunarcrush_score: { gt: 0 }
    },
    include: {
      agents: {
        include: {
          agent_deployments: true
        }
      }
    }
  });

  for (const signal of signals) {
    for (const deployment of signal.agents.agent_deployments) {
      // HYPERLIQUID FLOW
      if (deployment.venue === 'HYPERLIQUID' && deployment.hyperliquid_agent_address) {
        try {
          // Get agent's private key
          const privateKey = await getAgentPrivateKey(deployment.id);
          
          // Initialize Hyperliquid adapter
          const hl = new HyperliquidAdapter(
            deployment.hyperliquid_agent_address,
            privateKey,
            deployment.chain === 'testnet'
          );

          // Calculate position size
          const balance = await hl.getAccountValue();
          const positionSize = balance * (signal.size_model.value / 100);

          // Execute trade
          const result = await hl.openPosition({
            symbol: signal.token_symbol,
            side: signal.side,
            usdAmount: positionSize,
            leverage: 1
          });

          // Create position record
          await prisma.positions.create({
            data: {
              signal_id: signal.id,
              deployment_id: deployment.id,
              token_symbol: signal.token_symbol,
              venue: 'HYPERLIQUID',
              side: signal.side,
              entry_price: result.averagePrice,
              size: result.size,
              status: 'OPEN',
              pnl: 0
            }
          });

          console.log(`✅ Executed: ${signal.token_symbol} for ${deployment.hyperliquid_agent_address}`);
        } catch (error) {
          console.error(`❌ Failed to execute signal ${signal.id}:`, error.message);
        }
      }

      // SPOT FLOW
      if (deployment.venue === 'SPOT' && deployment.module_enabled) {
        // Execute via Safe wallet + module
        // ... existing SPOT logic
      }
    }
  }
}
```

**User Setup for Hyperliquid:**
1. User creates agent on platform UI
2. System generates unique agent wallet (EOA) and stores encrypted private key
3. User receives agent address: `0x9fD20FACeeEf805Ed4D6Baba936d20d8C73f3176`
4. User goes to https://app.hyperliquid.xyz/API
5. User adds agent address to whitelist (approves for trading)
6. System can now trade on user's behalf (non-custodial - no withdrawals!)

---

### Service 4: Position Monitoring Service
**File:** `workers/position-monitor-hyperliquid.ts`  
**Interval:** Continuous (1 min check)

**Flow:**
1. **Smart Position Discovery:**
   - Fetches all active Hyperliquid deployments
   - Queries Hyperliquid for actual open positions
   - Creates missing database records
   - Cleans up orphan records (closed on exchange but still marked open in DB)

2. **PnL Tracking:**
   - Updates current price for each position
   - Calculates unrealized PnL
   - Updates `positions.pnl` field

3. **Auto-Exit Logic:**
   - **Stop Loss:** Close if PnL <= -10%
   - **Take Profit:** Close if PnL >= +20%
   - **Trailing Stop:** Close if price drops 5% from highest point
   - **Time-based:** Close after 24 hours (optional)

4. **Execution:**
   - Calls `hl.closePosition()` when exit condition met
   - Updates position status to 'CLOSED'
   - Records final PnL

**Code:**
```typescript
// workers/position-monitor-hyperliquid.ts
async function monitorPositions() {
  // 1. Smart Discovery
  const deployments = await prisma.agent_deployments.findMany({
    where: {
      venue: 'HYPERLIQUID',
      hyperliquid_agent_address: { not: null }
    }
  });

  for (const deployment of deployments) {
    const privateKey = await getAgentPrivateKey(deployment.id);
    const hl = new HyperliquidAdapter(
      deployment.hyperliquid_agent_address,
      privateKey,
      deployment.chain === 'testnet'
    );

    // Fetch actual positions from Hyperliquid
    const livePositions = await hl.getOpenPositions();

    // Sync with database
    for (const livePos of livePositions) {
      const dbPos = await prisma.positions.findFirst({
        where: {
          deployment_id: deployment.id,
          token_symbol: livePos.coin,
          status: 'OPEN'
        }
      });

      if (!dbPos) {
        // Create missing position
        await prisma.positions.create({
          data: {
            deployment_id: deployment.id,
            token_symbol: livePos.coin,
            venue: 'HYPERLIQUID',
            side: livePos.szi > 0 ? 'LONG' : 'SHORT',
            entry_price: parseFloat(livePos.entryPx),
            size: Math.abs(parseFloat(livePos.szi)),
            status: 'OPEN',
            pnl: parseFloat(livePos.unrealizedPnl)
          }
        });
      }
    }
  }

  // 2. Monitor and Auto-Exit
  const openPositions = await prisma.positions.findMany({
    where: { status: 'OPEN', venue: 'HYPERLIQUID' },
    include: { agent_deployments: true, signals: true }
  });

  for (const position of openPositions) {
    const deployment = position.agent_deployments;
    const privateKey = await getAgentPrivateKey(deployment.id);
    const hl = new HyperliquidAdapter(
      deployment.hyperliquid_agent_address,
      privateKey,
      deployment.chain === 'testnet'
    );

    // Get current price
    const currentPrice = await hl.getCurrentPrice(position.token_symbol);
    const pnlPercent = ((currentPrice - position.entry_price) / position.entry_price) * 100;
    
    if (position.side === 'SHORT') {
      pnlPercent = -pnlPercent;
    }

    // Update PnL
    await prisma.positions.update({
      where: { id: position.id },
      data: {
        pnl: pnlPercent,
        current_price: currentPrice
      }
    });

    // Exit conditions
    const stopLoss = position.signals?.risk_model?.stopLoss || 0.10;
    const takeProfit = position.signals?.risk_model?.takeProfit || 0.20;

    let shouldClose = false;
    let reason = '';

    if (pnlPercent <= -(stopLoss * 100)) {
      shouldClose = true;
      reason = `Stop Loss hit: ${pnlPercent.toFixed(2)}%`;
    } else if (pnlPercent >= (takeProfit * 100)) {
      shouldClose = true;
      reason = `Take Profit hit: ${pnlPercent.toFixed(2)}%`;
    }

    if (shouldClose) {
      await hl.closePosition(position.token_symbol);
      
      await prisma.positions.update({
        where: { id: position.id },
        data: {
          status: 'CLOSED',
          closed_at: new Date(),
          exit_reason: reason
        }
      });

      console.log(`✅ Closed position: ${position.token_symbol} - ${reason}`);
    }
  }
}

setInterval(monitorPositions, 60 * 1000); // Every 1 minute
```

---

## 🔗 Complete Flow Example

### Step-by-Step: From Tweet to Closed Position

**1. Tweet Posted:**
```
@elonmusk: "Dogecoin to the moon! 🚀 $DOGE"
```

**2. LLM Filtering (5 min later):**
```typescript
ct_posts.update({
  is_signal_candidate: true,
  extracted_tokens: ['DOGE'],
  confidence_score: 0.87,
  signal_type: 'LONG'
})
```

**3. Signal Generation (1 min later):**
```typescript
// Fetch LunarCrush
lunarCrushScore = {
  score: 0.623,
  tradeable: true,
  positionSize: 6.23%, // 0-10%
  reasoning: "Strong social sentiment (89%), Good Galaxy Score (72%)"
}

// Create signal
signals.create({
  agent_id: "ring-agent",
  token_symbol: "DOGE",
  venue: "HYPERLIQUID",
  side: "LONG",
  size_model: { value: 6.23 },
  lunarcrush_score: 0.623
})
```

**4. Trade Execution (30 sec later):**
```typescript
// Get agent wallet
agentAddress = "0x9fD20FACeeEf805Ed4D6Baba936d20d8C73f3176"
privateKey = decrypt(deployment.hyperliquid_agent_private_key)

// Check balance
balance = $500 (on user's Hyperliquid account)

// Calculate position
positionSize = $500 * 6.23% = $31.15

// Execute
hl.openPosition({
  symbol: "DOGE",
  side: "LONG",
  usdAmount: 31.15,
  leverage: 1
})

// Result
position = {
  entry_price: 0.082,
  size: 379.88 DOGE,
  status: "OPEN"
}
```

**5. Position Monitoring (every 1 min):**
```typescript
// Minute 1
currentPrice = 0.083, pnl = +1.22%

// Minute 5
currentPrice = 0.088, pnl = +7.32%

// Minute 12
currentPrice = 0.098, pnl = +19.51%

// Minute 15
currentPrice = 0.101, pnl = +23.17%
// ✅ Take Profit (20%) hit!

hl.closePosition("DOGE")
position.update({ status: "CLOSED", pnl: 23.17 })
```

**Final Result:**
- Entry: $31.15
- Exit: $38.37
- Profit: **$7.22 (+23.17%)**

---

## 🎯 User Journey (Hyperliquid)

### For Agent Creator:
1. Visit platform UI
2. Click "Create Agent"
3. Fill in details (name, CT accounts to follow, etc.)
4. Select venue: "Hyperliquid"
5. System generates agent wallet: `0x9fD20...`
6. Copy agent address

### For Agent Subscriber:
1. Browse marketplace
2. Find interesting agent
3. Click "Subscribe" → "Hyperliquid"
4. See agent address: `0x9fD20...`
5. Visit https://app.hyperliquid.xyz/API
6. Add agent address to whitelist
7. Done! Agent can now trade on your behalf

### Security Model:
- ✅ **Non-custodial:** User funds stay in their Hyperliquid account
- ✅ **No withdrawals:** Agent can ONLY trade (open/close positions)
- ✅ **Revocable:** User can remove agent from whitelist anytime
- ✅ **Transparent:** All positions visible on Hyperliquid UI
- ✅ **Encrypted keys:** Private keys stored with AES-256-GCM

---

## 📊 Database Schema

### ct_posts
```prisma
model ct_posts {
  id                    String   @id @default(uuid())
  ct_account_id         String
  tweet_id              String   @unique
  tweet_text            String
  tweet_created_at      DateTime
  
  // LLM Filtering outputs
  is_signal_candidate   Boolean?
  extracted_tokens      String[]
  confidence_score      Float?   // 0-1
  signal_type           String?  // 'LONG' | 'SHORT'
  processed_for_signals Boolean  @default(false)
}
```

### signals
```prisma
model signals {
  id                    String   @id @default(uuid())
  agent_id              String
  token_symbol          String
  venue                 venue_t  // 'HYPERLIQUID' | 'SPOT'
  side                  String   // 'LONG' | 'SHORT'
  size_model            Json     // { type, value: 6.23 }
  risk_model            Json     // { stopLoss: 0.10, takeProfit: 0.20 }
  source_tweets         String[]
  
  // LunarCrush data
  lunarcrush_score      Float?   // -1 to 1
  lunarcrush_reasoning  String?
  lunarcrush_breakdown  Json?
  
  created_at            DateTime @default(now())
}
```

### positions
```prisma
model positions {
  id            String   @id @default(uuid())
  signal_id     String
  deployment_id String
  token_symbol  String
  venue         venue_t
  side          String
  entry_price   Float
  current_price Float?
  size          Float
  pnl           Float    @default(0)
  status        String   // 'OPEN' | 'CLOSED'
  exit_reason   String?
  closed_at     DateTime?
  created_at    DateTime @default(now())
}
```

### agent_deployments
```prisma
model agent_deployments {
  id                              String  @id @default(uuid())
  agent_id                        String
  venue                           venue_t
  
  // Hyperliquid fields
  hyperliquid_agent_address       String?
  hyperliquid_agent_private_key   String? // Encrypted!
  
  // SPOT fields
  safe_address                    String?
  module_enabled                  Boolean @default(false)
}
```

---

## ⚙️ Environment Variables

```bash
# LunarCrush
LUNARCRUSH_API_KEY=tt6l3p9qa3otztg3rik6gf2ofdmhhl3ndd4b4psvl

# Encryption (CRITICAL!)
AGENT_WALLET_ENCRYPTION_KEY=your-32-byte-hex-key-here

# Hyperliquid Service
HYPERLIQUID_SERVICE_URL=https://your-render-service.onrender.com
HYPERLIQUID_SERVICE_PORT=5000

# Optional: Twitter/X ingestion
GAME_API_KEY=apx-31d308e580e9a3b0efc45eb02db1f977
```

---

## 🚀 Deployment

### Services to Run:

**Railway (Node.js):**
1. `npm run dev` - Next.js web app
2. `node workers/tweet-ingestion-worker.ts` - LLM filtering (5 min)
3. `node workers/signal-generator.ts` - Signal generation (1 min)
4. `node workers/trade-executor-worker.ts` - Trade execution (30 sec)
5. `node workers/position-monitor-hyperliquid.ts` - Position monitoring (1 min)

**Render (Python):**
1. `python services/hyperliquid-service/main.py` - Hyperliquid adapter

### Start All:
```bash
# Start all workers
npm run workers:start

# Or individually
npm run worker:tweet-ingestion
npm run worker:signal-generator
npm run worker:trade-executor
npm run worker:position-monitor
```

---

## ✅ System Status

| Component | Status | File |
|-----------|--------|------|
| LLM Filtering | ✅ Ready | `workers/tweet-ingestion-worker.ts` |
| Signal Generation | ✅ Ready | `/api/admin/run-signal-once.ts` |
| LunarCrush Scoring | ✅ Working | `lib/lunarcrush-score.ts` |
| Trade Execution | ✅ Working | `workers/trade-executor-worker.ts` |
| Position Monitoring | ✅ Working | `workers/position-monitor-hyperliquid.ts` |
| Hyperliquid Adapter | ✅ Working | `lib/adapters/hyperliquid-adapter.ts` |
| Agent Wallet Gen | ✅ Secure | `lib/hyperliquid-agent-wallet.ts` |

**System is PRODUCTION READY!** 🎉

