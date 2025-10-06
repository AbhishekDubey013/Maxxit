# Quick Start - Trading in 5 Minutes 🚀

**Get your system trading REAL crypto in minutes!**

---

## Prerequisites

- ✅ System running (`npm run dev`)
- ✅ Database populated (tokens, venues)
- ✅ Safe wallet on Arbitrum with USDC
- ✅ ETH for gas in executor wallet

---

## Step 1: Setup Executor Wallet (2 minutes)

### Create New Wallet
```bash
# In Node.js console or create create-wallet.js:
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address, '\nPrivate Key:', w.privateKey);"
```

**Output:**
```
Address: 0x1234567890AbCdEf1234567890AbCdEf12345678
Private Key: 0xabcdef...
```

### Add to .env
```bash
# Add this line to .env
echo 'EXECUTOR_PRIVATE_KEY="0xabcdef..."' >> .env
```

### Fund with ETH
```
Send 0.1 ETH to executor address on Arbitrum
For gas fees (~$5-10 worth)
```

---

## Step 2: Setup Safe Wallet (2 minutes)

### Create Safe (if you don't have one)
1. Go to https://app.safe.global
2. Connect your wallet
3. Create new Safe on Arbitrum
4. Add owners:
   - Your main wallet
   - Executor address (from Step 1)
5. Set threshold to **1** (for testing)

### Fund Safe
```
Send USDC to Safe address on Arbitrum
Minimum: $100 for testing
Recommended: $1000+ for real trading
```

### Verify
```bash
curl "http://localhost:5000/api/safe/status?safeAddress=YOUR_SAFE_ADDRESS&chainId=42161" | jq
```

**Should show:**
```json
{
  "valid": true,
  "balances": {
    "usdc": { "amount": 1000.0 },
    "eth": { "amount": 0.05 }
  },
  "readiness": {
    "ready": true,
    "status": "READY"
  }
}
```

---

## Step 3: Deploy Agent (30 seconds)

### Get Agent ID
```bash
# List available agents
curl "http://localhost:5000/api/agents" | jq '.[] | {id, name, venue}'
```

**Pick an agent (example):**
```json
{
  "id": "ca6a0073-091d-4164-bbe4-dda5c178ed04",
  "name": "GMX Momentum Bot",
  "venue": "GMX"
}
```

### Deploy
```bash
curl -X POST http://localhost:5000/api/deployments/create \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "ca6a0073-091d-4164-bbe4-dda5c178ed04",
    "userWallet": "0xYourMainWallet...",
    "safeWallet": "0xYourSafeWallet..."
  }' | jq
```

**Success Response:**
```json
{
  "success": true,
  "deployment": {
    "id": "deployment-uuid",
    "agentName": "GMX Momentum Bot",
    "venue": "GMX",
    "status": "ACTIVE"
  },
  "safeInfo": {
    "balances": {
      "usdc": 1000.0,
      "eth": 0.05
    }
  },
  "message": "Agent deployed successfully"
}
```

---

## Step 4: Generate Signal (30 seconds)

### Option A: Wait for Auto-Generation
```
System automatically generates signals every 6 hours
from ingested tweets
```

### Option B: Generate Manually
```bash
# Get CT account ID
curl "http://localhost:5000/api/ct-accounts" | jq '.[] | {id, handle}'

# Generate signals
curl -X POST "http://localhost:5000/api/admin/generate-signals-simple?ctAccountId=2e1befda-4ee2-4267-929b-90a3eb4667b2" | jq
```

### View Signals
```bash
curl "http://localhost:5000/api/db/signals?_limit=5&_sort=-createdAt" | jq '.[] | {id, token: .tokenSymbol, venue, side, leverage: .sizeModel.leverage}'
```

**Example Signal:**
```json
{
  "id": "b927b15b-c9c5-46da-8857-ae1a0528eb3c",
  "token": "BTC",
  "venue": "GMX",
  "side": "LONG",
  "leverage": 3
}
```

---

## Step 5: Execute Trade! (10 seconds) 🚀

### Execute
```bash
curl -X POST http://localhost:5000/api/admin/execute-trade \
  -H "Content-Type: application/json" \
  -d '{"signalId": "b927b15b-c9c5-46da-8857-ae1a0528eb3c"}' | jq
```

### Success Response
```json
{
  "success": true,
  "txHash": "0x1234567890abcdef...",
  "positionId": "position-uuid",
  "message": "Trade executed successfully"
}
```

### View on Explorer
```
Arbitrum: https://arbiscan.io/tx/0x1234567890abcdef...
```

### Check Position
```bash
curl "http://localhost:5000/api/db/positions?id=position-uuid" | jq
```

**Position Details:**
```json
{
  "id": "position-uuid",
  "venue": "GMX",
  "tokenSymbol": "BTC",
  "side": "LONG",
  "collateral": 50,
  "size": 150,
  "leverage": "3",
  "status": "OPEN",
  "txHash": "0x1234567890abcdef...",
  "createdAt": "2025-10-05T12:00:00Z"
}
```

