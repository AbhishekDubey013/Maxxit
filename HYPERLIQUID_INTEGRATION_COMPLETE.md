# Hyperliquid Integration - Complete Implementation

## Overview

This document describes the complete Hyperliquid perpetuals integration for the Maxxit platform. The integration enables fully automated, non-custodial trading of perpetual contracts on Hyperliquid exchange.

## Architecture

### Non-Custodial Model
- **User Control**: Users maintain full control of their funds in their Hyperliquid account
- **Agent Delegation**: Each deployment gets a unique agent wallet that users approve via Hyperliquid's API wallet system
- **No Withdrawals**: Agent wallets can only trade, not withdraw funds from user accounts
- **Per-Deployment Agents**: Every deployment has its own unique agent address for maximum security

### Key Components

#### 1. Backend Services
- **`lib/adapters/hyperliquid-adapter.ts`**: TypeScript adapter for Hyperliquid trading
- **`lib/hyperliquid-utils.ts`**: Utility functions for positions, prices, and balances
- **`services/hyperliquid-service.py`**: Python service using official Hyperliquid SDK
- **`lib/hyperliquid-signing.ts`**: EIP-712 signing for Hyperliquid actions

#### 2. Database Schema
New fields in `agent_deployments`:
- `hyperliquid_agent_address`: Unique agent wallet address per deployment
- `hyperliquid_agent_key_encrypted`: AES-256-GCM encrypted private key
- `hyperliquid_agent_key_iv`: Encryption initialization vector
- `hyperliquid_agent_key_tag`: Authentication tag for encryption

#### 3. API Endpoints
- **`/api/agents/[id]/generate-hyperliquid-agent`**: Generate unique agent per deployment
- **`/api/agents/[id]/hyperliquid-setup`**: Save user's Hyperliquid address
- **`/api/hyperliquid/register-agent`**: Decrypt and retrieve agent keys
- **`/api/admin/execute-trade-once`**: Execute signals (updated for Hyperliquid)

#### 4. UI Components
- **`components/HyperliquidAgentModal.tsx`**: Setup modal with instructions
- **`pages/create-agent.tsx`**: Updated with Hyperliquid venue support
- **`pages/my-deployments.tsx`**: Updated with Hyperliquid agent setup button

#### 5. Workers & Automation
- **`workers/trade-executor-worker.ts`**: Executes pending signals (updated for Hyperliquid)
- **`workers/position-monitor-hyperliquid.ts`**: Smart position discovery and monitoring
- **`workers/position-monitor-v2.ts`**: Updated with Hyperliquid price tracking

#### 6. Trade Execution Logic
- **`lib/trade-executor.ts`**: Updated with `closeHyperliquidPositionMethod`
- Checks `hyperliquid_agent_address` instead of `module_enabled` for Hyperliquid
- Routes to Python service for actual trade execution

## Complete Flow

### 1. Agent Creation & Setup
```
User creates agent
  ↓
UI calls /api/agents/[id]/generate-hyperliquid-agent
  ↓
Backend generates unique agent wallet (EOA)
  ↓
Private key encrypted with AES-256-GCM
  ↓
Stored in agent_deployments table
  ↓
Agent address shown to user in modal
```

### 2. User Approval on Hyperliquid
```
User goes to https://app.hyperliquid.xyz/API (testnet or mainnet)
  ↓
Enters agent name and address
  ↓
Clicks "Authorize"
  ↓
MetaMask signature approves agent
  ↓
User saves their Hyperliquid address in Maxxit UI
```

### 3. Automated Signal Execution
```
Tweet ingestion worker monitors CT accounts
  ↓
LLM classifies signal candidate tweets
  ↓
Signal generator creates signals (venue: HYPERLIQUID)
  ↓
Trade executor worker picks up pending signals
  ↓
Checks: agent ACTIVE + deployment ACTIVE + hyperliquid_agent_address set
  ↓
Calls /api/admin/execute-trade-once
  ↓
TradeExecutor routes to HyperliquidAdapter
  ↓
HyperliquidAdapter calls Python service
  ↓
Python service uses agent wallet to trade on user's behalf
  ↓
Position created on Hyperliquid
  ↓
Position record created in database
```

### 4. Position Monitoring & Risk Management
```
Position monitor runs every 60 seconds
  ↓
Queries Hyperliquid API for open positions
  ↓
For each position:
  - Fetches current price
  - Calculates PnL
  - Checks exit conditions:
    • Hard stop loss: -10%
    • Trailing stop: 3% activation, 1% trail
    • Take profit: if set
  ↓
If triggered → closes position via Python service
  ↓
Updates database with exit price and PnL
```

### 5. Smart Position Discovery
```
Position monitor checks ALL active deployments
  ↓
Queries Hyperliquid API for each user address
  ↓
If position exists but NOT in database:
  - Creates signal record (placeholder)
  - Creates position record
  - Applies monitoring
  ↓
If position in database but NOT on Hyperliquid:
  - Marks as closed (orphan cleanup)
```

## Security Features

