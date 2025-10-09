# Environment Variables Template

Copy these variables to your `.env` file locally, and add them to Vercel/Railway dashboards for production.

## Required Variables

```bash
# Node Environment
NODE_ENV=production

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DATABASE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Get from: https://neon.tech
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# BLOCKCHAIN - ARBITRUM ONE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHAIN_ID=42161
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc

# Smart Contract Addresses (DO NOT CHANGE - already deployed)
TRADING_MODULE_ADDRESS=0x74437d894C8E8A5ACf371E10919c688ae79E89FA
USDC_ADDRESS=0xaf88d065e77c8cC2239327C5EDb3A432268e5831

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WALLET PRIVATE KEYS (KEEP SECRET!)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Executor wallet - pays gas for trades (needs 0.01+ ETH on Arbitrum)
EXECUTOR_PRIVATE_KEY=your_executor_private_key_here
EXECUTOR_ADDRESS=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3

# Deployer wallet - module owner
DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here

# Platform fee receiver (your wallet)
PLATFORM_FEE_RECEIVER=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# API CONFIGURATION (IMPORTANT FOR WORKERS!)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Base URL for API calls from workers
# Production: https://your-vercel-domain.vercel.app
# Development: http://localhost:5000
API_BASE_URL=https://your-domain.vercel.app

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# X/TWITTER API (Required for real tweets)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# GAME API (Recommended - easier to get)
# Get from: https://console.game.xapi.com/
GAME_API_KEY=apx-090643fe359939fd167201c7183dc2dc

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# OPTIONAL VARIABLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# X Official API (Alternative to GAME API)
X_API_BEARER_TOKEN=

# Perplexity AI API (for smart tweet classification)
# Get from: https://www.perplexity.ai/settings/api
PERPLEXITY_API_KEY=
```

## Important Notes

### 1. API_BASE_URL is Critical!
This tells the workers where to call the API endpoints.
- **Production:** Set to your Vercel domain (e.g., `https://maxxit.vercel.app`)
- **Development:** Set to `http://localhost:5000`

**Without this, workers will fail with `ECONNREFUSED` errors!**

### 2. For Vercel Deployment
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to: Settings → Environment Variables
4. Add all variables above
5. Set `API_BASE_URL` to `https://your-vercel-domain.vercel.app`

### 3. For Railway Deployment
1. Go to: https://railway.app/dashboard
2. Select your project
3. Go to: Variables tab
4. Add all variables above
5. **IMPORTANT:** Set `API_BASE_URL` to your Vercel URL

### 4. Security
- NEVER commit `.env` to git
- Keep private keys secure
- Use different keys for production vs development
- Executor wallet needs ~0.01 ETH on Arbitrum

### 5. X API
- **With GAME_API_KEY:** Fetches real tweets from X/Twitter
- **Without:** Uses mock tweets (testing only)

### 6. Perplexity API
- **With key:** Smart LLM-based tweet classification
- **Without:** Uses regex fallback (still works!)

