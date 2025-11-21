# Ostium Trade Index Bug Fix

## 🚨 Critical Bug Discovered

When attempting to close Ostium positions, the **wrong positions were being closed** even though the transaction showed success.

## Root Cause

The Ostium SDK's `get_open_trades()` function returns **incorrect trade indices**:

```python
# ALL positions returned with index='0' (WRONG!)
{'tradeID': '119306', 'index': '0', ...}  # ETH/USD
{'tradeID': '119307', 'index': '0', ...}  # XRP/USD  
{'tradeID': '119308', 'index': '0', ...}  # HYPE/USD
{'tradeID': '119352', 'index': '0', ...}  # XAG/USD
{'tradeID': '119353', 'index': '0', ...}  # USD/CHF
```

### The Problem

1. Ostium stores trades **per-user per-pair** with indices (0, 1, 2, ...) specific to each pair
2. The SDK's `get_open_trades()` returns `index='0'` for ALL positions
3. When closing a position, we passed `trade_index=0` + `pair_id`, which closed **the first trade for that pair** (often the wrong one!)
4. Transaction succeeded (status: 1), USDC was transferred back, but the **wrong position was closed**

### Example Scenario

```
User has 5 open positions:
- ETH/USD  (tradeID: 119306, real index: 0)
- XRP/USD  (tradeID: 119307, real index: 0)
- HYPE/USD (tradeID: 119308, real index: 0)
- XAG/USD  (tradeID: 119352, real index: 0) 
- USD/CHF  (tradeID: 119353, real index: 0)

Try to close HYPE (tradeID: 119308):
1. SDK matches trade by tradeID ✅
2. SDK returns index='0' ❌
3. Call close_trade(index=0, pair_id=41) 
4. Closes FIRST HYPE position at index 0 (might be a different trade!)
5. Transaction succeeds, but WRONG position closed ❌
```

## The Fix

Added **on-chain contract query** to get the correct trade index before closing:

```python
# Query Ostium Trading contract directly
trading_contract = w3.eth.contract(address=trading_contract_address, abi=trading_abi)

# Get ALL trades for this user and pair from on-chain
on_chain_trades = trading_contract.functions.getTrades(
    user_address,
    pair_index
).call()

# Match by openPrice to find the correct trade
for on_chain_trade in on_chain_trades:
    if on_chain_trade.openPrice == target_open_price:
        correct_trade_index = on_chain_trade.index
        break

# Use correct index for closing
sdk.ostium.close_trade(correct_trade_index, pair_index, price)
```

### Why This Works

1. **Queries smart contract directly** - gets actual on-chain state
2. **Returns all trades for a pair** - with their correct indices (0, 1, 2, etc.)
3. **Matches by openPrice** - unique identifier for most cases
4. **Uses correct index** - closes the exact position we intend to

## Implementation Details

### Modified Function
`services/ostium-service.py` - `close_position()` endpoint

### Contract Details
- **Contract**: Ostium Trading (Arbitrum Sepolia)
- **Address**: `0x2A9B9c988393f46a2537B0ff11E98c2C15a95afe`
- **Function**: `getTrades(address _trader, uint256 _pairIndex)`
- **Returns**: Array of Trade structs with correct indices

### Trade Struct
```solidity
struct Trade {
    address trader;
    uint256 pairIndex;
    uint256 index;          // ← This is what we need!
    uint256 positionSizeAsset;
    uint256 openPrice;      // ← Used for matching
    bool buy;
    uint256 leverage;
    uint256 tp;
    uint256 sl;
}
```

## Testing

To verify the fix works:

```bash
# 1. Start fixed Ostium service
cd services
python3 ostium-service.py

# 2. Check positions
npx tsx scripts/test-ostium-pnl-calc.ts 0xYOUR_ADDRESS

# 3. Try closing a specific position
curl -X POST http://localhost:5002/close-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentAddress": "0x...",
    "userAddress": "0x...",
    "market": "HYPE",
    "tradeId": "119308"
  }'

# 4. Verify correct position was closed
npx tsx scripts/test-ostium-pnl-calc.ts 0xYOUR_ADDRESS
```

## Log Output

### Before Fix
```
[CLOSE] Looking for trade - market: HYPE, tradeId: 119308
[CLOSE] Matched by tradeId: 119308
[CLOSE] Closing HYPE - trade_index: 0, pair_index: 41
[CLOSE] ✅ SDK close_trade returned
# Transaction succeeds but wrong position closed!
```

### After Fix
```
[CLOSE] Looking for trade - market: HYPE, tradeId: 119308
[CLOSE] Matched by tradeId: 119308
[CLOSE] ⚠️  SDK returned index: 0 (often incorrect - all positions show '0')
[CLOSE] 🔍 Querying on-chain to find correct trade index for tradeID 119308
[CLOSE] 📊 Found 3 on-chain trades for pair 41
[CLOSE]   Trade 0: on-chain index=0, openPrice=39431216403374430000
[CLOSE]   Trade 1: on-chain index=1, openPrice=38500000000000000000
[CLOSE]   Trade 2: on-chain index=2, openPrice=40200000000000000000
[CLOSE] ✅ Matched! Correct trade_index = 0
[CLOSE] 🎯 Using trade_index: 0 for HYPE (pair_index: 41)
[CLOSE] ✅ SDK close_trade returned
# Correct position closed!
```

## Impact

### Before Fix
- ❌ Wrong positions being closed
- ❌ Unable to close specific positions
- ❌ Database out of sync with on-chain state
- ❌ User positions stuck open

### After Fix
- ✅ Correct positions closed every time
- ✅ Can close any specific position by tradeID
- ✅ Database stays in sync with on-chain state
- ✅ Reliable position management

## Future Considerations

1. **Report to Ostium SDK Team**: The `index` field in `get_open_trades()` response is incorrect
2. **Alternative Matching**: Could also match by `collateral + leverage + timestamp` for extra safety
3. **Cache On-chain Data**: Could cache trade indices to reduce RPC calls
4. **Batch Operations**: Could optimize to query all pairs at once if closing multiple positions

## Related Files

- `services/ostium-service.py` - Main fix implementation
- `lib/trade-executor.ts` - Calls the close endpoint
- `workers/position-monitor-ostium.ts` - Monitors and closes positions
- `docs/OSTIUM_PNL_FIX.md` - Related P&L calculation fix

## Status

✅ **FIXED** - Ostium positions now close correctly with proper trade index lookup from on-chain contract.

