# Ostium Complete Flow Testing Guide

**For:** Junior Developer Testing  
**Purpose:** End-to-end verification of Ostium trading pipeline  
**Estimated Time:** 30-45 minutes

---

## 📋 **Overview**

This guide covers testing the complete automated trading flow for Ostium agents:

```
Tweet → Classification → Signal → Trade Execution → Position Monitoring → APR Update
```

---

## 🎯 **Prerequisites**

### 1. Services Running
```bash
# Check if all services are running
lsof -i :3000  # Next.js (should be running)
lsof -i :5002  # Ostium Python service (should be running)

# If not running, start them:
# Terminal 1: Next.js
cd /Users/abhishekdubey/Downloads/Maxxit
npm run dev

# Terminal 2: Ostium Service
cd /Users/abhishekdubey/Downloads/Maxxit/services
source venv/bin/activate
python ostium-service.py
```

### 2. Database Connection
```bash
# Test database connectivity
cd /Users/abhishekdubey/Downloads/Maxxit
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`.then(() => console.log('✅ DB Connected')).catch(e => console.error('❌ DB Error:', e));
"
```

### 3. Verify Active Ostium Agents
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.agents.findMany({
  where: { venue: 'OSTIUM', status: 'ACTIVE' },
  select: { id: true, name: true, status: true }
}).then(agents => {
  console.log('Active Ostium Agents:', agents.length);
  agents.forEach(a => console.log(\`  - \${a.name} (\${a.id.substring(0,8)}...)\`));
  prisma.\$disconnect();
});
"
```

**Expected Output:**
```
Active Ostium Agents: 2
  - Zim (0c4f01b7...)
  - Rise (ea4d0329...)
```

---

## 🧪 **Step-by-Step Testing Flow**

---

## **STEP 1: Tweet Ingestion**

### 1.1 Create Test Tweet
```bash
cd /Users/abhishekdubey/Downloads/Maxxit

npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function ingestTestTweet() {
  const TWEET_ID = 'TEST_' + Date.now();
  
  // Get an active CT account
  const ctAccount = await prisma.ct_accounts.findFirst({
    where: { is_active: true },
  });
  
  if (!ctAccount) {
    console.error('❌ No active CT account found');
    process.exit(1);
  }
  
  const tweetText = '\$BTC is showing massive momentum! Going LONG with 3x leverage. Entry at current levels, targeting 20% gains. Strong fundamentals and growing adoption. LFG! 🚀';
  
  const tweet = await prisma.ct_posts.create({
    data: {
      tweet_id: TWEET_ID,
      ct_account_id: ctAccount.id,
      tweet_text: tweetText,
      full_text: tweetText,
      tweet_created_at: new Date(),
      engagement_score: 100,
      is_signal_candidate: null,
      confidence: null,
    },
  });
  
  console.log('✅ Tweet Created:');
  console.log('   Tweet ID:', tweet.tweet_id);
  console.log('   Account:', ctAccount.account_name);
  console.log('   Text:', tweet.tweet_text.substring(0, 80) + '...');
  console.log('');
  console.log('📝 Save this Tweet ID for next steps:', tweet.tweet_id);
  
  await prisma.\$disconnect();
}

ingestTestTweet();
"
```

**Expected Output:**
```
✅ Tweet Created:
   Tweet ID: TEST_1731234567890
   Account: CryptoTrader
   Text: $BTC is showing massive momentum! Going LONG with 3x leverage...

📝 Save this Tweet ID for next steps: TEST_1731234567890
```

### 1.2 Verify Tweet in Database
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID

