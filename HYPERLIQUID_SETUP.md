# Hyperliquid Setup Guide

This guide walks through setting up Hyperliquid perpetual trading for Maxxit agents.

## Overview

Hyperliquid integration allows agents to trade perpetual positions on Hyperliquid with:
- ✅ Non-custodial flow (users control funds via Safe wallet)
- ✅ Agent wallet executes trades on behalf of user
- ✅ Profit receiver can collect fees
- ✅ Up to 50x leverage on supported tokens
- ✅ Low fees and high liquidity

## Architecture

```
User's Safe Wallet (Arbitrum)
    ↓ Bridge USDC
Hyperliquid L1
    ↓ Deposit to Agent Wallet
Agent Wallet trades on Hyperliquid
    ↓ Profits/Fees
Profit Receiver Address
```

## Setup Steps

### 1. Install Python Dependencies

The Hyperliquid adapter uses a Python service for SDK integration:

```bash
cd services/
pip install -r requirements-hyperliquid.txt
```

### 2. Start Hyperliquid Service

```bash
# Start the Python service (default port 5001)
python services/hyperliquid-service.py

# Or specify a custom port
HYPERLIQUID_SERVICE_PORT=5002 python services/hyperliquid-service.py
```

### 3. Configure Environment Variables

Add to your `.env`:

```bash
# Hyperliquid Service URL (default: http://localhost:5001)
HYPERLIQUID_SERVICE_URL=http://localhost:5001

# Agent wallet encryption key (32 bytes hex)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AGENT_WALLET_ENCRYPTION_KEY=your_32_byte_hex_key_here
```

### 4. Add Hyperliquid Tokens to Database

```bash
npx ts-node scripts/add-hyperliquid-tokens.ts
```

This adds 50+ popular tokens available on Hyperliquid, including:
- BTC, ETH, SOL, ARB, AVAX
- DeFi tokens: UNI, AAVE, LINK
- Meme coins: DOGE, SHIB, PEPE, WIF
- AI tokens: FET, RNDR, WLD
- And many more...

### 5. Deploy Agent with Hyperliquid Venue

Create an agent and select **HYPERLIQUID** as the venue when deploying.

### 6. Run One-Click Setup

From the "My Deployments" page:

1. Click "**Enable Hyperliquid (One-Click)**"
2. This will:
   - Enable the trading module on your Safe
   - Approve USDC for Hyperliquid bridge
   - Register an agent wallet for trading
3. Sign the transaction in your wallet

### 7. Bridge USDC to Hyperliquid

After setup, you need to bridge USDC from your Safe to Hyperliquid:

**Option A: Use Hyperliquid Bridge UI**
1. Go to https://app.hyperliquid.xyz/bridge
2. Connect your Safe wallet
3. Bridge USDC from Arbitrum to Hyperliquid

**Option B: Use API**
```bash
curl -X POST http://localhost:5000/api/hyperliquid/bridge-usdc \
  -H "Content-Type: application/json" \
  -d '{
    "safeAddress": "0x...",
    "amount": 100,
    "destination": "0x..." 
  }'
```

## Trading Flow

1. **Signal Generation**: Agents monitor Twitter and generate signals
2. **Trade Execution**: When a signal matches the agent's venue (HYPERLIQUID):
   - Get agent wallet private key (encrypted in DB)
   - Call Python service to execute trade
   - Python service uses Hyperliquid SDK to place order
3. **Position Tracking**: Positions are tracked in the database
4. **Position Monitoring**: Worker monitors positions and closes based on:
   - Take profit levels
   - Stop loss levels
   - Trailing stop logic

## Security Features

### Agent Wallet Security
- ✅ One agent wallet per deployment
- ✅ Private keys encrypted in database (AES-256-GCM)
- ✅ Keys never exposed to frontend
- ✅ Trading limits enforced in module

### Trading Limits
Set in the trading module:
- Max leverage: 10x (configurable)
- Max position size: 5000 USDC (configurable)
- Max daily volume: 20000 USDC (configurable)
- Whitelisted tokens only

