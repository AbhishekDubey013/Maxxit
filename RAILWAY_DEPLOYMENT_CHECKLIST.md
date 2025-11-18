# Railway Deployment Checklist ✅

## Branch: `Vprime-telegram-clean`

All changes have been pushed and are ready for Railway deployment.

---

## ✅ What's Been Deployed

### 1. **Agent WHAT + Agent HOW Architecture**
- ✅ Two-layer agent system (classification + personalization)
- ✅ User trading preferences (5 sliders)
- ✅ Personalized position sizing (0.5% to 10%)
- ✅ Backend algorithm: `lib/agent-how.ts`
- ✅ API endpoints: `/api/user/trading-preferences`

### 2. **One Address Per User**
- ✅ `user_agent_addresses` table (one Hyperliquid + one Ostium per user)
- ✅ Removed address fields from `agent_deployments`
- ✅ Updated `lib/deployment-agent-address.ts`
- ✅ Updated trade executor to use user addresses

### 3. **Telegram Integration**
- ✅ Telegram alpha user support
- ✅ DM message processing
- ✅ LLM classification
- ✅ Signal generation with Agent HOW
- ✅ Complete testing tools

### 4. **Database Schema Changes**
- ✅ `user_agent_addresses` table
- ✅ `user_trading_preferences` table
- ✅ Migration SQL: `prisma/migrations/add_user_trading_preferences.sql`

---

## 🚀 Railway Deployment Steps

### Step 1: Run Database Migration

**On Railway PostgreSQL:**
```sql
-- Run this migration
\i prisma/migrations/add_user_trading_preferences.sql

-- Or manually:
CREATE TABLE IF NOT EXISTS user_trading_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT UNIQUE NOT NULL,
  risk_tolerance INTEGER DEFAULT 50 CHECK (risk_tolerance >= 0 AND risk_tolerance <= 100),
  trade_frequency INTEGER DEFAULT 50 CHECK (trade_frequency >= 0 AND trade_frequency <= 100),
  social_sentiment_weight INTEGER DEFAULT 50 CHECK (social_sentiment_weight >= 0 AND social_sentiment_weight <= 100),
  price_momentum_focus INTEGER DEFAULT 50 CHECK (price_momentum_focus >= 0 AND price_momentum_focus <= 100),
  market_rank_priority INTEGER DEFAULT 50 CHECK (market_rank_priority >= 0 AND market_rank_priority <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_trading_preferences_wallet 
  ON user_trading_preferences(user_wallet);

-- Update trigger
CREATE OR REPLACE FUNCTION update_user_trading_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_trading_preferences_updated_at
  BEFORE UPDATE ON user_trading_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_trading_preferences_updated_at();
```

**Or via Prisma:**
```bash
npx prisma migrate deploy
```

### Step 2: Verify Environment Variables

**Required for Telegram Worker:**
```bash
TELEGRAM_BOT_TOKEN=8306277007:AAGPfBb8ybTP5iW6j2S-C2CJJQc1ZbpFMB4
DATABASE_URL=postgresql://...
PERPLEXITY_API_KEY=... (for LLM classification)
```

**Required for Main App:**
```bash
DATABASE_URL=postgresql://...
# All existing env vars
```

### Step 3: Deploy Services

**Main App (Next.js):**
- ✅ Branch: `Vprime-telegram-clean`
- ✅ Auto-deploys on push
- ✅ Includes new API endpoints:
  - `/api/user/trading-preferences` (GET/POST)
  - `/api/agents/[id]/generate-deployment-address`
  - Updated deployment endpoints

**Telegram Worker:**
- ✅ Service: `services/telegram-alpha-worker`
- ✅ Or unified: `services/telegram-worker` (if you merged)
- ✅ Environment: `TELEGRAM_BOT_TOKEN` required
- ✅ Interval: 2 minutes (configurable)

**Signal Generator Worker:**
- ✅ Now uses Agent HOW for personalized sizing
- ✅ Falls back to 5% if no preferences
- ✅ No new env vars needed

**Trade Executor Worker:**
- ✅ Uses `user_agent_addresses` table
- ✅ One address per user (not per deployment)
- ✅ No new env vars needed

### Step 4: Verify Deployment

**Check API Endpoints:**
```bash
# Test trading preferences API
curl https://your-app.railway.app/api/user/trading-preferences?wallet=0x123...

# Should return:
{
  "success": true,
  "preferences": {
    "risk_tolerance": 50,
    "trade_frequency": 50,
    "social_sentiment_weight": 50,
    "price_momentum_focus": 50,
    "market_rank_priority": 50
  }
}
```

**Check Database Tables:**
```sql
-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_agent_addresses', 'user_trading_preferences');

-- Should return both tables
```

**Check Telegram Worker:**
```bash
# Health check
curl https://telegram-worker.railway.app/health

# Should return:
{
  "status": "ok",
  "service": "telegram-alpha-worker",
  "database": "connected"
}
```

---

## 📋 Post-Deployment Verification

### 1. Test User Address Generation

