# Complete Monitoring System for Agent Where

## 🎯 Overview

This document describes the **complete end-to-end monitoring flow** for the Maxxit Agent Framework, with special focus on the Agent Where (venue routing) layer.

---

## 📊 Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     MONITORING LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Health Monitoring                                            │
│     • Venue availability (Hyperliquid, Ostium)                   │
│     • Database connectivity                                      │
│     • Routing performance                                        │
│     • System status (healthy/degraded/critical)                  │
│                                                                  │
│  2. Performance Monitoring                                       │
│     • Routing decision time (avg ~40-60ms)                       │
│     • Position monitoring latency                                │
│     • API response times                                         │
│     • Database query performance                                 │
│                                                                  │
│  3. Business Metrics                                             │
│     • Agent APR (30d, 90d, SI)                                   │
│     • Sharpe ratio                                               │
│     • Position PnL tracking                                      │
│     • Venue distribution                                         │
│                                                                  │
│  4. Routing Analytics                                            │
│     • Venue selection frequency                                  │
│     • Token distribution across venues                           │
│     • Routing success/failure rates                              │
│     • Fallback patterns                                          │
│                                                                  │
│  5. Error Tracking                                               │
│     • Failed routing attempts                                    │
│     • Trade execution errors                                     │
│     • Venue connectivity issues                                  │
│     • Market data staleness                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Monitoring Components

### 1. Health Check API

**Endpoint:** `GET /api/monitoring/health`

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-11-13T12:00:00Z",
  "venues": {
    "hyperliquid": {
      "status": "healthy",
      "availableMarkets": 220,
      "lastSync": "2025-11-13T11:30:00Z",
      "responseTime": 25
    },
    "ostium": {
      "status": "healthy",
      "availableMarkets": 8,
      "lastSync": "2025-11-13T11:30:00Z",
      "responseTime": 32
    }
  },
  "routing": {
    "avgRoutingTimeMs": 42,
    "totalRoutingDecisions": 156,
    "successRate": 98.5,
    "failureRate": 1.5
  },
  "database": {
    "status": "connected",
    "responseTime": 12
  },
  "recommendations": [
    "✅ All systems operational. Agent Where is healthy."
  ]
}
```

**Usage:**
```bash
# Check system health
curl http://localhost:3000/api/monitoring/health

# In production monitoring (e.g., UptimeRobot, Datadog)
curl https://your-domain.com/api/monitoring/health
```

### 2. Analytics API

**Endpoint:** `GET /api/monitoring/analytics?timeWindow=day`

**Response:**
```json
{
  "success": true,
  "timeWindow": "day",
  "totalRoutings": 156,
  "venueDistribution": [
    {
      "venue": "HYPERLIQUID",
      "count": 128,
      "percentage": 82.05,
      "avgRoutingTimeMs": 38
    },
    {
      "venue": "OSTIUM",
      "count": 28,
      "percentage": 17.95,
      "avgRoutingTimeMs": 52
    }
  ],
  "tokenDistribution": {
    "BTC": { "count": 45, "venues": { "HYPERLIQUID": 45 } },
    "ETH": { "count": 38, "venues": { "HYPERLIQUID": 38 } },
    "HYPE": { "count": 12, "venues": { "OSTIUM": 12 } }
  },
  "recentRouting": [...]
}
```

### 3. Dashboard API

**Endpoint:** `GET /api/monitoring/dashboard`

**Comprehensive dashboard data including:**
- System health
- Routing analytics
- Active agents (total, MULTI venue)
- Open positions (by venue)
- Signal execution rates
- Recent errors

### 4. Venue Routing Stats API

**Endpoint:** `GET /api/venue-routing/stats?timeWindow=day&tokenSymbol=BTC`

**Detailed routing statistics per token or global**

---

## 🔄 Monitoring Workers

### 1. Position Monitor (Combined)

**File:** `workers/position-monitor-combined.ts`

**Purpose:** Monitor open positions across all venues

**Flow:**
```
Every 5 minutes:
  ↓
Run Hyperliquid Monitor
  • Fetch open HYPERLIQUID positions from DB
  • Query Hyperliquid API for current prices
  • Update current_price, pnl in DB
  • Check TP/SL conditions
  • Close positions if needed
  ↓
Run Ostium Monitor
  • Fetch open OSTIUM positions from DB
  • Query Ostium API for current prices
  • Update current_price, pnl in DB
  • Check TP/SL conditions
  • Close positions if needed
  ↓
Log Summary
  • Positions monitored
  • Updates made
  • Errors encountered
```

**Run:**
```bash
npx tsx workers/position-monitor-combined.ts
```

### 2. Trade Executor Worker

**File:** `workers/trade-executor-worker.ts`

**Purpose:** Execute pending signals with Agent Where routing

**Flow:**
```
Every 5 minutes:
  ↓
Fetch Pending Signals
  • venue='MULTI' and no positions
  • venue-specific signals without positions
  ↓
