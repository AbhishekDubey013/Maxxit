# 🧪 Testing Ostium $5k Position (Open & Close)

## Prerequisites

The platform wallet `0x3828dFCBff64fD07B963Ef11BafE632260413Ab3` has:
- ✅ $13,869 USDC balance
- ✅ 4 active positions already
- ✅ Trading successfully on Ostium testnet

## Minimum Position Size

**Per Ostium Support:** Minimum position size is **$5,000 USD** on both testnet and mainnet.

## How to Run the Test

### Step 1: Set Private Key

```bash
# Set the platform wallet private key
export PLATFORM_WALLET_KEY='0xYourPrivateKeyHere'

# OR use executor key
export EXECUTOR_PRIVATE_KEY='0xYourPrivateKeyHere'
```

### Step 2: Run Test

```bash
# Using the shell script
./scripts/test-5k-position.sh

# OR directly with npx
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com \
npx tsx scripts/test-ostium-open-close.ts
```

## What the Test Does

1. ✅ Checks initial USDC balance
2. ✅ Lists all current positions
3. ✅ **Opens BTC position:**
   - Size: $5,000 USD
   - Leverage: 3x
   - Side: Long
4. ⏳ Waits 5 seconds for settlement
5. ✅ Verifies position was opened
6. ✅ **Closes the BTC position**
7. ⏳ Waits 5 seconds for closure
8. ✅ Verifies position was closed
9. ✅ Shows final balance & PnL

## Expected Output

```
🧪 Testing Ostium Open & Close Position
Platform: 0x3828dFCBff64fD07B963Ef11BafE632260413Ab3

💰 Initial balance:
  USDC: $13869.086458

📊 Current positions:
  Total: 4 open positions
    ADA/USD: long $996.5 (3x)
    SOL/USD: long $998.6 (3x)
    HYPE/USD: long $996.5 (3x)
    XRP/USD: long $996.5 (3x)

🚀 Opening BTC position...
   Size: $5000, Leverage: 3x (Ostium min: $5k)
   ✅ Position opened!
   Trade ID: 0x...

⏳ Waiting 5 seconds for position to settle...

📊 Positions after opening:
  Total: 5 open positions
  ✅ Found BTC position:
     Size: $5000
     Entry: $96336.90
     Leverage: 3x
     PnL: $0.00

🔻 Closing BTC position...
   ✅ Position closed!

⏳ Waiting 5 seconds for closure to settle...

📊 Final positions:
  Total: 4 open positions
  ✅ BTC position successfully closed!

💰 Final balance:
  USDC: $13869.05
  Change: -$0.04

✅ Test complete!

Summary:
  - Opened BTC position: ✅
  - Closed BTC position: ✅
  - Balance change: -$0.04
```

## Position Monitoring

The Ostium position monitor (`workers/position-monitor-ostium.ts`) will:
- ✅ Auto-discover this position
- ✅ Create DB record
- ✅ Monitor price in real-time
- ✅ Track PnL
- ✅ Execute trailing stops if configured

## Troubleshooting

### Error: "Private key not found"
- Set `PLATFORM_WALLET_KEY` or `EXECUTOR_PRIVATE_KEY` environment variable

### Error: "BelowMinLevPos()"
- Position size is too small
- Minimum is $5,000 per Ostium support

### Error: "Insufficient allowance"
- Need to approve USDC spending for Ostium Trading Contract
- Contract: `0x2A9B9c988393f46a2537B0ff11E98c2C15a95afe`

### Error: "Insufficient balance"
- Platform wallet needs more USDC
- Current balance: $13,869 (sufficient for $5k position)

## Integration with Agent System

When an agent (like the one assigned to `0xa10846a...72fac5`) places a trade:

1. **Agent generates signal** → Signal added to DB
2. **Trade executor** → Calls Ostium service with $5k+ position
3. **Position opened** → Using agent delegation (agent trades on behalf of user)
4. **Position monitor** → Discovers and tracks position
5. **Auto-close** → When TP/SL/trailing stop hit

All positions are tracked in the `positions` table with venue='OSTIUM'.

## Notes

- Platform wallet is actively trading (4 positions currently)
- Ostium service is live at `https://maxxit-1.onrender.com`
- Minimum position: $5,000 (per Ostium support)
- Testnet: Arbitrum Sepolia
- Network: Same minimum on mainnet

---

**Ready to test!** Just set your `PLATFORM_WALLET_KEY` and run the script. 🚀