```bash
# Via API
POST /api/agents/:id/generate-deployment-address
{
  "userWallet": "0x...",
  "venue": "MULTI"
}

# Should return:
{
  "success": true,
  "venue": "MULTI",
  "addresses": {
    "hyperliquid": { "address": "0x...", "encrypted": {...} },
    "ostium": { "address": "0x...", "encrypted": {...} }
  }
}
```

### 2. Test Trading Preferences

```bash
# Save preferences
POST /api/user/trading-preferences
{
  "userWallet": "0x...",
  "preferences": {
    "risk_tolerance": 70,
    "trade_frequency": 60,
    "social_sentiment_weight": 80,
    "price_momentum_focus": 55,
    "market_rank_priority": 50
  }
}

# Get preferences
GET /api/user/trading-preferences?wallet=0x...
```

### 3. Test Telegram Flow

```bash
# Add Telegram user (if not exists)
# Via SQL or admin endpoint

# Send test message to bot
# Check telegram_posts table

# Verify signal generated with personalized sizing
SELECT 
  s.token_symbol,
  s.side,
  (s.size_model->>'value')::numeric as position_pct,
  s.size_model->>'reasoning' as reasoning
FROM signals s
WHERE s.created_at > now() - interval '10 minutes'
ORDER BY s.created_at DESC
LIMIT 1;
```

---

## 🔍 Monitoring

### Key Metrics to Watch

**Database:**
```sql
-- Check user addresses
SELECT COUNT(*) FROM user_agent_addresses;

-- Check preferences
SELECT COUNT(*) FROM user_trading_preferences;

-- Check recent signals with personalized sizing
SELECT 
  COUNT(*) as total_signals,
  AVG((size_model->>'value')::numeric) as avg_position_pct,
  MIN((size_model->>'value')::numeric) as min_position_pct,
  MAX((size_model->>'value')::numeric) as max_position_pct
FROM signals
WHERE created_at > now() - interval '24 hours';
```

**Logs:**
- Telegram worker: Processing messages
- Signal generator: "Agent HOW: X% position"
- Trade executor: Using user addresses

---

## ⚠️ Common Issues

### Issue: Migration Failed

**Solution:**
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('user_agent_addresses', 'user_trading_preferences');

-- If missing, run migration manually (see Step 1)
```

### Issue: Telegram Worker Not Processing

**Check:**
1. `TELEGRAM_BOT_TOKEN` is set
2. Worker is running (check Railway logs)
3. Database connection works
4. Health check returns 200

**Debug:**
```bash
# Check worker logs
railway logs --service telegram-worker

# Test bot token
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
```

### Issue: Position Size Always 5%

**Check:**
1. User has set preferences (not all 50/50)
2. Preferences API returns custom values
3. Signal generation is calling Agent HOW
4. Check signal `size_model.reasoning` field

**Fix:**
- User needs to set preferences via UI or API
- Default is 50/50 all = 5% position

### Issue: Agent Address Not Found

**Check:**
1. User has generated address via API
2. `user_agent_addresses` table has entry
3. Trade executor is using `getUserHyperliquidAddress()` / `getUserOstiumAddress()`

**Fix:**
- Generate address: POST `/api/agents/:id/generate-deployment-address`
- Verify in database: `SELECT * FROM user_agent_addresses WHERE user_wallet = '...'`

---

## ✅ Success Criteria

Your deployment is successful when:

1. ✅ **Database:**
   - `user_agent_addresses` table exists
   - `user_trading_preferences` table exists
   - Migration completed without errors

2. ✅ **API Endpoints:**
   - `/api/user/trading-preferences` works (GET/POST)
   - `/api/agents/:id/generate-deployment-address` works
   - Returns addresses for MULTI venue

3. ✅ **Telegram Worker:**
   - Health check returns 200
   - Processes messages every 2 minutes
   - Classifies messages correctly
   - Creates signals with personalized sizing

4. ✅ **Signal Generation:**
   - Signals have `size_model.value` (not always 5%)
   - `size_model.reasoning` explains calculation
   - Uses user preferences when available

5. ✅ **Trade Execution:**
   - Uses addresses from `user_agent_addresses`
   - One address per user (not per deployment)
   - Works for MULTI venue agents

---

## 📚 Documentation

- **Architecture:** `AGENT_WHAT_AND_HOW.md`
- **Integration:** `AGENT_HOW_INTEGRATION.md`
- **Testing:** `TELEGRAM_TEST_GUIDE.md`
- **Address Design:** `ONE_ADDRESS_PER_USER_FIX.md`

---

## 🎯 Quick Test After Deployment

```bash
# 1. Check bot status
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe

# 2. Test preferences API
curl https://your-app.railway.app/api/user/trading-preferences?wallet=0x123...

# 3. Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM user_trading_preferences;"

# 4. Send test message to Telegram bot
# 5. Check signals table for personalized sizing
```

---

**Status: ✅ All code pushed to `Vprime-telegram-clean`**  
**Ready for Railway deployment! 🚀**

