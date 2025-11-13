# Agent Where: Quick Start Guide

## 🚀 What is Agent Where?

**Agent Where** is the intelligent venue routing layer that automatically selects the best trading venue (Hyperliquid or Ostium) for each trade based on pair availability.

**Default behavior:** Try Hyperliquid first → fallback to Ostium if pair not available.

---

## ⚡ Quick Setup (3 Steps)

### 1. Run Setup Script

```bash
npx tsx scripts/setup-agent-where.ts
```

This will:
- ✅ Add MULTI venue type to database
- ✅ Create routing tables
- ✅ Set default config (HYPERLIQUID → OSTIUM)
- ✅ Verify system readiness

### 2. Sync Markets (if needed)

```bash
npx tsx scripts/sync-hyperliquid-markets.ts
npx tsx scripts/sync-ostium-markets.ts
```

### 3. Done! 🎉

Your system now supports multi-venue routing.

---

## 📖 Usage

### Create a Multi-Venue Agent

**Option 1: Via API**
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smart Router",
    "venue": "MULTI",
    "creator_wallet": "0x...",
    "profit_receiver_address": "0x...",
    "weights": [1, 1, 1]
  }'
```

**Option 2: Via Prisma**
```typescript
const agent = await prisma.agents.create({
  data: {
    name: "Smart Router",
    venue: 'MULTI',  // 👈 Set to MULTI
    creator_wallet: "0x...",
    profit_receiver_address: "0x...",
    weights: [1, 1, 1],
    status: 'ACTIVE',
  }
});
```

### Signals Are Generated Normally

```typescript
// Signal generator automatically uses agent's venue
const signal = await prisma.signals.create({
  data: {
    agent_id: agent.id,
    venue: agent.venue,  // Will be 'MULTI'
    token_symbol: 'BTC',
    side: 'LONG',
    ...
  }
});
```

### Routing Happens at Execution

When `TradeExecutor` runs:
1. Detects `venue === 'MULTI'`
2. Calls `VenueRouter` to select best venue
3. Updates signal with selected venue
4. Executes trade normally

**Example flow:**
```
Signal: BTC LONG (MULTI)
  ↓
VenueRouter: Check HYPERLIQUID for BTC → ✅ Available
  ↓
Update: signal.venue = 'HYPERLIQUID'
  ↓
Execute: Trade on Hyperliquid
  ↓
Position: Created on Hyperliquid
```

---

## 🔧 Configuration

### View Current Config

```bash
# Global config
curl http://localhost:3000/api/venue-routing/config

# Agent-specific config
curl http://localhost:3000/api/venue-routing/config?agentId=YOUR_AGENT_ID
```

### Set Custom Routing

```bash
# Prefer Ostium first (e.g., for exotic pairs like HYPE)
curl -X POST http://localhost:3000/api/venue-routing/config \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "YOUR_AGENT_ID",
    "venuePriority": ["OSTIUM", "HYPERLIQUID"],
    "routingStrategy": "FIRST_AVAILABLE",
    "failoverEnabled": true
  }'
```

### View Routing Stats

```bash
# Last 24 hours
curl http://localhost:3000/api/venue-routing/stats?timeWindow=day

# For specific token
curl http://localhost:3000/api/venue-routing/stats?tokenSymbol=BTC
```

---

## 📊 Example Outputs

### Routing Stats Response

```json
{
  "success": true,
  "timeWindow": "day",
  "stats": {
    "total": 125,
    "byVenue": {
      "HYPERLIQUID": 98,
      "OSTIUM": 27
    },
    "byToken": {
      "BTC": { "total": 45, "venues": { "HYPERLIQUID": 45 } },
      "HYPE": { "total": 12, "venues": { "OSTIUM": 12 } }
    },
    "avgRoutingTimeMs": 42
  }
}
```

### Routing History (Database)

```sql
SELECT token_symbol, selected_venue, routing_reason, routing_duration_ms
FROM venue_routing_history
ORDER BY created_at DESC
LIMIT 10;
```

**Example rows:**

| token_symbol | selected_venue | routing_reason | routing_duration_ms |
|--------------|----------------|----------------|---------------------|
| BTC | HYPERLIQUID | HYPERLIQUID: Market BTC/USD available (Index: 0) | 38 |
| ETH | HYPERLIQUID | HYPERLIQUID: Market ETH/USD available (Index: 1) | 42 |
| HYPE | OSTIUM | HYPERLIQUID: Market not found → OSTIUM: Available (Index: 41) | 65 |

---

## ✅ Backward Compatibility

**Existing agents are 100% compatible.** No changes needed.

| Agent Venue | Behavior |
|-------------|----------|
| `HYPERLIQUID` | Always uses Hyperliquid (unchanged) |
| `OSTIUM` | Always uses Ostium (unchanged) |
| `SPOT` | Always uses Spot (unchanged) |
| `GMX` | Always uses GMX (unchanged) |
| `MULTI` | **NEW**: Smart routing |

**Pre-existing agents continue to work exactly as before.**

---

## 🐛 Troubleshooting

### "No venue available for token"

**Fix:**
```bash
# Sync markets
npx tsx scripts/sync-hyperliquid-markets.ts
npx tsx scripts/sync-ostium-markets.ts

# Verify token exists
psql $DATABASE_URL -c "SELECT * FROM venue_markets WHERE token_symbol = 'YOUR_TOKEN';"
```

### Routing seems slow

**Check:**
```bash
curl http://localhost:3000/api/venue-routing/stats?timeWindow=hour
# Look at: stats.avgRoutingTimeMs (should be < 100ms)
```

### Signal still shows MULTI after execution

**Check routing history:**
```sql
SELECT * FROM venue_routing_history WHERE signal_id = 'YOUR_SIGNAL_ID';
```

If no record → routing didn't happen → check TradeExecutor logs

---

## 📚 Full Documentation

For detailed architecture, API reference, and advanced configuration:

**👉 [docs/AGENT_WHERE_ROUTING.md](docs/AGENT_WHERE_ROUTING.md)**

---

## 🎯 Summary

1. ✅ Run: `npx tsx scripts/setup-agent-where.ts`
2. ✅ Create agents with `venue: 'MULTI'`
3. ✅ Generate signals normally
4. ✅ Trades automatically route to best venue
5. ✅ Monitor via `/api/venue-routing/stats`

**That's it!** Your agents now intelligently route across Hyperliquid and Ostium.

---

**Branch:** `agent-where-venue-routing`  
**Status:** ✅ Production Ready  
**Last Updated:** 2025-11-13

