# LunarCrush Trading Score Integration

## 🎯 Overview

This document explains the **LunarCrush Scoring System** - a "cocktail" of LunarCrush metrics that creates a **-1 to 1 score** determining both **tradeability** and **position size**.

---

## 📊 The Scoring System

### Score Range: -1.0 to +1.0

| Score Range | Meaning | Position Size | Action |
|-------------|---------|---------------|--------|
| **0.8 to 1.0** | 🟢 Excellent | 8-10% of fund | Strong Buy |
| **0.5 to 0.8** | 🟢 Strong | 5-8% of fund | Buy |
| **0.2 to 0.5** | 🟡 Moderate | 2-5% of fund | Small Buy |
| **0.0 to 0.2** | 🟡 Weak | 0-2% of fund | Minimal/Skip |
| **-1.0 to 0.0** | 🔴 Negative | 0% (no trade) | Do Not Trade |

### Position Sizing Formula

```
Position Size = Score × 10%

Examples:
  Score 0.2 → 2% of fund
  Score 0.5 → 5% of fund
  Score 0.8 → 8% of fund
  Score 1.0 → 10% of fund
```

---

## 🧪 Metrics Used (The "Cocktail")

### 1. Galaxy Score (Weight: 30%)

**What it is:** LunarCrush's proprietary 0-100 score combining social activity, price performance, and market cap.

**Scoring:**
- 75-100 → 0.8 to 1.0 (Excellent)
- 60-75  → 0.4 to 0.8 (Good)
- 50-60  → 0.0 to 0.4 (Average)
- 40-50  → -0.4 to 0.0 (Poor)
- 0-40   → -1.0 to -0.4 (Very Poor)

### 2. Sentiment (Weight: 25%)

**What it is:** Social sentiment from 0 (bearish) to 1 (bullish).

**Scoring:**
- 0.7-1.0 → 0.5 to 1.0 (Very Bullish)
- 0.6-0.7 → 0.2 to 0.5 (Bullish)
- 0.4-0.6 → -0.2 to 0.2 (Neutral)
- 0.3-0.4 → -0.5 to -0.2 (Bearish)
- 0.0-0.3 → -1.0 to -0.5 (Very Bearish)

### 3. Social Volume Change (Weight: 20%)

**What it is:** 24h change in social media mentions (percentage).

**Scoring:**
- >50%     → 0.8 to 1.0 (Explosive)
- 20-50%   → 0.4 to 0.8 (Strong)
- 0-20%    → 0.0 to 0.4 (Positive)
- -20-0%   → -0.4 to 0.0 (Weak)
- <-20%    → -1.0 to -0.4 (Dead)

### 4. Price Momentum (Weight: 15%)

**What it is:** 24h price change percentage.

**Scoring:**
- >10%      → 0.6 to 1.0 (Strong Up)
- 5-10%     → 0.3 to 0.6 (Up)
- -5 to 5%  → -0.3 to 0.3 (Flat)
- -10 to -5%→ -0.6 to -0.3 (Down)
- <-10%     → -1.0 to -0.6 (Strong Down)

### 5. Alt Rank (Weight: 10%)

**What it is:** Token's rank by social activity (1 = best).

**Scoring:**
- 1-50      → 0.7 to 1.0 (Top Tier)
- 51-200    → 0.3 to 0.7 (Good)
- 201-500   → -0.2 to 0.3 (Average)
- 501-1000  → -0.6 to -0.2 (Poor)
- >1000     → -1.0 to -0.6 (Very Poor)

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install axios dotenv
```

### 2. Add API Key

```bash
# .env
LUNARCRUSH_API_KEY=your-api-key-here
```

Get your API key from: https://lunarcrush.com/developers/api

### 3. Test the System

```bash
npx tsx scripts/test-lunarcrush-score.ts
```

### 4. Example Output

```
📊 BTC Analysis:

Score: 0.752 🟢
Tradeable: ✅ YES
Position Size: 7.52% of fund
Confidence: 75.2%

Breakdown:
  Galaxy Score:    0.850 [████████████████████]
  Sentiment:       0.720 [██████████████░░░░░░]
  Social Volume:   0.640 [███████████░░░░░░░░░]
  Price Momentum:  0.810 [████████████████░░░░]
  Market Rank:     0.900 [██████████████████░░]

Reasoning: Excellent Galaxy Score. Very bullish sentiment. Strong social growth. Strong price momentum. Top-ranked project.

💰 Trade Decision:
   Fund: $1000
   Size: 7.52%
   Amount: $75.20
   Action: BUY BTC
```

---

## 🔌 Integration with Maxxit

### Option 1: Signal Validation

Add as a validation layer for your existing signals:

```typescript
// In lib/signal-generator.ts

import { createLunarCrushScorer } from './lunarcrush-score';

