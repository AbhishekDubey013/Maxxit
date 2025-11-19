# APR Calculation Explained

## Question: "You are mapping it with agent id and signal id through it right?"

**Answer: APR is mapped to `agent_id`, NOT `signal_id`.**

APR is calculated and stored **per agent** in the `agents` table.

---

## 📊 How APR Works

### 1. **Storage Location**

APR metrics are stored in the `agents` table:

```sql
-- prisma/schema.prisma
model agents {
  id                        String   @id
  name                      String
  creator_wallet            String
  venue                     venue_t
  
  -- ✅ APR METRICS HERE (per agent)
  apr_30d                   Float?   -- 30-day annualized return
  apr_90d                   Float?   -- 90-day annualized return
  apr_si                    Float?   -- Since inception annualized return
  sharpe_30d                Float?   -- Risk-adjusted return
  
  agent_deployments         agent_deployments[]
  signals                   signals[]
  -- ...
}
```

**Key Point:**
- One APR value per agent (shared across all user deployments of that agent)
- NOT one APR per signal
- NOT one APR per deployment

---

### 2. **Data Flow**

```
1. Signal Created (signals table)
   ├─ agent_id: Links to which agent
   ├─ token_symbol: What to trade
   ├─ side: BUY/SELL
   └─ size_model: Position size (personalized via Agent HOW)
                 ↓
2. Position Opened (positions table)
   ├─ deployment_id: Which user's deployment
   ├─ signal_id: Which signal triggered it
   ├─ agent_id: (via deployment → agent link)
   ├─ entry_price: Entry price
   ├─ qty: Quantity
   └─ opened_at: Timestamp
                 ↓
3. Position Closed (positions table updated)
   ├─ exit_price: Exit price
   ├─ pnl: Profit/Loss calculated
   ├─ closed_at: Timestamp
   └─ realized: true
                 ↓
4. APR Updated (agents table updated)
   └─ Triggered automatically by position close
```

---

### 3. **APR Calculation Formula**

```typescript
// From lib/metrics-updater.ts

// Step 1: Get all closed positions for this agent (across all deployments)
const deployments = await prisma.agent_deployments.findMany({
  where: { agent_id: agentId },
  select: { id: true }
});

const positions = await prisma.positions.findMany({
  where: {
    deployment_id: { in: deploymentIds },
    closed_at: { not: null },  // Only closed positions
  },
  orderBy: { closed_at: 'desc' }
});

// Step 2: Filter by time period
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

const positions30d = positions.filter(p => p.closed_at >= thirtyDaysAgo);
const positions90d = positions.filter(p => p.closed_at >= ninetyDaysAgo);

// Step 3: Calculate total PnL
const totalPnl30d = positions30d.reduce((sum, p) => 
  sum + parseFloat(p.pnl), 0
);

// Step 4: Calculate capital deployed
const capitalDeployed30d = positions30d.reduce((sum, p) => {
  const entryPrice = parseFloat(p.entry_price);
  const qty = parseFloat(p.qty);
  return sum + (entryPrice * qty);  // Actual USD deployed
}, 0);

// Step 5: Calculate APR
const apr30d = capitalDeployed30d > 0
  ? (totalPnl30d / capitalDeployed30d) * (365 / 30) * 100
  : 0;

// Step 6: Update agent
await prisma.agents.update({
  where: { id: agentId },
  data: {
    apr_30d,
    apr_90d,
    apr_si,
    sharpe_30d,
  }
});
```

**Formula:**
```
APR = (Total PnL / Total Capital Deployed) × (365 / Days) × 100

Where:
- Total PnL = Sum of all position profits/losses
- Total Capital Deployed = Sum of (entry_price × qty) for each position
- Days = 30 for APR 30d, 90 for APR 90d, actual days for APR SI
```

---

### 4. **Example**

**Scenario:**
- Agent: "Whale Watcher"
- 3 positions closed in last 30 days:
  1. ETH: Entry $2000 × 1 ETH = $2000, Exit $2100, PnL = +$100
  2. BTC: Entry $40000 × 0.1 BTC = $4000, Exit $41000, PnL = +$100
  3. SOL: Entry $100 × 10 SOL = $1000, Exit $90, PnL = -$100

**Calculation:**
```
Total PnL = $100 + $100 - $100 = $100
Capital Deployed = $2000 + $4000 + $1000 = $7000
APR 30d = ($100 / $7000) × (365 / 30) × 100
        = 0.0143 × 12.17 × 100
        = 17.4%
```

---

### 5. **When APR Updates**

APR is automatically recalculated when:

