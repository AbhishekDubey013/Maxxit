# Vercel Environment Variables for Agent Where System

Complete list of environment variables required for deploying Maxxit with Agent Where to Vercel.

---

## 🗄️ Database (REQUIRED)

```bash
# PostgreSQL Database URL
DATABASE_URL="postgresql://username:password@host:5432/database_name?sslmode=require"

# Optional: Neon REST API (if using Neon)
NEON_REST_URL="https://your-project.neon.tech/sql"
```

---

## 🔐 Authentication & Security (REQUIRED)

```bash
# Session & JWT Secrets
SESSION_SECRET="your-random-session-secret-min-32-chars"
JWT_SECRET="your-random-jwt-secret-min-32-chars"

# Agent Wallet Encryption
AGENT_WALLET_ENCRYPTION_KEY="your-32-byte-encryption-key"
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🤖 LLM APIs (REQUIRED for Signal Generation)

```bash
# Choose at least ONE (Perplexity recommended for cost)
PERPLEXITY_API_KEY="pplx-xxxxx"
OPENAI_API_KEY="sk-xxxxx"
ANTHROPIC_API_KEY="sk-ant-xxxxx"
```

---

## 🔵 Hyperliquid Configuration (REQUIRED)

```bash
# Hyperliquid Service URL
HYPERLIQUID_SERVICE_URL="https://your-hyperliquid-service.railway.app"
# Or for local dev: http://localhost:5001

# Network
HYPERLIQUID_TESTNET="false"  # false for mainnet, true for testnet

# Platform Wallet (receives profit shares)
HYPERLIQUID_PLATFORM_WALLET="0x..."  # Your Arbitrum wallet address

# Fee Configuration
HYPERLIQUID_FEE_MODEL="PROFIT_SHARE"  # PROFIT_SHARE | FLAT | PERCENTAGE | TIERED
HYPERLIQUID_PROFIT_SHARE="10"  # 10% of profits (if using PROFIT_SHARE model)
HYPERLIQUID_FLAT_FEE="0.5"  # Only if FLAT model
HYPERLIQUID_FEE_PERCENT="0.1"  # Only if PERCENTAGE model
```

---

## 🟢 Ostium Configuration (REQUIRED)

```bash
# Ostium Service URL
OSTIUM_SERVICE_URL="https://your-ostium-service.railway.app"
# Or for local dev: http://localhost:5002

# Network
OSTIUM_TESTNET="false"  # false for mainnet, true for testnet

# RPC URL
OSTIUM_RPC_URL="https://arb1.arbitrum.io/rpc"  # Mainnet
# OSTIUM_RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"  # Testnet

# Platform Wallet (receives profit shares)
OSTIUM_PLATFORM_WALLET="0x..."  # Your Arbitrum wallet address

# Fee Configuration
OSTIUM_FEE_MODEL="PROFIT_SHARE"  # Recommended
OSTIUM_PROFIT_SHARE="10"  # 10% of profits
```

---

## ⚡ Trade Execution (REQUIRED)

```bash
# Executor Private Key (for signing transactions)
EXECUTOR_PRIVATE_KEY="0x..."  # KEEP THIS SECRET!

# Arbitrum RPC
ARBITRUM_RPC="https://arb1.arbitrum.io/rpc"  # Mainnet
# ARBITRUM_RPC="https://sepolia-rollup.arbitrum.io/rpc"  # Testnet
ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"  # Alternative name

# Trading Module Address
TRADING_MODULE_ADDRESS="0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb"
MODULE_ADDRESS="0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb"  # Fallback
```

---

## 🐦 Twitter/X Integration (OPTIONAL - for tweet ingestion)

```bash
# Game API (for tweet scraping)
GAME_API_KEY="your-game-api-key"

# Twitter Proxy Service (if deployed separately)
TWITTER_PROXY_URL="https://your-twitter-proxy.railway.app"
# Or: http://localhost:5003
```

---

## 📊 External APIs (OPTIONAL)

```bash
# LunarCrush (for social metrics)
LUNARCRUSH_API_KEY="your-lunarcrush-key"

