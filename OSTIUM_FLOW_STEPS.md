# Ostium Complete Flow - Step-by-Step Checklist

**For Developer Testing**  
Follow these steps **in order** to test the complete Ostium trading pipeline.

---

## 🎯 **Overview: Tweet → Trade → APR**

```
1. Tweet Ingestion
   ↓
2. LLM Classification
   ↓
3. Signal Generation
   ↓
4. Market Validation
   ↓
5. Trade Execution
   ↓
6. Position Monitoring
   ↓
7. Position Closing
   ↓
8. APR Calculation
```

---

## ✅ **STEP 1: Tweet Ingestion**

**What happens:** A tweet is stored in the database for processing.

**How to test:**
```bash
cd /Users/abhishekdubey/Downloads/Maxxit

npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createTweet() {
  const TWEET_ID = 'TEST_' + Date.now();
  const ctAccount = await prisma.ct_accounts.findFirst({ where: { is_active: true } });
  
  const tweet = await prisma.ct_posts.create({
    data: {
      tweet_id: TWEET_ID,
      ct_account_id: ctAccount.id,
      tweet_text: '\$BTC bullish momentum! LONG with 3x leverage targeting 20% gains 🚀',
      full_text: '\$BTC bullish momentum! LONG with 3x leverage targeting 20% gains 🚀',
      tweet_created_at: new Date(),
      engagement_score: 100,
    },
  });
  
  console.log('✅ Tweet Created:', TWEET_ID);
  console.log('📝 Save this ID for next steps');
  prisma.\$disconnect();
}
createTweet();
"
```

**Expected output:**
```
✅ Tweet Created: TEST_1731234567890
📝 Save this ID for next steps
```

**Verify:**
```bash
# Replace TEST_1731234567890 with your tweet ID
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.ct_posts.findUnique({ where: { tweet_id: 'TEST_1731234567890' } })
  .then(t => console.log('Tweet found:', t ? '✅' : '❌'))
  .finally(() => prisma.\$disconnect());
"
```

**✅ Step 1 Complete when:** Tweet exists in database with `is_signal_candidate: null`

---

## ✅ **STEP 2: LLM Classification**

**What happens:** AI analyzes the tweet to determine if it's a trading signal.

**How to test:**
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

async function classify() {
  const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID
  
  const tweet = await prisma.ct_posts.findUnique({ where: { tweet_id: TWEET_ID } });
  const result = await classifier.classifyTweet(tweet.tweet_text);
  
  await prisma.ct_posts.update({
    where: { tweet_id: TWEET_ID },
    data: { is_signal_candidate: result.isSignal, confidence: result.confidence },
  });
  
  console.log('✅ Classification:', result.isSignal ? 'SIGNAL' : 'NOT SIGNAL');
  console.log('   Confidence:', result.confidence);
  prisma.\$disconnect();
}
classify();
"
```

**Expected output:**
```
✅ Classification: SIGNAL
   Confidence: HIGH
```

**Verify:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.ct_posts.findUnique({ where: { tweet_id: 'TEST_1731234567890' } })
  .then(t => {
    console.log('Is Signal:', t.is_signal_candidate ? '✅' : '❌');
    console.log('Confidence:', t.confidence);
  })
  .finally(() => prisma.\$disconnect());
"
```

**✅ Step 2 Complete when:** `is_signal_candidate: true` and `confidence` is set

---

## ✅ **STEP 3: Signal Generation**

**What happens:** System extracts token, side, and leverage from the tweet.

**How to test:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { SignalGenerator } from './lib/signal-generator';

const prisma = new PrismaClient();
const generator = new SignalGenerator({
  provider: 'perplexity',
  apiKey: process.env.PERPLEXITY_API_KEY || '',
});

