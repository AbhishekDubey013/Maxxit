# APR Calculation - Industry Standards & Recommendations

## Current Problem

**Wrong Assumption**: The system assumes $1,000 initial capital  
**Reality**: Actual capital deployed is much smaller (e.g., $138 across 6 trades)  
**Result**: Wildly inflated APR percentages that don't reflect reality

## Industry Standards for Return Calculation

### 1. **Account-Based Returns** (Most Common) ⭐ RECOMMENDED

**Used by**: Binance, Coinbase, Interactive Brokers, Robinhood, all major exchanges

**How it works**:
```
Starting Balance: $1,000
Ending Balance: $1,050
Return = (1050 - 1000) / 1000 × 100% = 5%
APR = 5% × (365 / days) = Annualized Return
```

**Pros**:
- Industry standard
- Easy for users to understand
- Matches how real trading accounts work
- Includes unrealized PnL

**Cons**:
- Requires tracking account balance over time

**Implementation for Hyperliquid**:
```typescript
// Option 1: Query balance at start of period
const startBalance = await getHyperliquidBalance(userAddress);
// ... trades happen ...
const endBalance = await getHyperliquidBalance(userAddress);
const return = (endBalance - startBalance) / startBalance;

// Option 2: Track balance changes
let currentBalance = initialDeposit;
// After each trade:
currentBalance += pnl;
const return = (currentBalance - initialDeposit) / initialDeposit;
```

---

### 2. **Capital Efficiency / Deployed Capital Returns**

**Used by**: Prop trading firms, algo traders evaluating strategy efficiency

**How it works**:
```
Trade 1: Used $50, PnL = +$2
Trade 2: Used $100, PnL = +$5
Total Capital Deployed: $150
Total PnL: $7
Return = 7 / 150 × 100% = 4.67%
```

**Pros**:
- Shows actual trading efficiency
- No need to track full account balance
- Works with current system

**Cons**:
- Not standard for end users
- Doesn't account for capital sitting idle

**Current Reality**:
- Your 6 trades: $138 deployed, $4.52 PnL = **3.28% return**
- Much more realistic than 165.13%!

---

### 3. **Time-Weighted Returns (TWR)**

**Used by**: Hedge funds, mutual funds, professional asset managers

**How it works**:
- Removes impact of deposits/withdrawals
- Calculates return based on portfolio performance alone
- Complex: requires daily valuations

**Formula**:
```
TWR = [(1 + R1) × (1 + R2) × ... × (1 + Rn)] - 1
where R = return for each sub-period
```

**Pros**:
- Industry standard for fund managers
- Fair comparison between different time periods

**Cons**:
- Complex to implement
- Requires frequent balance snapshots

---

### 4. **Money-Weighted Returns (MWR / IRR)**

**Used by**: Private equity, venture capital, individual investors

**How it works**:
- Accounts for timing and size of cash flows
- Rewards deploying capital at the right time

**Pros**:
- Shows actual investor experience
- Accounts for contribution timing

**Cons**:
- Requires solving for IRR (iterative calculation)
- Less common in trading

---

### 5. **Per-Trade ROI**

**Used by**: Trade journals, strategy backtesting

**How it works**:
```
Entry: $100
Exit: $105
ROI = (105 - 100) / 100 = 5% per trade
```

**Pros**:
- Simple to understand
- Good for comparing individual trades

**Cons**:
- Doesn't aggregate to portfolio level
- Doesn't consider time

---

## ✅ Recommended Solution for Maxxit

### Short-Term Fix (Quick)
**Use actual deployed capital** instead of assumed $1,000:

```typescript
// In metrics-updater.ts
const totalCapitalDeployed = positions.reduce((sum, pos) => {
  const entryPrice = parseFloat(pos.entry_price.toString());
  const qty = parseFloat(pos.qty.toString());
  return sum + (entryPrice * qty);
}, 0);

const apr = (totalPnL / totalCapitalDeployed) * (365 / days) * 100;
```

**Pros**: Simple 1-line fix, much more accurate  
**Cons**: Still not perfect (capital reuse not considered)

---

### Long-Term Solution (Best) ⭐

**Track account balance over time**:

1. Add to `agent_deployments` table:
```prisma
model agent_deployments {
  // ... existing fields
  initial_balance     Decimal?  @db.Decimal(20, 8)
  current_balance     Decimal?  @db.Decimal(20, 8)
  balance_updated_at  DateTime?
}
```

2. Update balance after each trade:
```typescript
// After position closes
const deployment = await prisma.agent_deployments.findUnique({
  where: { id: position.deployment_id }
});

const newBalance = parseFloat(deployment.current_balance) + pnl;

await prisma.agent_deployments.update({
  where: { id: deployment.id },
  data: { current_balance: newBalance }
});
```

3. Calculate returns:
```typescript
const return = (current_balance - initial_balance) / initial_balance;
const apr = return * (365 / days) * 100;
```

4. Sync with Hyperliquid:
```typescript
// Periodically verify
const actualBalance = await getHyperliquidBalance(userAddress);
// Reconcile any differences (deposits, withdrawals, manual trades)
```

**Pros**:
- Industry standard approach
- Most accurate
- Users understand it
- Accounts for all activity

**Cons**:
- Requires schema migration
- Need to set initial balance for existing deployments

---

## Comparison: Your Current Numbers

| Method | Starting Capital | Total PnL | Return | APR (SI) |
|--------|-----------------|-----------|---------|----------|
| **Current (Wrong)** | $1,000 (assumed) | $4.52 | 0.45% | **165.13%** |
| **Deployed Capital** | $138 (actual) | $4.52 | 3.28% | **1,196.60%** |
| **Account Balance** | (need to query) | $4.52 | TBD | TBD |

*Note: Even deployed capital method shows unrealistic APR because of short time period (4 days)*

---

## What Other Platforms Do

- **Binance**: Account balance method + daily snapshots
- **ByBit**: Starting balance vs current balance
- **Coinbase**: Portfolio value over time
- **TradingView**: Manual entry of starting capital
- **3Commas**: Bot starting balance vs current balance
- **Hedge Funds**: Time-weighted returns (TWR) with daily NAV

---

## Recommendation for Next Step

**Option 1: Quick Fix (Today)**
```bash
# Update metrics-updater.ts to use actual deployed capital
# More accurate than $1,000 assumption
```

**Option 2: Proper Fix (This Week)**
```bash
# Add balance tracking to schema
# Query Hyperliquid balance for existing deployments
# Update balance after each trade
# Use account-based return calculation
```

**Option 3: Full Solution (Long-term)**
```bash
# Implement TWR with daily balance snapshots
# Add performance attribution (per strategy, per token)
# Add benchmarking (vs BTC, vs market)
# Calculate Sharpe, Sortino, Calmar ratios properly
```

I recommend **Option 2** - it's the industry standard and users will understand it.

