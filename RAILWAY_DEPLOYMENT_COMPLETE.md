# Complete Railway Deployment Guide

## 🚀 Deploy Maxxit to Railway (Updated for Hyperliquid Integration)

This guide covers the complete deployment of Maxxit to Railway, including the new Hyperliquid integration with automated position monitoring.

---

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your Maxxit codebase pushed to GitHub
3. **API Keys**: Collect all required API keys (see below)

---

## Step 1: Create Railway Project

1. Go to [railway.app/new](https://railway.app/new)
2. Click "Deploy from GitHub repo"
3. Select your Maxxit repository
4. Railway will automatically detect Next.js and set up the build

---

## Step 2: Required Environment Variables

### Core Application

```env
# Node Environment
NODE_ENV=production

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
NEON_REST_URL=https://your-project.neon.tech/api/v2
NEON_REST_TOKEN=your-neon-rest-token

# Next.js
NEXT_PUBLIC_API_URL=https://your-app.railway.app
```

### Blockchain RPC Endpoints

```env
# Arbitrum One (Mainnet)
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Arbitrum Sepolia (Testnet)
ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

### Twitter/X API (GAME SDK)

```env
# GAME API for Twitter Data
GAME_API_KEY=apx-your-game-api-key

# Alternative: Direct Twitter API (optional)
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
```

### LLM Services (for Signal Classification)

```env
# Perplexity AI (Primary - Recommended)
PERPLEXITY_API_KEY=pplx-your-key

# OpenAI (Fallback)
OPENAI_API_KEY=sk-your-key

# Anthropic Claude (Fallback)
ANTHROPIC_API_KEY=sk-ant-your-key
```

### LunarCrush API (Market Intelligence)

```env
# LunarCrush for Market Sentiment & Scoring
LUNARCRUSH_API_KEY=your-lunarcrush-key
```

### Hyperliquid Integration

```env
# Hyperliquid Service
HYPERLIQUID_SERVICE_URL=https://your-hyperliquid-service.render.com
HYPERLIQUID_SERVICE_PORT=5001

# Hyperliquid Testnet/Mainnet Mode
NEXT_PUBLIC_HYPERLIQUID_TESTNET=true

# Agent Wallet Encryption (CRITICAL - Generate your own!)
AGENT_WALLET_ENCRYPTION_KEY=generate-a-secure-64-char-hex-key-here
```

### Safe Wallet & Smart Contracts

```env
# Safe Wallet Deployment
PRIVATE_KEY=your-deployer-private-key

# Module Addresses
MODULE_ADDRESS=0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb
```

### Worker Configuration

```env
# Worker Intervals (in milliseconds)
TWEET_INGESTION_INTERVAL=300000    # 5 minutes
SIGNAL_GENERATOR_INTERVAL=60000    # 1 minute
TRADE_EXECUTOR_INTERVAL=30000      # 30 seconds
POSITION_MONITOR_INTERVAL=60000    # 1 minute
```

---

## Step 3: Generate Secure Encryption Key

The `AGENT_WALLET_ENCRYPTION_KEY` is critical for encrypting Hyperliquid agent private keys. Generate it:

### Option 1: Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option 2: Using OpenSSL

```bash
openssl rand -hex 32
```

### Option 3: Online (use with caution)

Visit a secure random hex generator and generate a 64-character hex string.

⚠️ **IMPORTANT**: Keep this key secret! Store it securely. If lost, all encrypted agent wallets become unrecoverable.

---

## Step 4: Deploy Hyperliquid Python Service

The Hyperliquid integration requires a separate Python service for the Hyperliquid SDK.

### Deploy to Render (Free Tier)

1. Create a new Web Service on [render.com](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `pip install -r services/hyperliquid-service/requirements.txt`
   - **Start Command**: `python services/hyperliquid-service/main.py --port $PORT`
   - **Environment**: Python 3.11
   - **Region**: Same as your Railway app (for low latency)
4. Set Environment Variables:
   ```env
   PORT=5001
   HYPERLIQUID_TESTNET=true
   ```
5. Deploy and copy the service URL (e.g., `https://your-service.onrender.com`)
6. Add this URL to Railway as `HYPERLIQUID_SERVICE_URL`

---

## Step 5: Set Up Database (Neon PostgreSQL)

1. Go to [neon.tech](https://neon.tech) and create a new project
2. Copy the connection string
3. In Railway, add `DATABASE_URL` with the connection string
4. Run Prisma migrations:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

---

## Step 6: Configure Workers

Maxxit runs 4 background workers:

1. **Tweet Ingestion** - Fetches and classifies tweets every 5 minutes
2. **Signal Generator** - Creates trading signals every 1 minute
3. **Trade Executor** - Executes pending trades every 30 seconds
4. **Position Monitor** - Monitors and manages positions every 1 minute

These workers run automatically in Railway using the `start` script in `package.json`.

---

## Step 7: Deploy & Monitor

1. Click "Deploy" in Railway
2. Wait for build to complete (~3-5 minutes)
3. Railway will provide a public URL (e.g., `https://your-app.railway.app`)
4. Visit the URL to verify deployment
5. Check logs in Railway dashboard for any errors

### Monitor Workers

View worker logs in Railway:
- **Deployments** → **Logs**
- Filter by:
  - `[TweetWorker]`
  - `[SignalWorker]`
  - `[TradeWorker]`
  - `[PositionMonitor]`

---

## Step 8: Test Hyperliquid Integration

### 1. Visit Your Deployed App

Open `https://your-app.railway.app`

### 2. Connect to an Agent

1. Browse the agent marketplace
2. Click "Hyperliquid" on any agent
3. Connect your MetaMask wallet
4. System generates a unique agent wallet for you
5. Copy the agent address

### 3. Approve on Hyperliquid

1. Visit `https://app.hyperliquid-testnet.xyz/API` (or mainnet)
2. Connect with your wallet
3. Add/Authorize the agent address
4. Confirm the transaction

### 4. Verify Setup

1. Return to Maxxit
2. Click "I've Approved It"
3. Status should change to "✅ Active"

### 5. Monitor Positions

- Signals will be generated automatically from X posts
- Trades execute automatically when signals are generated
- Positions appear in your Hyperliquid account
- Position monitor tracks all positions in real-time

---

## Troubleshooting

### Workers Not Running

Check Railway logs for errors. Common issues:
- Missing environment variables
- Database connection issues
- API key issues

### Hyperliquid Service Connection Failed

- Verify `HYPERLIQUID_SERVICE_URL` is correct
- Check Render service is running
- Check Render service logs

### Agent Wallet Decryption Failed

- Verify `AGENT_WALLET_ENCRYPTION_KEY` is set correctly
- Check the key is 64 hex characters (32 bytes)
- If key was changed, old wallets are unrecoverable

### No Trades Executing

- Check worker logs for errors
- Verify `LUNARCRUSH_API_KEY` is valid
- Check Twitter/X API is returning data
- Verify LLM API keys are valid

### Database Connection Issues

- Check `DATABASE_URL` is correct
- Verify Neon project is active
- Check IP allowlist if restricted

---

## Security Best Practices

1. **Encryption Key**: Generate a unique `AGENT_WALLET_ENCRYPTION_KEY` - never use defaults
2. **Private Keys**: Never commit private keys to git
3. **API Keys**: Rotate API keys regularly
4. **Database**: Use connection pooling for high traffic
5. **Rate Limiting**: Implement rate limiting on API endpoints
6. **Monitoring**: Set up error alerts in Railway

---

## Scaling

### Increase Worker Performance

1. Upgrade Railway plan for more resources
2. Deploy workers to separate Railway services
3. Use Redis for worker coordination
4. Implement job queues (Bull/BullMQ)

### Optimize Database

1. Add indexes for frequent queries
2. Use Neon's autoscaling
3. Implement caching (Redis)
4. Use read replicas for analytics

---

## Cost Estimation

### Railway (Starter Plan - $5/month)

- Next.js app: ~$5/month
- Workers: Included
- Build minutes: 500 free/month

### Render (Free Tier)

- Hyperliquid Python service: Free
- Limitations: Sleeps after 15 min inactivity

### Neon PostgreSQL (Free Tier)

- Database: Free up to 512 MB
- Pro plan: $19/month (recommended for production)

### API Costs

- Perplexity AI: ~$0.01 per 1K tokens
- LunarCrush: Free tier available
- GAME SDK: Varies by plan

**Total Monthly Cost (Production)**: ~$30-50/month

---

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrated and accessible
- [ ] Hyperliquid service running on Render
- [ ] Workers running and logging correctly
- [ ] Marketplace loading agents
- [ ] Hyperliquid connect flow working
- [ ] Test agent wallet generation
- [ ] Verify agent approval on Hyperliquid
- [ ] Monitor first automated trade
- [ ] Check position monitoring
- [ ] Set up error alerts
- [ ] Document custom configuration

---

## Support

- **Documentation**: See `/docs` in your deployed app
- **GitHub Issues**: Report bugs on your repository
- **Community**: Join Discord for community support

---

## Next Steps

1. **Add Real Twitter Data**: Configure GAME SDK or Twitter API properly
2. **Optimize LLM**: Fine-tune prompts for better signal classification
3. **Add More Venues**: Expand beyond Hyperliquid (GMX, Vertex, etc.)
4. **Build Analytics**: Add comprehensive performance dashboards
5. **Implement Risk Management**: Add position size limits, stop losses, etc.

---

**Your Maxxit trading system is now live on Railway! 🚀**

Monitor overnight and check logs for any issues. The system will automatically:
- Fetch tweets
- Classify signals
- Execute trades
- Monitor positions
- Close positions based on exit logic

Happy trading! 📈

