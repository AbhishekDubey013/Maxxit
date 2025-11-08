# Hyperliquid Profit Share Collection - Setup Guide

## 🔍 Issue Found

**Profit shares were NOT being collected** from Hyperliquid trades.

### Findings:
- **4 profitable positions** closed with **$4.52 total profit**
- **Expected profit share (10%)**: $0.45
- **Actual collected**: $0.00 ❌

### Root Causes:
1. ❌ `HYPERLIQUID_PLATFORM_WALLET` environment variable was not set
2. ❌ Duplicate `/transfer` endpoint in Hyperliquid service prevented delegation

---

## ✅ Fixes Applied

### 1. Removed Duplicate Endpoint
**File**: `services/hyperliquid-service.py`

There were two `/transfer` endpoints:
- **Line 392** (OLD): `transfer_usdc()` - basic transfer, no delegation support
- **Line 711** (CORRECT): `transfer()` - supports agent delegation with `vaultAddress`

Flask was using the first one, which doesn't support transferring from user wallets via agent delegation.

**Fixed**: Removed the duplicate at line 392.

### 2. Created Retroactive Collection Script
**File**: `scripts/collect-missed-profit-shares.ts`

This script will collect the $0.45 in missed profit shares after the service is redeployed.

---

## 🚀 Next Steps

### Step 1: Set Environment Variables

#### For Railway (Production):
```bash
# Go to Railway dashboard → Environment Variables
HYPERLIQUID_PLATFORM_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
HYPERLIQUID_PROFIT_SHARE=10
HYPERLIQUID_FEE_MODEL=PROFIT_SHARE
```

#### For Local Development:
```bash
# Add to .env file
export HYPERLIQUID_PLATFORM_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
export HYPERLIQUID_PROFIT_SHARE=10
export HYPERLIQUID_FEE_MODEL=PROFIT_SHARE
```

### Step 2: Redeploy Hyperliquid Service

The duplicate endpoint fix needs to be deployed:

```bash
# Railway will auto-deploy from the git push
# Or manually trigger redeploy in Railway dashboard
```

**Service URL**: https://hyperliquid-service.onrender.com

### Step 3: Collect Missed Profit Shares

After the service is redeployed, run:

```bash
export HYPERLIQUID_PLATFORM_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
export HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com

npx tsx scripts/collect-missed-profit-shares.ts
```

**Expected result**:
- Collect $0.20 from ARB position
- Collect $0.16 from SOL position  
- Collect $0.05 from OP position
- Collect $0.03 from ETH position
- **Total: $0.45**

---

## 📊 How It Works (After Fix)

### Automatic Collection on Future Trades

```
1. Agent closes Hyperliquid position with $10 profit
2. System calculates 10% profit share = $1.00
3. Agent transfers $1.00 from user wallet → platform wallet
4. Billing event recorded in database
5. User keeps $9.00 profit
```

### Code Flow

```typescript
// lib/trade-executor.ts (line 1380)
await this.collectHyperliquidFees({
  deploymentId,
  userAddress,
  pnl: 10.00,
  positionSize: 100.00
});

// Calls Hyperliquid service
POST https://hyperliquid-service.onrender.com/transfer
{
  "agentPrivateKey": "0x...",
  "toAddress": "0x3828dFCBff64fD07B963Ef11BafE632260413Ab3",
  "amount": 1.00,
  "vaultAddress": "0xUserWallet..." // Agent acts on behalf of user
}
```

---

## 🧪 Verification

### Check Database
```sql
-- Check billing events
SELECT * FROM billing_events 
WHERE kind = 'PROFIT_SHARE' 
ORDER BY occurred_at DESC;
```

### Check Hyperliquid Balance
Go to: https://app.hyperliquid.xyz/

Login with: `0x3828dFCBff64fD07B963Ef11BafE632260413Ab3`

Check USDC balance increases after profitable closes.

---

## 💰 Fee Models

You can configure different fee models via environment variables:

### 1. Profit Share (Default) ✅
```bash
HYPERLIQUID_FEE_MODEL=PROFIT_SHARE
HYPERLIQUID_PROFIT_SHARE=10  # 10% of profits only
```
**Use case**: Industry standard - only charge on winning trades

### 2. Flat Fee
```bash
HYPERLIQUID_FEE_MODEL=FLAT
HYPERLIQUID_FLAT_FEE=0.50  # $0.50 per trade
```
**Use case**: Predictable revenue regardless of outcome

### 3. Percentage of Position Size
```bash
HYPERLIQUID_FEE_MODEL=PERCENTAGE
HYPERLIQUID_FEE_PERCENT=0.1  # 0.1% of position value
```
**Use case**: Charge based on capital efficiency

### 4. Tiered Profit Share
```bash
HYPERLIQUID_FEE_MODEL=TIERED
# Automatically charges:
# - 5% for profits under $100
# - 10% for profits $100-$500
# - 15% for profits over $500
```
**Use case**: Incentivize larger profitable trades

---

## 📝 Summary

| Item | Status |
|------|--------|
| Missed profit shares | $0.45 (4 positions) |
| Platform wallet | `0x3828...3Ab3` ✅ |
| Duplicate endpoint | Fixed ✅ |
| Retroactive script | Created ✅ |
| Service redeployment | **Pending** ⏳ |
| Profit collection | Will work after redeploy ✅ |

---

## 🎯 Action Items

- [ ] Redeploy Hyperliquid service with duplicate endpoint fix
- [ ] Set `HYPERLIQUID_PLATFORM_WALLET` in Railway environment
- [ ] Run retroactive collection script to get $0.45
- [ ] Monitor future trades to confirm automatic collection works
- [ ] Verify platform wallet balance increases after profitable closes

