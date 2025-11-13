# V2 vs V3 Table Comparison

## 📊 Complete Table Mapping

### ✅ V2 Core Tables with V3 Equivalents

| V2 Table | V3 Equivalent | Status | Notes |
|----------|---------------|--------|-------|
| `agents` | `agents_v3` | ✅ Created | Agent configuration |
| `agent_deployments` | `agent_deployments_v3` | ✅ Created | User deployments |
| `signals` | `signals_v3` | ✅ Created | Trading signals |
| `positions` | `positions_v3` | ✅ Created | Trading positions |
| `venue_routing_config` | `venue_routing_config_v3` | ✅ Created | Routing preferences |
| `venue_routing_history` | `venue_routing_history_v3` | ✅ Created | Routing decisions |

---

### ❌ Missing V3 Tables (CRITICAL!)

| V2 Table | V3 Equivalent | Status | Why We Need It |
|----------|---------------|--------|----------------|
| `billing_events` | `billing_events_v3` | ❌ **MISSING** | **CRITICAL**: Profit sharing, subscription billing |
| `pnl_snapshots` | `pnl_snapshots_v3` | ❌ **MISSING** | **CRITICAL**: Daily PnL tracking, APR calculation |
| `audit_logs` | `audit_logs_v3` | ⚠️ Optional | Audit trail, compliance, debugging |

---

### ✅ Shared Tables (Used by Both V2 and V3)

These tables are shared between V2 and V3 - they don't need V3 versions:

| Table | Purpose | Used By |
|-------|---------|---------|
| `ct_accounts` | CT account metadata | Both V2 & V3 |
| `ct_posts` | Classified tweets | Both V2 & V3 |
| `impact_factor_history` | CT account performance | Both V2 & V3 |
| `market_indicators_6h` | Market data cache | Both V2 & V3 |
| `token_registry` | Token metadata | Both V2 & V3 |
| `venues_status` | Venue health checks | Both V2 & V3 |
| `venue_markets` | Available trading pairs | Both V2 & V3 |
| `research_institutes` | Research institutes | Both V2 & V3 |
| `research_signals` | Research-based signals | Both V2 & V3 |
| `agent_research_institutes` | Agent-research links | Both V2 & V3 |
| `user_hyperliquid_wallets` | User wallets | Both V2 & V3 |
| `wallet_pool` | Wallet pool | Both V2 & V3 |

---

### 🔴 V2-Only Tables (Not Needed in V3)

These tables are specific to V2 features:

| Table | Purpose | Notes |
|-------|---------|-------|
| `telegram_trades` | Telegram bot trades | V2 feature only |
| `telegram_users` | Telegram users | V2 feature only |
| `agent_accounts` | Agent-CT account links | V3 uses arrays in `agents_v3.x_account_ids` |
| `agent_research_institutes` | Agent-research links | V3 uses arrays in `agents_v3.research_institute_ids` |

---

## 🚨 Critical Missing Tables

We **MUST** add these 2 tables for V3 to work properly:

### 1. **billing_events_v3** ⚡ CRITICAL

**Why**: Without this, we can't:
- Charge subscription fees
- Collect profit sharing (20% of profits)
- Track billing history
- Handle trial periods

**V2 Schema**:
```sql
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES positions(id),
  deployment_id UUID NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
  kind bill_kind_t,  -- 'SUBSCRIPTION' | 'PROFIT_SHARE'
  amount DECIMAL(20, 8),
  asset TEXT DEFAULT 'USDC',
  status bill_status_t,  -- 'PENDING' | 'COLLECTED' | 'FAILED'
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

**V3 Version Needed**:
```sql
CREATE TABLE billing_events_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID REFERENCES positions_v3(id),
  deployment_id UUID NOT NULL REFERENCES agent_deployments_v3(id) ON DELETE CASCADE,
  kind bill_kind_t,
  amount DECIMAL(20, 8),
  asset TEXT DEFAULT 'USDC',
  status bill_status_t,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  
  -- Indexes
  INDEX idx_billing_v3_deployment (deployment_id, occurred_at),
  INDEX idx_billing_v3_kind (kind, occurred_at)
);
```

---

### 2. **pnl_snapshots_v3** ⚡ CRITICAL

**Why**: Without this, we can't:
- Calculate APR accurately
- Show daily PnL charts
- Track performance over time
- Display performance history in UI

**V2 Schema**:
```sql
CREATE TABLE pnl_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  deployment_id UUID NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  pnl DECIMAL(20, 8),
  return_pct REAL,
  
  UNIQUE (deployment_id, day)
);
```

**V3 Version Needed**:
```sql
CREATE TABLE pnl_snapshots_v3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents_v3(id) ON DELETE CASCADE,
  deployment_id UUID NOT NULL REFERENCES agent_deployments_v3(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  pnl DECIMAL(20, 8),
  return_pct REAL,
  
  UNIQUE (deployment_id, day),
  
  -- Indexes
  INDEX idx_pnl_v3_agent (agent_id, day),
  INDEX idx_pnl_v3_deployment (deployment_id, day)
);
```

---

### 3. **audit_logs_v3** (Optional but Recommended)

**Why**: For debugging, compliance, and transparency:
- Track all V3 agent actions
- Debugging routing decisions
- Compliance audits
- User activity tracking

**V2 Schema**:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  subject_type TEXT,
  subject_id UUID,
  payload JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  trace_id TEXT,
  
  INDEX idx_audit_event (event_name, occurred_at)
);
```

**V3 Version** (Can share with V2 - it's generic):
- We can actually use the same `audit_logs` table for both V2 and V3
- Just use different `event_name` prefixes: `v2.agent.created` vs `v3.agent.created`

---

## 📋 Summary

### Current Status:
- ✅ **6 tables created** (core functionality)
- ❌ **2 tables missing** (critical for production)
- ⚠️ **1 table optional** (nice to have)

### What We Need to Add:
1. `billing_events_v3` - **MUST HAVE** for profit sharing
2. `pnl_snapshots_v3` - **MUST HAVE** for APR/performance tracking
3. Consider using shared `audit_logs` for both V2 and V3

### Shared Resources (No V3 Version Needed):
- ✅ CT accounts, posts, impact factor
- ✅ Market data, token registry
- ✅ Venue status, markets
- ✅ Research institutes, signals
- ✅ User wallets, wallet pool

---

## 🚀 Next Steps

Run the updated deployment script to add missing tables:
```bash
npx tsx scripts/deploy-v3-complete.ts
```

This will create:
1. ✅ All existing V3 tables (already done)
2. ✅ `billing_events_v3` (NEW)
3. ✅ `pnl_snapshots_v3` (NEW)
4. ✅ All necessary indexes

Total V3 tables after fix: **8 tables**