prisma.ct_posts.findUnique({
  where: { tweet_id: TWEET_ID },
  select: {
    tweet_id: true,
    is_signal_candidate: true,
    confidence: true,
    tweet_text: true,
  }
}).then(tweet => {
  console.log('Tweet Status:', tweet);
  console.log('');
  if (tweet?.is_signal_candidate === null) {
    console.log('✅ Tweet is pending classification');
  } else {
    console.log('⚠️  Tweet already classified');
  }
  prisma.\$disconnect();
});
"
```

---

## **STEP 2: Tweet Classification (LLM)**

### 2.1 Classify the Tweet
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { LLMTweetClassifier } from './lib/llm-classifier';

const prisma = new PrismaClient();
const classifier = new LLMTweetClassifier({
  provider: 'perplexity',
  apiKey: process.env.PERPLEXITY_API_KEY || '',
  model: 'sonar',
});

const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID

async function classifyTweet() {
  const tweet = await prisma.ct_posts.findUnique({
    where: { tweet_id: TWEET_ID },
  });
  
  if (!tweet) {
    console.error('❌ Tweet not found');
    process.exit(1);
  }
  
  console.log('🤖 Classifying tweet with LLM...');
  const result = await classifier.classifyTweet(tweet.tweet_text);
  
  await prisma.ct_posts.update({
    where: { tweet_id: TWEET_ID },
    data: {
      is_signal_candidate: result.isSignal,
      confidence: result.confidence,
    },
  });
  
  console.log('✅ Classification Complete:');
  console.log('   Is Signal:', result.isSignal ? 'YES' : 'NO');
  console.log('   Confidence:', result.confidence);
  console.log('   Reasoning:', result.reasoning);
  
  await prisma.\$disconnect();
}

classifyTweet();
"
```

**Expected Output:**
```
🤖 Classifying tweet with LLM...
✅ Classification Complete:
   Is Signal: YES
   Confidence: HIGH
   Reasoning: Clear trading intent with token, direction, and leverage
```

---

## **STEP 3: Signal Generation**

### 3.1 Generate Trading Signal
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { SignalGenerator } from './lib/signal-generator';

const prisma = new PrismaClient();
const generator = new SignalGenerator({
  provider: 'perplexity',
  apiKey: process.env.PERPLEXITY_API_KEY || '',
});

const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID

