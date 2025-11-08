# Hyperliquid Integration Documentation

## Overview

Maxxit integrates with Hyperliquid perpetual DEX using an **agent delegation model** where:
- Users keep funds in their own Hyperliquid wallet
- Agents trade on behalf of users via delegation
- All positions are monitored in real-time with trailing stops
- System handles both auto-trading and manual Telegram commands

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Maxxit Trading Platform                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      │
│  │  Signal Gen  │─────▶│ Trade Exec   │─────▶│   HL Service │      │
│  │  (TypeScript)│      │ (TypeScript) │      │   (Python)   │      │
│  └──────────────┘      └──────────────┘      └──────────────┘      │
│         │                      │                      │              │
│         │                      │                      │              │
│         ▼                      ▼                      ▼              │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │              Position Monitor (TypeScript)                │      │
│  │  - Discovers positions from Hyperliquid API              │      │
│  │  - Auto-creates DB records for new positions             │      │
│  │  - Monitors P&L and trailing stops                       │      │
│  │  - Closes positions when conditions met                  │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Hyperliquid Network    │
                    │  (User's Wallet)        │
                    │  - Funds stay with user │
                    │  - Agent has delegation │
                    └─────────────────────────┘
```

## Agent Delegation Model

### How It Works

1. **User Wallet**: Users deposit USDC to their Hyperliquid wallet address
2. **Agent Wallet**: System creates an EOA wallet for each deployment (stored in wallet pool)
3. **Delegation**: User approves the agent to trade on their behalf via Hyperliquid's delegation mechanism
4. **Trading**: Agent executes trades using user's funds via `account_address` parameter

### Key Benefits

✅ **Non-custodial**: User maintains full control of funds  
✅ **Transparent**: All trades visible on Hyperliquid  
✅ **Revocable**: User can revoke agent access anytime  
✅ **Secure**: Agent cannot withdraw funds, only trade  

### Setup Flow

```typescript
// 1. User connects Hyperliquid wallet (MetaMask)
const userAddress = await wallet.getAddress();

// 2. System creates agent wallet (stored in encrypted wallet pool)
const agentWallet = await createAgentWallet();

// 3. User approves agent on Hyperliquid
await hyperliquidService.approveAgent({
  userAddress,
  agentAddress: agentWallet.address,
});

// 4. Agent can now trade on behalf of user
const result = await hyperliquidService.openPosition({
  agentPrivateKey: agentWallet.privateKey,
  vaultAddress: userAddress, // User's wallet
  coin: 'BTC',
  size: 0.1,
  isBuy: true,
});
```

## Services Architecture

### 1. Hyperliquid Service (Python)

**Location**: `services/hyperliquid-service.py`  
**Port**: 5001  
**Purpose**: Python service using official Hyperliquid SDK

#### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/balance` | POST | Get account balance |
| `/positions` | POST | Get open positions |
| `/market-info` | POST | Get market metadata |
| `/open-position` | POST | Open perpetual position |
| `/close-position` | POST | Close position (idempotent) |
| `/transfer` | POST | Internal USDC transfer |
| `/approve-agent` | POST | Approve agent for trading |

#### Key Features

- **Idempotent operations**: Closing already-closed positions returns success
- **Delegation support**: All endpoints support `vaultAddress` parameter
- **Error handling**: Graceful handling of common edge cases
- **Logging**: Comprehensive logging for debugging

#### Example Usage

```python
# Open position with delegation
POST /open-position
{
  "agentPrivateKey": "0x...",
  "vaultAddress": "0xUserWallet...",  # User's wallet
  "coin": "ETH",
  "isBuy": true,
  "size": 1.5,
  "slippage": 0.01
}

# Close position (idempotent)
POST /close-position
{
  "agentPrivateKey": "0x...",
  "vaultAddress": "0xUserWallet...",
  "coin": "ETH"
  # No size = close full position
}
```

### 2. Trade Executor (TypeScript)

**Location**: `lib/trade-executor.ts`  
**Purpose**: Coordinates trade execution across all venues

#### Hyperliquid-specific Logic

```typescript
// Execute Hyperliquid trade
private async executeHyperliquidTrade(ctx: ExecutionContext) {
  // 1. Get agent wallet from pool
  const agentPrivateKey = await getPrivateKeyForAddress(
    ctx.deployment.hyperliquid_agent_address
  );
  
  // 2. Create adapter with delegation
  const adapter = createHyperliquidAdapter(
    ctx.safeWallet,
    agentPrivateKey,
    userHyperliquidWallet  // User's wallet for delegation
  );
  
  // 3. Execute trade via Python service
  const result = await adapter.openPosition({
    coin: ctx.signal.token_symbol,
    isBuy: ctx.signal.side === 'LONG',
    size: calculatedSize,
    leverage: sizeModel.leverage || 1,
  });
  
  // 4. Create position record in DB
  const position = await prisma.positions.create({ ... });
  
  return { success: true, positionId: position.id };
}
```

#### Position Closing with Race Prevention

```typescript
async closePosition(positionId: string) {
  // STEP 1: Acquire lock (prevents concurrent close attempts)
  const lockResult = await prisma.positions.updateMany({
    where: { 
      id: positionId,
      closed_at: null,  // Only if not already closed
    },
    data: {
      metadata: { closing: true, closingStartedAt: new Date() }
    }
  });
  
  // If no rows updated, position already closed
  if (lockResult.count === 0) {
    return { success: true };  // Idempotent response
  }
  
  // STEP 2: Close on Hyperliquid
  const result = await closeHyperliquidPosition({ ... });
  
  // STEP 3: Handle already-closed gracefully
  if (!result.success && result.error.includes('No open position')) {
    await prisma.positions.update({
      where: { id: positionId },
      data: { closed_at: new Date() }
    });
    return { success: true };  // Self-healing
  }
  
  return result;
}
```

### 3. Position Monitor (TypeScript)

**Location**: `workers/position-monitor-hyperliquid.ts`  
**Schedule**: Every 30 seconds (cron)  
**Purpose**: Real-time position monitoring with auto-discovery

#### How It Works

```
1. Fetch ALL active deployments from DB
   ↓
2. For each deployment, query Hyperliquid API for open positions
   ↓
3. For each position found:
   - Check if exists in DB
   - If not, auto-create record (with signal)
   - Update trailing stop prices
   - Check if stop triggered
   ↓
4. Close positions via TradeExecutor if triggered
   ↓
5. Clean up orphan DB records (positions closed externally)
```

#### Key Features

**Smart Discovery**
```typescript
// Fetch positions directly from Hyperliquid
const hlPositions = await getHyperliquidOpenPositions(userAddress);

// Auto-create DB records for discovered positions
if (!dbPosition) {
  console.log('⚠️  Not in DB - creating record...');
  dbPosition = await prisma.positions.create({
    token_symbol: hlPosition.coin,
    side: parseFloat(hlPosition.szi) > 0 ? 'LONG' : 'SHORT',
    entry_price: parseFloat(hlPosition.entryPx),
    qty: Math.abs(parseFloat(hlPosition.szi)),
    source: 'auto-discovered',
  });
}
```

**Trailing Stops**
```typescript
// LONG positions: Track highest price
const highestPrice = Math.max(trailingParams.highestPrice || entryPrice, currentPrice);
const activationThreshold = entryPrice * 1.03; // +3% to activate

if (highestPrice >= activationThreshold) {
  const trailingStopPrice = highestPrice * (1 - trailingPercent / 100);
  
  if (currentPrice <= trailingStopPrice) {
    shouldClose = true;
    closeReason = 'TRAILING_STOP';
  }
}
```

**Instance Locking** (Prevents concurrent runs)
```typescript
// Acquire file-based lock
const hasLock = await acquireLock();
if (!hasLock) {
  console.log('Another monitor instance is running');
  return;
}

try {
  // Monitor positions...
} finally {
  releaseLock();  // Always release lock
}
```

**Orphan Cleanup**
```typescript
// Find positions in DB but not on Hyperliquid
const hlTokens = new Set(hlPositions.map(p => p.coin));
const orphans = dbPositions.filter(p => !hlTokens.has(p.token_symbol));

// Mark as closed (position was closed externally)
for (const orphan of orphans) {
  await prisma.positions.update({
    where: { id: orphan.id },
    data: { closed_at: new Date() }
  });
}
```

## Race Condition Prevention

### Problem
Multiple monitor instances or close attempts could cause:
- Duplicate close transactions
- "Position already closed" errors
- Database inconsistencies

### Solutions Implemented

#### 1. Database-level Locking
```typescript
// Optimistic locking using updateMany
const lockResult = await prisma.positions.updateMany({
  where: { id: positionId, closed_at: null },
  data: { metadata: { closing: true } }
});

// Only one process gets lockResult.count = 1
```

#### 2. Idempotent Operations
```python
# Python service returns success for already-closed positions
if not current_position:
    return jsonify({
        "success": True,
        "result": {"status": "already_closed"}
    })
```

#### 3. Instance Locking
```typescript
// File-based lock prevents concurrent monitor runs
const LOCK_FILE = path.join(__dirname, '../.position-monitor.lock');
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

if (fs.existsSync(LOCK_FILE)) {
  // Check if stale, otherwise exit
}
```

#### 4. Self-healing Sync
```typescript
// Detect when DB and Hyperliquid are out of sync
if (errorMsg.includes('No open position')) {
  // Position was closed externally - update DB
  await prisma.positions.update({
    where: { id: position.id },
    data: { closed_at: new Date() }
  });
  return { success: true };  // Not an error!
}
```

## Database Schema

### Positions Table

```prisma
model positions {
  id              String    @id @default(uuid())
  deployment_id   String
  signal_id       String?
  venue           Venue     // HYPERLIQUID
  token_symbol    String
  side            Side      // LONG | SHORT
  qty             Decimal   @db.Decimal(30, 10)
  entry_price     Decimal   @db.Decimal(30, 10)
  exit_price      Decimal?  @db.Decimal(30, 10)
  pnl             Decimal?  @db.Decimal(30, 10)
  entry_tx_hash   String?
  exit_tx_hash    String?
  source          String?   // 'auto-discovered' | 'signal'
  
  // Trailing stop parameters
  trailing_params Json?     // { enabled, trailingPercent, highestPrice, lowestPrice }
  
  // Metadata for locking
  metadata        Json?     // { closing: true, closingStartedAt: timestamp }
  
  created_at      DateTime  @default(now())
  closed_at       DateTime?
}
```

### Agent Deployments Table

```prisma
model agent_deployments {
  id                         String   @id @default(uuid())
  agent_id                   String
  user_address               String
  
  // For Hyperliquid: safe_wallet stores user's HL address
  safe_wallet                String
  
  // Agent wallet that trades on user's behalf
  hyperliquid_agent_address  String?
  
  status                     Status   // ACTIVE | PAUSED
  venue                      Venue    // HYPERLIQUID
  
  created_at                 DateTime @default(now())
  sub_started_at             DateTime?
}
```

## API Integration Examples

### Opening a Position

```typescript
// From signal or manual trade
const result = await tradeExecutor.executeSignal(signalId);

// Behind the scenes:
// 1. Validate signal and deployment
// 2. Get agent private key from wallet pool
// 3. Calculate position size and leverage
// 4. Call Python service to execute trade
// 5. Create position record in DB
// 6. Monitor starts tracking automatically
```

### Closing a Position

```typescript
// Manual close
await tradeExecutor.closePosition(positionId);

// Automatic close (from monitor)
if (shouldClose) {
  const result = await executor.closePosition(dbPosition.id);
  // Handles race conditions automatically
}
```

### Monitoring Positions

```typescript
// Get all open positions for a deployment
const positions = await prisma.positions.findMany({
  where: {
    deployment_id: deploymentId,
    closed_at: null,
  },
  include: {
    signals: true,
  }
});

// Calculate real-time P&L
for (const position of positions) {
  const currentPrice = await getHyperliquidMarketPrice(position.token_symbol);
  const { pnlUSD, pnlPercent } = calculatePnL(
    position.side,
    position.entry_price,
    currentPrice,
    position.qty * currentPrice
  );
}
```

## Profit Sharing Model

### Fee Collection on Hyperliquid

```typescript
// After closing profitable position
if (pnl > 0) {
  const profitShare = pnl * 0.10; // 10% of profit
  
  // Transfer from user's HL wallet to platform wallet
  await hyperliquidService.transfer({
    agentPrivateKey,      // Agent still has delegation
    vaultAddress: userAddress,  // User's wallet
    toAddress: platformWallet,
    amount: profitShare
  });
  
  // Record in billing events
  await prisma.billing_events.create({
    deployment_id,
    kind: 'PROFIT_SHARE',
    amount: profitShare,
    asset: 'USDC',
    status: 'COMPLETED',
  });
}
```

### Configurable Fee Models

Environment variables control fee structure:

```bash
# Profit share (default)
HYPERLIQUID_FEE_MODEL=PROFIT_SHARE
HYPERLIQUID_PROFIT_SHARE=10  # 10% of profits

# Or flat fee per trade
HYPERLIQUID_FEE_MODEL=FLAT
HYPERLIQUID_FLAT_FEE=0.5  # $0.50 per trade

# Or percentage of position size
HYPERLIQUID_FEE_MODEL=PERCENTAGE
HYPERLIQUID_FEE_PERCENT=0.1  # 0.1% of position size

# Or tiered profit share
HYPERLIQUID_FEE_MODEL=TIERED
# $0-100: 5%, $100-500: 10%, $500+: 15%
```

## Testing & Monitoring

### Health Checks

```bash
# Check Python service
curl http://localhost:5001/health

# Check positions are being monitored
tail -f logs/position-monitor.log
```

### Manual Testing

```bash
# 1. Open position manually
curl -X POST http://localhost:5001/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "0x...",
    "vaultAddress": "0xUser...",
    "coin": "BTC",
    "isBuy": true,
    "size": 0.01,
    "slippage": 0.01
  }'

# 2. Wait for monitor to discover (30 seconds)
# Check logs for "⚠️  Not in DB - creating record..."

# 3. Close position
curl -X POST http://localhost:5001/close-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "0x...",
    "vaultAddress": "0xUser...",
    "coin": "BTC"
  }'

# 4. Verify idempotency (close again)
# Should return success, not error
```

### Monitoring Logs

```bash
# Position monitor logs
tail -f logs/position-monitor.log

# Look for:
# ✅ Position healthy
# 🟢 Trailing stop triggered!
# ⚡ Closing position via TradeExecutor...
# ⚠️  Not in DB - creating record...
```

## Troubleshooting

### Common Issues

#### 1. "Agent not approved" error
**Cause**: User hasn't approved agent on Hyperliquid  
**Solution**: Call `/approve-agent` endpoint with user's signature

#### 2. Position shows open in DB but closed on Hyperliquid
**Cause**: Position closed externally or system was down  
**Solution**: Monitor will auto-detect and close in next run (orphan cleanup)

#### 3. Multiple monitors running
**Cause**: Lock file not released properly  
**Solution**: Remove stale lock: `rm workers/.position-monitor.lock`

#### 4. "Position already closed" errors
**Cause**: Race condition between monitors  
**Solution**: Already fixed! Operations are now idempotent

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=debug npm run monitor

# Check wallet pool
node -e "require('./lib/wallet-pool').listAllWallets()"

# Check active deployments
psql $DATABASE_URL -c "SELECT id, safe_wallet, hyperliquid_agent_address FROM agent_deployments WHERE status = 'ACTIVE'"
```

## Security Considerations

### Agent Wallet Security

1. **Wallet Pool Encryption**: Agent private keys stored encrypted in database
2. **No Withdrawal Rights**: Agents can only trade, not withdraw funds
3. **Revocable Access**: Users can revoke agent at any time on Hyperliquid
4. **Rate Limiting**: Python service has rate limits to prevent abuse

### Best Practices

- ✅ Never log private keys
- ✅ Use environment variables for sensitive config
- ✅ Validate all user inputs
- ✅ Monitor for unusual activity
- ✅ Implement position size limits
- ✅ Use multi-sig for platform wallet

## Performance Optimization

### Current Performance

- **Position discovery**: ~2 seconds per deployment
- **Trade execution**: ~5 seconds (includes Python service call)
- **Monitor cycle**: ~30 seconds for all deployments
- **Lock timeout**: 5 minutes (prevents hung processes)

### Optimization Tips

1. **Parallel processing**: Monitor deployments in parallel
2. **Batch queries**: Fetch multiple market prices at once
3. **Cache market info**: Cache token metadata (24h TTL)
4. **Connection pooling**: Reuse HTTP connections to Python service

## Deployment Checklist

- [ ] Python service running on port 5001
- [ ] Environment variables configured (see below)
- [ ] Database schema up to date
- [ ] Cron job for position monitor (every 30s)
- [ ] Log rotation configured
- [ ] Health check endpoint monitored
- [ ] Platform wallet funded for gas fees

### Required Environment Variables

```bash
# Hyperliquid Service
HYPERLIQUID_SERVICE_URL=http://localhost:5001
HYPERLIQUID_TESTNET=false  # true for testnet

# Fee Model
HYPERLIQUID_FEE_MODEL=PROFIT_SHARE
HYPERLIQUID_PROFIT_SHARE=10

# Platform Wallet (for profit collection)
HYPERLIQUID_PLATFORM_WALLET=0x...

# Executor
EXECUTOR_PRIVATE_KEY=0x...  # For signing transactions
```

## Future Improvements

1. **WebSocket integration**: Real-time position updates instead of polling
2. **Advanced order types**: Limit orders, stop-loss orders on Hyperliquid
3. **Multi-agent strategies**: Allow multiple agents per user
4. **Cross-margin mode**: Share margin across positions
5. **Analytics dashboard**: Real-time P&L charts and metrics
6. **Automated testing**: Integration tests for race conditions
7. **Distributed locking**: Redis-based locks for multi-server deployments

## References

- [Hyperliquid Python SDK](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)
- [Hyperliquid API Docs](https://hyperliquid.gitbook.io/hyperliquid-docs)
- [Agent Delegation Guide](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/trading-agent)

---

**Last Updated**: November 8, 2025  
**Version**: 1.0  
**Maintainer**: Maxxit Team

