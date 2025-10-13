# 🐛 Telegram Trade Bug Summary

## Problem
User sends command to **BUY** WETH, but system tries to **CLOSE** WETH position instead.

## Evidence

### 1. User Command (Correctly Parsed)
```
Command: "buy 1 usdc weth"
Parsed Intent: {
  action: 'BUY',    ← Correct!
  token: 'WETH',
  amount: 1
}
```

### 2. Transaction (Wrong Function Called)
```
Function: 0x86728e88 = closePosition()  ← WRONG! Should be executeTrade()
Error: CALL_EXCEPTION (transaction reverted)
Safe has 0 WETH to close
```

## Root Cause

The TradeExecutor is calling `closePosition()` when it should call `executeTrade()` for opening positions.

## Hypothesis

**Check if there's a bug in the `executeSignalForDeployment` method** where it's confusing BUY/LONG signals with CLOSE signals, or if it's trying to close an existing position first.

## Next Steps

1. ✅ Check if there are any open WETH positions in DB for this user
2. ⏳ Check `executeSignalForDeployment` logic in TradeExecutor
3. ⏳ Check if signal.side is being read correctly
4. ⏳ Add debug logging to see which code path is executing

## Quick Fix

The system needs to:
- For BUY commands (side='LONG') → Call `executeTrade()` to open position
- For SELL/CLOSE commands (side='SHORT' or explicit close) → Call `closePosition()`

Currently it's calling `closePosition()` for a BUY command.

