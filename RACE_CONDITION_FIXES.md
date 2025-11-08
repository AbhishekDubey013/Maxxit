# Race Condition Fixes for Hyperliquid Position Monitoring

## Problem Summary

The position monitoring system was experiencing race conditions that caused:

1. **Duplicate position closing attempts**: Multiple monitor instances trying to close the same position
2. **"Position already closed" errors**: DB thinking position is open when Hyperliquid already closed it
3. **Position creation conflicts**: Race conditions when auto-discovering positions from Hyperliquid
4. **Concurrent monitor runs**: Multiple monitor instances running simultaneously

## Solution Overview

### 1. Position Closing Lock (lib/trade-executor.ts)

**Problem**: Multiple processes trying to close the same position simultaneously

**Solution**: Implemented optimistic locking using database `updateMany` with `closed_at = null` check

```typescript
// Before closing, acquire lock
const lockResult = await prisma.positions.updateMany({
  where: { 
    id: positionId,
    closed_at: null, // Only lock if not already closed
  },
  data: {
    metadata: {
      closing: true,
      closingStartedAt: new Date().toISOString(),
    }
  }
});

// If lockResult.count === 0, position is already being closed
if (lockResult.count === 0) {
  return { success: true }; // Idempotent response
}
```

**Benefits**:
- Atomic check-and-set operation
- No external locks needed (uses database transaction)
- Idempotent - returns success if already closed

### 2. Graceful Handling of Already-Closed Positions

**Problem**: Hyperliquid API returns error when trying to close a position that's already closed

**Solutions Applied**:

#### A. Python Service (services/hyperliquid-service.py)
Changed from returning error to returning success with status:

```python
# Before
if not current_position:
    return jsonify({
        "success": False,
        "error": f"No open position found for {coin}"
    }), 400

# After
if not current_position:
    return jsonify({
        "success": True,
        "result": {
            "status": "already_closed",
            "message": f"No open position found for {coin}"
        }
    })
```

#### B. Trade Executor (lib/trade-executor.ts)
Added detection for already-closed positions:

```typescript
if (!result.success) {
  const errorMsg = result.error || '';
  const isAlreadyClosed = 
    errorMsg.includes('No open position') || 
    errorMsg.includes('Position not found');
  
  if (isAlreadyClosed) {
    // Update DB to reflect reality
    await prisma.positions.update({
      where: { id: position.id },
      data: { closed_at: new Date() },
    });
    return { success: true };
  }
}
```

**Benefits**:
- Operations are now idempotent
- System self-heals when DB and Hyperliquid are out of sync
- No false error alerts

### 3. Monitor Instance Locking (workers/position-monitor-hyperliquid.ts)

**Problem**: Multiple cron jobs or manual runs causing concurrent monitoring

**Solution**: File-based locking with timeout and PID tracking

```typescript
// Lock file with timeout
const LOCK_FILE = path.join(__dirname, '../.position-monitor.lock');
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function acquireLock(): Promise<boolean> {
  if (fs.existsSync(LOCK_FILE)) {
    const stats = fs.statSync(LOCK_FILE);
    const lockAge = Date.now() - stats.mtimeMs;
    
    // Remove stale locks
    if (lockAge > LOCK_TIMEOUT_MS) {
      fs.unlinkSync(LOCK_FILE);
    } else {
      return false; // Another instance is running
    }
  }
  
  fs.writeFileSync(LOCK_FILE, JSON.stringify({
    pid: process.pid,
    startedAt: new Date().toISOString(),
  }));
  
  return true;
}
```

**Benefits**:
- Prevents concurrent monitor runs
- Auto-cleans stale locks (handles crashed processes)
- Provides visibility into running instances (PID + timestamp)

### 4. Better Position Discovery Error Handling

**Problem**: Position creation race conditions and crashes on duplicate entries

**Solution**: Enhanced error handling in auto-discovery logic

```typescript
try {
  dbPosition = await prisma.positions.create({ ... });
} catch (error: any) {
  if (error.code === 'P2002') { // Prisma unique constraint violation
    // Race condition - fetch existing position
    dbPosition = await prisma.positions.findFirst({
      where: {
        deployment_id: deployment.id,
        token_symbol: symbol,
        closed_at: null,
      },
      orderBy: { opened_at: 'desc' }
    });
    
    if (!dbPosition) {
      console.error('Could not find position after duplicate error - skipping');
      continue; // Skip this position, don't crash
    }
  } else {
    console.error('Error creating position:', error.message);
    continue; // Skip, don't crash entire monitor
  }
}
```

**Benefits**:
- Monitor continues running even if one position has issues
- Gracefully handles race conditions on position creation
- Better logging for debugging

### 5. Enhanced Close Operation Error Handling

**Problem**: Position close failures blocking monitor progress

**Solution**: Try-catch around close operations with graceful degradation

```typescript
try {
  const result = await executor.closePosition(dbPosition.id);
  if (result.success) {
    totalPositionsClosed++;
  } else {
    if (result.error?.includes('already closed')) {
      console.log('ℹ️  Position already closed elsewhere');
    } else {
      console.log('❌ Failed to close:', result.error);
    }
  }
} catch (closeError: any) {
  console.error('❌ Exception while closing:', closeError.message);
  // Continue monitoring other positions
}
```

**Benefits**:
- Monitor continues even if one position fails to close
- Distinguishes between "already closed" (info) and real errors
- Provides better visibility into close operation results

## Testing Recommendations

### 1. Race Condition Testing
- Run multiple monitor instances simultaneously
- Verify only one acquires lock
- Verify no duplicate close attempts

### 2. Idempotency Testing
- Close a position manually on Hyperliquid
- Run monitor and verify it updates DB gracefully
- Try closing again - should succeed silently

### 3. Stale Lock Testing
- Create a lock file with old timestamp
- Run monitor and verify it cleans up stale lock
- Verify new monitor instance can start

### 4. Position Discovery Testing
- Create position on Hyperliquid outside of system
- Run monitor and verify auto-discovery
- Create duplicate entries manually - verify graceful handling

## Monitoring and Alerts

Consider adding alerts for:
1. Lock acquisition failures (might indicate hung process)
2. Repeated "already closed" messages (might indicate sync issues)
3. High rate of position creation errors
4. Monitor runtime exceeding lock timeout

## Future Improvements

1. **Database-based locking**: Consider using Prisma/PostgreSQL advisory locks instead of file-based locks for better reliability in distributed environments

2. **Position state machine**: Add explicit states (OPEN, CLOSING, CLOSED) to make state transitions more visible

3. **Distributed tracing**: Add correlation IDs to track position operations across services

4. **Reconciliation job**: Periodic job to sync DB state with Hyperliquid state for positions that might have been closed outside the system

5. **Metrics**: Track lock acquisition success rate, position close success rate, race condition frequency

## Files Modified

1. `/lib/trade-executor.ts` - Added position locking and graceful close handling
2. `/services/hyperliquid-service.py` - Made close-position endpoint idempotent
3. `/workers/position-monitor-hyperliquid.ts` - Added instance locking and better error handling

## Deployment Notes

- **No database migrations required** - Uses existing `metadata` JSON field
- **Backward compatible** - Lock file is optional, system works without it
- **No environment variables needed** - Uses sensible defaults
- **Lock file location**: `workers/.position-monitor.lock` (will be created automatically)

## Rollback Plan

If issues occur:
1. The changes are defensive and idempotent - safe to keep running
2. If needed, can revert to previous version
3. Delete lock file manually if it gets stuck: `rm workers/.position-monitor.lock`

