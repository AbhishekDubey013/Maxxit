# Position Monitor Race Conditions - Fixed

## Issue

When multiple instances of position monitors run simultaneously (e.g., during deployment or if manually triggered), they can discover the same on-chain position at the same time, leading to:

1. **Race Condition**: Both try to create the same signal/position in DB
2. **Confusing Logs**: Multiple error messages like "Could not find position after duplicate error"
3. **User Confusion**: Logs suggest problems when everything is working correctly

## Root Cause

Multiple monitor instances discovering the same position simultaneously:

```
Monitor A: Sees SOL position on-chain → Creates signal → Creates position
Monitor B: Sees SOL position on-chain → Creates signal → ❌ DUPLICATE ERROR
```

Monitor B then tried multiple fallback queries to find the position, generating confusing error logs.

## Solution

### ✅ Simplified Race Condition Handling

**Before:**
```typescript
if (error.code === 'P2002') {
  console.log(`Position already discovered by another worker`);
  // Try to find position by token+side
  // Try to find by deployment+token
  // Check if it's closed
  // Log multiple errors
  // Eventually skip or continue
}
```

**After:**
```typescript
if (error.code === 'P2002') {
  console.log(`Position/signal already exists in DB (another worker got here first)`);
  console.log(`This is normal - position will be monitored in next cycle (30 seconds)`);
  console.log(`Skipping for now...`);
  continue; // Simple skip, will be picked up in next cycle
}
```

### ✅ Stale Position Cleanup (Already Working)

Both monitors already properly handle positions that are:
- **In DB as OPEN** but **Closed on-chain**

**Hyperliquid Monitor:**
- Fetches all open positions from DB
- Compares with live Hyperliquid positions
- Closes orphans with actual PnL from fills

**Ostium Monitor:**
- Iterates through open DB positions
- Checks if they still exist on-chain
- Marks as closed if not found

## Files Modified

1. **`workers/position-monitor-hyperliquid.ts`**
   - Simplified race condition handling (lines 195-201)
   - Removed confusing fallback queries
   - Clear messaging about next monitoring cycle

2. **`workers/position-monitor-ostium.ts`**
   - Simplified race condition handling (lines 212-214)
   - Clear messaging about next monitoring cycle

## Expected Behavior

### Normal Operation (Single Monitor)

```
📊 SOL LONG:
   Entry: $152.31, Size: 0.07, PnL: $-0.88
   ⚠️  Not in DB - creating record...
   ✅ Created DB record: 8fa2b3c1...
   💰 Current Price: $151.73
   📈 P&L: $-0.88 (-0.58%)
   ⏳ Trailing stop inactive
```

### Race Condition (Multiple Monitors)

```
📊 SOL LONG:
   Entry: $152.31, Size: 0.07, PnL: $-0.88
   ⚠️  Not in DB - creating record...
   ℹ️  Position/signal already exists in DB (another worker got here first)
   ✅ This is normal - position will be monitored in next cycle (30 seconds)
   ⏭️  Skipping for now...
```

Then 30 seconds later:
```
📊 SOL LONG:
   Entry: $152.31, Size: 0.07, PnL: $-0.88
   💰 Current Price: $151.73
   📈 P&L: $-0.88 (-0.58%)
   ⏳ Trailing stop inactive
```

### Stale Position (Closed Externally)

**Hyperliquid:**
```
🔄 Cleaning up 1 orphan DB record(s) (closed externally):
   Closing SOL (not on Hyperliquid)
   ✅ Found closing fill: Exit=$153.50, PnL=$42.35
   ✅ Updated DB with exit price and PnL
```

**Ostium:**
```
⚠️  Position SOL/USD LONG (TX: 123...) no longer on Ostium - marking as closed
   ✅ Updated DB: closed_at = now
```

## Testing

### Test Race Conditions

1. Deploy both `hyperliquid-monitor` and `ostium-monitor` to Railway
2. Manually trigger the standalone worker scripts locally at the same time
3. Check logs - should see simplified race condition messages
4. Verify all positions are eventually monitored (within 30 seconds)

### Test Stale Position Cleanup

1. Open a position via the agent
2. Manually close it directly on Hyperliquid/Ostium (outside the app)
3. Wait for next monitor cycle
4. Check logs - should see "Cleaning up orphan" or "no longer on..."
5. Verify DB position is marked as `closed_at: <timestamp>`

## Deployment

### Railway Services

**hyperliquid-monitor:**
- Root Directory: `.` (project root)
- Build Command: `npm install`
- Start Command: `npx tsx workers/position-monitor-hyperliquid.ts`
- Environment Variables:
  - `DATABASE_URL` (reference Postgres)
  - `HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com`

**ostium-monitor:**
- Root Directory: `.` (project root)
- Build Command: `npm install`
- Start Command: `npx tsx workers/position-monitor-ostium.ts`
- Environment Variables:
  - `DATABASE_URL` (reference Postgres)
  - `OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com`

## Benefits

✅ **Clearer logs** - No more confusing error messages for normal operation
✅ **Simpler code** - Removed complex fallback logic
✅ **Same functionality** - Positions still discovered and monitored correctly
✅ **Automatic recovery** - Race conditions resolve in next cycle (30 seconds)
✅ **Stale cleanup** - Positions closed externally are properly synced to DB

## Notes

- **Race conditions are normal** when multiple monitor instances run
- **30-second delay** before monitoring is acceptable (monitors run every 30s anyway)
- **Stale cleanup** ensures DB stays in sync with on-chain reality
- **No positions are missed** - they're just picked up in the next monitoring cycle

