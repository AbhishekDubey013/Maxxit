# Agent WHAT + Agent HOW Architecture 🎯

## Two-Layer Agent System

**Problem**: Traditional trading bots use one-size-fits-all position sizing  
**Solution**: Separate "WHAT to trade" from "HOW to trade" with personalization

```
┌─────────────────────────────────────────────────────────┐
│                     AGENT WHAT                           │
│  Aggregates Alpha Signals + LLM Classification          │
│                                                          │
│  Sources:                                                │
│  • Twitter accounts (CT influencers)                     │
│  • Telegram alpha users                                  │
│  • Research institutes                                   │
│                                                          │
│  Output: Classified signal with confidence (0-1)         │
│  Example: "ETH LONG, 85% confidence"                     │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│                     AGENT HOW                            │
│  Personalized Position Sizing Engine                     │
│                                                          │
│  Inputs:                                                 │
│  • LLM confidence (from Agent WHAT)                      │
│  • LunarCrush metrics (market data)                      │
│  • User trading preferences (personalization)            │
│                                                          │
│  Output: Position size (0.5% to 10% of balance)          │
│  Example: "5.8% position based on user's aggressive      │
│           risk profile + strong social sentiment"        │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
            TRADE EXECUTION
```

---

## Agent WHAT: Alpha Aggregation Layer

### What It Does
- **Monitors** alpha sources (Twitter, Telegram, Research)
- **Classifies** messages using LLM (GPT-4, Perplexity)
- **Extracts** token symbols and trading signals
- **Outputs** confidence score (0-1)

### Current Implementation
- ✅ `lib/llm-classifier.ts` - LLM-based classification
- ✅ `services/tweet-ingestion-worker/` - Twitter monitoring
- ✅ `services/telegram-alpha-worker/` - Telegram monitoring
- ✅ `workers/research-signal-generator.ts` - Research signal generation

### Classification Output
```typescript
{
  tokenSymbol: "ETH",
  side: "LONG",
  confidence: 0.85,              // LLM confidence
  sentiment: "BULLISH",
  reasoning: "Strong technical setup, upcoming catalyst",
  extractedTokens: ["ETH"]
}
```

---

## Agent HOW: Personalized Execution Layer

### What It Does
- **Combines** 3 data sources:
  1. LLM confidence (Agent WHAT output)
  2. LunarCrush metrics (market sentiment data)
  3. User trading preferences (personalization)

- **Calculates** personalized position size
- **Adjusts** weights based on user's trading personality
- **Outputs** position size + reasoning

### User Trading Preferences (5 Sliders)

#### 1. Risk Tolerance (0-100)
```
0 ────────────── 50 ────────────── 100
Conservative    Neutral         Aggressive

Conservative: 0.5-3% positions
Neutral: 2-7% positions
Aggressive: 5-10% positions
```

#### 2. Trade Frequency (0-100)
```
0 ────────────── 50 ────────────── 100
Patient         Moderate        Active

Patient: Only >60% confidence signals
Moderate: >40% confidence signals
Active: Take most signals
```

#### 3. Social Sentiment Weight (0-100)
```
0 ────────────── 50 ────────────── 100
Ignore Social   Balanced        Follow Social

Ignore: Minimal impact from social metrics
Balanced: 20% weight on social sentiment
Follow: 40% weight on social sentiment
```

#### 4. Price Momentum Focus (0-100)
```
0 ────────────── 50 ────────────── 100
Contrarian      Balanced        Momentum

Contrarian: Buy dips, fade rallies
Balanced: 20% weight on momentum
Momentum: Follow trends strongly (40% weight)
```

#### 5. Market Rank Priority (0-100)
```
0 ────────────── 50 ────────────── 100
Any Coin        Balanced        Top Only

Any Coin: Trade all tokens equally
Balanced: Slight preference for top coins
Top Only: Penalize low-ranked tokens (-30%)
```

### Position Sizing Algorithm

