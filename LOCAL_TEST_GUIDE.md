# Local End-to-End Testing Guide

## Complete Local Setup & Testing

This guide walks you through running and testing all services and workers locally.

---

## Prerequisites

### 1. Environment Variables
Ensure your `.env` file has all required variables:

```bash
# Critical for Hyperliquid
AGENT_WALLET_ENCRYPTION_KEY=<your-key>
HYPERLIQUID_SERVICE_URL=http://localhost:5001
HYPERLIQUID_TESTNET=true
NEXT_PUBLIC_HYPERLIQUID_TESTNET=true

# Database
DATABASE_URL=postgresql://...

# X/Twitter API
X_API_KEY=...
X_API_SECRET=...
TWITTER_BEARER_TOKEN=...

# Other services
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```

### 2. Python Environment
```bash
cd services
pip install -r requirements-hyperliquid.txt
```

### 3. Node Dependencies
```bash
npm install
```

---

## Services Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LOCAL TEST ENVIRONMENT                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Port 5000: Next.js Web App                                 │
│  Port 5001: Hyperliquid Python Service                      │
│                                                              │
│  Workers (Background):                                       │
│    - Tweet Ingestion (monitors X)                           │
│    - Signal Generator (creates signals)                      │
│    - Trade Executor (executes signals)                       │
│    - Position Monitor - SPOT/GMX                            │
│    - Position Monitor - Hyperliquid                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Start All Services

### Terminal 1: Hyperliquid Python Service
```bash
cd services
HYPERLIQUID_TESTNET=true python3 hyperliquid-service.py
```

**Expected Output**:
```
╔═══════════════════════════════════════════════════════════════╗
║     🚀 HYPERLIQUID SERVICE STARTING                          ║
╚═══════════════════════════════════════════════════════════════╝

Environment: TESTNET
SDK initialized successfully
 * Running on http://0.0.0.0:5001
```

**Health Check**:
```bash
curl http://localhost:5001/health
# Should return: {"status":"healthy","testnet":true}
```

---

### Terminal 2: Next.js Web App
```bash
npm run dev
```

**Expected Output**:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
info  - Loaded env from .env
```

**Health Check**:
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"healthy"}
```

---

### Terminal 3: Tweet Ingestion Worker
```bash
npx tsx workers/tweet-ingestion-worker.ts
```

**Expected Output**:
```
[TweetWorker] Starting tweet ingestion...
[TweetWorker] Monitoring X accounts for signals
```

---

### Terminal 4: Signal Generator
```bash
npx tsx workers/signal-generator.ts
```

**Expected Output**:
```
[SignalGen] Starting signal generation...
[SignalGen] Processing signal candidates
```

---

### Terminal 5: Trade Executor
```bash
npx tsx workers/trade-executor-worker.ts
```

**Expected Output**:
```
[TradeWorker] Starting trade execution...
[TradeWorker] Found X pending signals
```

---

### Terminal 6: Position Monitor (SPOT/GMX)
```bash
npx tsx workers/position-monitor-v2.ts
```

**Expected Output**:
```
[PositionMonitor] Starting position monitoring...
[PositionMonitor] Monitoring X open positions
```

---

### Terminal 7: Position Monitor (Hyperliquid)
```bash
npx tsx workers/position-monitor-hyperliquid.ts
```

**Expected Output**:
```
╔═══════════════════════════════════════════════════════════════╗
║     📊 HYPERLIQUID POSITION MONITOR - SMART DISCOVERY        ║
╚═══════════════════════════════════════════════════════════════╝

Found X active deployment(s)
```

---

## Step 2: Verify All Services Running

Run this in a new terminal:

```bash
# Check Hyperliquid service
curl http://localhost:5001/health

# Check Next.js
curl http://localhost:3000/api/health

# Check database connection
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.agents.count().then(count => {
  console.log('✅ Database connected. Agents:', count);
  process.exit(0);
}).catch(err => {
  console.error('❌ Database error:', err.message);
  process.exit(1);
});
"
```

---

## Step 3: End-to-End Test

### Test 1: Hyperliquid Service Endpoints

```bash
# Test market info
curl -X POST http://localhost:5001/market-info \
  -H "Content-Type: application/json" \
  -d '{"coin":"SOL"}'

# Test balance (use your Hyperliquid address)
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x3828dFCBff64fD07B963Ef11BafE632260413Ab3"}'

# Test positions
curl -X POST http://localhost:5001/positions \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x3828dFCBff64fD07B963Ef11BafE632260413Ab3"}'
```

---

### Test 2: Create Test Signal & Execute

```bash
npx tsx scripts/test-complete-hyperliquid-flow.ts
```

This will:
1. ✅ Create a test signal
2. ✅ Execute trade via TradeExecutor
3. ✅ Verify position created on Hyperliquid
4. ✅ Monitor position
5. ✅ Close position

---

### Test 3: Manual Signal Creation

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestSignal() {
  // Find an active Hyperliquid deployment
  const deployment = await prisma.agent_deployments.findFirst({
    where: {
      hyperliquid_agent_address: { not: null },
      status: 'ACTIVE'
    },
    include: { agents: true }
  });

  if (!deployment) {
    console.error('❌ No active Hyperliquid deployment found');
    process.exit(1);
  }

  console.log('✅ Found deployment:', deployment.id);
  console.log('   Agent:', deployment.agents.name);
  console.log('   Address:', deployment.safe_wallet);

  // Create test signal
  const signal = await prisma.signals.create({
    data: {
      agent_id: deployment.agents.id,
      token_symbol: 'SOL',
      side: 'LONG',
      venue: 'HYPERLIQUID',
      size_model: { type: 'fixed', value: 0.1 },
      risk_model: { 
        stopLoss: null, 
        takeProfit: null, 
        trailingStop: 0.01 
      },
      source_tweets: ['MANUAL_TEST'],
      proof_verified: true,
      executor_agreement_verified: true,
    }
  });

  console.log('✅ Test signal created:', signal.id);
  console.log('   Token:', signal.token_symbol);
  console.log('   Side:', signal.side);
  console.log('   Venue:', signal.venue);
  console.log();
  console.log('💡 Trade executor will pick this up automatically');
  console.log('   Or execute manually with:');
  console.log('   curl -X POST http://localhost:3000/api/admin/execute-trade-once?signalId=' + signal.id);

  await prisma.\$disconnect();
}