# Price Oracle
PRICE_ORACLE_API_KEY="your-price-oracle-key"
```

---

## ⚙️ Application Configuration (OPTIONAL)

```bash
# Environment
NODE_ENV="production"

# API Base URL (for worker communication)
API_BASE_URL="https://your-vercel-app.vercel.app"
NEXT_PUBLIC_API_URL="https://your-vercel-app.vercel.app"

# Frontend URLs
NEXT_PUBLIC_HYPERLIQUID_TESTNET="false"
```

---

## 🔄 Worker Intervals (OPTIONAL - defaults are fine)

```bash
# Signal Generation
SIGNAL_GENERATION_INTERVAL="60000"  # 1 minute (milliseconds)
RESEARCH_SIGNAL_INTERVAL="120000"  # 2 minutes

# Trade Execution
TRADE_EXECUTION_INTERVAL="300000"  # 5 minutes

# Position Monitoring
POSITION_MONITOR_INTERVAL="300000"  # 5 minutes

# Tweet Ingestion
TWEET_INGESTION_INTERVAL="300000"  # 5 minutes
```

---

## 📝 Platform-Specific (Vercel)

```bash
# Vercel automatically provides:
# - VERCEL
# - VERCEL_URL
# - VERCEL_ENV (production | preview | development)
# - VERCEL_GIT_COMMIT_SHA
# - VERCEL_GIT_COMMIT_MESSAGE

# You don't need to set these manually
```

---

## 🎯 Minimal Configuration (Production Ready)

**For a production Vercel deployment with Agent Where**, you MUST have:

```bash
# ===== REQUIRED (13 variables) =====
DATABASE_URL="postgresql://..."
SESSION_SECRET="..."
JWT_SECRET="..."
AGENT_WALLET_ENCRYPTION_KEY="..."

PERPLEXITY_API_KEY="pplx-..."  # Or OPENAI_API_KEY or ANTHROPIC_API_KEY

HYPERLIQUID_SERVICE_URL="https://..."
HYPERLIQUID_TESTNET="false"
HYPERLIQUID_PLATFORM_WALLET="0x..."
HYPERLIQUID_PROFIT_SHARE="10"

OSTIUM_SERVICE_URL="https://..."
OSTIUM_RPC_URL="https://arb1.arbitrum.io/rpc"
OSTIUM_PLATFORM_WALLET="0x..."
OSTIUM_PROFIT_SHARE="10"

EXECUTOR_PRIVATE_KEY="0x..."  # CRITICAL: Keep secret!
ARBITRUM_RPC="https://arb1.arbitrum.io/rpc"
TRADING_MODULE_ADDRESS="0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb"
```

---

## 📋 Copy-Paste Template for Vercel

```bash
# ===== DATABASE =====
DATABASE_URL=postgresql://username:password@host:5432/database?sslmode=require

# ===== SECURITY =====
SESSION_SECRET=your-random-session-secret-min-32-chars
JWT_SECRET=your-random-jwt-secret-min-32-chars
AGENT_WALLET_ENCRYPTION_KEY=your-32-byte-encryption-key

# ===== LLM =====
PERPLEXITY_API_KEY=pplx-xxxxx

# ===== HYPERLIQUID =====
HYPERLIQUID_SERVICE_URL=https://your-hyperliquid-service.railway.app
HYPERLIQUID_TESTNET=false
HYPERLIQUID_PLATFORM_WALLET=0x...
HYPERLIQUID_PROFIT_SHARE=10

# ===== OSTIUM =====
OSTIUM_SERVICE_URL=https://your-ostium-service.railway.app
OSTIUM_TESTNET=false
OSTIUM_RPC_URL=https://arb1.arbitrum.io/rpc
OSTIUM_PLATFORM_WALLET=0x...
OSTIUM_PROFIT_SHARE=10

# ===== EXECUTION =====
EXECUTOR_PRIVATE_KEY=0x...
ARBITRUM_RPC=https://arb1.arbitrum.io/rpc
TRADING_MODULE_ADDRESS=0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb

