# End-to-End Testing Guide

## 🎯 Overview

This guide walks you through testing the complete automated flow from tweet ingestion to Hyperliquid position execution.

---

## 📋 Prerequisites Checklist

### 1. Database Setup

```bash
# Apply schema changes
npx prisma db push

# Regenerate Prisma client
npx prisma generate

# Restart Next.js to pick up new client
# (if running)
```

### 2. Environment Variables

Ensure these are set in `.env`:

```bash
# Database
DATABASE_URL=postgresql://...

# LunarCrush
LUNARCRUSH_API_KEY=tt6l3p9qa3otztg3rik6gf2ofdmhhl3ndd4b4psvl

# Encryption (32-byte hex key)
AGENT_WALLET_ENCRYPTION_KEY=d2f59cd41ed3a665c9408b8497730e50f937b4d07ad9d04751d0101d626f1e38

# Hyperliquid Service
HYPERLIQUID_SERVICE_URL=http://localhost:5000
HYPERLIQUID_SERVICE_PORT=5000
```

### 3. Start Hyperliquid Service

```bash
cd services/hyperliquid-service
python main.py
```

Should show:
```
 * Running on http://0.0.0.0:5000
```

### 4. Create Test Agent

If you don't have a Hyperliquid agent yet, create one:

```sql
INSERT INTO agents (name, description, venue, goal, status)
VALUES (
  'Ring',
  'Test agent for Hyperliquid',
  'HYPERLIQUID',
  'Test trading',
  'ACTIVE'
);
```

---

## 🧪 Run Pre-Test Checklist

This verifies all prerequisites:

```bash
npx tsx scripts/pre-test-checklist.ts
```

**Expected Output:**
```
✅ DATABASE_URL: postgresql://...
✅ LUNARCRUSH_API_KEY: tt6l3p9qa3ot...
✅ AGENT_WALLET_ENCRYPTION_KEY: d2f59cd41ed3a...
✅ user_hyperliquid_wallets table exists
✅ ct_posts.confidence_score exists
✅ Found 1 Hyperliquid agent(s)
✅ Hyperliquid service is running
✅ LunarCrush API is working

✅ ALL CHECKS PASSED - Ready to test!
```

If any check fails, fix the issue and re-run.

---

## 🚀 Run Complete Flow Test

### Default Test

Uses default configuration (BTC tweet):

```bash
npx tsx scripts/test-complete-automated-flow.ts
```

### Custom Test

Override with environment variables:

```bash
TEST_USER_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3 \
TEST_AGENT_NAME=Ring \
TEST_TWEET="Ethereum hitting new ATH! $ETH going parabolic 🚀" \
TEST_CT_ACCOUNT=TestTrader \
npx tsx scripts/test-complete-automated-flow.ts
```

---

## 📝 Test Flow Steps

The test will execute these steps:

### Step 1: Create Synthetic Tweet
- Creates a CT account if needed
- Inserts tweet into `ct_posts`
- Shows: `✅ Created tweet: synthetic_1730556789...`

### Step 2: LLM Filtering
- Runs `classifyTweet()` on the tweet
- Extracts tokens, confidence, signal type
- Updates `ct_posts` with classification
- Shows:
  ```
  ✅ Classification complete:
     Is Signal: true
     Confidence: 87.5%
     Tokens: BTC
     Side: LONG
  ```

### Step 3: Signal Generation
- Fetches LunarCrush data for each token
- Combines LunarCrush score (60%) + Tweet confidence (40%)
- Applies exponential scaling for position size
- Creates signals in database
- Shows:
  ```
  📊 Processing token: BTC
     LunarCrush Score: 0.623
     Combined Score: 0.670
     Tweet Confidence: 87.5%
     Position Size: 5.39% (exponential)
     Tradeable: YES ✅
  ```

### Step 4: Setup User Agent Wallet
- Gets or creates agent wallet for user
- Decrypts private key
- Shows agent address
- **Prompts: "Have you whitelisted this address?"**

**IMPORTANT:** Before continuing:
1. Visit https://app.hyperliquid.xyz/API (testnet)
2. Add the shown agent address
3. Approve for trading
4. Answer 'y' to continue

### Step 5: Trade Execution
- Initializes Hyperliquid adapter
- Checks account balance
- Calculates position sizes
- Executes trades via Hyperliquid
- Creates position records
- Shows:
  ```
  💰 Account Balance: $999.00
  
  📈 Executing signal for BTC...
     Position Size: 5.39% = $53.84
     ✅ Trade executed!
     Entry Price: $43,250.50
     Size: 0.001245 BTC
  ```

