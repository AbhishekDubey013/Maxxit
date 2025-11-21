# OSTIUM BALANCE CHECK - CRITICAL FIX NEEDED

## Current Problem

**The balance check is WRONG!**

```typescript
// lib/trade-executor.ts line 1001
const balance = await getOstiumBalance(userArbitrumWallet);
const usdcBalance = parseFloat(balance.usdcBalance);
```

This checks the user's **wallet balance**, not their **deposited Ostium margin**.

---

## How Ostium Actually Works

### With Delegation:

1. **User deposits USDC into Ostium protocol**
   - USDC goes from wallet → Ostium contract
   - Becomes available margin for trading

2. **Agent trades using deposited margin**
   - Agent calls `perform_trade(trader_address=user_wallet)`
   - Ostium uses user's deposited margin (NOT wallet balance)

3. **Current balance check is wrong**
   - Checks `sdk.balance.get_usdc_balance(address)` → wallet balance
   - Should check deposited/margin balance in Ostium

---

## The Fix

We need to check the user's **deposited margin in Ostium**, not their wallet balance.

### Option 1: Use Ostium SDK Method

Check if Ostium SDK has a method like:
```python
# Possible methods (need to verify)
sdk.balance.get_margin_balance(address)
sdk.balance.get_vault_balance(address)
sdk.balance.get_available_balance(address)
sdk.trading.get_user_collateral(address)
```

### Option 2: Query Ostium Contract Directly

```python
from web3 import Web3

# Ostium TradingStorage contract
trading_storage = '0x0b9F5243B29938668c9Cfbd7557A389EC7Ef88b8'  # Testnet

# Get user's vault balance (deposited USDC)
vault_balance = trading_storage_contract.functions.getVaultBalance(user_address).call()
```

### Option 3: Use GraphQL API

```graphql
query UserMargin {
  user(address: "0x...") {
    marginBalance
    availableMargin
    usedMargin
  }
}
```

GraphQL endpoint: `https://subgraph.satsuma-prod.com/391a61815d32/ostium/ost-sep-final/api`

---

## What Needs to Change

### 1. Update Ostium Service

**File:** `services/ostium-service.py`

Add new endpoint: `/margin-balance` or update `/balance`

```python
@app.route('/margin-balance', methods=['POST'])
def get_margin_balance():
    """
    Get user's deposited margin in Ostium (not wallet balance)
    """
    address = data.get('address')
    
    # Get deposited margin from Ostium contract
    # Option 1: SDK method
    margin = sdk.balance.get_margin_balance(address)
    
    # Option 2: Contract query
    # margin = trading_storage.getVaultBalance(address)
    
    return jsonify({
        "success": True,
        "address": address,
        "marginBalance": str(margin),
        "walletBalance": str(sdk.balance.get_usdc_balance(address))
    })
```

### 2. Update Trade Executor

**File:** `lib/trade-executor.ts`

```typescript
// OLD (WRONG)
const balance = await getOstiumBalance(userArbitrumWallet);
const usdcBalance = parseFloat(balance.usdcBalance);

// NEW (CORRECT)
const balance = await getOstiumMarginBalance(userArbitrumWallet);
const usdcBalance = parseFloat(balance.marginBalance);
```

### 3. Update Adapter

**File:** `lib/adapters/ostium-adapter.ts`

Add new function:

```typescript
export async function getOstiumMarginBalance(
  address: string
): Promise<{ marginBalance: string; walletBalance: string }> {
  const response = await fetch(`${OSTIUM_SERVICE_URL}/margin-balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to get margin balance');
  }

  return data;
}
```

---

## Impact

**Currently:**
- ❌ Checking wallet balance (irrelevant for Ostium delegation)
- ❌ Trades fail even if user has deposited margin
- ❌ Error: "transfer amount exceeds balance"

**After fix:**
- ✅ Check deposited margin in Ostium
- ✅ Trades execute if user has enough margin
- ✅ Correct balance validation

---

## Immediate Action

1. **Check Ostium SDK documentation** for margin balance method
2. **Or query TradingStorage contract** for vault balance
3. **Update balance check** to use deposited margin
4. **Test** with user who has deposited USDC in Ostium

---

## Related Issue

The error `execution reverted: ERC20: transfer amount exceeds balance` occurs because:
- User deposited USDC into Ostium (wallet balance = 0)
- System checks wallet balance → sees 0
- But should check Ostium margin balance → might have $100+

**Fix this and trades will work!**


