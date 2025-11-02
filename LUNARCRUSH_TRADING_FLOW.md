# LunarCrush Dynamic Position Sizing - Trading Flow

## 🎯 Overview

**Complete automated flow:** Tweet → Signal → **LunarCrush Scoring** → Dynamic Position Size → Trade Execution (SPOT/GMX or HYPERLIQUID)

---

## 📊 The Flow

### 1. Tweet Ingestion
```
workers/tweet-ingestion-worker.ts
↓
Fetches tweets from monitored CT accounts
Stores in: ct_posts table
Marks: is_signal_candidate = true
```

### 2. Signal Generation (WITH LunarCrush!)
```
pages/api/admin/run-signal-once.ts
↓
For each signal candidate:
  ✅ Extract token symbol
  ✅ Call LunarCrush API
  ✅ Get score (-1 to 1)
  ✅ Calculate position size (score × 10%)
  ✅ Check if tradeable (score > 0)
  
If score > 0:
  → Create signal with dynamic position size
  → Store LunarCrush score & reasoning
  
If score ≤ 0:
  → Skip signal (don't trade)
```

### 3. Trade Execution (BOTH SPOT & HYPERLIQUID)
```
workers/trade-executor-worker.ts
↓
For each signal:
  ✅ Read position size from signal.size_model.value
  ✅ Calculate actual amount: balance × (position_size / 100)
  ✅ Execute trade on venue (SPOT, GMX, or HYPERLIQUID)
```

---

## 🔄 Complete Example Flow

### Example: BTC Tweet

**Step 1: Tweet Detected**
```
Tweet: "@elonmusk: Bitcoin is the future 🚀"
→ Stored in ct_posts
→ is_signal_candidate = true
→ extracted_tokens = ["BTC"]
```

**Step 2: LunarCrush Scoring**
```
Call: LunarCrush API for BTC
Response:
  - Galaxy Score: 80.3 → 0.80
  - Sentiment: 58.3% → 0.58
  - Social Volume: 0%
  - Price Momentum: 3.4%
  - Market Rank: 1 → 0.99
  
Weighted Score: 0.491

Position Size: 0.491 × 10% = 4.91% ✅
Tradeable: YES (score > 0)
```

**Step 3: Signal Created**
```sql
INSERT INTO signals (
  token_symbol: "BTC",
  venue: "HYPERLIQUID",
  size_model: {
    type: "balance-percentage",
    value: 4.91  ← Dynamic from LunarCrush!
  },
  lunarcrush_score: 0.491,
  lunarcrush_reasoning: "Excellent Galaxy Score..."
)
```

**Step 4: Trade Execution**
```
Agent Balance: $1000
Position Size: 4.91% (from signal)
Trade Amount: $1000 × 4.91% = $49.10

Execute: BUY BTC with $49.10 on HYPERLIQUID ✅
```

---

## 📈 Position Sizing Examples

| Token | LC Score | Position | Fund $1000 | Trade Amount |
|-------|----------|----------|------------|--------------|
| **BTC** | 0.491 🟡 | 4.91% | $1000 | **$49.10** |
| **ETH** | 0.215 🟡 | 2.15% | $1000 | $21.50 |
| **SOL** | 0.342 🟡 | 3.42% | $1000 | $34.20 |
| **DOGE** | 0.156 ⚪ | 1.56% | $1000 | $15.60 |
| **SHIB** | 0.384 🟡 | 3.84% | $1000 | $38.40 |
| **SCAM** | -0.2 🔴 | 0% | $1000 | **NO TRADE** |

---

## 🎛️ LunarCrush Scoring Breakdown

### Cocktail of 5 Metrics

1. **Galaxy Score** (30%) - Overall project health (0-100)
2. **Sentiment** (25%) - Social bullish/bearish (0-100%)
3. **Social Volume** (20%) - 24h mention growth
4. **Price Momentum** (15%) - 24h price change
5. **Market Rank** (10%) - Position in market (1 = best)

### Scoring Formula
```
Each metric → Normalize to -1..1
Weighted average → Final score (-1 to 1)
Position Size = max(0, score × 10%)
```

### Decision Logic
```
If score > 0:
  → TRADEABLE
  → Use dynamic position size

If score ≤ 0:
  → NOT TRADEABLE
  → Skip signal entirely
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Required for LunarCrush integration
LUNARCRUSH_API_KEY=your-key-here
```

### Fallback Behavior