async function generateSignal() {
  const tweet = await prisma.ct_posts.findUnique({
    where: { tweet_id: TWEET_ID },
    include: { ct_accounts: true },
  });
  
  if (!tweet || !tweet.is_signal_candidate) {
    console.error('❌ Tweet not classified as signal');
    process.exit(1);
  }
  
  // Get active Ostium agents
  const agents = await prisma.agents.findMany({
    where: { venue: 'OSTIUM', status: 'ACTIVE' },
  });
  
  console.log(\`🎯 Generating signals for \${agents.length} Ostium agents...\`);
  
  for (const agent of agents) {
    const signal = await generator.generateSignal({
      tweetText: tweet.tweet_text,
      tweetAuthor: tweet.ct_accounts?.account_name || 'Unknown',
      venue: 'OSTIUM',
      agentId: agent.id,
    });
    
    if (signal.isValid) {
      const created = await prisma.signals.create({
        data: {
          agent_id: agent.id,
          venue: 'OSTIUM',
          token_symbol: signal.token,
          side: signal.side,
          size_model: signal.sizeModel,
          risk_model: signal.riskModel,
          source_tweets: [TWEET_ID],
        },
      });
      
      console.log(\`✅ Signal created for \${agent.name}:\`);
      console.log(\`   Token: \${signal.token}\`);
      console.log(\`   Side: \${signal.side}\`);
      console.log(\`   Leverage: \${signal.sizeModel.leverage}x\`);
      console.log(\`   Signal ID: \${created.id.substring(0, 8)}...\`);
    }
  }
  
  await prisma.\$disconnect();
}

generateSignal();
"
```

**Expected Output:**
```
🎯 Generating signals for 2 Ostium agents...
✅ Signal created for Zim:
   Token: BTC
   Side: LONG
   Leverage: 3x
   Signal ID: 7a8b9c0d...
✅ Signal created for Rise:
   Token: BTC
   Side: LONG
   Leverage: 3x
   Signal ID: 8b9c0d1e...
```

### 3.2 Verify Signals in Database
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID

prisma.signals.findMany({
  where: {
    source_tweets: { has: TWEET_ID },
  },
  include: {
    agents: { select: { name: true, venue: true } },
  },
}).then(signals => {
  console.log(\`📊 Signals Generated: \${signals.length}\`);
  signals.forEach(s => {
    console.log(\`\\n\${s.agents.name} (\${s.agents.venue}):\`);
    console.log(\`  Token: \${s.token_symbol}\`);
    console.log(\`  Side: \${s.side}\`);
    console.log(\`  Leverage: \${s.size_model.leverage}x\`);
    console.log(\`  Skipped: \${s.skipped_reason || 'No'}\`);
  });
  prisma.\$disconnect();
});
"
```

---

## **STEP 4: Trade Execution**

### 4.1 Check Market Availability
```bash
curl -X POST http://localhost:5002/validate-market \
  -H "Content-Type: application/json" \
  -d '{"market": "BTC"}' | jq
```

**Expected Output:**
```json
{
  "success": true,
  "market": "BTC",
  "isAvailable": true,
  "marketName": "BTC/USD",
  "assetIndex": 0
}
```

### 4.2 Execute Trades
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { executeSignal } from './lib/trade-executor';

const prisma = new PrismaClient();

const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID

async function executeTrades() {
  const signals = await prisma.signals.findMany({
    where: {
      source_tweets: { has: TWEET_ID },
      skipped_reason: null,
    },
    include: {
      agents: true,
    },
  });
  
  console.log(\`🚀 Executing \${signals.length} trades...\n\`);
  
  for (const signal of signals) {
    console.log(\`Trading for \${signal.agents.name}:\`);
    
    try {
      const result = await executeSignal(signal.id);
      
      if (result.success) {
        console.log(\`✅ Trade executed successfully\`);
        console.log(\`   Order ID: \${result.orderId}\`);
        console.log(\`   TX Hash: \${result.txHash}\`);
      } else {
        console.error(\`❌ Trade failed: \${result.error}\`);
      }
    } catch (error: any) {
      console.error(\`❌ Error: \${error.message}\`);
    }
    console.log('');
  }
  
  await prisma.\$disconnect();
}

executeTrades();
"
```

**Expected Output:**
```
🚀 Executing 2 trades...

Trading for Zim:
✅ Trade executed successfully
   Order ID: 118965
   TX Hash: 0x9e563d061e04031bfda1ab946baf9961d1402b513b76474193a33fcc47bb5961

Trading for Rise:
✅ Trade executed successfully
   Order ID: 118966
   TX Hash: 0x7f452c950d93920ceda0ac835bae8850c1301a402c85363082b22edd48aa4850
```

### 4.3 Verify Positions Created
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID

async function checkPositions() {
  const signals = await prisma.signals.findMany({
    where: { source_tweets: { has: TWEET_ID } },
    include: {
      positions: {
        select: {
          id: true,
          token_symbol: true,
          side: true,
          qty: true,
          entry_price: true,
          entry_tx_hash: true,
          closed_at: true,
        },
      },
      agents: { select: { name: true } },
    },
  });
  
  console.log('📊 Position Status:\\n');
  
  for (const signal of signals) {
    console.log(\`\${signal.agents.name}:\`);
    if (signal.positions.length === 0) {
      console.log('  ⚠️  No position created yet');
    } else {
      const pos = signal.positions[0];
      console.log(\`  Token: \${pos.token_symbol} \${pos.side}\`);
      console.log(\`  Qty: \${pos.qty}\`);
      console.log(\`  Entry Price: \${pos.entry_price || 'Pending fill'}\`);
      console.log(\`  Status: \${pos.closed_at ? 'CLOSED' : 'OPEN'}\`);
      console.log(\`  TX Hash: \${pos.entry_tx_hash}\`);
    }
    console.log('');
  }
  
  await prisma.\$disconnect();
}

checkPositions();
"
```

---

## **STEP 5: Position Monitoring**

### 5.1 Run Position Monitor Once
```bash
npx tsx workers/position-monitor-ostium.ts
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          🔵 OSTIUM POSITION MONITOR                      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

🔍 Fetching active Ostium deployments...
   Found: 2 deployments

📊 Monitoring Zim (0x3828...3Ab3):
   Fetching Ostium positions...
   Positions Found: 1
   ✅ Monitoring BTC LONG (entry: $98,500.00, qty: 1000)

📊 Monitoring Rise (0x3828...3Ab3):
   Fetching Ostium positions...
   Positions Found: 1
   ✅ Monitoring BTC LONG (entry: $98,500.00, qty: 1000)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ostium Monitor: Success
   Positions Monitored: 2
```

### 5.2 Check Position Details
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getPositionDetails() {
  const positions = await prisma.positions.findMany({
    where: {
      venue: 'OSTIUM',
      closed_at: null,
    },
    include: {
      agent_deployments: {
        include: { agents: { select: { name: true } } },
      },
    },
    orderBy: { opened_at: 'desc' },
    take: 5,
  });
  
  console.log(\`📊 Open Ostium Positions: \${positions.length}\\n\`);
  
  for (const pos of positions) {
    console.log(\`\${pos.agent_deployments.agents.name}:\`);
    console.log(\`  Token: \${pos.token_symbol} \${pos.side}\`);
    console.log(\`  Entry Price: \$\${pos.entry_price}\`);
    console.log(\`  Qty: \${pos.qty}\`);
    console.log(\`  Opened: \${pos.opened_at?.toISOString()}\`);
    console.log(\`  Trailing Stop: \${pos.trailing_params?.enabled ? 'Enabled' : 'Disabled'}\`);
    console.log('');
  }
  
  await prisma.\$disconnect();
}

getPositionDetails();
"
```

---

## **STEP 6: Position Closing**

### 6.1 Simulate Manual Close (for testing)
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { closePosition } from './lib/trade-executor';

const prisma = new PrismaClient();

async function closeTestPosition() {
  // Get first open Ostium position
  const position = await prisma.positions.findFirst({
    where: {
      venue: 'OSTIUM',
      closed_at: null,
    },
    include: {
      agent_deployments: {
        include: { agents: { select: { name: true } } },
      },
    },
  });
  
  if (!position) {
    console.log('⚠️  No open positions to close');
    return;
  }
  
  console.log(\`🔴 Closing position for \${position.agent_deployments.agents.name}...\`);
  console.log(\`   Token: \${position.token_symbol} \${position.side}\`);
  console.log(\`   Entry: \$\${position.entry_price}\`);
  console.log('');
  
  try {
    const result = await closePosition(position.id, 'MANUAL_TEST');
    
    if (result.success) {
      console.log('✅ Position closed successfully');
      console.log(\`   Exit Price: \$\${result.exitPrice}\`);
      console.log(\`   PnL: \$\${result.pnl}\`);
      console.log(\`   TX Hash: \${result.txHash}\`);
    } else {
      console.error(\`❌ Failed to close: \${result.error}\`);
    }
  } catch (error: any) {
    console.error(\`❌ Error: \${error.message}\`);
  }
  
  await prisma.\$disconnect();
}

closeTestPosition();
"
```

### 6.2 Verify Position Closed
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyClose() {
  const closedPositions = await prisma.positions.findMany({
    where: {
      venue: 'OSTIUM',
      closed_at: { not: null },
    },
    include: {
      agent_deployments: {
        include: { agents: { select: { name: true } } },
      },
    },
    orderBy: { closed_at: 'desc' },
    take: 3,
  });
  
  console.log(\`📊 Recently Closed Positions: \${closedPositions.length}\\n\`);
  
  for (const pos of closedPositions) {
    console.log(\`\${pos.agent_deployments.agents.name}:\`);
    console.log(\`  Token: \${pos.token_symbol} \${pos.side}\`);
    console.log(\`  Entry: \$\${pos.entry_price} → Exit: \$\${pos.exit_price}\`);
    console.log(\`  PnL: \$\${pos.pnl} (\${parseFloat(pos.pnl?.toString() || '0') > 0 ? '✅ Profit' : '❌ Loss'})\`);
    console.log(\`  Exit Reason: \${pos.exit_reason}\`);
    console.log(\`  Closed: \${pos.closed_at?.toISOString()}\`);
    console.log('');
  }
  
  await prisma.\$disconnect();
}

verifyClose();
"
```

---

## **STEP 7: APR Calculation & Update**

### 7.1 Trigger APR Update
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { updateAgentMetrics } from './lib/metrics-updater';

const prisma = new PrismaClient();

async function updateAPR() {
  // Get all Ostium agents
  const agents = await prisma.agents.findMany({
    where: { venue: 'OSTIUM' },
    select: { id: true, name: true },
  });
  
  console.log(\`📊 Updating APR for \${agents.length} Ostium agents...\\n\`);
  
  for (const agent of agents) {
    console.log(\`Calculating for \${agent.name}...\`);
    const result = await updateAgentMetrics(agent.id);
    
    if (result.success) {
      console.log(\`✅ APR Updated:\`);
      console.log(\`   30d: \${result.apr30d?.toFixed(2)}%\`);
      console.log(\`   90d: \${result.apr90d?.toFixed(2)}%\`);
      console.log(\`   SI: \${result.aprSi?.toFixed(2)}%\`);
      console.log(\`   Sharpe: \${result.sharpe30d?.toFixed(2)}\`);
    } else {
      console.error(\`❌ Error: \${result.error}\`);
    }
    console.log('');
  }
  
  await prisma.\$disconnect();
}

updateAPR();
"
```

**Expected Output:**
```
📊 Updating APR for 2 Ostium agents...

Calculating for Zim...
✅ APR Updated:
   30d: 12.50%
   90d: 8.75%
   SI: 145.30%
   Sharpe: 1.85

Calculating for Rise...
✅ APR Updated:
   30d: 0.00%
   90d: 0.00%
   SI: 0.00%
   Sharpe: 0.00
```

### 7.2 Verify APR in Database
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyAPR() {
  const agents = await prisma.agents.findMany({
    where: { venue: 'OSTIUM' },
    select: {
      name: true,
      venue: true,
      apr_30d: true,
      apr_90d: true,
      apr_si: true,
      sharpe_30d: true,
    },
  });
  
  console.log('📊 Ostium Agent APR:\\n');
  
  for (const agent of agents) {
    console.log(\`\${agent.name} (\${agent.venue}):\`);
    console.log(\`  APR 30d: \${agent.apr_30d || 0}%\`);
    console.log(\`  APR 90d: \${agent.apr_90d || 0}%\`);
    console.log(\`  APR SI: \${agent.apr_si || 0}%\`);
    console.log(\`  Sharpe 30d: \${agent.sharpe_30d || 0}\`);
    
    // Verify venue-specific calculation
    const closedPositions = await prisma.positions.count({
      where: {
        agent_deployments: {
          agents: { name: agent.name },
        },
        venue: 'OSTIUM',
        closed_at: { not: null },
      },
    });
    
    console.log(\`  Closed Positions: \${closedPositions}\`);
    
    if (agent.apr_30d && agent.apr_30d > 0 && closedPositions === 0) {
      console.log('  ❌ BUG: APR > 0 but no closed Ostium positions!');
    } else if (agent.apr_30d && agent.apr_30d > 0) {
      console.log('  ✅ APR is correct (based on closed positions)');
    } else {
      console.log('  ✅ Correctly showing 0% (no profitable closed positions)');
    }
    console.log('');
  }
  
  await prisma.\$disconnect();
}

verifyAPR();
"
```

---

## 🎯 **Complete Flow Verification Checklist**

Use this checklist to verify each step:

- [ ] **Tweet Ingestion**
  - [ ] Tweet created in `ct_posts` table
  - [ ] Tweet ID saved for reference
  - [ ] `is_signal_candidate` is `null` (pending classification)

- [ ] **Tweet Classification**
  - [ ] LLM classifier ran successfully
  - [ ] `is_signal_candidate` set to `true`
  - [ ] `confidence` level recorded (LOW/MEDIUM/HIGH)

- [ ] **Signal Generation**
  - [ ] Signals created for active Ostium agents
  - [ ] `token_symbol`, `side`, `leverage` extracted correctly
  - [ ] Signals linked to source tweet via `source_tweets` array

- [ ] **Trade Execution**
  - [ ] Market validation passed (token available on Ostium)
  - [ ] Trade executed via `/open-position` endpoint
  - [ ] Order ID and TX Hash returned
  - [ ] Position created in `positions` table

- [ ] **Position Monitoring**
  - [ ] Position monitor detects open positions
  - [ ] Trailing stop parameters set
  - [ ] Real-time PnL tracking working

- [ ] **Position Closing**
  - [ ] Position closed successfully
  - [ ] `exit_price` and `pnl` calculated correctly
  - [ ] `exit_reason` recorded
  - [ ] `closed_at` timestamp set

- [ ] **APR Calculation**
  - [ ] Metrics updater ran without errors
  - [ ] APR calculated based on OSTIUM positions only (venue-filtered)
  - [ ] APR > 0 only when closed positions exist
  - [ ] Sharpe ratio calculated correctly

---

## 🐛 **Common Issues & Troubleshooting**

### Issue 1: "No active CT account found"
**Solution:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.ct_accounts.updateMany({
  where: {},
  data: { is_active: true },
}).then(() => console.log('✅ CT accounts activated'));
"
```

### Issue 2: "Market not available"
**Check available markets:**
```bash
curl http://localhost:5002/available-markets | jq '.markets | keys'
```

### Issue 3: "Ostium service not responding"
**Restart service:**
```bash
pkill -9 -f "python.*ostium"
cd /Users/abhishekdubey/Downloads/Maxxit/services
source venv/bin/activate
python ostium-service.py
```

### Issue 4: "Position never filled"
**Explanation:** Ostium uses keepers. If testnet keepers are inactive, orders won't fill.
**Solution:** Use a highly liquid token (BTC, ETH, SOL) and wait 1-2 minutes.

### Issue 5: "APR showing from wrong venue"
**Verify fix applied:**
```bash
grep "venue: agent.venue" lib/metrics-updater.ts
```
**Expected:** Should return the line with venue filtering.

---

## 📝 **Test Report Template**

After completing all steps, fill this out:

```
OSTIUM COMPLETE FLOW TEST REPORT
Date: _______________
Tester: _______________

✅ PASSED | ⚠️  PARTIAL | ❌ FAILED

[ ] Step 1: Tweet Ingestion
    Notes: _____________________________________

[ ] Step 2: Tweet Classification
    Notes: _____________________________________

[ ] Step 3: Signal Generation
    Notes: _____________________________________

[ ] Step 4: Trade Execution
    Notes: _____________________________________

[ ] Step 5: Position Monitoring
    Notes: _____________________________________

[ ] Step 6: Position Closing
    Notes: _____________________________________

[ ] Step 7: APR Calculation
    Notes: _____________________________________

OVERALL RESULT: [ ] PASS | [ ] FAIL

CRITICAL BUGS FOUND:
1. _____________________________________
2. _____________________________________

RECOMMENDATIONS:
1. _____________________________________
2. _____________________________________
```

---

## 🚀 **Quick Test Script (All Steps)**

For rapid testing, run this automated script:

```bash
npx tsx scripts/test-ostium-e2e-flow.ts
```

This script runs all 7 steps automatically and reports success/failure for each.

---

## 📞 **Support**

If you encounter issues during testing:
1. Check service logs: `tail -f logs/ostium-service.log`
2. Check database connectivity
3. Verify environment variables are set (`.env` file)
4. Check if Ostium testnet is operational: https://arbiscan.io/

---

**END OF GUIDE**