createTestSignal().catch(console.error);
"
```

---

### Test 4: Check Worker Status

```bash
# Check if workers are processing
ps aux | grep -E "tweet-ingestion|signal-generator|trade-executor|position-monitor"
```

---

## Step 4: Monitor Logs

### Watch All Logs in Real-Time

```bash
# Terminal 8: Watch all worker logs
tail -f logs/*.log

# Or individual logs:
tail -f logs/tweet-ingestion.log
tail -f logs/signal-generator.log
tail -f logs/trade-executor.log
tail -f logs/position-monitor.log
```

---

## Step 5: Test Complete Flow

### Scenario: Tweet → Signal → Position

1. **Create a synthetic tweet** (if you don't want to wait for real tweets):

```bash
npx tsx -e "
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSyntheticTweet() {
  // Find a CT account that an agent monitors
  const agentAccount = await prisma.agent_accounts.findFirst({
    where: {
      agents: { status: 'ACTIVE' }
    },
    include: {
      ct_accounts: true,
      agents: true
    }
  });

  if (!agentAccount) {
    console.error('❌ No active agent with CT account found');
    process.exit(1);
  }

  // Create synthetic tweet
  const tweet = await prisma.ct_posts.create({
    data: {
      ct_account_id: agentAccount.ct_account_id,
      external_id: 'TEST_' + Date.now(),
      content: 'SOL is looking bullish! Strong momentum. #crypto',
      posted_at: new Date(),
      is_signal_candidate: true,
      extracted_tokens: ['SOL'],
      sentiment_score: 0.8
    }
  });

  console.log('✅ Synthetic tweet created:', tweet.id);
  console.log('   Content:', tweet.content);
  console.log('   CT Account:', agentAccount.ct_accounts.name);
  console.log('   Agent:', agentAccount.agents.name);
  console.log();
  console.log('💡 Signal generator will process this automatically');
  
  await prisma.\$disconnect();
}

createSyntheticTweet().catch(console.error);
"
```

2. **Wait for signal generation** (or trigger manually):
```bash
npx tsx workers/signal-generator.ts
```

3. **Wait for trade execution** (or trigger manually):
```bash
npx tsx workers/trade-executor-worker.ts
```

4. **Check position created**:
```bash
npx tsx scripts/check-hyperliquid-positions.ts
```

---

## Troubleshooting

### Issue: Hyperliquid service not responding
```bash
# Check if service is running
lsof -i :5001

# Check service logs
tail -f /tmp/hyperliquid-service.log

# Restart service
cd services && HYPERLIQUID_TESTNET=true python3 hyperliquid-service.py
```

### Issue: Worker not processing
```bash
# Check worker is running
ps aux | grep "worker-name"

# Check worker logs
tail -f logs/worker-name.log

# Restart worker
npx tsx workers/worker-name.ts
```

### Issue: Database connection failed
```bash
# Test database
npx prisma db pull

# Check DATABASE_URL
echo $DATABASE_URL
```

### Issue: No signals generated
```bash
# Check CT accounts
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.ct_accounts.findMany({ include: { agent_accounts: true } })
  .then(accounts => {
    console.log('CT Accounts:', accounts.length);
    accounts.forEach(acc => console.log(' -', acc.name, '(', acc.agent_accounts.length, 'agents)'));
  })
  .finally(() => prisma.\$disconnect());
"
```

### Issue: Trades not executing
```bash
# Check pending signals
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.signals.findMany({
  where: {
    positions: { none: {} },
    skipped_reason: null
  },
  include: { agents: true }
})
  .then(signals => {
    console.log('Pending signals:', signals.length);
    signals.forEach(s => console.log(' -', s.token_symbol, s.side, '(agent:', s.agents.name, ')'));
  })
  .finally(() => prisma.\$disconnect());
"
```

---

## Quick Test Script

Run this to test everything at once:

```bash
./scripts/test-local-setup.sh
```

---

## Clean Up

To stop all services:

```bash
# Stop all Node.js processes
pkill -f "tsx workers"
pkill -f "next-server"

# Stop Python service
pkill -f "hyperliquid-service"

# Or use the stop script
./scripts/stop-all-local.sh
```

---

## Expected Results

After running for 5-10 minutes, you should see:

✅ Hyperliquid service responding to health checks
✅ Next.js app accessible at http://localhost:3000
✅ Tweet ingestion worker monitoring X accounts
✅ Signal generator creating signals from tweets
✅ Trade executor executing pending signals
✅ Positions created on Hyperliquid testnet
✅ Position monitors tracking open positions
✅ Risk management (stop loss, trailing stop) working

---

## Performance Benchmarks

### Expected Timings:
- Tweet → Signal: 1-5 minutes
- Signal → Trade: 1-5 minutes
- Trade → Position: 5-30 seconds
- Position Monitor: Every 60 seconds

### Resource Usage:
- Hyperliquid Service: ~50-100 MB RAM
- Next.js: ~200-300 MB RAM
- Each Worker: ~100-150 MB RAM
- Total: ~1-1.5 GB RAM

---

**Last Updated**: November 1, 2025
**Testing Version**: 1.0.0