class SignalGenerator {
  private lunarCrush = createLunarCrushScorer();

  async generateSignal(tweet: Tweet) {
    // Your existing signal generation
    const token = this.extractToken(tweet.text);
    const sentiment = this.analyzeSentiment(tweet.text);

    // NEW: Validate with LunarCrush
    if (this.lunarCrush) {
      const lcScore = await this.lunarCrush.getTokenScore(token);
      
      // Only create signal if LunarCrush agrees
      if (!lcScore.tradeable) {
        console.log(`[LunarCrush] Skipping ${token} - Score: ${lcScore.score}`);
        return null; // Skip this signal
      }

      // Adjust position size based on LunarCrush score
      return this.createSignal({
        token,
        sentiment,
        sizeModel: {
          type: 'lunarcrush-dynamic',
          percentage: lcScore.positionSize, // Use LunarCrush size!
          confidence: lcScore.confidence
        },
        lunarCrushScore: lcScore.score,
        reasoning: lcScore.reasoning
      });
    }

    // Fallback to your original logic
    return this.createSignalOriginal(token, sentiment);
  }
}
```

### Option 2: Standalone Signal Generation

Use LunarCrush as primary signal source:

```typescript
// scripts/lunarcrush-signals.ts

import { createLunarCrushScorer } from '../lib/lunarcrush-score';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const scorer = createLunarCrushScorer();

async function generateLunarCrushSignals() {
  const tokens = ['BTC', 'ETH', 'SOL', 'ARB', 'MATIC', 'LINK'];
  
  for (const token of tokens) {
    const score = await scorer!.getTokenScore(token);
    
    if (score.tradeable) {
      // Create signal in database
      await prisma.signals.create({
        data: {
          agent_id: YOUR_AGENT_ID,
          token_symbol: token,
          venue: 'HYPERLIQUID',
          side: 'LONG',
          size_model: {
            type: 'balance-percentage',
            value: score.positionSize, // Dynamic based on score!
          },
          risk_model: {
            stopLoss: 0.05,
            takeProfit: 0.15,
          },
          source_tweets: [`LUNARCRUSH_${Date.now()}`],
          lunarcrush_score: score.score,
          lunarcrush_reasoning: score.reasoning
        }
      });
      
      console.log(`✅ Signal created for ${token} (${score.positionSize}%)`);
    }
  }
}
```

### Option 3: Hybrid Approach (Recommended)

Combine influencer tweets + LunarCrush validation:

```typescript
async function hybridSignalGeneration(tweet: Tweet) {
  const token = extractToken(tweet.text);
  
  // Step 1: Parse influencer tweet
  const tweetSentiment = analyzeSentiment(tweet.text);
  
  // Step 2: Get LunarCrush validation
  const lcScore = await scorer!.getTokenScore(token);
  
  // Step 3: Combine both signals
  const shouldTrade = tweetSentiment === 'bullish' && lcScore.tradeable;
  
  if (!shouldTrade) {
    console.log(`Skip ${token}: Tweet=${tweetSentiment}, LC=${lcScore.score}`);
    return;
  }
  
  // Step 4: Use LunarCrush for position sizing
  return createSignal({
    token,
    side: 'LONG',
    sizeModel: {
      type: 'balance-percentage',
      value: lcScore.positionSize, // Dynamic!
    },
    confidence: (tweetConfidence + lcScore.confidence) / 2,
    sources: {
      tweet: tweet.id,
      lunarcrush: lcScore.score
    }
  });
}
```

---

## 📊 Real-World Examples

### Example 1: Strong Buy

```
Token: BTC
Galaxy Score: 85 → 0.90
Sentiment: 0.75 → 0.75
Social Volume: +45% → 0.70
Price Momentum: +12% → 0.80
Alt Rank: 1 → 1.00

Weighted Average:
  (0.90 × 0.30) + (0.75 × 0.25) + (0.70 × 0.20) 
  + (0.80 × 0.15) + (1.00 × 0.10) = 0.837

Final Score: 0.84
Position Size: 8.4% of fund
Decision: STRONG BUY ✅
```

### Example 2: Moderate Buy

```
Token: SOL
Galaxy Score: 62 → 0.47
Sentiment: 0.58 → 0.33
Social Volume: +15% → 0.30
Price Momentum: +4% → 0.24
Alt Rank: 15 → 0.93

Weighted Average:
  (0.47 × 0.30) + (0.33 × 0.25) + (0.30 × 0.20) 
  + (0.24 × 0.15) + (0.93 × 0.10) = 0.445

Final Score: 0.45
Position Size: 4.5% of fund
Decision: MODERATE BUY 🟡
```

### Example 3: Do Not Trade

```
Token: SHIB
Galaxy Score: 35 → -0.12
Sentiment: 0.35 → -0.33
Social Volume: -25% → -0.50
Price Momentum: -8% → -0.48
Alt Rank: 850 → -0.48