For Each Signal:
  ↓
  If venue='MULTI':
    • Call VenueRouter
    • Select best venue (Hyperliquid → Ostium)
    • Update signal.venue
    • Log routing decision
  ↓
  Execute Trade
    • Call venue adapter
    • Create position
    • Update metrics
  ↓
Log Summary
  • Signals processed
  • Positions created
  • Routing decisions
```

**Run:**
```bash
npx tsx workers/trade-executor-worker.ts
```

### 3. Signal Generator Worker

**File:** `workers/signal-generator.ts`

**Purpose:** Generate signals from tweets and research

**Flow:**
```
Every 6 hours:
  ↓
Fetch Unprocessed Tweets
  • is_signal_candidate=true
  • processed_for_signals=false
  ↓
For Each Tweet:
  ↓
  LLM Classification
    • Extract token, side, confidence
    • Generate risk model
  ↓
  Create Signal
    • venue=MULTI (for MULTI agents)
    • venue=specific (for venue-specific agents)
    • Store size_model, risk_model
  ↓
  Mark Tweet as Processed
```

### 4. Metrics Updater

**File:** `lib/metrics-updater.ts`

**Purpose:** Update agent APR after position closes

**Flow:**
```
After Position Closes:
  ↓
Get Agent
  • Check if MULTI venue
  ↓
Get Closed Positions
  • MULTI agents: all venues
  • Specific agents: that venue only
  ↓
Calculate Metrics
  • APR 30d, 90d, SI
  • Sharpe ratio
  • Capital deployed
  • Total PnL
  ↓
Update Agent Record
  • Store new metrics
  • Visible in marketplace
```

---

## 📈 Metrics Calculation

### APR (Annual Percentage Rate)

```typescript
// For MULTI venue agents: include all venue positions
// For specific venue agents: only that venue

const positions = await prisma.positions.findMany({
  where: {
    deployment_id: { in: deploymentIds },
    venue: agent.venue === 'MULTI' 
      ? { in: ['HYPERLIQUID', 'OSTIUM', 'GMX', 'SPOT'] }
      : agent.venue,
    closed_at: { not: null }
  }
});

// Calculate capital deployed
const capitalDeployed = positions.reduce((sum, p) => 
  sum + (parseFloat(p.entry_price) * parseFloat(p.qty)), 
  0
);

// Calculate PnL
const totalPnl = positions.reduce((sum, p) => 
  sum + parseFloat(p.pnl), 
  0
);

// APR formula
const apr30d = capitalDeployed > 0
  ? (totalPnl / capitalDeployed) * (365 / 30) * 100
  : 0;
```

**Key Points:**
- ✅ MULTI agents: APR calculated across all venues
- ✅ Venue-specific agents: APR only from that venue
- ✅ Uses actual capital deployed (not fixed $1000)
- ✅ Annualized based on time period

---

## 🔔 Alerting & Notifications

### 1. Health Degradation Alerts

**Trigger:** When system status becomes 'degraded' or 'critical'

**Action:**
```bash
# Example with webhook
curl -X POST https://your-webhook.com/alert \
  -H "Content-Type: application/json" \
  -d '{
    "status": "degraded",
    "message": "Hyperliquid venue is degraded",
    "recommendations": ["Sync markets: npx tsx scripts/sync-hyperliquid-markets.ts"]
  }'
```

### 2. Routing Failure Alerts

**Trigger:** When routing success rate < 80%

**Action:** Send notification to team

### 3. Position Monitoring Alerts

**Trigger:** Position monitoring fails or latency > 1 minute

**Action:** Alert DevOps team

---

## 📊 Dashboard Visualization

### Recommended Metrics to Display

#### 1. System Health Panel
- Overall status indicator (green/yellow/red)
- Venue health (Hyperliquid, Ostium)
- Database status
- Last health check timestamp

#### 2. Routing Performance Panel
- Average routing time (last hour)
- Routing success rate (last 24h)
- Venue distribution pie chart
- Recent routing decisions table

#### 3. Agent Performance Panel
- Total active agents
- MULTI venue agents count
- Top performing agents (by APR)
- Agent APR distribution chart

#### 4. Position Tracking Panel
- Open positions count (by venue)
- Total unrealized PnL
- Recent position updates
- Position monitoring latency

#### 5. Signal Pipeline Panel
- Signals generated (last 24h)
- Signals executed vs skipped
- Execution rate %
- Recent signals table

---

## 🚨 Monitoring Best Practices

### 1. Regular Health Checks

```bash
# Run every 5 minutes via cron or monitoring service
*/5 * * * * curl https://your-domain.com/api/monitoring/health