### 1. Encryption
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key**: 32-byte key from environment (`ENCRYPTION_KEY`)
- **Per-Record IV**: Unique initialization vector per encrypted key
- **Authentication Tag**: Ensures integrity and authenticity

### 2. Non-Custodial Design
- Agent wallets can only **trade** on user accounts
- Cannot **withdraw** or **transfer** funds from user accounts
- User retains full control and can revoke agent access anytime
- Hyperliquid's smart contracts enforce these permissions

### 3. Per-Deployment Isolation
- Each deployment has a unique agent wallet
- Keys never shared across deployments
- If one deployment compromised, others unaffected

### 4. API Security
- Agent private keys never exposed via API
- Decryption only happens server-side in secure context
- Keys stored encrypted at rest in database

## Testing

### Test Scripts
- **`scripts/test-hyperliquid-signal-flow.ts`**: Verify complete flow eligibility
- **`scripts/test-hyperliquid-monitoring.ts`**: Test position monitoring
- **`scripts/sync-hyperliquid-positions.ts`**: Sync database with Hyperliquid
- **`scripts/test-hyperliquid-token-spectrum.ts`**: Test multiple token trades

### Running Tests
```bash
# Test signal execution flow
npx tsx scripts/test-hyperliquid-signal-flow.ts

# Test position monitoring
npx tsx scripts/test-hyperliquid-monitoring.ts

# Sync positions
npx tsx scripts/sync-hyperliquid-positions.ts <user_address>
```

## Environment Variables

### Required
```bash
# Hyperliquid Service
HYPERLIQUID_SERVICE_URL=http://localhost:5001
HYPERLIQUID_TESTNET=true  # or false for mainnet

# Encryption
ENCRYPTION_KEY=<32-byte-hex-key>

# Python Service
# (Set in services/ directory)
```

### Python Service (.env in services/)
```bash
HYPERLIQUID_TESTNET=true
```

## Deployment

### 1. Install Python Dependencies
```bash
cd services
pip install -r requirements-hyperliquid.txt
```

### 2. Start Hyperliquid Service
```bash
cd services
HYPERLIQUID_TESTNET=true python3 hyperliquid-service.py &
```

### 3. Start Workers
```bash
# Trade execution (every 5 min)
npx tsx workers/trade-executor-worker.ts &

# Position monitoring (every 60s)
npx tsx workers/position-monitor-hyperliquid.ts &
```

### 4. Database Migration
```bash
npx prisma migrate dev
npx prisma generate
```

## Production Checklist

- [ ] Change `ENCRYPTION_KEY` to production value
- [ ] Set `HYPERLIQUID_TESTNET=false` for mainnet
- [ ] Update `HYPERLIQUID_SERVICE_URL` if deployed separately
- [ ] Ensure Python service has high availability
- [ ] Set up monitoring for worker processes
- [ ] Configure alerts for failed trades
- [ ] Test with small positions first

## Monitoring & Observability

### Logs
- Trade execution: `[TRADE]` prefix
- Position monitoring: `[PositionMonitor]` prefix
- Hyperliquid service: Python service logs

### Key Metrics
- Pending signals count
- Position execution success rate
- Position monitoring latency
- Stop loss trigger rate

## Troubleshooting

### Common Issues

**1. Agent not approved error**
- Check user has approved agent on Hyperliquid UI
- Verify correct agent address used
- Ensure user's Hyperliquid address saved in deployment

**2. Decryption errors**
- Verify `ENCRYPTION_KEY` matches key used for encryption
- Check IV and tag are correctly stored
- Regenerate agent if corruption suspected

**3. Positions not executing**
- Check deployment status is ACTIVE
- Verify `hyperliquid_agent_address` is set
- Check `sub_active` is true
- Review worker logs for errors

**4. Prices not updating**
- Verify Hyperliquid service is running
- Check network connectivity to Hyperliquid API
- Confirm token symbol is supported

## Documentation

- **`HYPERLIQUID_QUICKSTART.md`**: Quick start guide
- **`HYPERLIQUID_TESTNET_GUIDE.md`**: Testnet setup
- **`HYPERLIQUID_POSITION_MONITORING.md`**: Monitoring details
- **`HYPERLIQUID_DEPLOYMENT_READY.md`**: Deployment guide
- **`SECURITY_AUDIT_HYPERLIQUID.md`**: Security audit results

## Future Enhancements

1. **Multi-Agent Support**: Allow multiple agents per user account
2. **Custom Risk Parameters**: Per-user stop loss and take profit settings
3. **Advanced Order Types**: Limit orders, trailing entry
4. **Portfolio Management**: Cross-position risk management
5. **Analytics Dashboard**: PnL charts, performance metrics

## Credits

Built using:
- [Hyperliquid Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)
- [ethers.js](https://docs.ethers.org/) for EIP-712 signing
- [Prisma](https://www.prisma.io/) for database
- [Flask](https://flask.palletsprojects.com/) for Python service

## License

Proprietary - Maxxit Platform

---

**Status**: ✅ Production Ready (Testnet Validated)
**Last Updated**: November 1, 2025
**Version**: 1.0.0