---

## Monitoring Your Trade

### Check Position Status
```bash
# Refresh position data
curl "http://localhost:5000/api/db/positions?id=position-uuid" | jq
```

### View in GMX UI
```
1. Go to https://app.gmx.io
2. Connect Safe wallet
3. View Positions tab
4. See your BTC LONG position
```

### Check Safe Balance
```bash
curl "http://localhost:5000/api/safe/status?safeAddress=YOUR_SAFE&chainId=42161" | jq '.balances'
```

---

## Closing Your Position

### Manual Close
```bash
curl -X POST http://localhost:5000/api/admin/close-position \
  -H "Content-Type: application/json" \
  -d '{"positionId": "position-uuid"}' | jq
```

### Success Response
```json
{
  "success": true,
  "txHash": "0xdef456...",
  "positionId": "position-uuid",
  "message": "Position closed successfully"
}
```

### Check Results
```bash
# Position should now be CLOSED
curl "http://localhost:5000/api/db/positions?id=position-uuid" | jq '.status'

# Check USDC balance (should have increased if profitable)
curl "http://localhost:5000/api/safe/status?safeAddress=YOUR_SAFE&chainId=42161" | jq '.balances.usdc'
```

---

## What Just Happened? 🎉

You just:
1. ✅ Created an executor wallet
2. ✅ Set up a Safe wallet with USDC
3. ✅ Deployed a trading agent
4. ✅ Generated a trading signal
5. ✅ **Executed a REAL trade on-chain!**
6. ✅ Monitored the position
7. ✅ (Optionally) Closed the position

**Your system is now trading real crypto automatically!**

---

## Next Steps

### Automate Everything
```bash
# System already runs automatically:
# - Tweet ingestion: Every 6 hours
# - Classification: Automatic
# - Signal generation: Automatic
# - Trade execution: Manual trigger (or add automation)
```

### Add More Agents
```bash
# Deploy multiple agents for different strategies
curl -X POST http://localhost:5000/api/deployments/create \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "spot-agent-uuid",
    "userWallet": "0xYourWallet...",
    "safeWallet": "0xYourSafe..."
  }'
```

### Monitor Performance
```bash
# View all positions
curl "http://localhost:5000/api/db/positions?_sort=-createdAt" | jq

# Check P&L (when implemented)
# Calculate: (exitPrice - entryPrice) / entryPrice * size
```

---

## Troubleshooting

### "No signer configured"
**Problem:** EXECUTOR_PRIVATE_KEY not set

**Fix:**
```bash
echo 'EXECUTOR_PRIVATE_KEY="0x..."' >> .env
# Restart server
```

### "Insufficient funds for gas"
**Problem:** Executor wallet has no ETH

**Fix:**
```
Send 0.1 ETH to executor address on Arbitrum
```

### "Transaction reverted"
**Problem:** Executor not Safe owner

**Fix:**
1. Go to https://app.safe.global
2. Open your Safe
3. Settings → Owners
4. Add executor address
5. Try again

### "Cannot execute trade"
**Problem:** Pre-trade validation failed

**Check:**
```bash
# View detailed error
curl -X POST http://localhost:5000/api/admin/execute-trade \
  -H "Content-Type: application/json" \
  -d '{"signalId": "signal-uuid"}' | jq
```

**Common issues:**
- Not enough USDC
- Not enough ETH for gas
- Token not available on venue
- Market not found

---

## Pro Tips

### Test with Small Amounts First
```
Start with $100-200 USDC
Test each venue (SPOT, GMX)
Verify everything works
Then scale up
```

### Use Multi-Sig for Large Amounts
```
Threshold: 2 of 3
Owners: [Your wallet, Executor, Backup]
Executor proposes, you approve
Extra security for large trades
```

### Monitor Gas Costs
```bash
# Check executor ETH balance
curl "http://localhost:5000/api/safe/status?safeAddress=EXECUTOR_ADDRESS&chainId=42161" | jq '.balances.eth'

# Refill when low
```

### Track All Trades
```bash
# Export positions to CSV (manual for now)
curl "http://localhost:5000/api/db/positions" | jq -r '.[] | [.createdAt, .venue, .tokenSymbol, .side, .size, .status] | @csv'
```

---

## 🎉 You're Trading!

Your automated crypto trading system is now **LIVE** and executing real trades!

**Happy trading!** 🚀💰

---

## Documentation

- `TRANSACTION_SUBMISSION_COMPLETE.md` - Complete guide
- `ENV_SETUP.md` - Environment setup
- `API_QUICK_REFERENCE.md` - All API endpoints
- `EXECUTION_LAYER_COMPLETE.md` - Technical docs

---

## Support

If you encounter issues:
1. Check logs: `npm run dev` terminal
2. Review documentation
3. Verify Safe wallet configuration
4. Check executor wallet has ETH
5. Ensure EXECUTOR_PRIVATE_KEY is set

**Good luck with your trading!** 🎯