# Alert if status != 'healthy'
```

### 2. Daily Analytics Review

```bash
# Run daily at 9 AM
0 9 * * * curl https://your-domain.com/api/monitoring/analytics?timeWindow=day > /var/log/routing-analytics.log
```

### 3. Market Data Freshness

```bash
# Sync markets daily at 2 AM
0 2 * * * cd /app && npx tsx scripts/sync-hyperliquid-markets.ts
0 2 * * * cd /app && npx tsx scripts/sync-ostium-markets.ts
```

### 4. Database Maintenance

```bash
# Vacuum and analyze weekly
0 3 * * 0 psql $DATABASE_URL -c "VACUUM ANALYZE venue_routing_history;"
0 3 * * 0 psql $DATABASE_URL -c "VACUUM ANALYZE positions;"
```

### 5. Log Rotation

```bash
# Rotate logs weekly
0 0 * * 0 find /app/logs -name "*.log" -mtime +7 -delete
```

---

## 📈 Performance Benchmarks

### Expected Performance

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Routing time | < 100ms | > 200ms |
| Position monitor latency | < 30s | > 60s |
| Database response time | < 50ms | > 100ms |
| Signal execution rate | > 95% | < 80% |
| System uptime | > 99.9% | < 99% |

### Scaling Guidelines

- **< 100 agents:** Single instance, no optimization needed
- **100-1000 agents:** Consider read replicas for database
- **1000+ agents:** Implement caching layer for routing config
- **10000+ agents:** Horizontal scaling with load balancer

---

## 🔍 Debugging Guide

### Issue: Routing is slow (> 200ms)

**Check:**
1. Database indexes:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename IN ('venue_markets', 'venue_routing_config');
   ```

2. Query venue_markets directly:
   ```sql
   EXPLAIN ANALYZE 
   SELECT * FROM venue_markets 
   WHERE venue = 'HYPERLIQUID' AND token_symbol = 'BTC';
   ```

3. Check database connection pool:
   ```bash
   psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
   ```

**Fix:**
- Ensure indexes exist
- Increase connection pool size
- Consider caching routing config

### Issue: High routing failure rate

**Check:**
1. Venue market data:
   ```sql
   SELECT venue, COUNT(*), MAX(last_synced)
   FROM venue_markets
   GROUP BY venue;
   ```

2. Recent routing errors:
   ```sql
   SELECT * FROM signals 
   WHERE venue = 'MULTI' 
     AND skipped_reason LIKE '%No venue available%'
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

**Fix:**
- Sync markets: `npx tsx scripts/sync-hyperliquid-markets.ts`
- Check venue API availability
- Review token list

### Issue: Metrics not updating

**Check:**
1. Position closure:
   ```sql
   SELECT COUNT(*) FROM positions 
   WHERE closed_at IS NOT NULL 
     AND closed_at > NOW() - INTERVAL '1 hour';
   ```

2. Metrics updater logs:
   ```bash
   grep "MetricsUpdater" logs/combined-services.log | tail -20
   ```

**Fix:**
- Verify position monitor is running
- Check if positions are closing properly
- Manually trigger: `POST /api/admin/update-metrics?agentId=xxx`

---

## 📊 Monitoring Endpoints Summary

| Endpoint | Purpose | Frequency |
|----------|---------|-----------|
| `GET /api/monitoring/health` | System health check | Every 5 min |
| `GET /api/monitoring/analytics` | Routing analytics | Every hour |
| `GET /api/monitoring/dashboard` | Full dashboard data | On demand |
| `GET /api/venue-routing/stats` | Venue routing stats | On demand |
| `GET /api/venue-routing/config` | Routing configuration | On demand |

---

## 🚀 Production Monitoring Stack

### Recommended Tools

1. **Uptime Monitoring:** UptimeRobot, Pingdom
   - Monitor `/api/monitoring/health`
   - Alert on status code != 200

2. **APM:** New Relic, DataDog, Sentry
   - Track API response times
   - Monitor database queries
   - Error tracking

3. **Logging:** Papertrail, Loggly, CloudWatch
   - Centralized log aggregation
   - Search and filtering
   - Alerts on error patterns

4. **Metrics:** Prometheus + Grafana
   - Custom metrics dashboard
   - Historical trend analysis
   - Alerting rules

### Example Grafana Dashboard

```yaml
Dashboard Panels:
  - System Health Gauge (green/yellow/red)
  - Routing Time Graph (last 24h)
  - Venue Distribution Pie Chart
  - Position Count by Venue (stacked bar)
  - APR Trends (line graph)
  - Error Rate (percentage over time)
```

---

## ✅ Monitoring Checklist

### Daily
- [ ] Check system health status
- [ ] Review routing analytics
- [ ] Verify position monitoring is active
- [ ] Check for any critical errors

### Weekly
- [ ] Review agent APR metrics
- [ ] Analyze venue distribution trends
- [ ] Check market data freshness
- [ ] Review database performance

### Monthly
- [ ] Performance benchmark review
- [ ] Capacity planning assessment
- [ ] Update alerting thresholds
- [ ] Review and optimize queries

---

## 📚 Related Documentation

- [Agent Where Routing](AGENT_WHERE_ROUTING.md) - Venue routing system
- [Agent Framework Architecture](AGENT_FRAMEWORK_ARCHITECTURE.md) - Three-layer framework
- [Venue Markets DB System](VENUE_MARKETS_DB_SYSTEM.md) - Market data management
- [APR Calculation Standards](APR_CALCULATION_STANDARDS.md) - Metrics calculation

---

**Last Updated:** 2025-11-13  
**Status:** ✅ Production Ready  
**Branch:** `agent-where-venue-routing`

