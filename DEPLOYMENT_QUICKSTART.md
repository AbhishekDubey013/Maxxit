# 🚀 Railway Deployment - Quick Start

## Critical Environment Variables

```bash
# Generate this first!
AGENT_WALLET_ENCRYPTION_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Database (from Neon)
DATABASE_URL=postgresql://...

# Hyperliquid Service (from Render)
HYPERLIQUID_SERVICE_URL=https://your-service.onrender.com

# APIs
LUNARCRUSH_API_KEY=tt6l3p9qa3otztg3rik6gf2ofdmhhl3ndd4b4psvl
PERPLEXITY_API_KEY=pplx-...
GAME_API_KEY=apx-...

# Mode
NEXT_PUBLIC_HYPERLIQUID_TESTNET=true
```

## Deploy in 5 Minutes

1. **Generate Key**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. **Set Variables**: Add to Railway → Variables
3. **Deploy Hyperliquid Service**: Render.com → Python service
4. **Auto-Deploy**: Railway detects push and deploys
5. **Migrate DB**: Railway Shell → `npx prisma db push`

## Test After Deploy

```bash
# 1. Visit marketplace
https://your-app.railway.app

# 2. Click "Hyperliquid" on any agent
# 3. Connect MetaMask
# 4. Approve on Hyperliquid
# 5. Done!
```

## Monitor Overnight

Check Railway logs for:
- `[TweetWorker]` - Fetching tweets
- `[SignalWorker]` - Generating signals
- `[TradeWorker]` - Executing trades
- `[PositionMonitor]` - Monitoring positions

## Troubleshooting

**Workers not running?**
→ Check env vars in Railway

**"Encryption key not set"?**
→ Set AGENT_WALLET_ENCRYPTION_KEY

**No trades executing?**
→ Check LunarCrush API key

---

**Full Guide**: See [RAILWAY_DEPLOYMENT_COMPLETE.md](./RAILWAY_DEPLOYMENT_COMPLETE.md)

