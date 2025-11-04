# Railway Deployment Verification Checklist

## 🚀 **System Overview**

Your Maxxit system is now configured for **fully automated trading**:
- New tweets → Signal generation → Hyperliquid position execution → Monitoring

---

## ✅ **Pre-Deployment Checklist**

### **1. Environment Variables on Railway**

Ensure these are set in Railway's Variables section:

#### **Critical (Required)**
```bash
# Database
DATABASE_URL=postgresql://...

# Encryption
AGENT_WALLET_ENCRYPTION_KEY=5ae5611fa855df162f87d6e29dab68e6e25297ad5a76811fca233491898be6cf

# LLM Classification
PERPLEXITY_API_KEY=your_key_here
# OR
OPENAI_API_KEY=your_key_here
# OR
ANTHROPIC_API_KEY=your_key_here

# LunarCrush Scoring
LUNARCRUSH_API_KEY=tt6l3p9qa3otztg3rik6gf2ofdmhhl3ndd4b4psvl

# Hyperliquid Service (on Render)
HYPERLIQUID_SERVICE_URL=https://your-hyperliquid-service.onrender.com

# Twitter/X Data
GAME_API_KEY=apx-31d308e580e9a3b0efc45eb02db1f977
```

#### **Optional (Recommended)**
```bash
# Testnet Mode
NEXT_PUBLIC_HYPERLIQUID_TESTNET=true

# Worker Intervals
TWEET_INGESTION_INTERVAL=300000    # 5 mins
SIGNAL_GENERATION_INTERVAL=60000    # 1 min
TRADE_EXECUTION_INTERVAL=30000      # 30 sec
POSITION_MONITOR_INTERVAL=60000     # 1 min
```

---

### **2. Railway Services**

Verify these services are deployed and running:

#### **Service 1: Web App (Next.js)**
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Port: `3000`
- Status: ✅ Should show "Deployed"

#### **Service 2: Workers**
- Build Command: `npm install --legacy-peer-deps && npx prisma generate`
- Start Command: `bash workers/start-railway-workers-only.sh`
- Status: ✅ Should show "Deployed" and stay running (continuous mode)
- Note: Workers now run in continuous loops - service stays alive indefinitely

---

### **3. Render Service**

Verify Hyperliquid Python service on Render:

- Service Name: `hyperliquid-service`
- Runtime: Python 3
- Build Command: `pip install -r requirements.txt`
- Start Command: `python app.py`
- Port: `5001`
- Health Check: `GET /health` should return 200 OK

**Test Endpoint:**
```bash
curl https://your-hyperliquid-service.onrender.com/health
# Should return: {"status": "healthy", "testnet": true}
```

---

## 🔍 **Verify Deployment Status**

### **Check Railway Logs**

#### **1. Tweet Ingestion Worker**
Look for:
```
[Tweet Ingestion] 🐦 Fetching tweets...
[Tweet Ingestion] Found X CT accounts to monitor
[Tweet Ingestion] Fetched Y new tweets
```

#### **2. Signal Generator Worker**
Look for:
```
[Signal Generator] 📊 Checking for signal candidates...
[Signal Generator] Found X active deployments
[Signal Generator] Generated Y signals
```

#### **3. Trade Executor Worker**
Look for:
```
[Trade Executor] 🎯 Checking for pending signals...
[Trade Executor] Found X pending signals
[Trade Executor] Executed trade for [token]
```

#### **4. Position Monitor Worker**
Look for:
```
[Position Monitor] 📈 Monitoring Hyperliquid positions...
[Position Monitor] Found X open positions
[Position Monitor] Position [ID] PnL: +X%
```

---

## 🎯 **Current System State**

### **Active Agent**
- Name: `ArbMaxx`
- Status: `ACTIVE` ✅
- Venue: `HYPERLIQUID`

### **Linked CT Account**
- Username: `@Abhishe42402615`
- Status: Active ✅

### **Deployment**
- User Wallet: `0xa10846a81528d429b50b0dcbf8968938a572fac5`
- Hyperliquid Agent: `0x73064E8427F720FC7C4bDE78F81c05F6C6FD23cA`
- Agent Status: **Approved on Hyperliquid** ✅
- Balance: Check on Hyperliquid testnet

### **Pending Signals**
- From `@Abhishe42402615`: **12 signals** waiting to be processed
- Other accounts: 1,551 signals (will be skipped - not linked to any agent)

---

## 📊 **Expected Workflow**

### **When a New Tweet Arrives:**

