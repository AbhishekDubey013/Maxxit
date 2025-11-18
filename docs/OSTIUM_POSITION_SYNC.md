# Ostium Position Synchronization Architecture

## Problem Statement

There was a race condition where the database could become out of sync with on-chain position state:

1. Position gets closed on-chain (externally, by liquidation, or manually)
2. Position monitor hasn't run yet to sync DB
3. Trade executor tries to close the position based on DB showing it's still open
4. This causes error: `0xf77a8069` (NoOpenPosition/PositionAlreadyClosed)

## Solution: Multi-Layer Synchronization

We've implemented a **defense-in-depth** approach with three layers of protection:

### Layer 1: Position Monitor (Background Sync)
**File:** `workers/position-monitor-ostium.ts` (lines 247-270)

**What it does:**
- Runs every 30 seconds
- Fetches all on-chain positions for each user
- Compares with DB positions
- Marks positions as CLOSED in DB if not found on-chain

**Code:**
```typescript
const ostPosition = ostiumPositions.find(
  p => p.tradeId === position.entry_tx_hash || 
       (p.market === position.token_symbol && p.side.toUpperCase() === position.side)
);

if (!ostPosition) {
  // Position no longer on-chain - sync DB
  await prisma.positions.update({
    where: { id: position.id },
    data: {
      status: 'CLOSED',
      closed_at: new Date(),
      exit_reason: 'CLOSED_EXTERNALLY',
    },
  });
}
```

### Layer 2: Pre-Flight Check (Before Close)
**File:** `lib/trade-executor.ts` (lines 1616-1650)

**What it does:**
- Before attempting to close a position, verify it exists on-chain
- If not found, immediately sync DB and skip the close operation
- Prevents the error from happening in the first place

**Code:**
```typescript
// PRE-FLIGHT CHECK: Verify position still exists on-chain
const onChainPositions = await getOstiumPositions(userArbitrumAddress);

const positionExistsOnChain = onChainPositions.some(
  p => p.tradeId === position.entry_tx_hash || 
       (p.market === position.token_symbol && p.side.toUpperCase() === position.side)
);

if (!positionExistsOnChain) {
  // Update DB and return success (idempotent)
  await prisma.positions.update({
    where: { id: position.id },
    data: {
      status: 'CLOSED',
      closed_at: new Date(),
      exit_reason: 'CLOSED_EXTERNALLY',
    },
  });
  
  return { success: true, message: 'Position already closed externally' };
}
```

### Layer 3: Error Detection & Recovery
**File:** `services/ostium-service.py` (lines 796-807)

**What it does:**
- Catches the `0xf77a8069` error from Ostium SDK
- Treats it as a success case (idempotent behavior)
- Returns `success: true` with `alreadyClosed: true`

**Code:**
```python
except Exception as sdk_error:
    error_str = str(sdk_error)
    if '0xf77a8069' in error_str:
        # Position already closed - treat as success
        return jsonify({
            "success": True,
            "message": "Position already closed (idempotent)",
            "closePnl": 0,
            "alreadyClosed": True
        })
```

## Database Schema Updates

All position updates now consistently set:
- `status: 'CLOSED'` (for fast queries)
- `closed_at: Date` (timestamp)
- `exit_reason: string` (why it was closed)

This ensures queries can efficiently filter open positions:
```typescript
const openPositions = await prisma.positions.findMany({
  where: { status: 'OPEN' }  // Fast indexed query
});
```

## Benefits

1. **No More Errors**: The `0xf77a8069` error is now handled gracefully at all levels
2. **Idempotent Operations**: Closing a position multiple times is safe
3. **Database Accuracy**: DB state matches on-chain reality
4. **Better Performance**: Using indexed `status` field for queries
5. **Graceful Degradation**: Even if one layer fails, others provide backup

## Error Code Reference

- `0xf77a8069` = `NoOpenPosition` or `PositionAlreadyClosed` 
  - Occurs when trying to close a position that doesn't exist
  - Now treated as success (idempotent)

## Testing Checklist

- [ ] Position closed externally → Monitor syncs DB
- [ ] Position closed externally → Close attempt is idempotent
- [ ] Multiple close attempts → No errors
- [ ] Position liquidated → DB syncs correctly
- [ ] Monitor runs concurrently → Lock prevents race conditions

## Future Improvements

1. **Webhook Support**: Listen to Ostium events for instant updates
2. **PnL Recovery**: Calculate actual PnL from transaction history
3. **Close Reason Detection**: Differentiate liquidation vs manual close
4. **Multi-Venue Support**: Extend pre-flight checks to Hyperliquid and other venues

