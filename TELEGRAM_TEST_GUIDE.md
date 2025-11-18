# Telegram Flow Testing Guide 🧪

## Complete End-to-End Test: Message → Signal → Trade

### Prerequisites Checklist

Before testing, ensure you have:

- [ ] `TELEGRAM_BOT_TOKEN` set in `.env`
- [ ] Database tables created (telegram_alpha_users, telegram_posts, etc.)
- [ ] At least one Telegram alpha user registered
- [ ] At least one agent linked to that Telegram user
- [ ] At least one active deployment for that agent
- [ ] User agent address generated (Hyperliquid/Ostium)

---

## Quick Test (Simulated Message)

**Test the entire pipeline without sending a real Telegram message:**

```bash
# Test with default message (ETH LONG)
npx tsx scripts/test-telegram-complete-flow.ts

# Test with custom message
npx tsx scripts/test-telegram-complete-flow.ts "BTC breaking $50k! Going LONG 🚀" BTC LONG
```

**What it tests:**
1. ✅ Telegram user exists in database
2. ✅ Agents are subscribed to user
3. ✅ Active deployments exist
4. ✅ User agent addresses are generated
5. ✅ User trading preferences (Agent HOW)
6. ✅ Message classification
7. ✅ Signal generation with personalized sizing
8. ✅ Recent signals created

---

## Step-by-Step Manual Test

### Step 1: Verify Telegram User is Registered

```bash
# Check if user exists
npx tsx scripts/check-telegram-user.ts abhidavinci

# Add user if not exists
npx tsx scripts/add-telegram-alpha-user.ts abhidavinci "Abhishek" "Crypto trader"
```

**Expected Output:**
```
✅ Found Telegram alpha user:
   Username: @abhidavinci
   Telegram ID: 123456789
   Display Name: Abhishek
   Bio: Crypto trader
```

### Step 2: Link Agent to Telegram User

**Option A: Via SQL**
```sql
-- Get telegram user ID
SELECT id, telegram_username FROM telegram_alpha_users WHERE telegram_username = 'abhidavinci';

-- Get agent ID
SELECT id, name, venue FROM agents WHERE name = 'MaxxIt AI' LIMIT 1;

-- Link them
INSERT INTO agent_telegram_users (agent_id, telegram_alpha_user_id)
VALUES (
  '<agent-id-from-above>',
  '<telegram-user-id-from-above>'
);
```

**Option B: Via UI**
- Go to agent creation page
- In "Alpha Sources" section
- Select "Telegram Users"
- Check the box for @abhidavinci

### Step 3: Deploy the Agent

1. Go to agent page
2. Click "Deploy Agent"
3. Connect wallet
4. Set trading preferences (Agent HOW) - **NEW!**
   - Risk Tolerance: 70 (Aggressive)
   - Trade Frequency: 60 (Active)
   - Social Weight: 80 (Follow social)
   - Momentum Focus: 55 (Balanced)
   - Market Rank: 50 (Balanced)
5. Generate agent address
6. Whitelist address on Hyperliquid/Ostium
7. Complete deployment

### Step 4: Verify Setup

```bash
# Run the test script to verify everything is connected
npx tsx scripts/test-telegram-complete-flow.ts
```

**Expected Output:**
```
✅ Telegram user: @abhidavinci
✅ Subscribed agents: 1
✅ Active deployments: 1
✅ User addresses: Hyperliquid (0x...)
✅ Trading preferences: Set (70/60/80/55/50)
✅ Test message classified
✅ Signals generated with personalized sizing (6.8% position)
```

### Step 5: Send Real Telegram Message

**Method 1: DM the Bot** (if bot accepts DMs)
```
Send to @your_bot_username:

ETH looking bullish! Breaking $3500 resistance. LONG with 5x leverage. Target $4000 🚀
```

**Method 2: Telegram API (for testing)**

```typescript
// Send test message via Telegram API
const TELEGRAM_BOT_TOKEN = 'your-token-here';
const TELEGRAM_CHAT_ID = '123456789'; // Your Telegram user ID

const message = 'ETH breaking out! Going LONG with 5x leverage 🚀';

fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
  }),
});
```

**Method 3: Create Post Directly (Database)**

```sql
-- Insert a test message directly into database
INSERT INTO telegram_posts (
  telegram_alpha_user_id,
  message_id,
  message_text,
  posted_at,
  is_processed
)
SELECT
  id,
  'test_' || extract(epoch from now())::text,
  'ETH breaking $3500! Going LONG 🚀',
  now(),
  false
FROM telegram_alpha_users
WHERE telegram_username = 'abhidavinci';
```

