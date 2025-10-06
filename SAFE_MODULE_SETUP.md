# 🔐 Safe Module Setup Guide

**Complete guide to deploying and using MaxxitTradingModule**

---

## 📋 Overview

The MaxxitTradingModule provides **non-custodial, hack-proof trading** where:
- ✅ User maintains full custody (owns the Safe)
- ✅ Module can ONLY trade on whitelisted DEXes
- ✅ Module CANNOT withdraw principal funds
- ✅ Automatic 0.2 USDC fee + 20% profit share
- ✅ User can disable module anytime

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install ethers@5

# Install Hardhat globally (optional)
npm install -g hardhat
```

### Environment Variables

Add to `.env`:

```bash
# Deployment
DEPLOYER_PRIVATE_KEY=0x...          # Private key for deploying contracts
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
ARBISCAN_API_KEY=YOUR_API_KEY       # For contract verification

# Platform Configuration
PLATFORM_FEE_RECEIVER=0x...         # Address to receive 0.2 USDC trade fees
PLATFORM_PROFIT_RECEIVER=0x...      # Address to receive 20% profit share
MODULE_OWNER=0x...                  # Address that can manage whitelists

# Execution
EXECUTOR_PRIVATE_KEY=0x...          # Private key for executing trades (must be authorized)
TRADING_MODULE_ADDRESS=0x...        # Deployed module address (set after deployment)
```

---

## 📦 Step 1: Deploy Smart Contract

### Deploy to Arbitrum Testnet (Sepolia)

```bash
# Deploy to testnet first
npx hardhat run contracts/deploy/deploy-module.ts --network arbitrumSepolia
```

### Deploy to Arbitrum Mainnet

```bash
# Deploy to mainnet
npx hardhat run contracts/deploy/deploy-module.ts --network arbitrum
```

### Output

```
✅ MaxxitTradingModule deployed to: 0x123...

Deployment Info:
{
  "address": "0x123...",
  "chainId": 42161,
  "platformFeeReceiver": "0xFee...",
  "platformProfitReceiver": "0xProfit...",
  "moduleOwner": "0xOwner...",
  "usdc": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  "tradeFee": "0.2 USDC",
  "profitShare": "20%"
}
```

**Save the module address to `.env`:**

```bash
TRADING_MODULE_ADDRESS=0x123...
```

---

## 🔍 Step 2: Verify Contract

```bash
npx hardhat verify --network arbitrum \
  0x123... \
  0xFEE_RECEIVER \
  0xPROFIT_RECEIVER \
  0xaf88d065e77c8cC2239327C5EDb3A432268e5831 \
  0xMODULE_OWNER
```

---

## ⚙️ Step 3: Configure Module

### Authorize Executor Wallet

```typescript
// In Node.js/TypeScript
import { createSafeModuleService } from './lib/safe-module-service';

const moduleService = createSafeModuleService(
  process.env.TRADING_MODULE_ADDRESS!,
  42161, // Arbitrum
  process.env.MODULE_OWNER_PRIVATE_KEY // Use module owner key for this
);

// Authorize executor
await moduleService.setExecutorAuthorization(
  EXECUTOR_ADDRESS,
  true
);
```

### Whitelist Additional Tokens (Optional)

```typescript
// Whitelist WETH
await moduleService.setTokenWhitelist(
  '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
  true
);

// Whitelist ARB
await moduleService.setTokenWhitelist(
  '0x912CE59144191C1204E64559FE8253a0e49E6548', // ARB on Arbitrum
  true
);
```

---

## 👤 Step 4: User Enables Module

### Option A: Via Safe UI (Recommended for users)

1. Go to Safe wallet: https://app.safe.global
2. Navigate to: Apps → Transaction Builder
3. Add transaction:
   - To: `[Safe Address]`
   - Contract Method: `enableModule`
   - Module address: `[TRADING_MODULE_ADDRESS]`
4. Sign and execute

### Option B: Programmatically

```typescript
import Safe from '@safe-global/protocol-kit';
import { ethers } from 'ethers';

// User's Safe instance
const safe = await Safe.create({
  ethAdapter,
  safeAddress: USER_SAFE_ADDRESS,
});