```
1. Tweet Ingestion (every 5 mins)
   └─> Fetch new tweets from @Abhishe42402615
   └─> Store in `ct_posts` table
   └─> Mark as `is_signal_candidate: null` (not classified yet)

2. LLM Classification (every 1 min)
   └─> Pick up unclassified tweets
   └─> Classify: Is it a signal? Extract tokens. Sentiment. Confidence.
   └─> Update: `is_signal_candidate: true/false`, `confidence_score: 0-1`

3. Signal Generation (every 1 min)
   └─> Pick up `is_signal_candidate: true` posts
   └─> Fetch LunarCrush score for token
   └─> Calculate position size (based on LunarCrush + confidence)
   └─> Create signal in `signals` table
   └─> Mark post as `processed_for_signals: true`

4. Trade Execution (every 30 sec)
   └─> Pick up pending signals
   └─> Get agent private key (decrypt)
   └─> Calculate order size (USD → token amount)
   └─> Send order to Hyperliquid via Python service
   └─> Create position record
   └─> Mark signal as executed

5. Position Monitoring (every 1 min)
   └─> Fetch open positions from Hyperliquid
   └─> Update PnL, current price
   └─> Check exit conditions (stop loss, take profit, trailing stop)
   └─> Close position if exit triggered
```

---

## 🧪 **Testing the Flow**

### **Option 1: Wait for Real Tweets**
Just wait for `@Abhishe42402615` to post a new trading-related tweet.

### **Option 2: Process Existing 12 Signals**
The 12 pending signals from `@Abhishe42402615` will be automatically processed once workers start.

### **Option 3: Create Synthetic Tweet (Local Test)**
Before deploying, test locally:
```bash
cd /Users/abhishekdubey/Downloads/Maxxit
npx tsx scripts/test-complete-automated-flow.ts
```

---

## 🚨 **Common Issues & Fixes**

### **Issue 1: No Tweets Being Ingested**
**Symptom:** Tweet ingestion worker logs show "Fetched 0 tweets"
**Cause:** GAME API returning 204 No Content
**Fix:** This is a known GAME API issue. Tweets are already in DB from previous ingestion.

### **Issue 2: No Signals Being Generated**
**Symptom:** Signal generator finds 0 signal candidates
**Cause:** 
- All tweets already classified as `is_signal_candidate: false`
- Or already processed (`processed_for_signals: true`)
**Fix:** Wait for new tweets or manually reset `processed_for_signals` flag

### **Issue 3: Trade Execution Fails**
**Symptom:** "Order must have minimum value of $10"
**Cause:** Account balance too low or position size calculation too small
**Fix:** 
- Fund Hyperliquid account with more testnet USDC
- Increase position size via LunarCrush score

### **Issue 4: Position Not Found**
**Symptom:** "No open positions found on Hyperliquid"
**Cause:** Agent not approved or API error
**Fix:** 
- Verify agent is approved on Hyperliquid UI
- Check Hyperliquid service logs on Render

---

## 📈 **Monitoring Dashboard**

### **Railway Logs**
Check worker activity in real-time:
```
Railway Dashboard > Your Project > Workers > Logs
```

### **Database (Vercel/Railway)**
Monitor tables:
- `ct_posts` - Tweet ingestion
- `signals` - Signal generation
- `positions` - Trade execution

### **Hyperliquid UI**
Monitor positions:
```
https://app.hyperliquid-testnet.xyz/trade
```
Connect with: `0xa10846a81528d429b50b0dcbf8968938a572fac5`

---

## ✅ **Deployment Complete When:**

- [ ] All environment variables set on Railway
- [ ] Hyperliquid service healthy on Render
- [ ] Railway workers showing logs
- [ ] ArbMaxx agent status = ACTIVE
- [ ] Hyperliquid agent approved
- [ ] At least $100 USDC in Hyperliquid testnet account

---

## 🎉 **You're Ready!**

Once all checks pass, the system will automatically:
1. Monitor `@Abhishe42402615` for new tweets
2. Process the 12 existing signals
3. Execute trades on Hyperliquid testnet
4. Monitor and manage positions

**No manual intervention needed!** 🚀

---

## 📞 **Need Help?**

Check Railway logs first:
- Tweet ingestion issues → Check GAME_API_KEY
- Signal generation issues → Check LUNARCRUSH_API_KEY, PERPLEXITY_API_KEY
- Trade execution issues → Check HYPERLIQUID_SERVICE_URL, agent approval
- Position monitoring issues → Check Hyperliquid service health