```typescript
// Step 1: Get LunarCrush metrics (5 metrics, 0-1 each)
const lcMetrics = {
  galaxyScore: 0.7,           // Overall LunarCrush score
  sentiment: 0.8,             // Social sentiment
  socialVolumeChange: 0.6,    // Social activity change
  priceMomentum: 0.75,        // Price action
  altRank: 0.65,              // Market cap ranking
};

// Step 2: Apply user preference weights
const weights = {
  galaxy: 0.25,                                    // Base weight (always 25%)
  sentiment: 0.20 * (user.social_weight / 50),    // Adjusted by user
  social: 0.20 * (user.social_weight / 50),       // Adjusted by user
  momentum: 0.20 * (user.momentum_focus / 50),    // Adjusted by user
  rank: 0.15 * (user.rank_priority / 50),         // Adjusted by user
};

// Step 3: Calculate weighted LunarCrush score
let lcScore = 
  lcMetrics.galaxyScore * weights.galaxy +
  lcMetrics.sentiment * weights.sentiment +
  lcMetrics.socialVolumeChange * weights.social +
  lcMetrics.priceMomentum * weights.momentum +
  lcMetrics.altRank * weights.rank;

// Step 4: Apply risk tolerance multiplier
const riskMultiplier = 0.5 + (user.risk_tolerance / 100);  // 0.5 to 1.5
lcScore *= riskMultiplier;

// Step 5: Combine with LLM confidence
const finalScore = (llmConfidence * 0.6) + (lcScore * 0.4);

// Step 6: Map to position size (0.5% to 10%)
let positionSize = 0.5 + (finalScore * 9.5);

// Step 7: Apply trade frequency filter
if (user.trade_frequency < 30 && finalScore < 0.6) {
  positionSize = 0;  // Skip low-confidence trades for patient traders
}

return positionSize;  // e.g., 5.8%
```

### Example Calculations

#### Example 1: Aggressive Momentum Trader
```
User Preferences:
- Risk Tolerance: 80 (High)
- Trade Frequency: 70 (Active)
- Social Sentiment: 50 (Balanced)
- Momentum Focus: 85 (Strong momentum follower)
- Market Rank: 60 (Slight preference for top coins)

LLM Confidence: 0.75 (75%)
LunarCrush Score: 0.70
Price Momentum: 0.85 (strong uptrend)

Calculation:
- Momentum weight boosted to 34% (from 20%)
- Risk multiplier: 1.3x
- Adjusted LC score: 0.70 * 1.3 = 0.91
- Final score: (0.75 * 0.6) + (0.91 * 0.4) = 0.814
- Position size: 0.5 + (0.814 * 9.5) = 8.23%

Result: 8.23% position (aggressive due to high risk tolerance + momentum)
```

#### Example 2: Conservative Patient Trader
```
User Preferences:
- Risk Tolerance: 25 (Conservative)
- Trade Frequency: 20 (Patient)
- Social Sentiment: 30 (Ignore mostly)
- Momentum Focus: 40 (Slight contrarian)
- Market Rank: 75 (Top coins only)

LLM Confidence: 0.65 (65%)
LunarCrush Score: 0.55
Alt Rank: 0.30 (low-ranked coin)

Calculation:
- Risk multiplier: 0.75x (conservative)
- Alt rank penalty: 0.7x (prefers top coins)
- Adjusted LC score: 0.55 * 0.75 * 0.7 = 0.289
- Final score: (0.65 * 0.6) + (0.289 * 0.4) = 0.506
- Trade frequency check: 20 < 30 && 0.506 < 0.6 → SKIP TRADE

Result: 0% position (trade skipped - patient trader + low confidence)
```

#### Example 3: Social Sentiment Follower
```
User Preferences:
- Risk Tolerance: 60 (Moderate-Aggressive)
- Trade Frequency: 55 (Moderate)
- Social Sentiment: 90 (Strong follower)
- Momentum Focus: 50 (Balanced)
- Market Rank: 40 (Any coin)

LLM Confidence: 0.70 (70%)
LunarCrush Score: 0.65
Social Sentiment: 0.95 (extremely bullish social)
Social Volume Change: 0.88 (high activity)

Calculation:
- Social weights boosted to 36% each (from 20%)
- Risk multiplier: 1.1x
- Adjusted LC score: 0.65 * 1.1 = 0.715 (boosted by social)
- Final score: (0.70 * 0.6) + (0.715 * 0.4) = 0.706
- Position size: 0.5 + (0.706 * 9.5) = 7.21%

Result: 7.21% position (strong social sentiment drives size up)
```

---

## Implementation Files

### Backend
1. **`lib/agent-how.ts`** - Position sizing engine
   - `getUserTradingPreferences()` - Get user preferences
   - `saveUserTradingPreferences()` - Save user preferences
   - `calculatePersonalizedPositionSize()` - Main algorithm
   - `getPositionSizeForSignal()` - Integration with trade-executor

2. **`pages/api/user/trading-preferences.ts`** - API endpoints
   - GET: Fetch user preferences
   - POST: Save user preferences

3. **`prisma/schema.prisma`** - Database schema
   - `user_trading_preferences` table (5 preference sliders)

### Frontend
1. **`components/TradingPreferencesModal.tsx`** - UI component
   - 5 sliders for user preferences
   - Real-time preview of impact
   - Save/cancel actions