// Enable module transaction
const tx = await safe.createEnableModuleTx(TRADING_MODULE_ADDRESS);

// User signs and executes
const executedTx = await safe.executeTransaction(tx);
```

---

## 🎯 Step 5: Initialize Capital Tracking

Before first trade, initialize capital tracking:

```typescript
import { createSafeModuleService } from './lib/safe-module-service';

const moduleService = createSafeModuleService(
  process.env.TRADING_MODULE_ADDRESS!,
  42161
);

// Initialize for user's Safe
await moduleService.initializeCapital(USER_SAFE_ADDRESS);
```

This records the initial USDC balance to calculate profit/loss later.

---

## 💰 Step 6: Execute Trades

### Backend Integration

```typescript
import { createSafeModuleService } from './lib/safe-module-service';
import { buildUniswapSwapData } from './lib/adapters/spot-adapter';

const moduleService = createSafeModuleService(
  process.env.TRADING_MODULE_ADDRESS!,
  42161
);

// Build swap data
const { swapData, minAmountOut } = await buildUniswapSwapData({
  tokenIn: USDC_ADDRESS,
  tokenOut: WETH_ADDRESS,
  amountIn: '100000000', // 100 USDC
  slippage: 0.5, // 0.5%
});

// Execute trade through module
const result = await moduleService.executeTrade({
  safeAddress: USER_SAFE_ADDRESS,
  fromToken: USDC_ADDRESS,
  toToken: WETH_ADDRESS,
  amountIn: '100000000', // 100 USDC (6 decimals)
  dexRouter: UNISWAP_ROUTER_ADDRESS,
  swapData: swapData,
  minAmountOut: minAmountOut,
});

if (result.success) {
  console.log('Trade executed!');
  console.log('TX Hash:', result.txHash);
  console.log('Amount Out:', result.amountOut);
  console.log('Fee Charged:', result.feeCharged);
  console.log('Profit Share:', result.profitShare);
}
```

### What Happens Automatically

1. ✅ **0.2 USDC fee deducted** → Sent to `platformFeeReceiver`
2. ✅ **Approval granted** → USDC approved for Uniswap
3. ✅ **Swap executed** → USDC → WETH
4. ✅ **Slippage protected** → Reverts if output < minAmountOut

When closing position (WETH → USDC):
5. ✅ **Profit calculated** → Current balance - initial capital
6. ✅ **20% profit share taken** → Sent to `platformProfitReceiver`
7. ✅ **User keeps 80%** → Principal + 80% profit

---

## 📊 Step 7: Monitor Positions

### Get Safe Statistics

```typescript
const stats = await moduleService.getSafeStats(USER_SAFE_ADDRESS);

console.log('Initialized:', stats.initialized);
console.log('Initial Capital:', stats.initialCapital, 'USDC');
console.log('Current Balance:', stats.currentBalance, 'USDC');
console.log('Profit/Loss:', stats.profitLoss, 'USDC');
console.log('Profit Taken:', stats.profitTaken, 'USDC');
console.log('Unrealized Profit:', stats.unrealizedProfit, 'USDC');
```

### Check if Ready for Trading

```typescript
const ready = await moduleService.isReadyForTrading(USER_SAFE_ADDRESS);
// Returns true if initialized and has enough USDC for fees
```

### Get Current P&L

```typescript
const profitLoss = await moduleService.getCurrentProfitLoss(USER_SAFE_ADDRESS);
// Returns: "+15.50" for profit or "-5.20" for loss
```

---

## 🔒 Security Features

### What Module CAN Do

✅ Swap USDC ↔ Tokens on **whitelisted DEXes**
✅ Approve tokens for DEX routers
✅ Transfer 0.2 USDC to platform (fixed fee)
✅ Transfer 20% of **profit only** to platform

### What Module CANNOT Do

❌ Transfer USDC to arbitrary addresses
❌ Withdraw principal funds
❌ Change Safe owners
❌ Interact with non-whitelisted contracts
❌ Disable itself (only Safe owner can)

### Principal Protection

```
Example:
Initial deposit:  1000 USDC
After trades:     1200 USDC
Profit:           200 USDC
Platform takes:   40 USDC (20% of profit)
User keeps:       1160 USDC (principal + 80% profit)