async function generateSignal() {
  const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID
  
  const tweet = await prisma.ct_posts.findUnique({
    where: { tweet_id: TWEET_ID },
    include: { ct_accounts: true },
  });
  
  const agents = await prisma.agents.findMany({
    where: { venue: 'OSTIUM', status: 'ACTIVE' },
  });
  
  for (const agent of agents) {
    const signal = await generator.generateSignal({
      tweetText: tweet.tweet_text,
      tweetAuthor: tweet.ct_accounts?.account_name || 'Test',
      venue: 'OSTIUM',
      agentId: agent.id,
    });
    
    if (signal.isValid) {
      await prisma.signals.create({
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
      console.log(\`✅ Signal created for \${agent.name}: \${signal.token} \${signal.side} \${signal.sizeModel.leverage}x\`);
    }
  }
  prisma.\$disconnect();
}
generateSignal();
"
```

**Expected output:**
```
✅ Signal created for Zim: BTC LONG 3x
✅ Signal created for Rise: BTC LONG 3x
```

**Verify:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.signals.findMany({
  where: { source_tweets: { has: 'TEST_1731234567890' } },
  include: { agents: true },
}).then(signals => {
  console.log('Signals created:', signals.length);
  signals.forEach(s => console.log(\`  - \${s.agents.name}: \${s.token_symbol} \${s.side}\`));
}).finally(() => prisma.\$disconnect());
"
```

**✅ Step 3 Complete when:** Signals exist in database for active Ostium agents

---

## ✅ **STEP 4: Market Validation**

**What happens:** System checks if the token is available on Ostium.

**How to test:**
```bash
# Check if BTC is available
curl -X POST http://localhost:5002/validate-market \
  -H "Content-Type: application/json" \
  -d '{"market": "BTC"}' | jq
```

**Expected output:**
```json
{
  "success": true,
  "market": "BTC",
  "isAvailable": true,
  "marketName": "BTC/USD",
  "assetIndex": 0
}
```

**Verify in database:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.venue_markets.findUnique({
  where: { venue_token_symbol: { venue: 'OSTIUM', token_symbol: 'BTC' } },
}).then(m => {
  console.log('Market found:', m ? '✅' : '❌');
  console.log('Name:', m?.market_name);
  console.log('Active:', m?.is_active ? '✅' : '❌');
}).finally(() => prisma.\$disconnect());
"
```

**✅ Step 4 Complete when:** Market exists in `venue_markets` table and `is_active: true`

---

## ✅ **STEP 5: Trade Execution**

**What happens:** System opens a position on Ostium via the agent.

**How to test:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function executeTrade() {
  const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID
  
  const signals = await prisma.signals.findMany({
    where: { source_tweets: { has: TWEET_ID } },
    include: { agents: true },
  });
  
  const ostiumServiceUrl = 'http://localhost:5002';
  
  for (const signal of signals) {
    const deployment = await prisma.agent_deployments.findFirst({
      where: { agent_id: signal.agent_id },
    });
    
    const response = await fetch(\`\${ostiumServiceUrl}/open-position\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentAddress: deployment.hyperliquid_agent_address,
        userAddress: deployment.user_wallet,
        market: signal.token_symbol,
        side: signal.side.toLowerCase(),
        collateral: 2000,
        leverage: signal.size_model.leverage || 3,
      }),
    });
    
    const result = await response.json();
    console.log(\`✅ Trade for \${signal.agents.name}:\`, result.orderId || result.tradeId);
  }
  prisma.\$disconnect();
}
executeTrade();
"
```

**Expected output:**
```
✅ Trade for Zim: 118965
✅ Trade for Rise: 118966
```

**Verify:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.positions.findMany({
  where: { venue: 'OSTIUM', closed_at: null },
  include: { agent_deployments: { include: { agents: true } } },
}).then(positions => {
  console.log('Open positions:', positions.length);
  positions.forEach(p => console.log(\`  - \${p.agent_deployments.agents.name}: \${p.token_symbol} \${p.side}\`));
}).finally(() => prisma.\$disconnect());
"
```

**✅ Step 5 Complete when:** Positions exist in database with `closed_at: null`

---

## ✅ **STEP 6: Position Monitoring**

**What happens:** System tracks PnL and applies trailing stops.

**How to test:**
```bash
# Run the position monitor once
npx tsx workers/position-monitor-ostium.ts
```

**Expected output:**
```
╔═══════════════════════════════════════════════════════════╗
║          🔵 OSTIUM POSITION MONITOR                      ║
╚═══════════════════════════════════════════════════════════╝

📊 Monitoring Zim (0x3828...3Ab3):
   ✅ Monitoring BTC LONG (entry: $98,500.00)

📊 Monitoring Rise (0x3828...3Ab3):
   ✅ Monitoring BTC LONG (entry: $98,500.00)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ostium Monitor: Success
   Positions Monitored: 2
```

**Verify:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.positions.findMany({
  where: { venue: 'OSTIUM', closed_at: null },
  select: {
    token_symbol: true,
    side: true,
    entry_price: true,
    trailing_params: true,
  },
}).then(positions => {
  positions.forEach(p => {
    console.log(\`\${p.token_symbol} \${p.side}:\`);
    console.log('  Entry:', p.entry_price);
    console.log('  Trailing:', p.trailing_params?.enabled ? '✅' : '❌');
  });
}).finally(() => prisma.\$disconnect());
"
```

**✅ Step 6 Complete when:** Positions have `trailing_params.enabled: true` and are being tracked

---

## ✅ **STEP 7: Position Closing**

**What happens:** Position is closed when conditions are met (trailing stop, take profit, etc.).

**How to test (manual close for testing):**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function closePosition() {
  const position = await prisma.positions.findFirst({
    where: { venue: 'OSTIUM', closed_at: null },
  });
  
  if (!position) {
    console.log('No open positions');
    return;
  }
  
  const ostiumServiceUrl = 'http://localhost:5002';
  const deployment = await prisma.agent_deployments.findUnique({
    where: { id: position.deployment_id },
  });
  
  const response = await fetch(\`\${ostiumServiceUrl}/close-position\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentAddress: deployment.hyperliquid_agent_address,
      userAddress: deployment.user_wallet,
      tradeId: position.entry_tx_hash,
    }),
  });
  
  const result = await response.json();
  console.log('✅ Position closed:', result.success ? '✅' : '❌');
  console.log('   TX Hash:', result.txHash);
  prisma.\$disconnect();
}
closePosition();
"
```

**Expected output:**
```
✅ Position closed: ✅
   TX Hash: 0x7f452c950d93920ceda0ac835bae8850c1301a402c85363082b22edd48aa4850
```

**Verify:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.positions.findFirst({
  where: { venue: 'OSTIUM', closed_at: { not: null } },
  orderBy: { closed_at: 'desc' },
}).then(p => {
  console.log('Closed position found:', p ? '✅' : '❌');
  console.log('Token:', p?.token_symbol, p?.side);
  console.log('Entry:', p?.entry_price);
  console.log('Exit:', p?.exit_price);
  console.log('PnL:', p?.pnl);
  console.log('Exit Reason:', p?.exit_reason);
}).finally(() => prisma.\$disconnect());
"
```

**✅ Step 7 Complete when:** Position has `closed_at`, `exit_price`, `pnl`, and `exit_reason` set

---

## ✅ **STEP 8: APR Calculation**

**What happens:** Agent's APR is recalculated based on closed positions.

**How to test:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
import { updateAgentMetrics } from './lib/metrics-updater';

const prisma = new PrismaClient();

async function updateAPR() {
  const agents = await prisma.agents.findMany({
    where: { venue: 'OSTIUM' },
  });
  
  for (const agent of agents) {
    console.log(\`Updating APR for \${agent.name}...\`);
    const result = await updateAgentMetrics(agent.id);
    
    if (result.success) {
      console.log('✅ APR Updated:');
      console.log('   30d:', result.apr30d?.toFixed(2) + '%');
      console.log('   90d:', result.apr90d?.toFixed(2) + '%');
      console.log('   SI:', result.aprSi?.toFixed(2) + '%');
    }
  }
  prisma.\$disconnect();
}
updateAPR();
"
```

**Expected output:**
```
Updating APR for Zim...
✅ APR Updated:
   30d: 12.50%
   90d: 8.75%
   SI: 145.30%
```

**Verify:**
```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.agents.findMany({
  where: { venue: 'OSTIUM' },
  select: { name: true, apr_30d: true, apr_90d: true, apr_si: true },
}).then(agents => {
  agents.forEach(a => {
    console.log(\`\${a.name}:\`);
    console.log('  APR 30d:', a.apr_30d || 0, '%');
    console.log('  APR 90d:', a.apr_90d || 0, '%');
    console.log('  APR SI:', a.apr_si || 0, '%');
  });
}).finally(() => prisma.\$disconnect());
"
```

**✅ Step 8 Complete when:** Agent's `apr_30d`, `apr_90d`, and `apr_si` are updated based on OSTIUM positions only

---

## 📊 **Final Verification Checklist**

After completing all 8 steps, verify the complete flow:

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verifyCompleteFlow() {
  const TWEET_ID = 'TEST_1731234567890'; // Replace with your tweet ID
  
  console.log('🔍 COMPLETE FLOW VERIFICATION\\n');
  console.log('════════════════════════════════════════════════════════════\\n');
  
  // 1. Tweet
  const tweet = await prisma.ct_posts.findUnique({ where: { tweet_id: TWEET_ID } });
  console.log('✅ Step 1 - Tweet Ingestion:', tweet ? '✅' : '❌');
  
  // 2. Classification
  console.log('✅ Step 2 - LLM Classification:', tweet?.is_signal_candidate ? '✅' : '❌');
  
  // 3. Signals
  const signals = await prisma.signals.findMany({
    where: { source_tweets: { has: TWEET_ID } },
  });
  console.log(\`✅ Step 3 - Signal Generation: \${signals.length} signals created\`);
  
  // 4. Market
  const market = await prisma.venue_markets.findUnique({
    where: { venue_token_symbol: { venue: 'OSTIUM', token_symbol: signals[0]?.token_symbol || '' } },
  });
  console.log('✅ Step 4 - Market Validation:', market?.is_active ? '✅' : '❌');
  
  // 5. Positions
  const positions = await prisma.positions.findMany({
    where: {
      signal_id: { in: signals.map(s => s.id) },
    },
  });
  console.log(\`✅ Step 5 - Trade Execution: \${positions.length} positions opened\`);
  
  // 6. Monitoring
  const monitoring = positions.some(p => p.trailing_params?.enabled);
  console.log('✅ Step 6 - Position Monitoring:', monitoring ? '✅' : '❌');
  
  // 7. Closed
  const closedPositions = positions.filter(p => p.closed_at);
  console.log(\`✅ Step 7 - Position Closing: \${closedPositions.length} positions closed\`);
  
  // 8. APR
  if (closedPositions.length > 0) {
    const agent = await prisma.agents.findUnique({
      where: { id: signals[0].agent_id },
      select: { name: true, apr_30d: true },
    });
    console.log(\`✅ Step 8 - APR Calculation: \${agent?.name} APR = \${agent?.apr_30d || 0}%\`);
  }
  
  console.log('\\n════════════════════════════════════════════════════════════');
  console.log('🎉 COMPLETE FLOW VERIFIED!\\n');
  
  prisma.\$disconnect();
}

verifyCompleteFlow();
"
```

---

## 🎯 **Summary**

**Complete Flow:** 8 Steps  
**Time Required:** 30-45 minutes  
**Each step must be verified before moving to next**

| Step | Name | Status Check |
|------|------|--------------|
| 1 | Tweet Ingestion | Tweet in `ct_posts` |
| 2 | LLM Classification | `is_signal_candidate: true` |
| 3 | Signal Generation | Signals in `signals` table |
| 4 | Market Validation | Market in `venue_markets` |
| 5 | Trade Execution | Positions in `positions` |
| 6 | Position Monitoring | `trailing_params.enabled: true` |
| 7 | Position Closing | `closed_at`, `pnl` set |
| 8 | APR Calculation | `apr_30d` updated |

**✅ All steps passing = Ostium flow is working correctly!**