Weighted Average:
  (-0.12 × 0.30) + (-0.33 × 0.25) + (-0.50 × 0.20) 
  + (-0.48 × 0.15) + (-0.48 × 0.10) = -0.328

Final Score: -0.33
Position Size: 0% (no trade)
Decision: DO NOT TRADE ❌
```

---

## 🎛️ Customization

### Adjust Weights

Modify weights in `lunarcrush-score.ts`:

```typescript
private calculateCompositeScore(breakdown: any): number {
  return (
    breakdown.galaxy * 0.30 +      // Adjust this
    breakdown.sentiment * 0.25 +   // Adjust this
    breakdown.social * 0.20 +      // Adjust this
    breakdown.momentum * 0.15 +    // Adjust this
    breakdown.rank * 0.10          // Adjust this
  );
}
```

**Examples:**
- Focus on sentiment: Increase sentiment weight to 0.40
- Ignore rank: Set rank weight to 0.00
- Momentum-focused: Increase momentum to 0.30

### Adjust Position Sizing

Modify the position size formula:

```typescript
private calculatePositionSize(score: number): number {
  if (score <= 0) return 0;
  
  // Option 1: Linear (current)
  return Math.min(10, score * 10);
  
  // Option 2: Conservative (slower growth)
  return Math.min(10, score * score * 10);
  
  // Option 3: Aggressive (faster growth)
  return Math.min(15, score * 15);
  
  // Option 4: Threshold-based
  if (score < 0.3) return 0;
  if (score < 0.6) return 3;
  if (score < 0.8) return 6;
  return 10;
}
```

### Adjust Score Ranges

Modify individual scoring functions:

```typescript
// Make Galaxy Score more strict
private scoreGalaxyScore(galaxyScore: number): number {
  if (galaxyScore >= 80) return 0.8 + (galaxyScore - 80) / 100; // Increased threshold
  if (galaxyScore >= 70) return 0.4 + (galaxyScore - 70) / 25;
  // ... etc
}
```

---

## 💰 Cost Considerations

### LunarCrush API Pricing

- **Free Tier**: 5 requests/minute
- **Starter**: $99/month (60 requests/minute)
- **Professional**: $199/month (Unlimited)

### Rate Limiting

Built-in rate limiting in the code:

```typescript
// In scoreTokens() method
await new Promise(resolve => setTimeout(resolve, 200));
// 200ms = 5 requests/second = 300 requests/minute (stays within limits)
```

### Optimization Tips

1. **Cache Results**: Store scores for 5-15 minutes
2. **Batch Requests**: Score multiple tokens at once
3. **Filter First**: Only score tokens that pass initial filters
4. **Schedule**: Run scoring once per hour, not on every signal

---

## 🔬 Testing

### Run Test Script

```bash
npx tsx scripts/test-lunarcrush-score.ts
```

### Manual Testing

```typescript
import { LunarCrushScorer } from './lib/lunarcrush-score';

const scorer = new LunarCrushScorer('your-api-key');

// Test single token
const score = await scorer.getTokenScore('BTC');
console.log(score);

// Test multiple tokens
const scores = await scorer.scoreTokens(['BTC', 'ETH', 'SOL']);
scores.forEach((score, token) => {
  console.log(`${token}: ${score.score} (${score.positionSize}%)`);
});
```

---

## 📝 Database Schema Extension

Add LunarCrush fields to your signals:

```prisma
model signals {
  // ... existing fields ...
  
  lunarcrush_score     Float?
  lunarcrush_breakdown Json?
  lunarcrush_reasoning String?
  
  @@index([lunarcrush_score])
}
```

Run migration:
```bash
npx prisma db push
```

---

## 🎯 Summary

### The Cocktail Recipe

1. **Galaxy Score** (30%) - Overall project health
2. **Sentiment** (25%) - Social bullish/bearish
3. **Social Volume** (20%) - Trending momentum
4. **Price Momentum** (15%) - Recent performance
5. **Alt Rank** (10%) - Market position

### Position Sizing Formula

```
Score → Position Size
  0.2 →     2%
  0.5 →     5%
  0.8 →     8%
  1.0 →    10%
```

### Integration Approaches

1. **Validation**: Use to validate existing signals
2. **Standalone**: Use as primary signal source
3. **Hybrid**: Combine with influencer tweets (recommended)

### Next Steps

1. Get LunarCrush API key
2. Run test script
3. Choose integration approach
4. Test with small positions
5. Monitor performance
6. Adjust weights if needed

---

**Your Maxxit agent can now dynamically adjust position sizes based on a comprehensive multi-factor score!** 🚀


