# Hyperliquid Testnet - 5 Minute Setup 🧪

Get your Hyperliquid integration running on testnet with zero risk.

## Why Testnet First?

- ✅ **Zero Risk**: Test with fake USDC
- ✅ **Free Funds**: Get testnet USDC from faucet
- ✅ **Full Features**: Everything works like mainnet
- ✅ **Perfect for Demos**: Show without spending real money

## Quick Setup (5 Minutes)

### Step 1: Set Testnet Mode (30 seconds)

Add to your `.env` file:

```bash
HYPERLIQUID_TESTNET=true
```

Or export for current session:

```bash
export HYPERLIQUID_TESTNET=true
```

### Step 2: Start Python Service (1 minute)

```bash
# With environment variable
HYPERLIQUID_TESTNET=true python services/hyperliquid-service.py

# Should see:
# 🌐 Running on TESTNET
# 📡 Base URL: https://api.hyperliquid-testnet.xyz
# * Running on http://0.0.0.0:5001
```

### Step 3: Verify Testnet Mode (30 seconds)

```bash
curl http://localhost:5001/health
```

Should return:
```json
{
  "status": "ok",
  "service": "hyperliquid",
  "network": "testnet",
  "baseUrl": "https://api.hyperliquid-testnet.xyz"
}
```

Or use the status checker:

```bash
npx tsx scripts/check-testnet-status.ts
```

### Step 4: Start Your App (30 seconds)

```bash
npm run dev
```

### Step 5: Get Testnet USDC (2 minutes)

1. Go to **https://app.hyperliquid-testnet.xyz**
2. Connect your wallet (MetaMask)
3. Click the faucet button (usually top-right or in menu)
4. Request testnet USDC (you'll get 1000-10000 USDC)
5. Wait ~10 seconds for confirmation

### Step 6: Deploy & Test (1 minute)

1. **Create Agent** at `/create-agent`
   - Select **HYPERLIQUID** venue
   - Configure settings
   - Deploy

2. **Run Setup** at `/my-deployments`
   - Click "Enable Hyperliquid (One-Click)"
   - Copy agent wallet address shown

3. **Fund Agent Wallet**
   - On Hyperliquid testnet app
   - Send testnet USDC to agent wallet

4. **Done!** Agent will now trade on testnet

## Visual Verification

You should see testnet indicators:

```
Python Service:
🧪 Starting Hyperliquid Service (TESTNET MODE)
📍 Network: TESTNET (https://api.hyperliquid-testnet.xyz)
```

```
Health Check:
{
  "network": "testnet"  ← This should say "testnet"
}
```

## Test Your First Trade

```bash
# Manual test trade (0.001 BTC)
curl -X POST http://localhost:5001/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "<your-agent-private-key>",
    "coin": "BTC",
    "isBuy": true,
    "size": 0.001,
    "slippage": 0.01
  }'
```

## Testnet Resources

### Get Testnet Funds

**Hyperliquid Testnet USDC:**
- https://app.hyperliquid-testnet.xyz (built-in faucet)

**Arbitrum Sepolia ETH** (for gas):
- https://faucet.quicknode.com/arbitrum/sepolia
- https://www.alchemy.com/faucets/arbitrum-sepolia

### Testnet Explorers

- **Hyperliquid Testnet**: https://app.hyperliquid-testnet.xyz
- **Arbitrum Sepolia**: https://sepolia.arbiscan.io

### Test Tokens Available

Major pairs work on testnet:
- BTC, ETH, SOL
- ARB, AVAX, MATIC
- And many more...

## Common Issues

### ❌ Service shows "mainnet" instead of "testnet"

```bash
# Make sure environment variable is set
export HYPERLIQUID_TESTNET=true

# Restart service
pkill -f hyperliquid-service
python services/hyperliquid-service.py
```

### ❌ Can't get testnet USDC

1. Try the Hyperliquid Discord #testnet channel
2. Ask for testnet funds
3. Community is helpful!

### ❌ Position won't open

Check agent has balance:
```bash
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "<agent-address>"}'
```

### ❌ Wrong network error

Make sure:
- Python service: `HYPERLIQUID_TESTNET=true`
- App: `HYPERLIQUID_TESTNET=true` in .env
- Both should match!

## Full Test Script

```bash
#!/bin/bash
# Complete testnet setup

# 1. Set testnet mode
export HYPERLIQUID_TESTNET=true

# 2. Start Python service in background
python services/hyperliquid-service.py &
sleep 2

# 3. Check health
curl http://localhost:5001/health

# 4. Check testnet status
npx tsx scripts/check-testnet-status.ts

# 5. Start app
npm run dev

# Success! Go to http://localhost:3000
```

## Environment File for Testnet

Create `.env` with:

```bash
# Testnet mode
HYPERLIQUID_TESTNET=true

# Service URL
HYPERLIQUID_SERVICE_URL=http://localhost:5001

# Encryption key (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
AGENT_WALLET_ENCRYPTION_KEY=<your-key>

# Use Sepolia
USE_SEPOLIA=true

# Other keys...
TWITTER_BEARER_TOKEN=<your-key>
OPENAI_API_KEY=<your-key>
```

## Switch Back to Mainnet

```bash
# 1. Unset testnet mode
unset HYPERLIQUID_TESTNET
# OR
export HYPERLIQUID_TESTNET=false

# 2. Update .env
# Remove or set: HYPERLIQUID_TESTNET=false

# 3. Restart services
pkill -f hyperliquid-service
python services/hyperliquid-service.py &
npm run dev
```

## Pro Tips

1. **Label testnet agents**: Add "[TESTNET]" to agent names
2. **Separate database**: Use different DB for testnet/mainnet
3. **Test everything**: Full flow before mainnet
4. **Document results**: Keep notes on what works

## Next Steps

Once testnet works:

1. ✅ Test signal generation
2. ✅ Test position opening
3. ✅ Test position closing
4. ✅ Test P&L tracking
5. ✅ Test profit collection
6. 🚀 Switch to mainnet!

## Support

- **Status Check**: `npx tsx scripts/check-testnet-status.ts`
- **Logs**: `tail -f logs/trade-executor.log`
- **Discord**: [Hyperliquid Discord](https://discord.gg/hyperliquid) #testnet

---

**That's it!** You're now running on testnet. Test freely, break things, learn, and then move to mainnet when ready. 🎯