### Step 6: Monitor Processing

**Watch the Telegram Worker:**

```bash
# If running locally
npm run dev:telegram-worker

# Check logs
tail -f logs/telegram-worker.log
```

**Expected Log Output:**
```
📱 TELEGRAM ALPHA INGESTION WORKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Found 1 unprocessed message(s)

Processing message from @abhidavinci:
  "ETH breaking $3500! Going LONG 🚀"

🤖 LLM Classification:
  ✅ Signal candidate: YES
  Token: ETH
  Sentiment: BULLISH
  Confidence: 85%

✅ Message processed and classified
```

**Watch Signal Generation:**

```bash
# Check signals table
psql $DATABASE_URL -c "
SELECT 
  s.id::text as signal_id,
  a.name as agent,
  s.token_symbol,
  s.side,
  s.venue,
  (s.size_model->>'value')::numeric as position_pct,
  s.created_at
FROM signals s
JOIN agents a ON s.agent_id = a.id
ORDER BY s.created_at DESC
LIMIT 5;
"
```

**Expected Output:**
```
signal_id   | agent       | token | side | venue      | position_pct | created_at
------------|-------------|-------|------|------------|--------------|------------------
abc123...   | MaxxIt AI   | ETH   | LONG | HYPERLIQUID| 6.80         | 2025-11-18 10:30
```

### Step 7: Verify Agent HOW Personalization

```bash
# Check signal details
psql $DATABASE_URL -c "
SELECT 
  token_symbol,
  side,
  size_model->>'value' as position_pct,
  size_model->>'reasoning' as reasoning
FROM signals
WHERE created_at > now() - interval '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
"
```

**Expected Output:**
```
token_symbol | position_pct | reasoning
-------------|--------------|---------------------------------------------------
ETH          | 6.80         | LLM confidence: 85%; Adjusted score: 78% (user: +8%); Final score: 82%; Position size: 6.80% of balance
```

This shows:
- Base position from LLM confidence
- User preference adjustment (+8%)
- Final personalized position (6.80%)

### Step 8: Watch Trade Execution

**Monitor Trade Executor:**

```bash
# Watch executor logs
tail -f logs/trade-executor.log

# Or check positions table
psql $DATABASE_URL -c "
SELECT 
  p.id::text as position_id,
  a.name as agent,
  p.token_symbol,
  p.side,
  p.venue,
  p.size_usd,
  p.status,
  p.created_at
FROM positions p
JOIN agents a ON p.agent_id = a.id
WHERE p.created_at > now() - interval '10 minutes'
ORDER BY p.created_at DESC;
"
```

**Expected Output:**
```
📊 TRADE EXECUTOR WORKER
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Processing signal abc123... for MaxxIt AI
  Token: ETH
  Side: LONG
  Venue: HYPERLIQUID (via Agent Where)
  Position: 6.80% of balance

🎯 Agent HOW Sizing:
  User risk tolerance: 70 (Aggressive)
  Base position: 5.00%
  Personalized adjustment: +1.80%
  Final position: 6.80%

✅ Trade executed: Position opened
  Entry price: $3,520
  Size: $680 (6.8% of $10,000 balance)
  Leverage: 5x
  Stop loss: $3,344 (-5%)
  Take profit: $4,048 (+15%)
```

---

## Troubleshooting

### Issue: User not found

```bash
# Check if user exists
psql $DATABASE_URL -c "SELECT * FROM telegram_alpha_users WHERE telegram_username = 'abhidavinci';"

# Add user
npx tsx scripts/add-telegram-alpha-user.ts abhidavinci
```

### Issue: No agents subscribed

```bash
# Check links
psql $DATABASE_URL -c "
SELECT 
  tau.telegram_username,
  a.name as agent_name,
  a.status
FROM agent_telegram_users atu
JOIN telegram_alpha_users tau ON atu.telegram_alpha_user_id = tau.id
JOIN agents a ON atu.agent_id = a.id
WHERE tau.telegram_username = 'abhidavinci';
"

# Add link if missing (see Step 2 above)
```

### Issue: No active deployments

```bash
# Check deployments
psql $DATABASE_URL -c "
SELECT 
  d.id::text,
  a.name,
  d.status,
  d.user_wallet,
  d.enabled_venues
FROM agent_deployments d
JOIN agents a ON d.agent_id = a.id
WHERE d.status = 'ACTIVE';
"

# Deploy agent via UI if none exist
```

