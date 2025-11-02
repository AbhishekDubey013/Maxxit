# Start Workers for Hyperliquid Testnet

Complete guide to start all workers for automated perpetual trading on Hyperliquid testnet.

## Prerequisites Checklist

- [x] Testnet wallet funded with USDC
- [x] Hyperliquid Python service running
- [x] Agent deployed with HYPERLIQUID venue
- [x] Agent wallet registered and funded
- [x] Database running
- [x] Environment variables set

## Quick Start (All Workers)

```bash
# Terminal 1: Start Hyperliquid service
HYPERLIQUID_TESTNET=true python3 services/hyperliquid-service.py

# Terminal 2: Start all workers
HYPERLIQUID_TESTNET=true npm run workers:start
```

That's it! Workers are now running and monitoring for signals.

---

## Step-by-Step Setup

### Step 1: Verify Hyperliquid Service (30 seconds)

```bash
# Check service is running
curl http://localhost:5001/health

# Should return:
# {
#   "status": "ok",
#   "service": "hyperliquid",
#   "network": "testnet"
# }
```

If not running:
```bash
HYPERLIQUID_TESTNET=true python3 services/hyperliquid-service.py
```

### Step 2: Verify Environment Variables (1 minute)

Check your `.env` file has:

```bash
# Testnet mode
HYPERLIQUID_TESTNET=true

# Service URL
HYPERLIQUID_SERVICE_URL=http://localhost:5001

# Encryption key
AGENT_WALLET_ENCRYPTION_KEY=<your-32-byte-hex-key>

# Database
DATABASE_URL=postgresql://localhost/maxxit

# Twitter (for signals)
TWITTER_BEARER_TOKEN=<your-token>

# OpenAI (for classification)
OPENAI_API_KEY=<your-key>

# Executor private key
EXECUTOR_PRIVATE_KEY=<your-key>
```

### Step 3: Start Trade Executor Worker (Main)

```bash
# In a new terminal
npm run worker:trade-executor

# Or with testnet flag
HYPERLIQUID_TESTNET=true npx tsx workers/trade-executor-worker.ts
```

**What it does:**
- Monitors for new signals in database
- Executes trades on Hyperliquid via Python service
- Creates position records
- Logs all activity

**You should see:**
```
🚀 Trade Executor Worker Started
📊 Polling for signals every 10 seconds
🧪 Network: TESTNET
```

### Step 4: Start Signal Generator Worker

```bash
# In another terminal
npm run worker:signal-generator

# Or
HYPERLIQUID_TESTNET=true npx tsx workers/signal-generator.ts
```

**What it does:**
- Monitors Twitter for trading signals
- Classifies tweets using LLM
- Generates trading signals for HYPERLIQUID venue
- Stores in database for execution

**You should see:**
```
🎯 Signal Generator Started
📡 Monitoring Twitter for signals
🔍 Looking for HYPERLIQUID signals
```

### Step 5: Start Position Monitor Worker

```bash
# In another terminal
npm run worker:position-monitor

# Or
HYPERLIQUID_TESTNET=true npx tsx workers/position-monitor-v2.ts
```

**What it does:**
- Monitors open Hyperliquid positions
- Tracks P&L
- Closes positions based on:
  - Take profit levels
  - Stop loss levels
  - Trailing stops

**You should see:**
```
📊 Position Monitor Started
🔄 Checking positions every 30 seconds
💰 Tracking P&L for HYPERLIQUID positions
```

---

## Alternative: Start All at Once

### Option 1: Using npm script

```bash
# Start all workers
npm run workers:start
```

### Option 2: Using bash script

```bash
# Make executable
chmod +x workers/start-workers.sh

# Start all
./workers/start-workers.sh
```

### Option 3: Custom start script

Create `start-testnet-workers.sh`:

```bash
#!/bin/bash

# Start all workers for testnet
export HYPERLIQUID_TESTNET=true

echo "🚀 Starting Hyperliquid Testnet Workers..."
echo ""

# Start Python service
echo "1️⃣ Starting Hyperliquid service..."
python3 services/hyperliquid-service.py > logs/hyperliquid-service.log 2>&1 &
PYTHON_PID=$!
sleep 2

# Start trade executor
echo "2️⃣ Starting trade executor..."
npx tsx workers/trade-executor-worker.ts > logs/trade-executor.log 2>&1 &
EXECUTOR_PID=$!

# Start signal generator
echo "3️⃣ Starting signal generator..."
npx tsx workers/signal-generator.ts > logs/signal-generator.log 2>&1 &
SIGNAL_PID=$!

# Start position monitor
echo "4️⃣ Starting position monitor..."
npx tsx workers/position-monitor-v2.ts > logs/position-monitor.log 2>&1 &
MONITOR_PID=$!

echo ""
echo "✅ All workers started!"
echo ""
echo "📊 Process IDs:"
echo "   Python Service: $PYTHON_PID"
echo "   Trade Executor: $EXECUTOR_PID"
echo "   Signal Generator: $SIGNAL_PID"
echo "   Position Monitor: $MONITOR_PID"
echo ""
echo "📝 Logs:"
echo "   tail -f logs/trade-executor.log"
echo "   tail -f logs/signal-generator.log"
echo "   tail -f logs/position-monitor.log"
echo ""
echo "🛑 To stop all: ./workers/stop-workers.sh"

# Save PIDs
echo $PYTHON_PID > /tmp/hyperliquid-service.pid
echo $EXECUTOR_PID > /tmp/trade-executor.pid
echo $SIGNAL_PID > /tmp/signal-generator.pid
echo $MONITOR_PID > /tmp/position-monitor.pid
```

---

## Monitoring Workers

### Check if workers are running:

