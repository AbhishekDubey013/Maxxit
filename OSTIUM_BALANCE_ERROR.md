# Ostium Balance Error - "transfer amount exceeds balance"

## Error

```
execution reverted: ERC20: transfer amount exceeds balance
```

## Root Cause

**The user's Arbitrum wallet doesn't have enough USDC to open the position.**

When using Ostium delegation:
- Agent address executes the trade
- But USDC is transferred from **user's Arbitrum wallet** (not agent address)
- If user's wallet has insufficient USDC, the transaction fails

---

## How It Works

### Ostium Delegation Flow:

1. **User's Arbitrum Wallet** (`safe_wallet` in deployment):
   - Must have USDC balance
   - USDC is transferred from here to open position

2. **Agent Address**:
   - Executes the trade via delegation
   - Doesn't need USDC (uses user's USDC)

3. **Trade Executor**:
   - Checks user's wallet balance (line 1001)
   - Calculates collateral based on balance
   - But if balance is 0 or too low, trade fails

---

## Solution

### Option 1: Fund User's Arbitrum Wallet (Recommended)

The user needs to send USDC to their Arbitrum wallet address.

**Steps:**
1. Get user's Arbitrum wallet address from deployment (`safe_wallet`)
2. User sends USDC to that address on Arbitrum Sepolia (testnet)
3. Minimum: $10 USDC (Ostium minimum order size)

**For Testnet:**
- Use Arbitrum Sepolia USDC faucet
- Or transfer from another wallet

**For Mainnet:**
- User transfers USDC from their main wallet
- Or deposits via bridge

---

### Option 2: Check Balance Before Trade

Add better balance validation in trade executor:

```typescript
// In lib/trade-executor.ts executeOstiumTrade()
const balance = await getOstiumBalance(userArbitrumWallet);
const usdcBalance = parseFloat(balance.usdcBalance);

if (usdcBalance === 0) {
  return {
    success: false,
    error: 'User wallet has no USDC balance. Please fund your Arbitrum wallet.',
    reason: `Balance: $${usdcBalance.toFixed(2)}`,
  };
}
```

---

## Current Balance Check

The trade executor already checks balance (lines 1001-1013):

```typescript
const balance = await getOstiumBalance(userArbitrumWallet);
const usdcBalance = parseFloat(balance.usdcBalance);

if (usdcBalance < OSTIUM_MIN_ORDER) {
  return {
    success: false,
    error: `Order must have minimum value of $10. Balance: $${usdcBalance.toFixed(2)}`,
  };
}
```

**But the error still occurs**, which means:
1. Balance check might be failing silently
2. Or balance changed between check and execution
3. Or there's a race condition

---

## Debugging Steps

### 1. Check User's Balance

```bash
# Call Ostium balance API
curl -X POST https://your-ostium-service.com/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "USER_ARBITRUM_WALLET_ADDRESS"}'
```

### 2. Check Deployment

```sql
SELECT 
  user_wallet,
  safe_wallet,
  enabled_venues
FROM agent_deployments
WHERE status = 'ACTIVE';
```

### 3. Verify USDC Balance

The user's `safe_wallet` address should have USDC on Arbitrum Sepolia.

---

## Minimum Requirements

- **Minimum Order Size:** $10 USDC
- **Recommended:** $50+ USDC for comfortable trading
- **Network:** Arbitrum Sepolia (testnet) or Arbitrum One (mainnet)

---

## Quick Fix

**For testing, fund the user's Arbitrum wallet:**

1. Get user's wallet address from deployment
2. Send USDC to that address
3. Retry the trade

**For production, users should:**
- Fund their Arbitrum wallet before deploying
- Or add funding step in deployment flow

---

## Prevention

Add balance check in deployment flow:

```typescript
// In deployment setup
const balance = await getOstiumBalance(userArbitrumWallet);
if (parseFloat(balance.usdcBalance) < 10) {
  // Show warning: "Please fund your Arbitrum wallet with at least $10 USDC"
  // Or redirect to funding page
}
```

