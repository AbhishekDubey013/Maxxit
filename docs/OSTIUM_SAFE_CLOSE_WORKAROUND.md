# Ostium Safe Close Workaround

## The Problem

**Ostium SDK Bug**: Returns `index='0'` for ALL positions, causing wrong positions to close.

**Your Example**:
- Tried to close: HYPE (tradeID 119308)
- What happened: Transaction succeeded, 0.5 USDC returned  
- Current state: **HYPE 119308 is STILL OPEN**
- Conclusion: **Wrong position was closed!**

## Safe Workaround

Until Ostium fixes the SDK, implement these safeguards:

### 1. Enforce ONE Position Per Market Per User

```typescript
// In trade-executor.ts
async function executeOstiumTrade(signal) {
  // Check if user already has a position for this market
  const existingPosition = await prisma.positions.findFirst({
    where: {
      deployment_id: deployment.id,
      venue: 'OSTIUM',
      token_symbol: signal.token_symbol,
      status: 'OPEN'
    }
  });

  if (existingPosition) {
    console.log(`⚠️  User already has an open ${signal.token_symbol} position`);
    console.log(`   Cannot open new position (Ostium SDK bug limitation)`);
    return {
      success: false,
      error: 'Already have position for this market (Ostium limitation)',
      reason: 'ONE_POSITION_PER_MARKET_LIMIT'
    };
  }

  // Proceed with opening position...
}
```

### 2. Verify Position Count Before Close

```python
# In ostium-service.py - close_position()

# After finding trade_to_close, verify it's the only one for this pair
pair_id = pair_index
all_trades_for_pair = [t for t in open_trades 
                       if t.get('pair', {}).get('id') == str(pair_id)]

if len(all_trades_for_pair) > 1:
    logger.error(f"⚠️  DANGER: User has {len(all_trades_for_pair)} positions for pair {pair_id}")
    logger.error(f"   Cannot safely close - Ostium SDK bug will close wrong one!")
    logger.error(f"   Trades: {[t.get('tradeID') for t in all_trades_for_pair]}")
    return jsonify({
        "success": False,
        "error": f"User has multiple {market} positions. Cannot safely close due to Ostium SDK bug.",
        "trade_ids": [t.get('tradeID') for t in all_trades_for_pair],
        "workaround_needed": True
    }), 400

logger.info(f"✅ Safe to close - only 1 {market} position for this user")
```

### 3. Add Warning to UI

```typescript
// In HyperliquidDashboard or similar
if (deployment.venue === 'OSTIUM' && openPositions.length > 0) {
  // Group by market
  const positionsByMarket = {};
  for (const pos of openPositions) {
    const market = pos.token_symbol;
    positionsByMarket[market] = (positionsByMarket[market] || 0) + 1;
  }

  // Warn if multiple positions per market
  const multiplePositions = Object.entries(positionsByMarket)
    .filter(([, count]) => count > 1);

  if (multiplePositions.length > 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Ostium SDK Limitation</AlertTitle>
        <AlertDescription>
          You have multiple positions for the same market:
          {multiplePositions.map(([market, count]) => (
            <div key={market}>• {market}: {count} positions</div>
          ))}
          <br />
          Automated closes may not work correctly. Please close manually on Ostium.
        </AlertDescription>
      </Alert>
    );
  }
}
```

### 4. Manual Close Instruction

When automated close fails, provide manual instructions:

```
⚠️  Cannot safely close position automatically

MANUAL CLOSE REQUIRED:
1. Go to https://app.hyperliquid-testnet.xyz (or mainnet)
2. Connect wallet: 0xa10846a81528d429b50b0dcbf8968938a572fac5
3. Find position: HYPE/USD (Entry: $39.43)
4. Click "Close Position"
5. Confirm transaction

Trade ID: 119308
Pair ID: 41
Current P&L: -16.56%
```

### 5. Database Tracking

Store the actual on-chain state:

```typescript
// When position opens
await prisma.positions.create({
  data: {
    ...positionData,
    // Store Ostium-specific data
    ostium_metadata: {
      tradeId: result.tradeId,
      pairIndex: market.pairIndex,
      // Track if there are other positions for same market
      is_only_position_for_market: true,
      warning_multiple_positions: false
    }
  }
});
```

## Immediate Action for Your System

### Step 1: Prevent New Multi-Positions

```sql
-- Add check constraint (optional, for safety)
-- This prevents multiple open positions per market per deployment
CREATE UNIQUE INDEX idx_one_position_per_market_ostium 
ON positions(deployment_id, token_symbol, venue) 
WHERE status = 'OPEN' AND venue = 'OSTIUM';
```

### Step 2: Flag Existing Risky Positions

```sql
-- Find users with multiple positions per market
SELECT 
  deployment_id,
  token_symbol,
  COUNT(*) as position_count,
  STRING_AGG(id::text, ', ') as position_ids
FROM positions
WHERE venue = 'OSTIUM' AND status = 'OPEN'
GROUP BY deployment_id, token_symbol
HAVING COUNT(*) > 1;
```

### Step 3: Disable Auto-Close for Multi-Positions

```typescript
// In position-monitor-ostium.ts

// Before attempting to close
const sameMarketPositions = await prisma.positions.findMany({
  where: {
    deployment_id: position.deployment_id,
    token_symbol: position.token_symbol,
    venue: 'OSTIUM',
    status: 'OPEN'
  }
});

if (sameMarketPositions.length > 1) {
  console.log(`⚠️  SKIPPING AUTO-CLOSE: Multiple ${position.token_symbol} positions`);
  console.log(`   Positions: ${sameMarketPositions.map(p => p.id).join(', ')}`);
  console.log(`   Action: Manual close required due to Ostium SDK bug`);
  
  // Mark for manual review
  await prisma.positions.update({
    where: { id: position.id },
    data: {
      exit_reason: 'MANUAL_CLOSE_REQUIRED_MULTI_POSITION'
    }
  });
  
  continue; // Skip auto-close
}

// Safe to auto-close (only one position for this market)
```

## Testing the Fix

```bash
# 1. Check current positions
npx tsx scripts/test-ostium-pnl-calc.ts 0xYOUR_ADDRESS

# 2. Identify if multiple per market
# If you see multiple ETH/USD or multiple HYPE/USD, etc. → RISKY

# 3. Try closing one
# Should fail with "User has multiple positions" error

# 4. Close manually on Ostium UI
# Then retry automated close for remaining positions
```

## Long-Term Solution

**Wait for Ostium to fix SDK** or implement one of:

1. **Use Ostium UI directly** for closes
2. **One position per market** limit (current workaround)
3. **Switch to different protocol** if critical

## Summary

| Scenario | Safe? | Action |
|----------|-------|--------|
| 1 position per market | ✅ Safe | Auto-close works with `index=0` |
| Multiple per market | ❌ UNSAFE | Disable auto-close, manual only |
| Unknown state | ⚠️  Risky | Check first, then decide |

**Current Status**: Your system has multiple positions per user but different markets, so `index=0` should work... but it's NOT working, which confirms the SDK bug is more severe than expected.

## Recommended Action NOW

1. ✅ Fund agent wallets with ETH for gas
2. ✅ Enforce one-position-per-market going forward
3. ⚠️  **Manually close existing positions on Ostium UI** to be safe
4. ✅ Re-enable auto-close only after verifying it works

**Do NOT trust automated closes until Ostium fixes the SDK!**

