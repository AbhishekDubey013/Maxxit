# Ostium PnL Calculation Fix

## Problem

The Ostium position monitor was showing **$0.00 (0.00%)** for all unrealized P&L calculations, even though positions had significant price movements.

### Example Issue
```
💰 Current Price: $50.4185 | Entry: $50.9440
📈 P&L: $0.00 (0.00%) | From Ostium SDK
⏳ Trailing stop inactive (need +3% for activation, current: 0.00%)
```

## Root Cause

After analyzing the Ostium SDK response, we discovered that **the Ostium SDK does not return any PnL field**.

### What We Expected (but didn't get):
- `pnl`
- `unrealizedPnl`
- `unrealizedPnlUSD`
- Any other PnL-related field

### What We Actually Got:
```javascript
{
  "tradeID": "119306",
  "collateral": "996500000",           // Collateral in USDC (6 decimals)
  "leverage": "300",                   // Leverage * 100 (300 = 3x)
  "openPrice": "3046406700000000000000", // Entry price in wei (18 decimals)
  "tradeNotional": "981320058152445633", // Position size in wei (18 decimals)
  "funding": "-3684093960974048715",    // Funding fees in wei (can be negative)
  "rollover": "0",                      // Rollover fees in wei
  "isBuy": true,                        // LONG or SHORT
  // ... other fields
}
```

## Solution

We implemented a **manual PnL calculation** using the fields that Ostium SDK does provide:

### 1. Updated `services/ostium-service.py`

Added extraction and conversion of the key fields:

```python
# Extract position size from tradeNotional (wei → tokens)
trade_notional_wei = int(trade.get('tradeNotional', 0))
position_size = float(trade_notional_wei / 1e18)

# Extract fees (wei → USD)
funding_wei = int(trade.get('funding', 0))
rollover_wei = int(trade.get('rollover', 0))
total_fees_usd = float((funding_wei + rollover_wei) / 1e18)

# Return these fields in the response
positions.append({
    "market": market_symbol,
    "side": "long" if trade.get('isBuy') else "short",
    "size": collateral_usdc,
    "entryPrice": entry_price_usd,
    "leverage": leverage,
    "tradeId": trade.get('tradeID'),
    # NEW FIELDS for accurate PnL calculation
    "tradeNotional": trade_notional_wei,
    "positionSize": position_size,
    "funding": funding_wei,
    "rollover": rollover_wei,
    "totalFees": total_fees_usd,
})
```

### 2. Updated `workers/position-monitor-ostium.ts`

Implemented manual PnL calculation using the actual position size and fees:

```typescript
// Use actual position size from Ostium (more accurate than calculated)
const positionSizeInTokens = ostPosition.positionSize || 
  ((collateral * leverage) / entryPriceNum);

// Calculate P&L from price movement
let pnlUSD = 0;
if (isLong) {
  pnlUSD = positionSizeInTokens * (currentPrice - entryPriceNum);
} else {
  pnlUSD = positionSizeInTokens * (entryPriceNum - currentPrice);
}

// Factor in funding and rollover fees
const totalFees = ostPosition.totalFees || 0;
pnlUSD += totalFees;

// Calculate percentage relative to collateral
const pnlPercent = collateral > 0 ? (pnlUSD / collateral) * 100 : 0;
```

## Results

### Before Fix:
```
💰 Current Price: $50.4185 | Entry: $50.9440
📈 P&L: $0.00 (0.00%) | From Ostium SDK
⏳ Trailing stop inactive (need +3% for activation, current: 0.00%)
```

### After Fix:
```
💰 Current Price: $49.5613 | Entry: $50.9440
📊 Using actual position size: 58.593750 tokens
💸 Fees (funding + rollover): $0.0099
📈 P&L: $-81.01 (-8.14%) | Collateral: $995.00, Leverage: 3x
⏳ Trailing stop inactive (need +3% for activation, current: -8.14%)
```

## Verification

Tested with live positions on address `0xa10846a81528d429b50b0dcbf8968938a572fac5`:

| Market | Entry Price | Current Price | P&L (USD) | P&L (%) | Status |
|--------|-------------|---------------|-----------|---------|--------|
| ETH/USD | $3046.41 | $2803.09 | -$242.46 | -24.33% | Hard SL triggered |
| XRP/USD | $2.14 | $1.98 | -$219.31 | -22.01% | Hard SL triggered |
| HYPE/USD | $39.43 | $37.25 | -$165.04 | -16.56% | Hard SL triggered |
| XAG/USD | $50.94 | $49.56 | -$81.01 | -8.14% | Active |
| USD/CHF | $0.81 | N/A | N/A | N/A | Price unavailable |

## Key Learnings

1. **Never assume SDK completeness**: Always verify what fields are actually returned
2. **Use actual position size**: `tradeNotional` is more accurate than calculating from collateral/leverage
3. **Include all fees**: Funding and rollover fees can significantly impact P&L
4. **Precision matters**: Convert wei (18 decimals) and USDC (6 decimals) correctly

## Files Modified

- `services/ostium-service.py` - Added new fields to position response
- `workers/position-monitor-ostium.ts` - Implemented manual PnL calculation
- `lib/adapters/ostium-adapter.ts` - No changes needed (pass-through)

## Testing

To test the fix:
```bash
# Start Ostium service
cd services
python3 ostium-service.py &

# Run test script
npx tsx scripts/test-ostium-pnl-calc.ts 0xYOUR_ADDRESS

# Or run position monitor
npx tsx workers/position-monitor-ostium.ts
```

## Status

✅ **FIXED** - Ostium PnL calculation is now accurate and includes all fees.