### Step 6: Verify Positions
- Fetches open positions from Hyperliquid
- Displays position details with PnL
- Shows:
  ```
  📊 Open Positions: 1
  
     BTC:
     - Side: LONG
     - Size: 0.001245
     - Entry: $43,250.50
     - PnL: $0.12
  ```

---

## ✅ Success Indicators

Test is successful if you see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ COMPLETE FLOW TEST SUCCESSFUL!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Flow Summary:
  1. ✅ Tweet created and classified
  2. ✅ LLM extracted tokens with 87.5% confidence
  3. ✅ LunarCrush scored and sized positions (exponential)
  4. ✅ Signals generated with dynamic sizing
  5. ✅ Agent wallet setup (0x9fD20...)
  6. ✅ Trades executed on Hyperliquid
  7. ✅ Positions verified and tracked

🚀 System is ready for production!
```

---

## 🐛 Common Issues

### Issue: "user_hyperliquid_wallets table MISSING"

**Fix:**
```bash
npx prisma db push
npx prisma generate
```

### Issue: "Hyperliquid service not reachable"

**Fix:**
```bash
# Start the Python service
cd services/hyperliquid-service
python main.py
```

### Issue: "Agent wallet not registered"

**Fix:**
1. Note the agent address shown in step 4
2. Visit https://app.hyperliquid.xyz/API (testnet)
3. Add the address to whitelist
4. Try again

### Issue: "Position size too small (min $10)"

**Fix:**
- Fund your Hyperliquid testnet account with more USDC
- Or use a tweet with higher confidence to get larger position size
- Account needs at least: `$10 / (position_size_percent / 100)`

Example: For 5% position, need at least $200 balance

### Issue: "Trading is halted" for a specific token

**Fix:**
- Try a different token (BTC, ETH, SOL usually work)
- Check Hyperliquid status: https://app.hyperliquid.xyz

---

## 📊 What Gets Created

After a successful test run:

### Database Records

**ct_posts:**
```
tweet_id: synthetic_1730556789...
tweet_text: "Bitcoin hitting new ATH! $BTC..."
is_signal_candidate: true
extracted_tokens: ['BTC']
confidence_score: 0.875
signal_type: 'LONG'
```

**user_hyperliquid_wallets:**
```
user_wallet: 0x3828dFCBff64fD07B963Ef11BafE632260413Ab3
agent_address: 0x9fD20FACeeEf805Ed4D6Baba936d20d8C73f3176
agent_private_key_encrypted: [encrypted]
```

**signals:**
```
agent_id: [agent UUID]
token_symbol: BTC
venue: HYPERLIQUID
side: LONG
size_model: { type: 'balance-percentage', value: 5.39 }
lunarcrush_score: 0.670
```

**positions:**
```
signal_id: [signal UUID]
token_symbol: BTC
venue: HYPERLIQUID
side: LONG
entry_price: 43250.50
qty: 0.001245
status: OPEN
```

### Hyperliquid Testnet

- Open position visible on https://app.hyperliquid.xyz/account
- Shows entry price, size, current PnL
- Can be closed manually or will be auto-closed by position monitor

---

## 🔧 Customization

### Test Different Tokens

```bash
TEST_TWEET="Solana is pumping hard! $SOL breaking ATH 🚀" \
npx tsx scripts/test-complete-automated-flow.ts
```

### Test Low Confidence

```bash
TEST_TWEET="Maybe $DOGE will do something? Not sure..." \
npx tsx scripts/test-complete-automated-flow.ts
```

Should get lower confidence → smaller position size

### Test Multiple Tokens

```bash
TEST_TWEET="$BTC and $ETH both looking bullish! Major breakout incoming 🚀" \
npx tsx scripts/test-complete-automated-flow.ts
```

Should create 2 signals, execute 2 trades

---

## 🚀 Next Steps After Successful Test

1. **Monitor the position** on Hyperliquid testnet
2. **Test position monitoring** (auto-close on stop loss/take profit)
3. **Test with different agents** (create multiple agents)
4. **Test with real tweets** (integrate actual Twitter data)
5. **Deploy to production** (Railway + Render)

---

## 📚 Related Documentation

- `SYSTEM_FLOW.md` - Complete system architecture
- `EXPONENTIAL_SCORING.md` - Position sizing logic
- `HYPERLIQUID_USER_WALLET_ARCHITECTURE.md` - Wallet management
- `HYPERLIQUID_INTEGRATION.md` - Hyperliquid setup

---

## ✅ Production Deployment Checklist

Before deploying to production:

- [ ] All tests pass locally
- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] Hyperliquid Python service deployed (Render)
- [ ] Next.js app deployed (Railway)
- [ ] Workers running (Railway)
- [ ] Real user wallets whitelisted on Hyperliquid mainnet
- [ ] Monitoring and alerts set up

---

**Your system is ready to trade! 🎉**

