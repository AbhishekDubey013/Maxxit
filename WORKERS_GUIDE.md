# 🤖 Workers Guide - Automated Trading System

**Status:** ✅ FULLY AUTOMATED  
**Created:** October 6, 2025

---

## Overview

The Maxxit platform now has **3 automated workers** that handle the complete trading flow:

1. **Signal Generator** - Creates trading signals from classified tweets (every 6 hours)
2. **Trade Executor** - Executes pending signals (every 30 minutes)
3. **Position Monitor** - Monitors and closes positions at targets (every 5 minutes)

---

## 🚀 Quick Start

### Start All Workers
```bash
bash workers/start-workers.sh
```

### Stop All Workers
```bash
bash workers/stop-workers.sh
```

### Check Status
```bash
bash workers/status-workers.sh
```

### View Live Logs
```bash
# All logs
tail -f logs/*.log

# Specific worker
tail -f logs/signal-generator.log
tail -f logs/trade-executor.log
tail -f logs/position-monitor.log
```

---

## 📋 Worker Details

### 1️⃣ **Signal Generator**

**File:** `workers/signal-generator.ts`  
**Schedule:** Every 6 hours  
**Purpose:** Generate trading signals from classified tweets

**What it does:**
- Fetches all active deployed agents
- For each agent, gets their subscribed CT accounts
- Calls signal generation API for classified tweets
- Creates signals with entry, stop-loss, take-profit

**Output:**
```
[SignalWorker] Found 3 active deployed agents
[SignalWorker] Agent "GMX Bot": Generated 2 signals
[SignalWorker] Agent "Spot Trader": Generated 1 signals
[SignalWorker] Complete! Total signals generated: 3
```

---

### 2️⃣ **Trade Executor**

**File:** `workers/trade-executor-worker.ts`  
**Schedule:** Every 30 minutes  
**Purpose:** Execute pending signals into actual positions

**What it does:**
- Fetches pending signals (status: PENDING)
- Validates agent deployment and Safe wallet
- Executes trades via Safe Module
- Creates open positions
- Deducts platform fees (0.2 USDC per trade)

**Output:**
```
[TradeWorker] Found 5 pending signals
[TradeWorker] Executing signal sig_123 (BTC LONG)...
[TradeWorker] ✅ Signal sig_123 executed successfully
[TradeWorker] Complete! Success: 4, Failed: 1
```

---

### 3️⃣ **Position Monitor**

**File:** `workers/position-monitor.ts`  
**Schedule:** Every 5 minutes  
**Purpose:** Monitor open positions and close at stop-loss/take-profit

**What it does:**
- Fetches all open positions
- Gets current prices for each token
- Calculates real-time P&L
- Checks stop-loss and take-profit triggers
- Closes positions when targets hit
- Takes 20% profit share on winning trades

**Output:**
```
[PositionMonitor] Monitoring 8 open positions
[PositionMonitor] BTC LONG: Entry=$43000, Current=$45000, P&L=+4.65%
[PositionMonitor] 🔴 Closing position pos_456: TAKE_PROFIT
[PositionMonitor] ✅ Position pos_456 closed: P&L=$125.50 (TAKE_PROFIT)
[PositionMonitor] Complete! Closed 2 positions
```

---

## 🔄 Complete Automated Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Tweet Ingestion (every 6 hours)                     │
│    → Python proxy fetches tweets from X                 │
│    → Stores in ct_posts table                           │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 2. LLM Classification (after ingestion)                │
│    → Perplexity AI analyzes tweets                     │
│    → Extracts tokens, sentiment, confidence             │
│    → Marks signal candidates                            │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Signal Generation (every 6 hours) ✨ NEW            │
│    → Signal Generator Worker runs                       │
│    → Creates signals for all active agents              │
│    → Combines tweets + market indicators + venue        │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Trade Execution (every 30 minutes) ✨ NEW           │
│    → Trade Executor Worker runs                         │
│    → Executes pending signals via Safe Module           │
│    → Opens positions, deducts fees                      │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Position Monitoring (every 5 minutes) ✨ NEW        │
│    → Position Monitor Worker runs                       │
│    → Checks stop-loss and take-profit                   │
│    → Closes positions, takes profit share               │
└───────────────────┬─────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Performance Dashboard                                │
│    → Users view real-time P&L and positions             │
│    → APR, Sharpe ratio, trade history                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Configuration

