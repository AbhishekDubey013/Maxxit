# Hyperliquid Quickstart 🚀

Get started with Hyperliquid perpetual trading in 5 minutes.

> **🧪 Want to test first?** See [TESTNET_QUICKSTART.md](TESTNET_QUICKSTART.md) for risk-free testing with fake funds!

## Prerequisites
- Node.js and npm installed
- Python 3.8+ installed
- Database setup (PostgreSQL)
- An agent deployed with HYPERLIQUID venue

## Step 1: Install Python Dependencies

```bash
pip install -r services/requirements-hyperliquid.txt
```

## Step 2: Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to your `.env`:
```bash
AGENT_WALLET_ENCRYPTION_KEY=<your-key-from-above>
HYPERLIQUID_SERVICE_URL=http://localhost:5001
```

## Step 3: Start Hyperliquid Service

```bash
# Terminal 1: Start Python service
python services/hyperliquid-service.py

# Should see:
# * Running on http://0.0.0.0:5001
```

## Step 4: Add Tokens (Already Done ✅)

The tokens have been added to the database! You can verify:

```bash
npx tsx scripts/add-hyperliquid-tokens.ts
```

## Step 5: Start Your App

```bash
# Terminal 2: Start main app
npm run dev
```

## Step 6: Deploy & Setup

1. **Create Agent** (if not already done):
   - Go to `/create-agent`
   - Select **HYPERLIQUID** as venue
   - Configure settings and deploy

2. **One-Click Setup**:
   - Go to `/my-deployments`
   - Find your Hyperliquid deployment
   - Click "**Enable Hyperliquid (One-Click)**"
   - Sign the transaction

3. **Bridge USDC**:
   - Go to https://app.hyperliquid.xyz/bridge
   - Connect your Safe wallet
   - Bridge USDC from Arbitrum to Hyperliquid
   - Destination: Your agent wallet address (shown after setup)

## Step 7: Start Trading!

Your agent will now:
- ✅ Monitor Twitter for signals
- ✅ Execute trades on Hyperliquid
- ✅ Track positions and P&L
- ✅ Close positions based on your strategy

## Quick Commands

### Check Service Health
```bash
curl http://localhost:5001/health
```

### Check Agent Balance
```bash
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "<agent-wallet-address>"}'
```

### Check Positions
```bash
curl -X POST http://localhost:5001/positions \
  -H "Content-Type: application/json" \
  -d '{"address": "<agent-wallet-address>"}'
```

### View Logs
```bash
tail -f logs/trade-executor.log
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Safe Wallet                        │
│                      (Arbitrum L1)                           │
│                                                              │
│  - User controls funds                                       │
│  - Module enabled for trading                                │
│  - USDC approved for bridge                                  │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ Bridge USDC
                   ↓
┌─────────────────────────────────────────────────────────────┐
│                   Hyperliquid L1                             │
│                                                              │
│  ┌───────────────────────────────────────────┐              │
│  │         Agent Wallet (EOA)                │              │
│  │  - Trades on behalf of user               │              │
│  │  - Private key encrypted in DB            │              │
│  │  - Executes perp positions                │              │
│  └───────────────────────────────────────────┘              │
│                                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   │ Profits & Fees
                   ↓
┌─────────────────────────────────────────────────────────────┐
│              Profit Receiver Address                         │
│                                                              │
│  - Receives trading fees                                     │
│  - Configurable profit split                                 │
└─────────────────────────────────────────────────────────────┘
```

## Supported Tokens

48 tokens including:
- **Major**: BTC, ETH, SOL, ARB, AVAX, BNB
- **DeFi**: UNI, AAVE, LINK, MKR, CRV
- **Memes**: DOGE, SHIB, PEPE, WIF, BONK
- **AI**: FET, RNDR, WLD
- **Gaming**: IMX, AXS, SAND
- And many more...

## Trading Limits

Default limits (configurable in module):
- Max leverage: **10x**
- Max position size: **$5,000**
- Max daily volume: **$20,000**
- Slippage: **1%**

## Non-Custodial Security ✅

- ✅ Users control Safe wallet on Arbitrum
- ✅ Agent wallet only trades (doesn't hold funds long-term)
- ✅ Private keys encrypted (AES-256-GCM)
- ✅ Users can withdraw from Hyperliquid anytime
- ✅ Trading limits enforced

## Troubleshooting

### Service Not Starting
```bash
# Check if port 5001 is in use
lsof -i :5001

# Use different port
HYPERLIQUID_SERVICE_PORT=5002 python services/hyperliquid-service.py
```

### Agent Wallet Not Found
Run setup again from My Deployments page.

### Insufficient Balance
Bridge more USDC from your Safe to Hyperliquid.

### Python Dependencies Error
```bash
pip install --upgrade pip
pip install -r services/requirements-hyperliquid.txt
```

## Production Checklist

- [ ] Generate secure encryption key (32 bytes)
- [ ] Set `AGENT_WALLET_ENCRYPTION_KEY` in Railway
- [ ] Deploy Python service separately in Railway
- [ ] Set `HYPERLIQUID_SERVICE_URL` to internal service URL
- [ ] Test with small amounts first ($10-100)
- [ ] Monitor logs and positions
- [ ] Set up alerts for errors

## Next Steps

1. ✅ Setup complete
2. Bridge initial funds (start with $100-1000)
3. Monitor first few trades
4. Adjust position sizing and leverage
5. Scale up as needed

## Support

- **Setup Guide**: See `HYPERLIQUID_SETUP.md`
- **API Reference**: Check `API_QUICK_REFERENCE.md`
- **Logs**: `logs/trade-executor.log`

Happy trading! 🎯