If `LUNARCRUSH_API_KEY` is **not set**:
- Uses default **5% position size** for all signals
- Still creates signals (doesn't skip)
- Logs warning: "LunarCrush API key not configured"

If LunarCrush API **fails for a token**:
- Uses default **5% position size** for that signal
- Still creates signal (doesn't skip)
- Logs error details

---

## 🗄️ Database Schema

### signals table (Updated)

```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY,
  agent_id UUID,
  token_symbol VARCHAR,
  venue venue_t,
  size_model JSONB,              -- Contains dynamic percentage
  
  -- NEW: LunarCrush fields
  lunarcrush_score FLOAT,        -- -1.0 to 1.0
  lunarcrush_reasoning TEXT,     -- Human-readable explanation
  lunarcrush_breakdown JSONB,    -- Breakdown of 5 metrics
  
  created_at TIMESTAMPTZ,
  ...
);

-- Index for filtering by score
CREATE INDEX idx_signals_lunarcrush_score ON signals(lunarcrush_score);
```

### size_model JSON Structure

```json
{
  "type": "balance-percentage",
  "value": 4.91,  ← Dynamic from LunarCrush (0-10%)
  "impactFactor": 1.5
}
```

### lunarcrush_breakdown JSON Structure

```json
{
  "galaxy": 0.80,
  "sentiment": 0.58,
  "social": 0.00,
  "momentum": 0.03,
  "rank": 0.99
}
```

---

## 🚀 How Trade Executor Uses It

### For SPOT/GMX (Safe Wallet)

```typescript
// lib/trade-executor.ts
async function executeTrade(signal: Signal) {
  const positionPercentage = signal.size_model.value; // From LunarCrush!
  const safeBalance = await getSafeBalance(deployment.safe_wallet);
  const tradeAmount = safeBalance * (positionPercentage / 100);
  
  // Execute trade through Safe module
  await executeModuleTx(token, tradeAmount);
}
```

### For HYPERLIQUID

```typescript
// lib/adapters/hyperliquid-adapter.ts
async function executeTrade(signal: Signal) {
  const positionPercentage = signal.size_model.value; // From LunarCrush!
  const agentBalance = await getHyperliquidBalance(agentAddress);
  const tradeAmount = agentBalance * (positionPercentage / 100);
  
  // Execute trade through Hyperliquid agent
  await placeOrder(token, tradeAmount);
}
```

**Both SPOT and HYPERLIQUID use the same dynamic percentage!** ✅

---

## 📊 Signal Dashboard View

When viewing signals, you can now see:

```
Signal #123 - BTC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Token: BTC
Venue: HYPERLIQUID
Position: 4.91% (Dynamic) ⭐

LunarCrush Analysis:
  Score: 0.491 🟡
  Galaxy: 80.3 🟢
  Sentiment: 58.3% 🟢
  Social: 0%
  Momentum: 3.4%
  Rank: #1 ⭐
  
Reasoning: Excellent Galaxy Score. Very bullish sentiment. Top-ranked project.

Trade Amount: $49.10 (from $1000 fund)
Status: Executed ✅
```

---

## 🔄 Testing the Flow

### 1. Create a Test Tweet Signal

```bash
# Create synthetic tweet in database
npx tsx scripts/test-complete-local-flow.ts
```

### 2. Run Signal Generator

```bash
# This will call LunarCrush and create signals
npx tsx workers/signal-generator.ts
```

### 3. Check Signal Created

```sql
SELECT 
  token_symbol,
  lunarcrush_score,
  size_model->>'value' as position_percentage,
  lunarcrush_reasoning
FROM signals
ORDER BY created_at DESC
LIMIT 5;
```

Expected output:
```
token_symbol | lunarcrush_score | position_percentage | lunarcrush_reasoning
-------------|------------------|---------------------|---------------------
BTC          | 0.491            | 4.91                | Excellent Galaxy Score...
ETH          | 0.215            | 2.15                | Very bullish sentiment...
SOL          | 0.342            | 3.42                | Excellent Galaxy Score...
```

### 4. Run Trade Executor

```bash
# This will execute trades with dynamic position sizes
npx tsx workers/trade-executor-worker.ts
```

### 5. Verify Trade Executed

```sql
SELECT 
  p.token,
  p.size,
  s.lunarcrush_score,
  s.size_model->>'value' as intended_percentage
FROM positions p
JOIN signals s ON s.id = p.signal_id
ORDER BY p.created_at DESC
LIMIT 5;
```

---

## 🎯 Benefits

### 1. Dynamic Risk Management
- **High confidence** (score 0.8-1.0) → 8-10% position
- **Medium confidence** (score 0.4-0.6) → 4-6% position  
- **Low confidence** (score 0.1-0.3) → 1-3% position
- **No confidence** (score ≤ 0) → No trade ❌

### 2. Multi-Factor Analysis
- Not just tweet sentiment
- Considers: Galaxy Score, Social Volume, Price Momentum, Market Rank
- More informed trading decisions

### 3. Consistent Across Venues
- Same position sizing logic for SPOT, GMX, and HYPERLIQUID
- Fair allocation based on market conditions
- No hardcoded percentages

### 4. Audit Trail
- Every signal has `lunarcrush_score`
- Every signal has `lunarcrush_reasoning`
- Every signal has `lunarcrush_breakdown`
- Can analyze performance by score ranges

### 5. Safety Filter
- **Negative scores automatically blocked**
- Won't trade tokens LunarCrush says to avoid
- Additional layer of protection against scams

---

## 📈 Performance Analysis

### Query: Top Performing Score Ranges

```sql
SELECT 
  CASE 
    WHEN s.lunarcrush_score >= 0.8 THEN 'Excellent (0.8-1.0)'
    WHEN s.lunarcrush_score >= 0.5 THEN 'Strong (0.5-0.8)'
    WHEN s.lunarcrush_score >= 0.2 THEN 'Moderate (0.2-0.5)'
    ELSE 'Weak (0.0-0.2)'
  END as score_range,
  COUNT(*) as signal_count,
  AVG(p.pnl_percentage) as avg_pnl,
  SUM(CASE WHEN p.pnl_percentage > 0 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as win_rate
FROM signals s
LEFT JOIN positions p ON p.signal_id = s.id
WHERE s.lunarcrush_score IS NOT NULL
  AND p.status = 'CLOSED'
GROUP BY score_range
ORDER BY avg_pnl DESC;
```

---

## 🛠️ Troubleshooting

### Issue: Signal created with 5% (not dynamic)

**Check:**
```bash
# Is API key set?
echo $LUNARCRUSH_API_KEY

# Check logs
tail -f logs/signal-generator.log | grep "LunarCrush"
```

**Solution:**
```bash
# Add to .env
LUNARCRUSH_API_KEY=your-key-here

# Restart signal generator
pm2 restart signal-generator
```

### Issue: All signals skipped

**Check:**
```sql
SELECT token_symbol, lunarcrush_score, lunarcrush_reasoning
FROM signals
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Possible causes:**
- All scores are negative (tokens not tradeable)
- LunarCrush API rate limit hit
- Token not found in LunarCrush database

**Solution:**
- Check LunarCrush dashboard for API usage
- Verify tokens exist on LunarCrush
- Add fallback to use default 5% if API fails

### Issue: Trade amount too small/large

**Check signal:**
```sql
SELECT 
  token_symbol,
  lunarcrush_score,
  size_model
FROM signals
WHERE id = 'signal-id-here';
```

**Adjust scoring weights:**
Edit `lib/lunarcrush-score.ts`:
```typescript
private calculateCompositeScore(breakdown: any): number {
  return (
    breakdown.galaxy * 0.30 +      // Adjust weights
    breakdown.sentiment * 0.25 +
    breakdown.social * 0.20 +
    breakdown.momentum * 0.15 +
    breakdown.rank * 0.10
  );
}
```

---

## 🎓 Summary

### Old Flow (Fixed 5%)
```
Tweet → Signal (5% fixed) → Trade (5% of balance)
```

### New Flow (Dynamic with LunarCrush)
```
Tweet → LunarCrush Scoring → Signal (0-10% dynamic) → Trade (% of balance)
                              ↓
                    If score ≤ 0: SKIP ❌
                    If score > 0: USE dynamic % ✅
```

### Key Changes

1. ✅ **Signal Generation:** Calls LunarCrush before creating signal
2. ✅ **Position Sizing:** Uses LunarCrush score (0-10%)
3. ✅ **Safety Filter:** Skips negative scores
4. ✅ **Database:** Stores score, reasoning, breakdown
5. ✅ **Trade Execution:** Uses dynamic % for BOTH SPOT & HYPERLIQUID

---

**Your trading system now has intelligent, data-driven position sizing!** 🚀