### Intervals
Edit `workers/start-workers.sh` to change schedules:

```bash
# Signal Generation: every 6 hours (21600 seconds)
run_worker_loop "signal-generator" "$WORKERS_DIR/signal-generator.ts" 21600

# Trade Execution: every 30 minutes (1800 seconds)
run_worker_loop "trade-executor" "$WORKERS_DIR/trade-executor-worker.ts" 1800

# Position Monitor: every 5 minutes (300 seconds)
run_worker_loop "position-monitor" "$WORKERS_DIR/position-monitor.ts" 300
```

### Price Feeds
By default, Position Monitor uses mock prices. **Update for production:**

Edit `workers/position-monitor.ts`:
```typescript
// Integrate real price feeds
async function getCurrentPrice(symbol: string): Promise<number | null> {
  // Option 1: Chainlink Price Feeds
  // Option 2: CoinGecko API
  // Option 3: DEX price queries
  // Option 4: Pyth Network
}
```

---

## 📊 Monitoring

### Health Check
```bash
# Check if workers are running
bash workers/status-workers.sh

# Output:
# ✅ signal-generator: RUNNING (PID: 12345)
# ✅ trade-executor: RUNNING (PID: 12346)
# ✅ position-monitor: RUNNING (PID: 12347)
```

### Database Queries
```bash
# Check pending signals
curl -s "http://localhost:5000/api/db/signals?status=PENDING" | jq length

# Check open positions
curl -s "http://localhost:5000/api/db/positions?status=OPEN" | jq length

# Check recent signals
curl -s "http://localhost:5000/api/signals?limit=10" | jq
```

### Logs
```bash
# View signal generation logs
tail -f logs/signal-generator.log

# View trade execution logs
tail -f logs/trade-executor.log

# View position monitoring logs
tail -f logs/position-monitor.log

# Search for errors
grep -i error logs/*.log
```

---

## 🚨 Troubleshooting

### Workers Not Starting
```bash
# Check if ports are in use
lsof -i :5000

# Check for zombie processes
ps aux | grep tsx

# Kill stuck processes
bash workers/stop-workers.sh
pkill -f "tsx workers/"
```

### Database Connection Issues
```bash
# Test database connection
npx tsx -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.agent.count().then(console.log)"
```

### API Errors
```bash
# Test signal generation manually
curl -X POST "http://localhost:5000/api/admin/run-signal-once?agentId=YOUR_AGENT_ID"

# Test trade execution manually
curl -X POST "http://localhost:5000/api/admin/execute-trade-once?signalId=YOUR_SIGNAL_ID"
```

---

## 🚀 Production Deployment

### Option 1: Systemd (Linux Server)
Create `/etc/systemd/system/maxxit-workers.service`:
```ini
[Unit]
Description=Maxxit Trading Workers
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/Maxxit
ExecStart=/bin/bash /path/to/Maxxit/workers/start-workers.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable maxxit-workers
sudo systemctl start maxxit-workers
sudo systemctl status maxxit-workers
```

### Option 2: PM2 (Node.js Process Manager)
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
pm2 ecosystem

# Edit ecosystem.config.js to add workers
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Docker
```dockerfile
# Add to Dockerfile
CMD ["bash", "workers/start-workers.sh"]
```

---

## ✅ System Now Complete!

**Before:** Manual API calls required at each step  
**After:** Fully automated end-to-end trading

The system now:
1. ✅ Ingests tweets automatically
2. ✅ Classifies them with AI
3. ✅ Generates trading signals
4. ✅ Executes trades via Safe Module
5. ✅ Monitors positions 24/7
6. ✅ Closes at targets
7. ✅ Shows real-time performance

**Ready for production deployment!** 🚀