### Non-Custodial Control
- ✅ Users control Safe wallet on Arbitrum
- ✅ Users can bridge funds back anytime
- ✅ Users can withdraw from Hyperliquid directly
- ✅ Agent wallet only trades, doesn't hold funds long-term

## API Endpoints

### Register Agent Wallet
```bash
POST /api/hyperliquid/register-agent
{
  "safeAddress": "0x..."
}
```

### Bridge USDC
```bash
POST /api/hyperliquid/bridge-usdc
{
  "safeAddress": "0x...",
  "amount": 100,
  "destination": "0x..."
}
```

### Get Balance (Python Service)
```bash
POST http://localhost:5001/balance
{
  "address": "0x..."
}
```

### Get Positions (Python Service)
```bash
POST http://localhost:5001/positions
{
  "address": "0x..."
}
```

### Open Position (Python Service)
```bash
POST http://localhost:5001/open-position
{
  "agentPrivateKey": "0x...",
  "coin": "BTC",
  "isBuy": true,
  "size": 0.01,
  "slippage": 0.01
}
```

## Monitoring

### Check Hyperliquid Service Health
```bash
curl http://localhost:5001/health
```

### View Agent Wallet
```bash
npx ts-node scripts/check-hyperliquid-agent.ts <deploymentId>
```

### Monitor Positions
The position monitor automatically tracks Hyperliquid positions:
```bash
npm run workers:position-monitor
```

## Troubleshooting

### Python Service Not Running
```bash
# Check if service is running
curl http://localhost:5001/health

# If not, start it
python services/hyperliquid-service.py
```

### Agent Wallet Not Registered
Run setup again from My Deployments page, or manually:
```bash
curl -X POST http://localhost:5000/api/hyperliquid/register-agent \
  -H "Content-Type: application/json" \
  -d '{"safeAddress": "0x..."}'
```

### Insufficient Balance
Bridge more USDC from your Safe to Hyperliquid:
```bash
# Check balance
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "0x..."}'
```

### Order Rejected
Check:
- Market exists for token (run `scripts/check-hyperliquid-markets.ts`)
- Sufficient balance
- Size meets minimum requirements
- Leverage within limits

## Production Deployment

### Railway Setup

1. Add Python buildpack to Railway:
```json
{
  "build": {
    "builder": "heroku/buildpacks:20"
  }
}
```

2. Add environment variables in Railway:
```
HYPERLIQUID_SERVICE_URL=<internal-service-url>
AGENT_WALLET_ENCRYPTION_KEY=<your-key>
```

3. Deploy Python service as separate Railway service:
```bash
# In Railway, create new service
# Point to services/hyperliquid-service.py
# Set PORT environment variable
```

## Fee Structure

Hyperliquid fees collected by profit receiver:
- **Maker**: -0.0002% (rebate)
- **Taker**: 0.025%
- **Liquidation**: 0.5%

Agent can configure profit sharing:
- 10-30% of profits go to profit receiver
- Set via `profit_receiver_address` in agent config

## Support

For issues or questions:
1. Check logs: `tail -f logs/trade-executor.log`
2. Check Python service: `curl http://localhost:5001/health`
3. Check database: `npx ts-node scripts/check-hyperliquid-status.ts`

## Example: Complete Setup

```bash
# 1. Install dependencies
pip install -r services/requirements-hyperliquid.txt

# 2. Start Python service
python services/hyperliquid-service.py &

# 3. Add tokens
npx ts-node scripts/add-hyperliquid-tokens.ts

# 4. Start main app
npm run dev

# 5. Deploy agent (select HYPERLIQUID venue)

# 6. Run one-click setup from My Deployments

# 7. Bridge USDC and start trading!
```

## Resources

- [Hyperliquid Docs](https://hyperliquid.gitbook.io/)
- [Hyperliquid Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)
- [Hyperliquid App](https://app.hyperliquid.xyz)

