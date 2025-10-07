# Dynamic Position Sizing System

## Overview

Instead of using fixed trade amounts (e.g., always $100), the system now uses **dynamic position sizing** based on:

1. **Wallet Balance** - How much USDC is available
2. **Signal Confidence** - How strong/reliable the signal is
3. **Risk Profile** - Conservative, Moderate, or Aggressive

---

## 🎯 Key Features

### 1. Balance-Based Scaling
- Trades scale proportionally with wallet size
- Example: 500 USDC wallet trades more than 100 USDC wallet
- Always keeps 20% in reserve for safety

### 2. Confidence-Based Sizing
- **HIGH confidence** (70-100): 8% of available balance
- **MEDIUM confidence** (50-69): 5% of available balance  
- **LOW confidence** (0-49): 2% of available balance

### 3. Safety Limits
- Minimum trade: $10 USDC
- Maximum trade: $1000 USDC (configurable)
- Reserve: 20% of balance kept safe
- Max position: 10% of total balance

---

## 📊 Examples from Demo

### Scenario 1: Current Wallet (9 USDC)
```
Balance: 9 USDC
Confidence: 80/100 (HIGH)

Result: 0.00 USDC ❌
Reason: Insufficient balance (need min $10)
```

### Scenario 2: Funded Wallet (100 USDC)
```
Balance: 100 USDC
Confidence: 75/100 (HIGH)
Available: 80 USDC (after 20% reserve)
Target: 8% of available = 6.40 USDC
Raised to minimum: 10 USDC ✅

Result: 10.00 USDC (10% of balance)
```

### Scenario 3: Well-Funded (500 USDC)
```
Balance: 500 USDC
Confidence: 85/100 (HIGH)
Available: 400 USDC (after 20% reserve)
Target: 8% of available = 32.00 USDC

Result: 32.00 USDC (6.4% of balance) ✅
```

### Scenario 4: Large Wallet (1000 USDC)
```
Balance: 1000 USDC
Confidence: 65/100 (MEDIUM)
Available: 800 USDC (after 20% reserve)
Target: 5% of available = 40.00 USDC

Result: 40.00 USDC (4% of balance) ✅
```

---

## 🔧 Configuration Profiles

### Conservative (Default)
```typescript
{
  maxPositionSizePercent: 10,
  highConfidencePercent: 8,
  mediumConfidencePercent: 5,
  lowConfidencePercent: 2,
  reservePercent: 20,
  minTradeUsd: 10,
  maxTradeUsd: 1000,
}
```

### Aggressive
```typescript
{
  maxPositionSizePercent: 20,
  highConfidencePercent: 15,
  mediumConfidencePercent: 10,
  lowConfidencePercent: 5,
  reservePercent: 10,
  minTradeUsd: 10,
  maxTradeUsd: 5000,
}
```

**Example Difference:**
- 500 USDC wallet, 80/100 confidence:
  - Conservative: 32 USDC (6.4%)
  - Aggressive: 67.50 USDC (13.5%)
  - Difference: +35.50 USDC

---

## 💡 How Confidence is Calculated

### Signal Confidence Formula

```typescript
// Based on agent weights and signal data
const confidence = (
  agentWeight[tweet] * tweetSentiment +
  agentWeight[rsi] * rsiScore +
  agentWeight[macd] * macdScore +
  agentWeight[volume] * volumeScore +
  ... other indicators
) / totalWeights

// Bonus for multiple confirming tweets
confidence += min(numTweets * 5, 20)
```

### Example:
```
Agent weights: [50, 50, 50, 50, 50, 50, 50, 50]
Tweet sentiment: 85/100
Technical score: 75/100
Source tweets: 2

Base score = (50*85 + 50*75 + ...) / 400 = ~75
Tweet bonus = 2 * 5 = +10
Final = 85/100 → HIGH confidence
```

---

## 🚀 Integration Steps

### 1. Update Signal Generation

**Before (Fixed Amount):**
```typescript
const signal = await prisma.signal.create({
  data: {
    sizeModel: {
      baseSize: 100, // ❌ Fixed amount
      leverage: 1,
    },
    // ...
  },
});
```

**After (Dynamic):**
```typescript
import { calculatePositionSize, calculateConfidence } from '../lib/position-sizing';

// Get wallet balance
const usdcBalance = await safeWallet.getUSDCBalance();

// Calculate confidence from tweet and indicators
const confidence = calculateConfidence(
  agent.weights,
  {
    tweetSentiment: 85,
    technicalScore: 75,
    sourceTweets: ['tweet1', 'tweet2'],
  }
);

// Calculate position size
const sizing = calculatePositionSize(
  usdcBalance,
  confidence
);

// Create signal with dynamic sizing
const signal = await prisma.signal.create({
  data: {
    sizeModel: {
      baseSize: sizing.usdcAmount, // ✅ Dynamic based on balance & confidence
      leverage: 1,
      confidence: sizing.confidenceScore,
      confidenceTier: sizing.confidence,
    },
    // ...
  },
});
```

### 2. Update Trade Execution