### Integration Points
1. **Signal Generation** (`workers/research-signal-generator.ts`)
   - Call `getPositionSizeForSignal()` when creating signals
   - Replace hardcoded 5% with personalized value

2. **Trade Execution** (`lib/trade-executor.ts`)
   - Already uses `sizeModel.value` from signal
   - No changes needed (backward compatible)

---

## Database Schema

```sql
CREATE TABLE user_trading_preferences (
  id UUID PRIMARY KEY,
  user_wallet TEXT UNIQUE NOT NULL,
  risk_tolerance INT DEFAULT 50,          -- 0-100
  trade_frequency INT DEFAULT 50,         -- 0-100
  social_sentiment_weight INT DEFAULT 50, -- 0-100
  price_momentum_focus INT DEFAULT 50,    -- 0-100
  market_rank_priority INT DEFAULT 50,    -- 0-100
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_trading_preferences_wallet 
  ON user_trading_preferences(user_wallet);
```

---

## User Flow

### First-Time Setup
```
1. User connects wallet → 0xuser123
   
2. User clicks "Deploy Agent" → Modal opens
   
3. Modal shows "Customize Your Trading Style" (NEW)
   - 5 sliders with explanations
   - "Use Defaults" or "Customize"
   
4. User adjusts sliders:
   - Risk: 70 (Aggressive)
   - Frequency: 60 (Moderate)
   - Social: 80 (Follow social)
   - Momentum: 55 (Balanced)
   - Rank: 50 (Balanced)
   
5. Click "Save & Deploy"
   - Preferences saved to database
   - Agent deployment created
   - Uses these preferences for ALL future trades
```

### Subsequent Deployments
```
1. User deploys another agent
   
2. Modal shows existing preferences
   - "Your current trading style: Aggressive Social Follower"
   - Option to "Keep Current" or "Modify"
   
3. If modified, updates preferences for ALL agents
   (preferences are at user level, not per-agent)
```

---

## Benefits

### For Users
✅ **Personalized trading** - Matches their risk tolerance and style  
✅ **Transparent** - Clear explanation of why each trade size was chosen  
✅ **Flexible** - Can adjust preferences anytime  
✅ **Consistent** - Same personality across all deployed agents  

### For Platform
✅ **Differentiation** - "User Trade Clone" is unique value prop  
✅ **Retention** - Users feel more connected to "their" trading strategy  
✅ **Data** - Collect preference data for future ML improvements  
✅ **Scalability** - Easy to add more preference dimensions later  

---

## Future Enhancements

### Phase 2: Advanced Preferences
- **Stop Loss Tightness** (0-100): Tight → Wide
- **Take Profit Strategy** (0-100): Quick Gains → Let Winners Run
- **Diversification Level** (0-100): Concentrated → Diversified
- **Leverage Preference** (0-100): Low Leverage → Max Leverage

### Phase 3: AI Learning
- Track which preference combinations perform best
- Suggest optimal settings based on historical data
- Auto-tune preferences using reinforcement learning

### Phase 4: Conditional Preferences
- Different preferences for different market conditions
- "Bull market mode" vs "Bear market mode"
- Time-of-day adjustments (volatile hours vs calm hours)

---

## Migration Plan

### Step 1: Deploy Schema
```sql
-- Add user_trading_preferences table
-- See prisma/schema.prisma
```

### Step 2: Update Signal Generation
```typescript
// In workers/research-signal-generator.ts

// OLD:
sizeModel: {
  type: 'balance-percentage',
  value: 5, // Hardcoded 5%
}

// NEW:
const { value, reasoning } = await getPositionSizeForSignal({
  tokenSymbol: tradingSignal.tokenSymbol,
  confidence: tradingSignal.confidence,
  userWallet: deployment.user_wallet,
  venue: deployment.venue,
});

sizeModel: {
  type: 'balance-percentage',
  value,  // Personalized!
  reasoning,
}
```

### Step 3: Add UI Component
- Import `TradingPreferencesModal` in deployment flow
- Show before/after agent creation
- Add "Edit Trading Style" button to user dashboard

### Step 4: Test
- Create test users with different preferences
- Verify position sizing varies correctly
- Check reasoning is logged properly

---

## Summary

### Agent WHAT
- **Job**: Find and classify alpha signals
- **Output**: "ETH LONG, 75% confidence"
- **Components**: LLM, Twitter, Telegram, Research

### Agent HOW
- **Job**: Decide position size based on user personality
- **Output**: "5.8% position (aggressive + social follower)"
- **Components**: User preferences + LunarCrush + LLM confidence

### Together
Agent WHAT (classification) + Agent HOW (personalization) = **User Trade Clone** 🎯

Every user gets a trading strategy that matches their risk tolerance, frequency preferences, and market beliefs!

