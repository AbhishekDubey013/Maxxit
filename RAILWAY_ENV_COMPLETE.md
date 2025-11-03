# Railway Environment Variables - Complete List

## 🔴 CRITICAL (Required)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Hyperliquid Service Connection
HYPERLIQUID_SERVICE_URL=https://your-service.onrender.com

# Agent Wallet Encryption
AGENT_WALLET_ENCRYPTION_KEY=your_64_char_hex_key

# LLM Provider (Choose ONE)
PERPLEXITY_API_KEY=your_key
# OR
OPENAI_API_KEY=your_key  
# OR
ANTHROPIC_API_KEY=your_key

# LunarCrush
LUNARCRUSH_API_KEY=tt6l3p9qa3otztg3rik6gf2ofdmhhl3ndd4b4psvl

# Frontend Config
NEXT_PUBLIC_HYPERLIQUID_TESTNET=true
```

## 🟡 RECOMMENDED (For Tweet Ingestion)

```bash
# Twitter/X API (Choose ONE method)

# Method 1: GAME API (Recommended)
GAME_API_KEY=apx-your_key

# Method 2: Direct Twitter API
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_secret
```

## 🟢 OPTIONAL (For Advanced Features)

```bash
# Safe Wallet Trading (if using SPOT/GMX venues)
PRIVATE_KEY=your_ethereum_private_key
INFURA_API_KEY=your_infura_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token

# Logging
LOG_LEVEL=info

# Node Environment
NODE_ENV=production
```

---

## 📝 How to Add on Railway

1. Go to your Railway project
2. Click on your service
3. Go to **"Variables"** tab
4. Click **"+ New Variable"**
5. Add each variable one by one
6. Click **"Deploy"** to restart with new variables

---

## ⚠️ CRITICAL: Generate Encryption Key

Don't use a default key! Generate your own:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `AGENT_WALLET_ENCRYPTION_KEY`

---

## 🔗 Link to Render Service

After Render deployment completes, copy its URL:

```
https://maxxit-hyperliquid-service.onrender.com
```

Set it as:
```
HYPERLIQUID_SERVICE_URL=https://maxxit-hyperliquid-service.onrender.com
```

---

## ✅ Test Configuration

After adding all variables, test with:

```bash
curl https://your-railway-url/api/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected",
  "hyperliquid": "connected",
  "llm": "configured",
  "lunarcrush": "configured"
}
```