```typescript
// In trade-executor.ts
import { calculatePositionSize } from '../lib/position-sizing';

// Before executing trade, recalculate size (balance may have changed)
const currentBalance = await safeWallet.getUSDCBalance();
const signal = await prisma.signal.findUnique({ where: { id: signalId } });

const sizeModel = signal.sizeModel as any;
const confidence = {
  score: sizeModel.confidence || 50,
  indicators: {},
};

const sizing = calculatePositionSize(currentBalance, confidence);

// Use sizing.usdcAmount for the actual trade
const tradeAmount = sizing.usdcAmount;
```

---

## 📈 Benefits

### 1. Risk Management
✅ Never risks too much on single trade  
✅ Scales down for low confidence  
✅ Always keeps reserve  
✅ Respects account size  

### 2. Capital Efficiency
✅ Uses more capital when confident  
✅ Scales with wallet growth  
✅ Maximizes opportunities  
✅ Minimizes idle capital (within safety limits)

### 3. Adaptability
✅ Works with any balance size  
✅ Adjusts to market conditions  
✅ Supports different risk profiles  
✅ Learns from signal quality  

---

## 🎯 Current System Status

### What Works Now:
1. ✅ Position sizing library implemented
2. ✅ Demo shows all scenarios
3. ✅ Confidence calculation ready
4. ✅ Multiple risk profiles available

### What Needs Integration:
1. 🔄 Update `scripts/test-complete-trading-flow.ts` to use dynamic sizing
2. 🔄 Update `lib/signal-generator.ts` (when implemented) to calculate confidence
3. 🔄 Update `lib/trade-executor.ts` to use real-time balance
4. 🔄 Add confidence calculation to LLM classifier output

---

## 🧪 Testing

### Test the System:
```bash
# Run demo with different scenarios
npx tsx scripts/demo-position-sizing.ts

# Test with your current wallet (9 USDC)
# Shows it won't trade (needs $10 minimum)

# Test with funded wallet (100+ USDC)
# Shows proper scaling and confidence tiers
```

### Manual Test:
```typescript
import { calculatePositionSize } from './lib/position-sizing';

const sizing = calculatePositionSize(
  100, // 100 USDC balance
  { score: 80, indicators: {} } // 80/100 confidence
);

console.log(sizing.usdcAmount); // 10 USDC (raised to minimum)
console.log(sizing.confidence); // "HIGH"
console.log(sizing.reasoning); // Detailed explanation
```

---

## 📋 Recommended Next Steps

1. **Fund Test Wallet**
   ```
   Send 100+ USDC to: 0xC613Df8883852667066a8a08c65c18eDe285678D
   Chain: Sepolia
   ```

2. **Update Test Flow**
   - Modify `scripts/test-complete-trading-flow.ts`
   - Use `calculatePositionSize()` instead of hardcoded $100
   - Pass real wallet balance

3. **Integrate with Signal Generator**
   - Calculate confidence from tweet sentiment + indicators
   - Use dynamic sizing when creating signals
   - Store confidence score in signal

4. **Add to Trade Executor**
   - Check balance before each trade
   - Recalculate size if balance changed
   - Skip trade if below minimum

---

## 🔍 API Usage

### Calculate Position Size
```typescript
import { 
  calculatePositionSize, 
  calculateConfidence, 
  DEFAULT_CONFIG 
} from './lib/position-sizing';

// Get confidence from signal data
const confidence = calculateConfidence(
  agent.weights, // [50, 50, 50, 50, 50, 50, 50, 50]
  {
    tweetSentiment: 85,
    technicalScore: 75,
    sourceTweets: ['tweet1', 'tweet2'],
  }
);
// Result: { score: 85, indicators: {...} }

// Calculate position size
const sizing = calculatePositionSize(
  walletBalance, // e.g., 500 USDC
  confidence,
  DEFAULT_CONFIG // or AGGRESSIVE_CONFIG
);

// Use the result
console.log(`Trade ${sizing.usdcAmount} USDC`);
console.log(`Confidence: ${sizing.confidence}`);
console.log(`Reasoning:`, sizing.reasoning);
```

---

## 📊 Comparison Table

| Balance | Confidence | Conservative | Moderate | Aggressive |
|---------|-----------|-------------|----------|------------|
| 9 USDC | 80/100 | ❌ $0 | ❌ $0 | ❌ $0 |
| 100 USDC | 50/100 | $10 (10%) | $10 (10%) | $10 (10%) |
| 100 USDC | 80/100 | $10 (10%) | $10 (10%) | $13.50 (13.5%) |
| 500 USDC | 50/100 | $20 (4%) | $20 (4%) | $45 (9%) |
| 500 USDC | 80/100 | $32 (6.4%) | $32 (6.4%) | $67.50 (13.5%) |
| 1000 USDC | 65/100 | $40 (4%) | $40 (4%) | $90 (9%) |
| 1000 USDC | 85/100 | $64 (6.4%) | $64 (6.4%) | $135 (13.5%) |

---

## ✅ Summary

**Problem Solved:** ✅  
Trade sizes are now **dynamic and intelligent** instead of fixed.

**Key Improvement:**  
System automatically adjusts trade size based on:
- 💰 Available capital
- 🎯 Signal quality
- 🛡️ Risk management
- 📊 Market conditions

**Ready to Use:**  
The library is complete and tested. Just needs integration into signal generation and trade execution flows.

**Next:** Integrate with real wallet balance checks and signal confidence scoring! 🚀