### Issue: No agent addresses

```bash
# Check user addresses
psql $DATABASE_URL -c "
SELECT 
  user_wallet,
  hyperliquid_agent_address,
  ostium_agent_address
FROM user_agent_addresses
WHERE user_wallet = '<your-wallet>';
"

# Generate via API:
# POST /api/agents/:id/generate-deployment-address
```

### Issue: Signals not generating

**Check telegram_posts table:**
```sql
SELECT 
  tp.id::text,
  tau.telegram_username,
  tp.message_text,
  tp.is_signal_candidate,
  tp.extracted_tokens,
  tp.is_processed
FROM telegram_posts tp
JOIN telegram_alpha_users tau ON tp.telegram_alpha_user_id = tau.id
WHERE tau.telegram_username = 'abhidavinci'
ORDER BY tp.posted_at DESC
LIMIT 5;
```

**If is_processed = false:**
- Telegram worker needs to run
- Run: `npm run dev:telegram-worker`

**If is_signal_candidate = false:**
- Message didn't pass LLM classification
- Try a clearer signal message
- Example: "ETH LONG at $3500, target $4000 🚀"

### Issue: Position size always 5%

**Check user preferences:**
```sql
SELECT * FROM user_trading_preferences WHERE user_wallet = '<your-wallet>';
```

**If no preferences:**
- User hasn't set trading preferences (Agent HOW)
- Default is 5% for all
- Set preferences via:
  - POST /api/user/trading-preferences
  - Or integrate TradingPreferencesModal in UI

---

## Example Test Messages

### Bullish (LONG)
```
ETH breaking out of $3500 resistance! Going LONG with 5x leverage. Target $4000. Strong fundamentals and momentum 🚀📈

BTC reclaiming $50k! LONG position with target $55k. Institutional buying pressure building 💪

AVAX showing massive strength! Entering LONG at $45, stop at $42, target $52 🎯
```

### Bearish (SHORT)
```
ETH showing weakness at $3500. Going SHORT with target $3200. Overbought on all timeframes 📉

BTC losing key support. SHORT position targeting $48k. Macro environment turning bearish ⚠️

SOL overextended. Shorting here with tight stop. Target: $80 📊
```

### Invalid (Should NOT Generate Signal)
```
Good morning everyone! How's the market today? ☀️

What do you think about ETH? Thinking of buying some...

DYOR! Not financial advice. Just my opinion 🤷
```

---

## Success Criteria

Your Telegram flow is working correctly when:

✅ **Message Classification:**
- Telegram message appears in `telegram_posts` table
- LLM classifies it correctly (is_signal_candidate = true)
- Tokens extracted properly

✅ **Signal Generation:**
- Signal created in `signals` table
- Linked to correct agent
- Venue set correctly (HYPERLIQUID for MULTI agents)
- Position size is personalized (not always 5%)

✅ **Agent HOW Integration:**
- Position size varies based on user preferences
- Reasoning includes user adjustment
- Falls back to 5% if no preferences

✅ **Trade Execution:**
- Trade executor picks up signal
- Position created in `positions` table
- Uses correct agent address (one per user)
- Executes on correct venue

---

## Next Steps After Successful Test

1. **Production Deployment:**
   - Deploy Telegram worker to Railway/server
   - Set environment variables
   - Enable auto-scaling

2. **Add More Telegram Users:**
   - Use `scripts/add-telegram-alpha-user.ts`
   - Link to multiple agents
   - Monitor performance

3. **Monitor Performance:**
   - Track signal quality
   - Monitor trade execution success rate
   - Analyze user preference patterns

4. **Optimize:**
   - Tune LLM classification prompts
   - Adjust Agent HOW weights
   - Add more preference dimensions

---

## Support

**Logs:**
- Telegram worker: `logs/telegram-worker.log`
- Signal generator: `logs/signal-generator.log`
- Trade executor: `logs/trade-executor.log`

**Database:**
```bash
# Quick status check
psql $DATABASE_URL -c "
SELECT 
  (SELECT COUNT(*) FROM telegram_alpha_users) as telegram_users,
  (SELECT COUNT(*) FROM telegram_posts WHERE posted_at > now() - interval '1 day') as messages_today,
  (SELECT COUNT(*) FROM signals WHERE created_at > now() - interval '1 day') as signals_today,
  (SELECT COUNT(*) FROM positions WHERE created_at > now() - interval '1 day') as positions_today;
"
```

Good luck with your test! 🚀

