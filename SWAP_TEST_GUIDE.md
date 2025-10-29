# 🧪 Swap Test Guide - Complete Setup

## Current Status ✅

- **Safe Address:** `0x49396C773238F01e6AbCc0182D01e3363Fe4d320`
- **Module Enabled:** ✅ YES
- **USDC Balance:** 2.0 USDC
- **Your Wallet:** `0x3828dFCBff64fD07B963Ef11BafE632260413Ab3` (authorized)

---

## ❌ Why the Swap Failed

The Safe wallet needs to **approve** the Uniswap V3 Router to spend its USDC tokens. This is a standard ERC-20 requirement and is a one-time setup.

---

## 🔧 Required Setup Steps

### Step 1: Approve Uniswap Router (One-Time Setup)

You have **TWO options**:

#### **Option A: Via Safe UI** (Recommended - Easiest)

1. **Open your Safe:**
   ```
   https://app.safe.global/home?safe=arb1:0x49396C773238F01e6AbCc0182D01e3363Fe4d320
   ```

2. **Create Transaction:**
   - Click **"New Transaction"**
   - Select **"Transaction Builder"**

3. **Add Transaction:**
   - Contract Address: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` (USDC)
   - ABI: Use ERC-20 standard ABI or manually enter:
   ```json
   [{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]
   ```
   
4. **Set Parameters:**
   - Function: `approve`
   - spender: `0xE592427A0AEce92De3Edee1F18E0157C05861564`
   - amount: `115792089237316195423570985008687907853269984665640564039457584007913129639935`
   
   (This is max uint256 = unlimited approval, standard for DEX interactions)

5. **Execute:**
   - Review and execute the transaction
   - Sign in MetaMask
   - Wait for confirmation on Arbiscan

#### **Option B: Via Etherscan** (Alternative)

1. **Go to USDC Contract:**
   ```
   https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831#writeProxyContract
   ```

2. **Connect Wallet:**
   - Click "Connect to Web3"
   - Connect your Safe wallet (use WalletConnect if needed)

3. **Call `approve`:**
   - Find the `approve` function
   - spender: `0xE592427A0AEce92De3Edee1F18E0157C05861564`
   - amount: `115792089237316195423570985008687907853269984665640564039457584007913129639935`

4. **Write & Confirm**

---

### Step 2: Initialize Capital (Required Before First Trade)

After approval is set, run:

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
npx tsx scripts/initialize-capital.ts
```

This will:
- Check your authorization ✅ (already done)
- Record your starting USDC balance (2.0 USDC)
- Enable profit/loss tracking

**Expected Output:**
```
✅ Capital initialized!
📊 Initialized Capital: 2.0 USDC
```

---

### Step 3: Execute the Swap

After approval AND capital initialization, run:

```bash
npx tsx scripts/test-swap-execution.ts
```

This will:
1. ✅ Check Safe has USDC (2.0 USDC)
2. ✅ Get quote from Uniswap (~5.68 ARB for 1.8 USDC)
3. ✅ Execute swap through module
4. ✅ Verify ARB received

**Expected Output:**
```
✅ Transaction confirmed!
🎉 Received: ~5.68 ARB
✅ SWAP SUCCESSFUL!
```

---

## 🔍 Verification Scripts

### Check Current Status
```bash
npx tsx scripts/check-safe-status.ts
```

### Diagnose Issues
```bash
npx tsx scripts/diagnose-swap-issue.ts
```

### Check Module Execution
```bash
npx tsx scripts/test-module-execution.ts
```

---

## 📊 What Happens During a Swap

1. **You call** `executeTrade` on the module
2. **Module verifies:**
   - You're an authorized executor ✅
   - Capital is initialized ✅
   - Safe has enough USDC ✅
3. **Module executes:**
   - Calls Uniswap V3 Router via `execTransactionFromModule`
   - Router transfers USDC from Safe (requires approval ⚠️)
   - Router swaps to ARB
   - ARB is sent back to Safe
4. **Module collects:**
   - Platform fee: 0.2 USDC
   - Profit share (if profitable): 20% of gains

---

## ❓ Troubleshooting

### "execution reverted" Error
**Cause:** USDC not approved to Uniswap Router  
**Fix:** Complete Step 1 above

### "Capital not initialized" Error
**Cause:** Need to call `initializeCapital` first  
**Fix:** Complete Step 2 above

### "Unauthorized executor" Error
**Cause:** Caller not authorized  
**Fix:** Already authorized ✅ (you're good!)

### "insufficient funds" Error  
**Cause:** Not enough USDC in Safe  
**Fix:** You have 2.0 USDC ✅ (sufficient for test)

---

## 🎯 Summary

**Current Status:**
- ✅ Safe deployed
- ✅ Module enabled
- ✅ USDC funded (2.0 USDC)
- ✅ Wallet authorized

**Remaining Steps:**
1. ⏳ Approve Uniswap Router (via Safe UI - 2 minutes)
2. ⏳ Initialize capital (run script - 30 seconds)
3. ⏳ Execute swap (run script - 30 seconds)

**Total Time:** ~3 minutes to complete test 🚀

---

## 🔗 Quick Links

- **Your Safe:** https://app.safe.global/home?safe=arb1:0x49396C773238F01e6AbCc0182D01e3363Fe4d320
- **Arbiscan (Safe):** https://arbiscan.io/address/0x49396C773238F01e6AbCc0182D01e3363Fe4d320
- **Arbiscan (Module):** https://arbiscan.io/address/0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb
- **USDC Contract:** https://arbiscan.io/address/0xaf88d065e77c8cC2239327C5EDb3A432268e5831

---

**Once you complete Step 1 (approval), let me know and I'll help you complete Steps 2 & 3!** 🚀

