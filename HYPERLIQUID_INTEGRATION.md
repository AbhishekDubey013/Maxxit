# Hyperliquid Integration - Complete Guide

## Overview

This system enables **non-custodial automated trading** on Hyperliquid. Each deployment gets a **unique agent wallet** that can trade on behalf of users without access to withdraw funds.

## Security Architecture

### Unique Agent Per Deployment
- **Each deployment gets its own unique EOA wallet**
- Private keys are **AES-256-GCM encrypted** and stored in database
- **Encryption key** stored in environment variable `AGENT_WALLET_ENCRYPTION_KEY`
- Users **never share their private keys** with the platform

### Non-Custodial Trading
- Agent wallets can **only execute trades**
- **Cannot withdraw** user funds (Hyperliquid security)
- Users retain **full control** of their funds
- Agent must be **whitelisted** by user on Hyperliquid

## Complete Flow

### 1. Agent Creation (Automated)

When a user creates a deployment for Hyperliquid:

```bash
POST /api/hyperliquid/generate-agent
{
  "deploymentId": "deployment-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "agentAddress": "0x...",
  "instructions": [
    "Go to Hyperliquid Settings → API/Agent",
    "Add this agent address",
    "Agent will trade on your behalf (non-custodial)"
  ]
}
```

**What happens:**
1. New EOA wallet generated
2. Private key encrypted with AES-256-GCM
3. Stored in `agent_deployments` table:
   - `hyperliquid_agent_address`: Agent's public address
   - `hyperliquid_agent_key_encrypted`: Encrypted private key
   - `hyperliquid_agent_key_iv`: Encryption IV (unique per deployment)
   - `hyperliquid_agent_key_tag`: Auth tag for verification

### 2. User Authorization

User must whitelist the agent on Hyperliquid:

1. Go to https://app.hyperliquid.xyz/API (or testnet)
2. Connect wallet
3. Add agent address shown in response
4. Approve

This gives the agent permission to:
- ✅ Open positions
- ✅ Close positions
- ✅ View balances
- ❌ Cannot withdraw funds
- ❌ Cannot transfer assets

### 3. Signal Generation

Tweets are processed and signals created:

```typescript
// Signal created from tweet
{
  agent_id: "agent-uuid",
  token_symbol: "BNB",
  side: "LONG",
  venue: "HYPERLIQUID",
  size_model: { type: "balance-percentage", value: 5 },
  risk_model: { stopLoss: 0.05, takeProfit: 0.15 }
}
```

### 4. Trade Execution

Trade executor worker picks up signal:

1. Finds deployments with `hyperliquid_agent_address` set
2. Calls `getAgentPrivateKey(deploymentId)`:
   - Retrieves encrypted key from database
   - Decrypts using `AGENT_WALLET_ENCRYPTION_KEY`
   - Returns private key
3. Creates `HyperliquidAdapter` with agent key
4. Executes trade via Python Hyperliquid service
5. Trade executed on user's behalf (non-custodial)
6. Position stored in database

### 5. Position Monitoring

Position monitor worker:
- Fetches open positions from Hyperliquid
- Compares with database
- Applies risk management (stop-loss, take-profit)
- Closes positions when conditions met

## Environment Variables

```bash
# CRITICAL - Keep secret! Used to encrypt agent private keys
AGENT_WALLET_ENCRYPTION_KEY=<64-char-hex-string>

# Hyperliquid Python service (for trade execution)
HYPERLIQUID_SERVICE_URL=http://localhost:3001
HYPERLIQUID_SERVICE_PORT=3001

# Network selection
HYPERLIQUID_TESTNET=true  # Set to false for mainnet
```

## API Endpoints

### Generate Unique Agent
```
POST /api/hyperliquid/generate-agent
Body: { "deploymentId": "uuid" }
```

Creates unique agent wallet for a deployment.

### Get Agent Private Key (Internal)
```typescript
import { getAgentPrivateKey } from './pages/api/hyperliquid/register-agent';

const privateKey = await getAgentPrivateKey(deploymentId);
```

Decrypts and returns agent private key for trade execution.

## Security Considerations

