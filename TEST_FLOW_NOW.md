# 🧪 Test Complete Flow NOW

## Quick Test (2 minutes)

### Step 1: Make Sure Workers Are Running

```bash
# Check if running
ps aux | grep -E "trade-executor|hyperliquid-service"

# If not running, start them:
./start-testnet-complete.sh
```

### Step 2: Run the Complete Flow Test

```bash
npx tsx scripts/test-complete-flow.ts
```

This will:
1. ✅ Create a synthetic tweet
2. ✅ Convert it to a signal
3. ✅ Execute as a position on Hyperliquid testnet
4. ✅ Show you the complete flow

**Expected output:**
```
📝 Synthetic Tweet Created
   "BTC looking extremely bullish here..."

🤖 Processing with LLM
   ✅ Token: BTC
   ✅ Side: LONG

💾 Signal Created
   Signal ID: xxx
   Confidence: 89%

⏳ Waiting for Trade Executor
   Checking... (attempt 1/12)
   
✅ Position Opened!
   Entry Price: $45,000
   Quantity: 0.01 BTC
   Position Value: $450

🎉 COMPLETE FLOW TEST SUCCESSFUL!
```

### Step 3: Watch in Real-Time (Optional)

In another terminal:

```bash
./scripts/watch-flow.sh
```

This shows live logs from all workers.

---

## What Gets Tested

| Step | What Happens | Expected Result |
|------|--------------|-----------------|
| 1 | Check prerequisites | ✅ Service running, Agent exists |
| 2 | Create synthetic tweet | ✅ Realistic trading tweet |
| 3 | Process with LLM | ✅ Extract token, side, venue |
| 4 | Create signal | ✅ Signal in database |
| 5 | Trade executor picks up | ✅ Within 10 seconds |
| 6 | Position opens | ✅ On Hyperliquid testnet |
| 7 | Verify on Hyperliquid | ✅ Position visible |

---

## Synthetic Tweets Used

The test randomly picks from:

1. **BTC Long:**
   > "BTC looking extremely bullish here. Breaking out above resistance. Going long with 2x leverage. Target $50k."

2. **ETH Short:**
   > "ETH/USD short setup forming. Breaking below support at $2400. Risk/reward looks good. Targeting $2200."

3. **SOL Long:**
   > "SOL is coiling up for a big move. Accumulating here for a long position. Could see $120+ soon."

---

## Verify Results

### Check Position in Database
```bash
npx tsx scripts/check-positions.ts
```

### Check on Hyperliquid App
```bash
open https://app.hyperliquid-testnet.xyz
```

### Check Logs
```bash
# Trade execution
tail -f logs/trade-executor.log

# Position monitoring
tail -f logs/position-monitor.log

# All logs
tail -f logs/*.log
```

---

## Troubleshooting

### "No active HYPERLIQUID agent found"
```bash
# Create agent at:
http://localhost:3000/create-agent

# Select HYPERLIQUID venue
# Deploy and enable module
```

### "Service not running"
```bash
# Start services
./start-testnet-complete.sh

# Or manually
HYPERLIQUID_TESTNET=true python3 services/hyperliquid-service.py
```

### "Position not created within 60 seconds"
```bash
# Check trade executor logs
tail -f logs/trade-executor.log

# Common issues:
# 1. Agent wallet not funded
# 2. Module not enabled
# 3. Wrong network (mainnet vs testnet)
```

### "Agent wallet doesn't have funds"
```bash
# Get testnet USDC
https://app.hyperliquid-testnet.xyz

# Transfer to agent wallet address
# (shown in deployment setup)
```

---

## Expected Timeline

```
T+0s:  Script starts, creates synthetic tweet
T+1s:  Signal created in database
T+10s: Trade executor picks up signal
T+12s: Position opened on Hyperliquid
T+15s: Position visible on app
T+30s: Position monitor starts tracking
```

Total: ~15 seconds from tweet to position!

---

## What to Watch For

### ✅ Success Indicators

- Signal created with ID
- Trade executor log shows "Processing signal"
- Position created in database
- Position visible on Hyperliquid app
- Position monitor tracking P&L

### ❌ Failure Indicators

- "No active agent found"
- "Service not running"
- "Position not created within 60 seconds"
- Errors in logs

---

## After Successful Test

Your system is now:
- ✅ Converting tweets to signals
- ✅ Executing positions automatically
- ✅ Tracking P&L
- ✅ Ready for real Twitter monitoring

Next:
1. Monitor real Twitter accounts
2. Adjust position sizing
3. Test stop loss/take profit
4. Scale up when comfortable

---

## Run Test Now

```bash
# Terminal 1: Start services (if not running)
./start-testnet-complete.sh

# Terminal 2: Run test
npx tsx scripts/test-complete-flow.ts

# Terminal 3: Watch logs (optional)
./scripts/watch-flow.sh
```

**Expected time: 15-30 seconds**

Go! 🚀

