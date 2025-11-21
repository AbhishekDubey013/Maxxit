# Ostium Pending Order Issue

## Problem

Position was executed successfully but:
- Entry Price: 0 (should have actual price)
- Quantity: 0 (should be 1000 USDC)
- Position not visible on Ostium platform

## Root Cause

**Ostium uses a keeper-based order system:**

1. **Order Submission**: When you call `open-position`, it creates an **order** (not a position yet)
2. **Keeper Fills Order**: A keeper bot must fill the order to create the actual position
3. **Position Created**: Only after keeper fills it does the position appear on-chain

The flow is:
```
Order Submitted → Waiting for Keeper → Keeper Fills → Position Created
```

## What Happened

1. ✅ Order was submitted successfully
2. ✅ Got `orderId` and `txHash`
3. ⏳ Order is **pending** (waiting for keeper to fill)
4. ❌ Position doesn't exist on-chain yet (keeper hasn't filled it)
5. ❌ Position monitor can't find it, so it might mark it as closed

## Solution

### Immediate Fix (Code)

1. **Store orderId**: Save the `orderId` so we can track it
2. **Use placeholder price**: Fetch current market price as estimate
3. **Mark as OPEN**: Don't mark as closed just because it's not found yet
4. **Position Monitor**: Will update entry_price once keeper fills the order

### For This Specific Position

The position with TX hash `3b0b1ec7c37086e1b2a0f62f38edff403be6f4140b03d2ff1898a28747554b45`:

1. **Check if order was filled**:
   ```bash
   # Query Ostium positions for the user's wallet
   curl -X POST http://localhost:5002/positions \
     -H "Content-Type: application/json" \
     -d '{"address": "0xa10846a81528d429b50b0dcbf8968938a572fac5"}'
   ```

2. **If position appears**: Position monitor will pick it up and update entry_price

3. **If position doesn't appear**: Order is still pending, wait for keeper to fill it

## Expected Behavior

- **Order Submitted**: Position created in DB with placeholder values
- **Keeper Fills**: Position appears on-chain
- **Position Monitor**: Discovers it and updates entry_price, qty, etc.
- **Position Visible**: Now visible on Ostium platform and in your system

## Time to Fill

Keeper typically fills orders within:
- **Testnet**: 1-5 minutes
- **Mainnet**: Usually faster (30 seconds - 2 minutes)

If order isn't filled after 10 minutes, it might have been rejected (check logs).

## Verification

Check if position exists on-chain:
```bash
# Get positions for user wallet
curl -X POST ${OSTIUM_SERVICE_URL}/positions \
  -H "Content-Type: application/json" \
  -d '{"address": "USER_WALLET_ADDRESS"}'
```

If position appears in response, it was filled. If not, it's still pending.


