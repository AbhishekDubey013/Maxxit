# Ostium SDK Bug Report: Incorrect Trade Indices with Delegation

## 🚨 Critical Issue

**The Ostium Python SDK returns incorrect trade indices, making it impossible to reliably close specific positions when using delegated trading.**

## Problem Summary

| Component | Expected | Actual | Impact |
|-----------|----------|--------|---------|
| `get_open_trades()` | Returns correct `index` per trade | Returns `index='0'` for ALL trades | ❌ Cannot identify which trade to close |
| `close_trade()` | Closes trade by `(pair_id, index)` | Closes first trade at index 0 | ❌ Wrong positions get closed |
| Storage Contract Query | Returns trades for user | Reverts with delegation | ❌ Cannot verify indices on-chain |

## Reproduction

```python
from ostium_python_sdk import OstiumSDK

sdk = OstiumSDK(network='testnet', private_key='0x...', rpc_url=RPC_URL)
result = await sdk.get_open_trades(trader_address='0xUserAddress')

trades = result[0]
for trade in trades:
    print(f"TradeID: {trade['tradeID']}, Index: {trade['index']}")
    
# Output:
# TradeID: 119306, Index: 0  ← ETH/USD
# TradeID: 119307, Index: 0  ← XRP/USD (WRONG! Should be different)
# TradeID: 119308, Index: 0  ← HYPE/USD (WRONG! Should be different)
# TradeID: 119352, Index: 0  ← XAG/USD (WRONG! Should be different)
# TradeID: 119353, Index: 0  ← USD/CHF (WRONG! Should be different)
```

**All trades report `index='0'` regardless of their actual on-chain index!**

## Impact

### When Closing Positions

```python
# Attempt to close HYPE (tradeID 119308)
sdk.ostium.close_trade(
    pair_id=41,        # HYPE
    trade_index=0,     # From SDK (WRONG!)
    market_price=37.0,
    trader_address='0xUserAddress'
)

# Result:
# ✅ Transaction succeeds
# ❌ Closes FIRST HYPE position at actual index 0
# ❌ Intended HYPE position (tradeID 119308) remains open
# 💰 Wrong user gets their collateral back
```

### Real-World Example

**Testnet Transaction**: `0xa4f33cd1753a7c572907c78347e3bec0c86a4b42830355e289c12004d1681a97`
- **Intent**: Close HYPE position (tradeID 119308)
- **What happened**: Transaction succeeded, 0.5 USDC returned
- **Current state**: HYPE (tradeID 119308) is **STILL OPEN**
- **Conclusion**: Wrong position was closed!

## Root Cause Analysis

### With Delegation

When using `trader_address` parameter (delegation):

1. **SDK Behavior**:
   - `get_open_trades(trader_address='0xUser')` ✅ Returns user's trades
   - BUT all have `index='0'` ❌

2. **Storage Contract Behavior**:
   - `TradingStorage.openTrades(user, pairIndex, index)` ❌ Reverts
   - Delegated trades not directly queryable under user address
   - Might be stored under agent address or in different structure

3. **Close Trade Behavior**:
   - Uses `(pair_id, index)` to identify which trade to close
   - With wrong index, closes wrong trade
   - Transaction succeeds, wrong position closed

## Attempted Solutions

### ❌ Solution 1: Query Storage Contract
```python
contract.functions.openTrades(user_address, pair_id, index).call()
```
**Result**: Reverts for all delegated trades

### ❌ Solution 2: Use index=0 for All
```python
# Assumption: Only one position per pair per user
close_trade(pair_id, index=0, ...)
```
**Result**: Works ONLY if user has exactly one position per pair. Fails with multiple positions.

### ❌ Solution 3: Match by openPrice
Cannot query storage contract to match, so cannot implement.

## Current Workaround

**LIMITATION: Support only ONE position per market per user**

```python
# This works:
- User A: 1 ETH/USD position ✅
- User A: 1 XRP/USD position ✅
- User A: 1 HYPE/USD position ✅

# This FAILS:
- User A: 2 ETH/USD positions ❌ (Can only close first one reliably)
```

## What Ostium SDK Should Provide

### Option 1: Fix `get_open_trades()` Return Value
```python
# Should return correct indices:
trades = [
    {'tradeID': '119306', 'index': '0', ...},  # ETH at index 0
    {'tradeID': '119307', 'index': '0', ...},  # XRP at index 0 (different pair)
    {'tradeID': '119308', 'index': '1', ...},  # HYPE at index 1 (if there's another HYPE at 0)
]
```

### Option 2: Add `close_trade_by_id()` Method
```python
# New method that accepts tradeID directly
sdk.ostium.close_trade_by_id(
    trade_id='119308',
    market_price=37.0,
    trader_address='0xUser'
)
```

### Option 3: Add Helper to Query Indices
```python
# Helper to get correct index for a trade
correct_index = sdk.get_trade_index(
    trader_address='0xUser',
    pair_id=41,
    trade_id='119308'
)
```

## Delegation-Specific Issues

The SDK doesn't properly handle delegated trades:

1. **Query works**: `get_open_trades(trader_address='0xUser')` returns trades
2. **Close works**: `close_trade(..., trader_address='0xUser')` executes
3. **Index wrong**: But uses wrong index, closes wrong position

The delegation feature is incomplete - it can open and close, but cannot reliably identify which trade to close.

## Tested Environment

- **Network**: Arbitrum Sepolia (Testnet)
- **SDK Version**: `ostium-python-sdk` (latest from pip)
- **Contract**: 
  - Trading: `0x2A9B9c988393f46a2537B0ff11E98c2C15a95afe`
  - Storage: `0x0B9f5243B29938668c9Cfbd7557A389EC7Ef88b8`

## Files for Reproduction

All scripts available in repository:
- `scripts/fix-ostium-index-mapping.py` - Demonstrates the bug
- `scripts/query-ostium-trades-detailed.ts` - Attempts to query storage
- `scripts/check-ostium-tx.ts` - Shows wrong position closed

## Recommended Actions

### For Ostium Team

1. **Fix SDK**: Make `get_open_trades()` return correct indices
2. **Add Method**: Implement `close_trade_by_id(trade_id)` 
3. **Documentation**: Document delegation limitations
4. **Contract**: Expose way to query delegated trades with correct indices

### For Our Project (Workaround)

Until SDK is fixed:
1. ✅ Enforce ONE position per market per user
2. ✅ Use `index=0` for all closes
3. ✅ Document limitation clearly
4. ❌ DO NOT allow multiple positions per market

## Severity

**🔴 CRITICAL** - Silent data corruption:
- ✅ Transactions succeed
- ❌ Wrong positions closed
- 💰 Wrong users affected
- 🤷 No error thrown

This is worse than a failing transaction because it **silently does the wrong thing**.

## Status

- **Reported**: 2025-11-21
- **Impact**: Production-blocking for multi-position use cases
- **Workaround**: Limit to one position per market per user
- **Fix Needed**: Ostium SDK team

## Contact

If Ostium team sees this:
- **Issue**: Trade indices incorrect with delegation
- **Method**: `get_open_trades()` returns `index='0'` for all
- **Need**: Either fix indices or add `close_by_trade_id()` method
- **Severity**: Critical - causes wrong positions to close

---

**This is a bug in the Ostium SDK, not our implementation.**

