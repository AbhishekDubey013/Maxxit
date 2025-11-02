# Exponential/Polynomial Position Sizing

## Overview

The position sizing system now uses **exponential (quadratic) scaling** combined with **tweet confidence** to create a more intelligent and aggressive capital allocation strategy.

---

## 📐 Formula

### 1. Combined Score Calculation

```
Combined Score = (LunarCrush Score × 60%) + (Tweet Confidence Score × 40%)
```

**Components:**
- **LunarCrush Score** (-1 to 1): Based on 5 metrics (Galaxy Score, Sentiment, Social Volume, Momentum, Rank)
- **Tweet Confidence** (0 to 1): From LLM tweet filtering

**Tweet Score Normalization:**
```
Tweet Score Normalized = (Tweet Confidence - 0.5) × 2
```
- 0.0 → -1.0 (very uncertain)
- 0.5 → 0.0 (neutral)
- 1.0 → 1.0 (very confident)

---

### 2. Exponential Position Sizing

```
Base Size = (Combined Score)² × 10%
Final Size = Base Size × Confidence Multiplier
```

**Why Quadratic?**
- Linear scaling: Score 0.5 → 5% position
- Quadratic scaling: Score 0.5 → 2.5% position
- Rewards strong signals more aggressively
- Reduces exposure to weak signals

---

### 3. Confidence Multiplier

Tweet confidence acts as an amplifier or dampener:

| Tweet Confidence | Multiplier | Effect |
|------------------|-----------|--------|
| 0.0 - 0.3 | 0.5x | Reduce weak signals |
| 0.3 - 0.5 | 0.7x | Slightly reduce uncertain |
| 0.5 - 0.7 | 1.0x | Neutral |
| 0.7 - 0.9 | 1.2x | Boost confident signals |
| 0.9 - 1.0 | 1.5x | Aggressively boost very confident |

---

## 📊 Comparison: Linear vs Exponential

### Example 1: Strong Signal, High Confidence

**Inputs:**
- LunarCrush Score: 0.7
- Tweet Confidence: 0.9

**Linear Calculation (OLD):**
```
Combined = (0.7 × 0.6) + ((0.9 - 0.5) × 2 × 0.4) = 0.74
Position = 0.74 × 10% = 7.4%
```

**Exponential Calculation (NEW):**
```
Combined = 0.74
Base = (0.74)² × 10% = 5.48%
Multiplier = 1.5x (confidence 0.9)
Position = 5.48% × 1.5 = 8.22%
```

**Result:** 8.22% (11% more aggressive)

---

### Example 2: Medium Signal, Low Confidence

**Inputs:**
- LunarCrush Score: 0.5
- Tweet Confidence: 0.3

**Linear Calculation (OLD):**
```
Combined = (0.5 × 0.6) + ((0.3 - 0.5) × 2 × 0.4) = 0.14
Position = 0.14 × 10% = 1.4%
```

**Exponential Calculation (NEW):**
```
Combined = 0.14
Base = (0.14)² × 10% = 0.196%
Multiplier = 0.5x (confidence 0.3)
Position = 0.196% × 0.5 = 0.098%
```

**Result:** 0.098% (93% reduction - much safer!)

---

## 🎯 Scaling Table

| Combined Score | Linear | Exponential (0.5 conf) | Exponential (0.9 conf) |
|----------------|--------|----------------------|----------------------|
| 0.2 | 2.0% | 0.4% | 0.6% |
| 0.3 | 3.0% | 0.9% | 1.35% |
| 0.4 | 4.0% | 1.6% | 2.4% |
| 0.5 | 5.0% | 2.5% | 3.75% |
| 0.6 | 6.0% | 3.6% | 5.4% |
| 0.7 | 7.0% | 4.9% | 7.35% |
| 0.8 | 8.0% | 6.4% | 9.6% |
| 0.9 | 9.0% | 8.1% | 10.0% *(capped)* |
| 1.0 | 10.0% | 10.0% | 10.0% *(capped)* |

---

## 💡 Benefits

### 1. Rewards High-Conviction Signals
- Strong LunarCrush + high tweet confidence = aggressive position
- Example: BTC with 0.9 score + 0.95 confidence = 10% position (max)

### 2. Reduces Risk on Weak Signals
- Weak signals get exponentially smaller positions
- Example: Low-rank token with 0.3 score + 0.3 confidence = 0.045% position

### 3. Better Capital Allocation
- Concentrates capital on best opportunities
- Diversifies with smaller bets on uncertain signals

### 4. Natural Risk Management
- Exponential curve prevents over-allocation to medium signals
- Confidence multiplier provides additional safety layer

---

## 🔧 Implementation

### In Code

```typescript
// lib/lunarcrush-score.ts

async getTokenScore(
  symbol: string,
  tweetConfidence: number = 0.5
): Promise<TradingScore> {
  // 1. Get LunarCrush score (-1 to 1)
  const lunarCrushScore = await this.fetchAndCalculateScore(symbol);

  // 2. Combine with tweet confidence
  const tweetScoreNormalized = (tweetConfidence - 0.5) * 2;
  const combinedScore = (lunarCrushScore * 0.6) + (tweetScoreNormalized * 0.4);

  // 3. Apply exponential scaling
  const quadraticScore = Math.pow(combinedScore, 2);
  const baseSize = quadraticScore * 10;

  // 4. Apply confidence multiplier
  const multiplier = this.getConfidenceMultiplier(tweetConfidence);
  const finalSize = Math.min(10, baseSize * multiplier);

  return { combinedScore, positionSize: finalSize };
}
```

