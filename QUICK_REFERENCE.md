# 📝 Maxxit Quick Reference

**One-Page Cheat Sheet for Developers**

---

## 🏗️ System Architecture

```
Twitter → tweet-ingestion (5min) → signal-generator (5min) 
    → trade-executor (2min) → position-monitor (1min)
```

---

## 🎯 11 Services

### API Services (Railway)
1. **agent-api** (5001) - Agent CRUD
2. **deployment-api** (5002) - Deployment management  
3. **signal-api** (5003) - Signal queries

### Workers (Railway)
4. **tweet-ingestion-worker** (5004) - Fetch tweets, LLM classify (5min)
5. **signal-generator-worker** (5008) - Create signals w/ LunarCrush (5min)
6. **trade-executor-worker** (5005) - Execute trades (2min)
7. **position-monitor-worker** (5006) - Risk management (1min)
8. **metrics-updater-worker** (5007) - APR updates (15min)

### External (Render - Python)
9. **hyperliquid-service** - Hyperliquid API
10. **ostium-service** - Ostium API
11. **twitter-proxy** - Twitter API

---

## 📊 Data Flow

```
1. Tweet → ct_posts (is_signal_candidate: true)
2. ct_posts → signals (via agent_accounts subscription)
3. signals → positions (via agent_deployments)
4. positions → monitoring (stop loss, trailing stop)
```

---

## 🗄️ Key Tables

- **agents** - Trading agents
- **agent_accounts** - Twitter subscriptions
- **ct_posts** - Tweets (with LLM classification)
- **signals** - Trading signals
- **agent_deployments** - User deployments
- **wallet_pool** - Agent private keys
- **positions** - Open/closed trades
- **venue_markets** - Token availability

---

## 🔑 Environment Variables

### All Services Need:
```bash
DATABASE_URL=<Railway PostgreSQL>
PORT=<service-specific>
```

### Workers Also Need:
```bash
# tweet-ingestion-worker
TWITTER_PROXY_URL=https://maxxit.onrender.com
PERPLEXITY_API_KEY=<key>

# signal-generator-worker
LUNARCRUSH_API_KEY=<key>

# trade-executor-worker & position-monitor-worker
HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com
```

---

## 🚀 Railway Deployment

```bash
Root Directory: services/<service-name>
Build: npm install && npx prisma generate && npm run build
Start: npm start
```

---

## 🔍 Quick Debugging

### Check Logs:
```bash
Railway → Service → Logs
Look for: "Worker starting..." or error messages
```

### Test Health:
```bash
curl https://<service>.up.railway.app/health
```

### Common Errors:
- `DATABASE_URL not found` → Add env var
- `404 from Hyperliquid` → Wrong service URL
- `Agent not in wallet_pool` → Add to DB
- `No signals to process` → Check earlier stages

---

## 📈 Pipeline Stages

| Stage | Worker | Input | Output | Time |
|-------|--------|-------|--------|------|
| 1. Ingest | tweet-ingestion | Twitter | ct_posts | 5min |
| 2. Generate | signal-generator | ct_posts | signals | 5min |
| 3. Execute | trade-executor | signals | positions | 2min |
| 4. Monitor | position-monitor | positions | updates | 1min |

**Total latency: ~12-15 minutes** from tweet to trade

---

## 🎯 Agent Framework

```
Agent WHAT  = Signal generation (tweet → signal)
Agent HOW   = Policy (future, currently pass-through)
Agent WHERE = Venue selection (HYPERLIQUID/OSTIUM)
```

---

## 🛡️ Risk Management

**Hardcoded in position-monitor-worker:**
- Stop Loss: **-10%**
- Trailing Stop: **Activates at +3%, trails by 1%**

---

## 💾 Database Queries

### Find unprocessed tweets:
```sql
SELECT * FROM ct_posts 
WHERE is_signal_candidate = true 
  AND processed_for_signals = false;
```

### Find pending signals:
```sql
SELECT s.* FROM signals s
LEFT JOIN positions p ON s.id = p.signal_id
WHERE p.id IS NULL;
```

### Check agent subscriptions:
```sql
SELECT a.name, ca.x_username 
FROM agents a
JOIN agent_accounts aa ON a.id = aa.agent_id
JOIN ct_accounts ca ON aa.ct_account_id = ca.id
WHERE a.status = 'PUBLIC';
```

---

## 🧪 Manual Testing

### Test trade execution:
```bash
npx tsx test_eth_final.ts
```

### Check pipeline flow:
```bash
npx tsx test_pipeline_flow.ts
```

### Monitor specific tweet:
```bash
npx tsx quick_check.ts
```

---

## 📞 Need Help?

1. Check **SERVICES_ARCHITECTURE.md** for detailed docs
2. Check **MANUAL_FLOW_TEST_RESULTS.md** for test results
3. Ask senior team

---

**Version:** 1.0  
**Last Updated:** November 14, 2025
