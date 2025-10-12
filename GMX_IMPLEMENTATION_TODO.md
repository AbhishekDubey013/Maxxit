# 🚧 GMX Implementation - Remaining Tasks

## ✅ COMPLETED:
1. ✅ GMX SubaccountRouter architecture designed
2. ✅ GMX adapter with security limits (10x leverage, 5000 USDC max)
3. ✅ 70+ token whitelist (GMX + SPOT)
4. ✅ GMX Reader for **on-chain prices** (queries GMX directly, like Uniswap Quoter)
5. ✅ Trade execution (open/close GMX positions)
6. ✅ Authorization scripts

## 🔴 CRITICAL - Must Complete:

### 1. **Fee Collection (0.2 USDC) via Safe Module**
**Location:** `lib/adapters/gmx-adapter-subaccount.ts:486`

**Current Status:** ❌ Stub implementation (just logs, doesn't execute)

**Required:** Call existing `MaxxitTradingModule.executeTrade()` to collect 0.2 USDC:

```typescript
private async collectTradeFee(safeAddress: string): Promise<Result> {
  // Use module to execute USDC transfer: Safe → Platform
  const result = await this.moduleService.executeTrade({
    safe: safeAddress,
    fromToken: USDC_ADDRESS,
    toToken: USDC_ADDRESS,
    amountIn: ethers.utils.parseUnits('0.2', 6),
    dexRouter: UNISWAP_ROUTER, // Dummy router (no actual swap)
    swapData: '0x', // Empty data
    minAmountOut: 0,
    profitReceiver: PLATFORM_FEE_RECEIVER,
  });
  
  return result;
}
```

**Why this way:**
- ✅ Uses existing smart contract (no new deployment)
- ✅ Same mechanism as SPOT trading
- ✅ Fully transparent on-chain
- ✅ Module enforces permissions

---

### 2. **Profit Share (20%) via Safe Module**
**Location:** `lib/trade-executor.ts:1090`

**Current Status:** ❌ Just logs "TODO"

**Required:** After GMX position closes with profit, deduct 20% to agent owner:

```typescript
// In closeGMXPosition():
if (pnl > 0) {
  const profitUSDC = pnl; // Already in USDC
  const profitShare = profitUSDC * 0.2; // 20%
  
  // Transfer via module: Safe → Agent Owner
  const result = await moduleService.executeTrade({
    safe: position.deployment.safeWallet,
    fromToken: USDC_ADDRESS,
    toToken: USDC_ADDRESS,
    amountIn: ethers.utils.parseUnits(profitShare.toFixed(6), 6),
    dexRouter: UNISWAP_ROUTER,
    swapData: '0x',
    minAmountOut: 0,
    profitReceiver: position.deployment.agent.profitReceiverAddress,
  });
  
  console.log(`[TradeExecutor] ✅ 20% profit share distributed: ${profitShare.toFixed(2)} USDC`);
}
```

**Why this way:**
- ✅ On-chain profit calculation from GMX
- ✅ Transparent USDC transfer via module
- ✅ Same mechanism as SPOT profit sharing
- ✅ Agent owner receives directly

---

### 3. **GMX Position Monitoring (Trailing Stop Loss)**
**Location:** `workers/position-monitor-v2.ts`

**Current Status:** ❌ Only monitors SPOT positions

**Required:** Add GMX venue support with **GMX Reader** for prices:

```typescript
// In position-monitor-v2.ts

import { createGMXReader } from '../lib/adapters/gmx-reader';

// ...

if (position.venue === 'GMX') {
  // Get current price from GMX (on-chain)
  const gmxReader = createGMXReader(provider);
  const priceData = await gmxReader.getMarketPrice(position.tokenSymbol);
  
  if (!priceData) {
    console.error(`[Monitor] Failed to get GMX price for ${position.tokenSymbol}`);
    continue;
  }
  
  const currentPrice = priceData.price;
  
  // Check trailing stop loss
  if (shouldTriggerTrailingStop(position, currentPrice)) {
    console.log(`[Monitor] 🛑 Trailing stop triggered for GMX ${position.tokenSymbol}`);
    await executor.closePosition(position.id);
  }
  
  // Check fixed stop loss
  if (shouldTriggerFixedStop(position, currentPrice)) {
    console.log(`[Monitor] 🛑 Fixed stop triggered for GMX ${position.tokenSymbol}`);
    await executor.closePosition(position.id);
  }
  
  // Check take profit
  if (shouldTriggerTakeProfit(position, currentPrice)) {
    console.log(`[Monitor] 🎯 Take profit triggered for GMX ${position.tokenSymbol}`);
    await executor.closePosition(position.id);
  }
}
```

**Why this way:**
- ✅ Uses **GMX Reader** (same prices GMX uses)
- ✅ Same monitoring logic as SPOT
- ✅ Trailing stop loss, fixed stop, take profit
- ✅ Automatic position management

---

### 4. **Update GMX Adapter to Use GMX Reader**
**Location:** `lib/adapters/gmx-adapter-subaccount.ts:520`

**Current Status:** ❌ Uses hardcoded fallback prices

**Required:** Replace `getGMXPrice()` with GMX Reader:

```typescript
async getGMXPrice(tokenSymbol: string): Promise<number> {
  const gmxReader = createGMXReader(this.provider);
  const priceData = await gmxReader.getMarketPrice(tokenSymbol);
  
  if (!priceData) {
    throw new Error(`Failed to get GMX price for ${tokenSymbol}`);
  }
  
  return priceData.price;
}
```

**Why this way:**
- ✅ Real-time on-chain prices from GMX
- ✅ Same prices GMX uses for settlement
- ✅ No external APIs needed
- ✅ Fully transparent

---

## 📊 Implementation Order:

1. **Update GMX adapter prices** (30 min) ← CRITICAL
2. **Implement fee collection** (1 hour) ← CRITICAL
3. **Implement profit share** (1 hour) ← CRITICAL
4. **Add GMX monitoring** (2 hours)
5. **Testing & validation** (2 hours)

**Total Estimated Time:** ~6 hours

---

## 🎯 After Completion:

### GMX Trading Flow (Fully Transparent):
```
1. User creates GMX signal
   ↓
2. Backend collects 0.2 USDC fee (via module, on-chain)
   ↓
3. Executor opens GMX position (SubaccountRouter)
   ↓
4. Position monitor tracks price (GMX Reader, on-chain)
   ↓
5. Trailing stop loss triggers
   ↓
6. Executor closes GMX position (SubaccountRouter)
   ↓
7. GMX calculates PnL (on-chain)
   ↓
8. Module deducts 20% profit share (via module, on-chain)
   ↓
9. User keeps 80% of profit in Safe
```

### All Money Movements:
- ✅ 0.2 USDC fee: Safe → Platform (via module)
- ✅ GMX collateral: Safe → GMX (via SubaccountRouter)
- ✅ GMX profits: GMX → Safe (automatic)
- ✅ 20% profit share: Safe → Agent Owner (via module)

### Transparency:
- ✅ All transactions on-chain
- ✅ Arbiscan shows every transfer
- ✅ Module enforces permissions
- ✅ GMX Reader provides exact settlement prices
- ✅ Users can verify everything

---

## 🔒 Security Checklist:

- ✅ GMX positions owned by Safe (not executor)
- ✅ Executor authorized via SubaccountRouter (revocable)
- ✅ Backend limits (10x leverage, 5000 USDC max)
- ✅ On-chain price feeds (GMX Reader)
- ✅ Smart contract enforces fees/profit (module)
- ✅ Trailing stop loss protects from big losses
- ✅ All money movements via module (transparent)

---

**Ready to implement?** Let me know and I'll complete all 4 tasks! 🚀