# ===== OPTIONAL: TWITTER =====
# GAME_API_KEY=your-game-api-key
# TWITTER_PROXY_URL=https://your-twitter-proxy.railway.app

# ===== OPTIONAL: APPLICATION =====
# NODE_ENV=production
# API_BASE_URL=https://your-app.vercel.app
# NEXT_PUBLIC_API_URL=https://your-app.vercel.app
```

---

## 🚀 Setting Variables in Vercel

### Method 1: Vercel Dashboard

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add each variable:
   - **Key:** Variable name (e.g., `DATABASE_URL`)
   - **Value:** Variable value
   - **Environments:** Select `Production`, `Preview`, `Development`

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Set environment variables
vercel env add DATABASE_URL production
vercel env add SESSION_SECRET production
# ... etc for each variable

# Or import from .env file
vercel env pull .env.production
```

### Method 3: Bulk Import

Create a file `.env.production` with all variables, then:

```bash
# Use Vercel CLI to import
vercel env import .env.production
```

---

## 🔐 Security Best Practices

### 1. Never Commit Secrets

```bash
# Add to .gitignore
.env
.env.local
.env.production
.env.*.local
```

### 2. Use Different Keys for Each Environment

- **Production:** Real keys, mainnet
- **Preview:** Test keys, testnet
- **Development:** Local dev keys

### 3. Rotate Keys Regularly

- Executor private key
- Session secrets
- API keys

### 4. Use Vercel's Secret Management

Mark sensitive variables as **secrets** in Vercel dashboard.

---

## 🧪 Testing Your Configuration

After deployment:

```bash
# 1. Check health
curl https://your-app.vercel.app/api/monitoring/health

# 2. Check venue routing
curl https://your-app.vercel.app/api/venue-routing/stats

# 3. Check database connection
curl https://your-app.vercel.app/api/agents

# 4. Test complete flow
# - Create a MULTI agent
# - Generate a signal
# - Watch it route and execute
```

---

## ⚠️ Common Issues

### Issue: "DATABASE_URL is not defined"
**Solution:** Verify DATABASE_URL is set in Vercel env vars

### Issue: "EXECUTOR_PRIVATE_KEY is not defined"
**Solution:** Add EXECUTOR_PRIVATE_KEY to Vercel env vars
**Important:** This should be a funded wallet on Arbitrum

### Issue: Services timeout
**Solution:** 
- Check HYPERLIQUID_SERVICE_URL and OSTIUM_SERVICE_URL are accessible
- Ensure services are deployed and running
- Test service health endpoints

### Issue: "Agent wallet encryption failed"
**Solution:** 
- Set AGENT_WALLET_ENCRYPTION_KEY
- Must be exactly 32 bytes (64 hex characters)
- Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 📚 Related Documentation

- [Agent Where Routing](docs/AGENT_WHERE_ROUTING.md)
- [Complete Monitoring System](docs/COMPLETE_MONITORING_SYSTEM.md)
- [Ostium Integration](docs/OSTIUM_ENV_SETUP.md)
- [Render Deployment Guide](RENDER_DEPLOYMENT_CHECKLIST.md)

---

## ✅ Pre-Deployment Checklist

Before deploying to Vercel:

- [ ] Database created and accessible
- [ ] Hyperliquid service deployed (Railway/Render)
- [ ] Ostium service deployed (Railway/Render)
- [ ] All REQUIRED env vars set in Vercel
- [ ] Executor wallet funded with ETH (for gas)
- [ ] Platform wallet addresses configured
- [ ] Secrets never committed to git
- [ ] Test environment variables in preview deployment first
- [ ] Health check endpoint works
- [ ] Market sync completed (`npx tsx scripts/sync-*-markets.ts`)

---

**Last Updated:** 2025-11-13  
**For:** Agent Where with Complete Monitoring  
**Branch:** `agent-where-venue-routing`  
**Status:** ✅ Production Ready