1. **Position Closes** → `lib/trade-executor.ts` calls `updateMetricsForDeployment()`
2. **Metrics Worker Runs** → `services/metrics-updater-worker` runs every 6 hours
3. **Manual Admin Trigger** → `/api/admin/update-metrics` endpoint

**Code Location:**
```typescript
// lib/metrics-updater.ts
export async function updateAgentMetrics(agentId: string) {
  // ... calculation ...
}

// Called from:
// - lib/trade-executor.ts (on position close)
// - services/metrics-updater-worker/src/worker.ts (periodic)
// - pages/api/admin/update-metrics.ts (manual)
```

---

### 6. **Multi-Venue Support**

APR calculation **includes all venues** (Hyperliquid + Ostium):

```typescript
// All positions for this agent, regardless of venue
const positions = await prisma.positions.findMany({
  where: {
    deployment_id: { in: deploymentIds },
    closed_at: { not: null },
  }
});

// Each position has 'venue' field ('HYPERLIQUID' or 'OSTIUM')
// APR aggregates across all venues
```

**Result:**
- If agent trades on Hyperliquid: APR from Hyperliquid positions
- If agent trades on Ostium: APR from Ostium positions
- If agent trades on BOTH: APR from combined positions

---

### 7. **Relationship to Signals**

**Signals → Positions → APR**

```
signals table:
├─ id: signal_123
├─ agent_id: agent_abc  ← Links signal to agent
├─ token_symbol: "ETH"
└─ side: "BUY"
          ↓
positions table:
├─ id: position_456
├─ signal_id: signal_123  ← Links back to signal
├─ deployment_id: deployment_xyz
├─ pnl: $100
└─ closed_at: 2024-01-15
          ↓
agents table (APR updated):
├─ id: agent_abc
└─ apr_30d: 17.4%  ← Calculated from ALL positions for this agent
```

**Summary:**
- ✅ `signal_id` links signal → position
- ✅ `agent_id` links position → agent
- ✅ APR is stored in `agents` table
- ❌ APR is NOT stored per signal
- ❌ APR is NOT stored per deployment

---

## ✅ Answer Summary

**Q: "You are mapping it with agent id and signal id through it right?"**

**A:**
- APR is mapped to **`agent_id`** only (stored in `agents` table)
- `signal_id` is used to link **signals → positions** (for tracking)
- APR calculation pulls **all positions** for an agent (via `deployment_id` → `agent_id`)
- Each position has a `signal_id` to show which signal triggered it
- But APR is aggregated across **all positions**, not per signal

**Data Model:**
```
agents (1) ──→ (many) agent_deployments
agents (1) ──→ (many) signals
agent_deployments (1) ──→ (many) positions
signals (1) ──→ (many) positions

APR = f(all positions for agent)
```

---

## 🔍 Verifying APR

**Check agent APR:**
```typescript
const agent = await prisma.agents.findUnique({
  where: { id: 'agent_id' },
  select: {
    name: true,
    apr_30d: true,
    apr_90d: true,
    apr_si: true,
    sharpe_30d: true,
  }
});

console.log(agent);
// {
//   name: "Whale Watcher",
//   apr_30d: 17.4,
//   apr_90d: 15.2,
//   apr_si: 22.1,
//   sharpe_30d: 1.8
// }
```

**Check positions that contribute to APR:**
```typescript
const deployments = await prisma.agent_deployments.findMany({
  where: { agent_id: 'agent_id' },
  select: { id: true }
});

const positions = await prisma.positions.findMany({
  where: {
    deployment_id: { in: deployments.map(d => d.id) },
    closed_at: { not: null },
  },
  include: {
    signal: {  // ← signal_id link
      select: {
        token_symbol: true,
        side: true,
      }
    }
  }
});

console.log(positions);
// [
//   { pnl: 100, signal: { token_symbol: "ETH", side: "BUY" } },
//   { pnl: 100, signal: { token_symbol: "BTC", side: "BUY" } },
//   { pnl: -100, signal: { token_symbol: "SOL", side: "SELL" } },
// ]
```

---

## 📚 Related Files

- **Schema:** `prisma/schema.prisma` (agents table)
- **Calculation:** `lib/metrics-updater.ts`
- **Worker:** `services/metrics-updater-worker/src/worker.ts`
- **Execution:** `lib/trade-executor.ts` (calls updateMetricsForDeployment)
- **API:** `pages/api/admin/update-metrics.ts`
- **Docs:** `docs/APR_CALCULATION_STANDARDS.md`, `docs/OSTIUM_APR_METRICS.md`