If losing trades:
Initial deposit:  1000 USDC
After trades:     900 USDC
Loss:             100 USDC
Platform takes:   0 USDC (no profit to share!)
User keeps:       900 USDC (all remaining funds)
```

---

## 🚨 Emergency: Disable Module

Users can disable the module anytime:

### Via Safe UI

1. Go to Settings → Modules
2. Find MaxxitTradingModule
3. Click "Disable"
4. Sign transaction

### Programmatically

```typescript
// From user's Safe
const tx = await safe.createDisableModuleTx(TRADING_MODULE_ADDRESS);
await safe.executeTransaction(tx);
```

After disabling:
- ✅ Module has ZERO access
- ✅ User has full control
- ✅ Can withdraw all funds
- ✅ No restrictions

---

## 📈 Testing

### Test on Arbitrum Sepolia

1. Deploy module to testnet
2. Create test Safe wallet
3. Get testnet USDC from faucet
4. Enable module
5. Execute test trades
6. Verify fees and profit share
7. Test emergency disable

### Integration Tests

```typescript
// Test capital initialization
const initResult = await moduleService.initializeCapital(testSafeAddress);
expect(initResult.success).toBe(true);

// Test trade execution
const tradeResult = await moduleService.executeTrade({...});
expect(tradeResult.success).toBe(true);
expect(tradeResult.feeCharged).toBe('200000'); // 0.2 USDC

// Test profit share
const profitShare = await moduleService.getPotentialProfitShare(testSafeAddress);
expect(parseFloat(profitShare)).toBeGreaterThan(0);
```

---

## 🔄 User Flow Summary

```
1. User creates/has Safe wallet
   └─ Deposits USDC

2. User enables MaxxitTradingModule
   └─ One-time transaction from Safe UI
   └─ Module now has LIMITED trading permissions

3. Agent generates signal
   └─ Backend processes signal

4. Executor calls module.executeTrade()
   └─ Module validates everything
   └─ Automatically charges 0.2 USDC fee
   └─ Executes swap on whitelisted DEX
   └─ Takes 20% profit share (if closing)
   └─ Returns result

5. User monitors via dashboard
   └─ See all trades on-chain
   └─ View profit/loss
   └─ Can disable module anytime
```

---

## 📚 API Reference

### SafeModuleService

```typescript
class SafeModuleService {
  // Initialize capital tracking (required before first trade)
  async initializeCapital(safeAddress: string): Promise<Result>
  
  // Execute a trade
  async executeTrade(params: TradeParams): Promise<TradeResult>
  
  // Get Safe statistics
  async getSafeStats(safeAddress: string): Promise<SafeStats>
  
  // Check if ready for trading
  async isReadyForTrading(safeAddress: string): Promise<boolean>
  
  // Get current profit/loss
  async getCurrentProfitLoss(safeAddress: string): Promise<string>
  
  // Get unrealized profit
  async getUnrealizedProfit(safeAddress: string): Promise<string>
  
  // Get potential profit share
  async getPotentialProfitShare(safeAddress: string): Promise<string>
  
  // Admin: Authorize executor
  async setExecutorAuthorization(executor: string, status: boolean): Promise<Result>
  
  // Admin: Whitelist DEX
  async setDexWhitelist(dex: string, status: boolean): Promise<Result>
  
  // Admin: Whitelist token
  async setTokenWhitelist(token: string, status: boolean): Promise<Result>
}
```

---

## ✅ Checklist

**Before Production:**

- [ ] Deploy module to Arbitrum mainnet
- [ ] Verify contract on Arbiscan
- [ ] Authorize executor wallet
- [ ] Whitelist required tokens (WETH, ARB, etc.)
- [ ] Test with small amounts first
- [ ] Monitor executor ETH balance for gas
- [ ] Set up monitoring/alerts
- [ ] Test emergency disable
- [ ] Update UI with module flow
- [ ] Create user documentation

**Security Audit (Recommended):**

- [ ] External smart contract audit
- [ ] Penetration testing
- [ ] Bug bounty program

---

## 🎉 Success!

Your Safe Module is now deployed and ready for **non-custodial, hack-proof trading!**

Users maintain full custody while agents trade automatically. 🔒🚀