### In Signal Generation

```typescript
// pages/api/admin/run-signal-once.ts

for (const post of candidatePosts) {
  for (const token of post.extracted_tokens) {
    // Get score with tweet confidence
    const scoreData = await lunarCrush.getTokenScore(
      token,
      post.confidence_score || 0.5  // From LLM filtering
    );

    // Create signal with exponentially-scaled position
    await prisma.signals.create({
      data: {
        size_model: {
          type: 'balance-percentage',
          value: scoreData.positionSize  // 0-10% (exponential)
        }
      }
    });
  }
}
```

---

## 📈 Real-World Examples

### Example 1: Elon Musk DOGE Tweet

**Tweet:** "Dogecoin to the moon! 🚀"
- **LLM Confidence:** 0.87 (very confident it's a signal)
- **LunarCrush Score:** 0.623 (strong social sentiment)

**Calculation:**
```
Combined = (0.623 × 0.6) + ((0.87 - 0.5) × 2 × 0.4) = 0.670
Base = (0.670)² × 10% = 4.49%
Multiplier = 1.2x (confidence 0.87)
Final = 4.49% × 1.2 = 5.39%
```

**Result:** 5.39% position (vs 6.7% linear)

---

### Example 2: Unknown Influencer Low-Cap Token

**Tweet:** "Check out $SCAM, might moon"
- **LLM Confidence:** 0.25 (uncertain if signal)
- **LunarCrush Score:** 0.2 (poor metrics)

**Calculation:**
```
Combined = (0.2 × 0.6) + ((0.25 - 0.5) × 2 × 0.4) = -0.08
Tradeable = false (negative score)
Final = 0%
```

**Result:** Signal skipped (not tradeable)

---

### Example 3: Bitcoin Institutional News

**Tweet:** "MicroStrategy buys 10,000 more BTC"
- **LLM Confidence:** 0.95 (very confident)
- **LunarCrush Score:** 0.85 (excellent metrics)

**Calculation:**
```
Combined = (0.85 × 0.6) + ((0.95 - 0.5) × 2 × 0.4) = 0.870
Base = (0.870)² × 10% = 7.569%
Multiplier = 1.5x (confidence 0.95)
Final = 7.569% × 1.5 = 11.35% → 10% (capped)
```

**Result:** 10% position (maximum allocation)

---

## ⚙️ Configuration

### Adjustable Parameters

You can tune the system by modifying these values in `lib/lunarcrush-score.ts`:

```typescript
// Weight distribution
const LUNARCRUSH_WEIGHT = 0.6;  // 60%
const TWEET_WEIGHT = 0.4;        // 40%

// Confidence multipliers
const MULTIPLIERS = {
  veryLow: 0.5,    // 0.0-0.3
  low: 0.7,        // 0.3-0.5
  neutral: 1.0,    // 0.5-0.7
  high: 1.2,       // 0.7-0.9
  veryHigh: 1.5    // 0.9-1.0
};

// Exponential power (1 = linear, 2 = quadratic, 3 = cubic)
const SCALING_POWER = 2;
```

### More Aggressive (Cubic)

```typescript
const baseSize = Math.pow(combinedScore, 3) * 10;
```

**Effect:**
- Score 0.5 → 1.25% (even more conservative)
- Score 0.9 → 7.29% (still aggressive on strong signals)

### Less Aggressive (Square Root)

```typescript
const baseSize = Math.sqrt(combinedScore) * 10;
```

**Effect:**
- Score 0.5 → 7.07% (more generous on medium)
- Score 0.9 → 9.49% (less boost on strong)

---

## 🧪 Testing

Run the test script to see exponential scaling in action:

```bash
npx tsx scripts/test-exponential-scoring.ts
```

**Output:**
- Compares linear vs exponential for real tokens
- Shows confidence multiplier effects
- Displays reasoning and breakdown

---

## 📊 Performance Impact

### Expected Outcomes

1. **Higher Win Rate:**
   - Larger positions on high-confidence signals
   - Better returns when right

2. **Lower Drawdowns:**
   - Smaller positions on uncertain signals
   - Limited losses when wrong

3. **Better Sharpe Ratio:**
   - Risk-adjusted returns improved
   - More capital in best opportunities

4. **Natural Portfolio Diversification:**
   - Many small positions (low confidence)
   - Few large positions (high confidence)

---

## ✅ Summary

| Feature | Old (Linear) | New (Exponential) |
|---------|-------------|-------------------|
| **Scaling** | Score × 10% | (Score²) × 10% × Multiplier |
| **Tweet Confidence** | Not used | 40% weight + multiplier |
| **Weak Signal (0.3)** | 3.0% | 0.5-1.0% |
| **Medium Signal (0.5)** | 5.0% | 2.5-3.75% |
| **Strong Signal (0.9)** | 9.0% | 8.1-10% |
| **Risk Management** | Basic | Advanced (multi-layer) |
| **Capital Efficiency** | Moderate | High |

**Result:** More intelligent, aggressive on winners, conservative on uncertainty! 🚀

