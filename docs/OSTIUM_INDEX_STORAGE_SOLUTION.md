# Ostium Trade Index Storage Solution

## Problem Solved

**Ostium SDK Bug**: Returns `index='0'` for ALL positions, making it impossible to close specific positions reliably.

**Solution**: Store the actual trade index when opening positions, then use it when closing.

## Implementation

### 1. Store Index When Opening

When a position is opened:
1. Query Ostium storage contract after order is filled
2. Match by `openPrice` to find the correct trade index
3. Store `ostium_trade_index` in database
4. Use this stored index when closing

### 2. Use Stored Index When Closing

When closing a position:
1. Look up `ostium_trade_index` from database
2. Pass it to `close_position` endpoint
3. Service uses stored index instead of SDK's broken `index='0'`
4. Correct position gets closed! ✅

## Code Changes

### Database Schema
```prisma
model positions {
  // ... existing fields ...
  ostium_trade_index    Int?  // Actual trade index from Ostium (fixes SDK bug)
}
```

### Opening Position (`services/ostium-service.py`)
```python
# After opening, query storage contract to get actual index
actual_trade_index = query_storage_contract(user_address, pair_id, open_price)

return {
    "success": True,
    "actualTradeIndex": actual_trade_index,  # NEW!
    # ... other fields ...
}
```

### Storing Index (`lib/trade-executor.ts`)
```typescript
const result = await openOstiumPosition({...});
const actualTradeIndex = result.actualTradeIndex;

await prisma.positions.create({
  data: {
    // ... other fields ...
    ostium_trade_index: actualTradeIndex,  // Store it!
  }
});
```

### Closing Position (`lib/trade-executor.ts`)
```typescript
const position = await prisma.positions.findUnique({...});

await closeOstiumPosition({
  // ... other params ...
  actualTradeIndex: position.ostium_trade_index,  // Use stored index!
});
```

### Using Stored Index (`services/ostium-service.py`)
```python
# In close_position() endpoint
stored_trade_index = data.get('actualTradeIndex')

# Or query from database
if not stored_trade_index and trade_id:
    db_position = query_db_for_position(trade_id)
    stored_trade_index = db_position.ostium_trade_index

# Use stored index instead of SDK's broken index='0'
if stored_trade_index is not None:
    trade_index = stored_trade_index  # ✅ CORRECT!
else:
    trade_index = 0  # ⚠️  Fallback (may be wrong)
```

## How It Works

### Opening Flow
```
1. User opens HYPE position
   ↓
2. SDK opens position, returns order_id
   ↓
3. Query storage contract: "What index did this trade get?"
   ↓
4. Match by openPrice: Found at index=2
   ↓
5. Store ostium_trade_index=2 in database
   ↓
6. Position record created with correct index ✅
```

### Closing Flow
```
1. Position monitor detects HYPE should close
   ↓
2. Look up position in database
   ↓
3. Get ostium_trade_index=2 from database
   ↓
4. Call close_position(..., actualTradeIndex=2)
   ↓
5. Service uses index=2 (not SDK's broken index='0')
   ↓
6. Correct HYPE position closed! ✅
```

## Benefits

✅ **Fixes SDK Bug**: No longer relies on SDK's broken `index='0'`  
✅ **Reliable Closes**: Always closes the correct position  
✅ **Backward Compatible**: Falls back to `index=0` if no stored index  
✅ **Works with Delegation**: Queries storage contract correctly  

## Limitations

### If Storage Query Fails
- Falls back to `index=0`
- May still close wrong position if multiple exist
- Logs warning for manual review

### If Index Not Stored
- Old positions opened before this fix won't have index
- Falls back to `index=0`
- Still works if only one position per market

## Migration

### For Existing Positions

Existing positions won't have `ostium_trade_index` set. Options:

1. **Leave as-is**: Falls back to `index=0` (works if one per market)
2. **Manual update**: Query storage contract and update database
3. **Re-open**: Close and re-open positions to get correct indices

### Database Migration

```sql
-- Add column (nullable for existing positions)
ALTER TABLE positions 
ADD COLUMN ostium_trade_index INTEGER;

-- Create index for faster lookups
CREATE INDEX idx_positions_ostium_trade_index 
ON positions(ostium_trade_index) 
WHERE ostium_trade_index IS NOT NULL;
```

## Testing

### Test Opening
```bash
# Open a new position
# Check logs for: "✅ Actual trade index stored: X"
# Verify database: SELECT ostium_trade_index FROM positions WHERE id='...'
```

### Test Closing
```bash
# Close position
# Check logs for: "✅ Using STORED trade index: X"
# Verify correct position closed on Ostium
```

## Status

✅ **Implemented**: Index storage on open  
✅ **Implemented**: Index usage on close  
✅ **Database**: Schema updated  
⏳ **Migration**: Needs to be run  
⏳ **Testing**: Needs verification with real positions  

## Future Improvements

1. **Retry Logic**: If storage query fails, retry after a delay
2. **Index Validation**: Verify stored index matches on-chain before closing
3. **Auto-Migration**: Script to backfill indices for existing positions
4. **Monitoring**: Alert if index storage fails frequently

---

**This solution works around the Ostium SDK bug by storing the correct index ourselves!**