```bash
# Check processes
ps aux | grep -E "trade-executor|signal-generator|position-monitor"

# Check logs
tail -f logs/trade-executor.log
tail -f logs/signal-generator.log
tail -f logs/position-monitor.log
```

### View real-time logs:

```bash
# All logs together
tail -f logs/*.log

# Just trade executor
tail -f logs/trade-executor.log

# Just errors
grep -i error logs/*.log
```

---

## Testing the Flow

### Test 1: Manual Signal Test

Create a test signal:

```bash
npx tsx scripts/create-test-signal.ts
```

This creates a BTC LONG signal for testing.

### Test 2: Check Signal Processing

Watch the trade executor log:

```bash
tail -f logs/trade-executor.log

# You should see:
# [TradeExecutor] Processing signal: BTC LONG
# [TradeExecutor] Opening Hyperliquid position...
# [TradeExecutor] ✅ Position opened
```

### Test 3: Check Position Created

```bash
# Via database
npx tsx scripts/check-positions.ts

# Via Hyperliquid app
# Go to: https://app.hyperliquid-testnet.xyz
# Connect wallet → View positions
```

### Test 4: Watch Position Monitor

```bash
tail -f logs/position-monitor.log

# You should see:
# [PositionMonitor] Checking 1 open position(s)
# [PositionMonitor] BTC LONG: Entry $45000, Current $45100, P&L: +$1.00
```

---

## Configuration Options

### Trade Executor Settings

In `workers/trade-executor-worker.ts`:

```typescript
const POLL_INTERVAL = 10000; // Check for signals every 10s
const MAX_RETRIES = 3;
const TESTNET_MODE = process.env.HYPERLIQUID_TESTNET === 'true';
```

### Signal Generator Settings

In `workers/signal-generator.ts`:

```typescript
const POLL_INTERVAL = 60000; // Check Twitter every 60s
const VENUE_FILTER = ['HYPERLIQUID']; // Only HYPERLIQUID signals
```

### Position Monitor Settings

In `workers/position-monitor-v2.ts`:

```typescript
const CHECK_INTERVAL = 30000; // Check positions every 30s
const TRAILING_STOP_PERCENT = 1; // 1% trailing stop
```

---

## Expected Behavior

### When a Signal Arrives:

```
1. Signal Generator → Detects tweet
   ✓ "BTC is bullish, going long"
   
2. Signal Generator → Creates signal in DB
   ✓ Signal: BTC LONG, 5% size, HYPERLIQUID venue
   
3. Trade Executor → Picks up signal
   ✓ Checking deployments with HYPERLIQUID
   ✓ Found 1 deployment
   
4. Trade Executor → Gets agent key
   ✓ Decrypted agent private key
   
5. Trade Executor → Calls Python service
   ✓ POST /open-position
   ✓ Coin: BTC, Size: 0.01, Side: LONG
   
6. Trade Executor → Creates position
   ✓ Position ID: xxx
   ✓ Entry: $45000
   
7. Position Monitor → Tracks position
   ✓ Current: $45100
   ✓ P&L: +$1.00 (+0.22%)
```

---

## Troubleshooting

### Workers Not Processing Signals

**Check:**
```bash
# 1. Database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM signals WHERE venue = 'HYPERLIQUID';"

# 2. Workers running
ps aux | grep worker

# 3. Logs for errors
grep -i error logs/trade-executor.log
```

### Python Service Connection Error

```bash
# Check service
curl http://localhost:5001/health

# If not running
HYPERLIQUID_TESTNET=true python3 services/hyperliquid-service.py
```

### No Positions Opening

**Common issues:**
1. Agent wallet not funded
2. Wrong network (mainnet vs testnet)
3. No active deployments
4. Module not enabled

**Debug:**
```bash
# Check agent balance
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_AGENT_ADDRESS"}'

# Check deployments
npx tsx scripts/check-deployments.ts
```

### Positions Not Closing

Check position monitor is running:
```bash
ps aux | grep position-monitor

# Restart if needed
npm run worker:position-monitor
```

---

## Stopping Workers

### Stop All Workers:

```bash
# Using script
./workers/stop-workers.sh

# Or manually
pkill -f "trade-executor"
pkill -f "signal-generator"
pkill -f "position-monitor"
pkill -f "hyperliquid-service"
```

### Stop Individual Worker:

```bash
# Find PID
ps aux | grep trade-executor

# Kill by PID
kill <PID>
```

---

## Production Checklist

Before going to mainnet:

- [ ] All workers tested on testnet
- [ ] Signals generating correctly
- [ ] Trades executing successfully
- [ ] Positions tracking properly
- [ ] P&L calculations accurate
- [ ] Stop losses working
- [ ] Trailing stops working
- [ ] Error handling tested
- [ ] Logs reviewing regularly
- [ ] Alerts configured

---

## Monitoring Dashboard

### Check Worker Status:

```bash
# Create status script
npx tsx scripts/worker-status.ts
```

Shows:
- ✅ Workers running
- 📊 Positions open
- 💰 Total P&L
- 🎯 Signals processed today
- ⚠️ Recent errors

---

## Next Steps

1. **Create a test agent:**
   ```bash
   # Via web app
   http://localhost:3000/create-agent
   # Select HYPERLIQUID venue
   ```

2. **Deploy agent:**
   - Run setup
   - Fund agent wallet
   - Module enabled

3. **Start workers:**
   ```bash
   npm run workers:start
   ```

4. **Monitor:**
   ```bash
   tail -f logs/trade-executor.log
   ```

5. **Watch for signals and trades!**

---

**Your workers are now ready to trade perpetuals on Hyperliquid testnet!** 🚀

Monitor logs, check positions, and verify everything works before moving to mainnet.