### ✅ Secure Practices

1. **Unique Keys**: Each deployment has unique agent wallet
2. **Encryption**: All private keys encrypted at rest
3. **No Shared Keys**: No environment variable private keys
4. **Non-Custodial**: Users retain full control of funds
5. **Whitelisting Required**: Agent must be approved by user

### ⚠️ Important Notes

1. **Encryption Key**: `AGENT_WALLET_ENCRYPTION_KEY` must be:
   - 64 characters (32 bytes hex)
   - Stored securely (not in version control)
   - Backed up (losing it = losing access to all agent wallets)

2. **Agent Approval**: Users MUST whitelist agent on Hyperliquid before trading

3. **Fund Safety**: Even if database is compromised:
   - Attacker cannot decrypt keys without `AGENT_WALLET_ENCRYPTION_KEY`
   - Even with keys, cannot withdraw user funds (Hyperliquid security)

## Deployment Checklist

- [ ] Set `AGENT_WALLET_ENCRYPTION_KEY` in production environment
- [ ] Back up encryption key securely
- [ ] Configure `HYPERLIQUID_SERVICE_URL` for Python service
- [ ] Set `HYPERLIQUID_TESTNET=false` for mainnet
- [ ] Test agent generation flow
- [ ] Test decryption flow
- [ ] Verify trade execution
- [ ] Monitor position tracking

## Workers

### Trade Executor
```bash
npx tsx workers/trade-executor-worker.ts
```

Processes signals and executes trades.

### Position Monitor (Hyperliquid)
```bash
npx tsx workers/position-monitor-hyperliquid.ts
```

Monitors open positions and applies risk management.

### Signal Generator
```bash
npx tsx workers/signal-generator.ts
```

Generates signals from classified tweets.

## Database Schema

```sql
-- Agent deployments table
CREATE TABLE agent_deployments (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  safe_wallet TEXT,
  
  -- Hyperliquid agent wallet (unique per deployment)
  hyperliquid_agent_address TEXT,
  hyperliquid_agent_key_encrypted TEXT,  -- AES-256-GCM encrypted
  hyperliquid_agent_key_iv TEXT,         -- Unique IV
  hyperliquid_agent_key_tag TEXT,        -- Auth tag for verification
  
  status agent_status_t,
  sub_active BOOLEAN
);
```

## Testing

### Test Agent Generation
```bash
curl -X POST http://localhost:5000/api/hyperliquid/generate-agent \
  -H "Content-Type: application/json" \
  -d '{"deploymentId": "your-deployment-id"}'
```

### Test Decryption
```typescript
import { getAgentPrivateKey } from './pages/api/hyperliquid/register-agent';

const key = await getAgentPrivateKey('deployment-id');
console.log('Decrypted:', key ? 'SUCCESS' : 'FAILED');
```

### Test Complete Flow
```bash
# 1. Create synthetic tweet
# 2. Run signal generator
npx tsx workers/signal-generator.ts

# 3. Run trade executor
npx tsx workers/trade-executor-worker.ts

# 4. Check position in database
```

## Troubleshooting

### "Encryption key not configured"
- Set `AGENT_WALLET_ENCRYPTION_KEY` in `.env`
- Restart Next.js server

### "No agent key configured for deployment"
- Call `/api/hyperliquid/generate-agent` first
- Verify agent address in database

### "User or API Wallet does not exist"
- Agent not whitelisted on Hyperliquid
- User must approve agent in Hyperliquid Settings → API/Agent

### "Cannot increase position when open interest is at cap"
- Hyperliquid testnet limitation
- Try different token or use mainnet

## Production Recommendations

1. **Encryption Key**: Use hardware security module (HSM) or secrets manager
2. **Key Rotation**: Implement periodic key rotation strategy
3. **Monitoring**: Alert on failed decryptions or unauthorized access attempts
4. **Backup**: Regular encrypted backups of database
5. **Audit**: Log all agent key access and trade executions

## Support

For issues or questions:
- Check logs: `logs/trade-executor.log`
- Verify encryption key is set
- Ensure Hyperliquid service is running
- Confirm agent is whitelisted on Hyperliquid

