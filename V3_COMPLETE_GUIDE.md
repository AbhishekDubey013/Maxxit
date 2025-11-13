# V3 Complete Guide - Separate System with Agent Where

## 🎯 Executive Summary

**V3 is a completely independent system** from V2, with its own tables, API endpoints, and intelligent venue routing. There is **zero overlap** with your existing V2 agents and data.

### Key Differences: V2 vs V3

| Feature | V2 (Existing) | V3 (New) |
|---------|---------------|----------|
| **Database** | `agents`, `signals`, `positions` | `agents_v3`, `signals_v3`, `positions_v3` |
| **Current Data** | 10 agents, 628 signals, 181 positions | 0 (fresh start) |
| **Venue Model** | Fixed at agent creation | Dynamic per trade |
| **Agent What** | Mixed with venue | Pure signal (venue-agnostic) |
| **Agent Where** | N/A | Intelligent routing |
| **Market Coverage** | Single venue | Multi-venue (220 HL + 41 Ostium pairs) |

---

## 📊 Architecture: Three-Layer Framework

### 1. Agent What (Signal & Alpha Layer)
**Purpose**: Generate venue-agnostic trading signals

```
Input:  X posts + Research signals + Market data
↓
Process: Weighted scoring + Confidence analysis
↓
Output: { token, side, size%, confidence }
        (NO venue specified!)
```

**Implementation**: `lib/v3/signal-generator-v3.ts`

**Example Output**:
```json
{
  "token_symbol": "ETH",
  "side": "LONG",
  "size_model": { "type": "percentage", "value": 25 },
  "risk_model": { "type": "trailing-stop", "stop": 0.03 },
  "confidence": 0.85,
  "requested_venue": "MULTI"
}
```

### 2. Agent How (Policy Layer)
**Purpose**: Apply user-specific policies and personalization

**Current Status**: ✅ Infrastructure in place, pass-through mode

**Future**:
- User risk preferences
- Position sizing adjustments
- Timing preferences
- Venue bias

**Implementation**: Ready for future enhancement

### 3. Agent Where (Execution & Routing Layer)
**Purpose**: Select optimal venue and execute trade

```
Input:  Signal with venue='MULTI'
↓
Check: Hyperliquid availability
↓
If available → Execute on Hyperliquid
If not available → Check Ostium
↓
If available → Execute on Ostium
If not available → Skip trade
↓
Log:   venue_routing_history_v3
```

**Implementation**: `lib/v3/venue-router.ts`

**Routing Priority**: 
1. HYPERLIQUID (220 pairs)
2. OSTIUM (41 pairs)

---

## 🗄️ Database Schema (V3)

### Core Tables

#### `agents_v3`
```sql
CREATE TABLE agents_v3 (
  id UUID PRIMARY KEY,
  creator_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  venue venue_v3_t DEFAULT 'MULTI',  -- Always MULTI for V3
  status agent_status_t DEFAULT 'DRAFT',
  
  -- Agent What configuration
  x_account_ids TEXT[],              -- X accounts to follow
  research_institute_ids TEXT[],     -- Research sources
  weights JSONB,                     -- { x: 0.5, research: 0.5 }
  
  -- Performance
  apr_30d REAL,
  apr_90d REAL,
  sharpe_30d REAL,
  
  profit_receiver_address TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `signals_v3`
```sql
CREATE TABLE signals_v3 (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents_v3(id),
  
  -- Agent What outputs (venue-agnostic)
  token_symbol TEXT NOT NULL,
  side TEXT NOT NULL,                -- LONG | SHORT
  size_model JSONB NOT NULL,         -- { type: "percentage", value: 25 }
  risk_model JSONB NOT NULL,         -- { type: "trailing-stop", stop: 0.03 }
  confidence REAL,
  
  -- Venue routing
  requested_venue venue_v3_t DEFAULT 'MULTI',  -- Always MULTI
  final_venue venue_v3_t,                      -- Set by Agent Where
  
  -- Source tracking
  source_tweets TEXT[],
  source_research TEXT[],
  
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `positions_v3`
```sql
CREATE TABLE positions_v3 (
  id UUID PRIMARY KEY,
  deployment_id UUID NOT NULL REFERENCES agent_deployments_v3(id),
  signal_id UUID NOT NULL REFERENCES signals_v3(id),
  
  venue venue_v3_t NOT NULL,         -- Actual venue used
  
  token_symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  qty DECIMAL(20, 8) NOT NULL,
  entry_price DECIMAL(20, 8) NOT NULL,
  
  status TEXT DEFAULT 'OPEN',
  pnl DECIMAL(20, 8),
  
  opened_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `venue_routing_config_v3`
```sql
CREATE TABLE venue_routing_config_v3 (
  id UUID PRIMARY KEY,
  agent_id UUID UNIQUE REFERENCES agents_v3(id),  -- NULL = global
  
  venue_priority TEXT[],             -- ['HYPERLIQUID', 'OSTIUM']
  routing_strategy TEXT DEFAULT 'FIRST_AVAILABLE',
  failover_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `venue_routing_history_v3`
```sql
CREATE TABLE venue_routing_history_v3 (
  id UUID PRIMARY KEY,
  signal_id UUID UNIQUE NOT NULL REFERENCES signals_v3(id),
  
  token_symbol TEXT NOT NULL,
  requested_venue venue_v3_t NOT NULL,  -- MULTI
  selected_venue venue_v3_t NOT NULL,   -- HYPERLIQUID or OSTIUM
  routing_reason TEXT NOT NULL,
  
  checked_venues TEXT[],
  venue_availability JSONB,
  routing_duration_ms INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🌐 Frontend Pages

### Homepage (/)
**Status**: Shows V3 agents ONLY

The main homepage has been updated to display V3 agents exclusively:

```typescript
// pages/index.tsx
const data = await db.get('agents_v3', {  // V3 table
  'status': 'eq.ACTIVE',
  'order': 'created_at.desc',
  'limit': '20',
  'select': 'id,name,venue,apr30d,apr90d,aprSi,sharpe30d',
});
```

**Features**:
- ✨ V3 banner at top
- Purple/blue V3 branding
- "No V3 agents yet" empty state
- V2 agents completely hidden

### V3 Dedicated Page (/v3)
**Status**: Optional V3-specific interface

```bash
URL: /v3
```

A dedicated V3 page with:
- Multi-venue agent showcase
- V3 branding and messaging
- Intelligent routing highlights
- 261 trading pairs coverage info

---

## 🔌 API Endpoints

### Agent Management

#### Create V3 Agent
```bash
POST /api/v3/agents/create

Body:
{
  "creator_wallet": "0xYourWallet",
  "name": "Multi-Venue Alpha Agent",
  "x_account_ids": ["1234567890"],
  "research_institute_ids": ["inst_xyz"],
  "weights": { "x": 0.6, "research": 0.4 },
  "profit_receiver_address": "0xYourWallet"
}

Response:
{
  "success": true,
  "agent": {
    "id": "uuid",
    "name": "Multi-Venue Alpha Agent",
    "venue": "MULTI",
    "status": "DRAFT",
    ...
  }
}
```

#### List V3 Agents
```bash
GET /api/v3/agents/list
GET /api/v3/agents/list?creator_wallet=0x...
GET /api/v3/agents/list?status=ACTIVE

Response:
{
  "success": true,
  "agents": [...],
  "count": 5,
  "version": "V3"
}
```

#### Deploy V3 Agent
```bash
POST /api/v3/agents/deploy

Body:
{
  "agent_id": "uuid",
  "user_wallet": "0xYourWallet",
  "hyperliquid_agent_address": "0x...",
  "hyperliquid_agent_key_encrypted": "...",
  "hyperliquid_agent_key_iv": "...",
  "hyperliquid_agent_key_tag": "...",
  "ostium_agent_address": "0x...",
  "ostium_agent_key_encrypted": "...",
  "ostium_agent_key_iv": "...",
  "ostium_agent_key_tag": "..."
}

Response:
{
  "success": true,
  "deployment": { ... }
}
```

### Signal Generation

#### Generate V3 Signal
```bash
POST /api/v3/signals/generate

Body:
{
  "agent_id": "uuid",
  "token_symbol": "ETH",
  "side": "LONG",
  "size_model": { "type": "percentage", "value": 25 },
  "risk_model": { "type": "trailing-stop", "stop": 0.03 },
  "confidence": 0.85,
  "source_tweets": ["tweet_id"],
  "source_research": ["signal_id"]
}

Response:
{
  "success": true,
  "signal": {
    "id": "uuid",
    "requested_venue": "MULTI",  // Will be routed automatically
    "status": "PENDING",
    ...
  },
  "message": "Signal created with MULTI venue - will be automatically routed"
}
```

### Trade Execution

#### Execute Trade
```bash
POST /api/v3/execute/trade

Body:
{
  "signal_id": "uuid"
}

Response:
{
  "success": true,
  "message": "Trade executed successfully",
  "position": {
    "id": "uuid",
    "venue": "HYPERLIQUID",  // Automatically selected
    ...
  }
}
```

### Statistics & Monitoring

#### Get Overview
```bash
GET /api/v3/stats/overview

Response:
{
  "success": true,
  "version": "V3",
  "stats": {
    "agents": { "total": 5, "active": 3 },
    "signals": { "total": 120, "executed": 100 },
    "positions": { "total": 100, "open": 15 },
    "routing": {
      "total": 120,
      "hyperliquid": 95,
      "ostium": 25,
      "avg_duration_ms": 45
    }
  }
}
```

#### Get Routing History
```bash
GET /api/v3/stats/routing-history
GET /api/v3/stats/routing-history?token_symbol=ETH
GET /api/v3/stats/routing-history?selected_venue=HYPERLIQUID

Response:
{
  "success": true,
  "history": [
    {
      "signal_id": "uuid",
      "token_symbol": "ETH",
      "requested_venue": "MULTI",
      "selected_venue": "HYPERLIQUID",
      "routing_reason": "HYPERLIQUID: pair available",
      "routing_duration_ms": 42
    }
  ],
  "summary": {
    "total": 120,
    "hyperliquid": 95,
    "ostium": 25,
    "hyperliquid_pct": "79.2",
    "ostium_pct": "20.8"
  }
}
```

---

## 🚀 Quick Start

### 1. Setup Database (First Time Only)
```bash
npx tsx scripts/exec-v3-sql-fixed.ts
```

This creates all V3 tables in your database.

### 2. Verify V3 Setup
```bash
npx tsx scripts/verify-v3-system.ts
```

Expected output:
```
✅ All V3 tables exist
✅ venue_v3_t enum is correct
✅ Global routing config set
✅ V2 and V3 are separate
✅ Market data available (220 HL + 41 Ostium pairs)
```

### 3. Check All Tables Present
```bash
npx tsx scripts/check-all-v3-tables.ts
```

Comprehensive verification of all 6 V3 tables and structures.

### 2. Create Your First V3 Agent

```typescript
const response = await fetch('http://localhost:3000/api/v3/agents/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator_wallet: '0xYourWallet',
    name: 'Alpha Hunter V3',
    x_account_ids: ['123456789'],  // Follow @elonmusk, etc.
    research_institute_ids: [],
    weights: { x: 1.0, research: 0 },
    profit_receiver_address: '0xYourWallet',
  }),
});

const { agent } = await response.json();
console.log('Agent created:', agent.id);
```

### 3. Deploy Agent to Your Wallet

```typescript
const response = await fetch('http://localhost:3000/api/v3/agents/deploy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: agent.id,
    user_wallet: '0xYourWallet',
    hyperliquid_agent_address: '0xAgentWallet',
    hyperliquid_agent_key_encrypted: '...',
    hyperliquid_agent_key_iv: '...',
    hyperliquid_agent_key_tag: '...',
    // Ostium keys optional for now
  }),
});

const { deployment } = await response.json();
console.log('Deployed:', deployment.id);
```

### 4. Generate a Test Signal

```typescript
const response = await fetch('http://localhost:3000/api/v3/signals/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: agent.id,
    token_symbol: 'ETH',
    side: 'LONG',
    size_model: { type: 'percentage', value: 25 },
    risk_model: { type: 'trailing-stop', stop: 0.03 },
    confidence: 0.85,
  }),
});

const { signal } = await response.json();
console.log('Signal created:', signal.id);
console.log('Venue:', signal.requested_venue);  // "MULTI"
```

### 5. Execute Trade (Auto-Routing!)

```typescript
const response = await fetch('http://localhost:3000/api/v3/execute/trade', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    signal_id: signal.id,
  }),
});

const { position } = await response.json();
console.log('Executed on:', position.venue);  // "HYPERLIQUID" or "OSTIUM"
```

### 6. Check Routing History

```sql
SELECT 
  token_symbol,
  selected_venue,
  routing_reason,
  routing_duration_ms
FROM venue_routing_history_v3
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔄 Complete Trade Flow

```
1. Signal Generation (Agent What)
   📊 Worker monitors X posts & research
   🧠 AI analyzes context + market data
   📝 Generates: { ETH, LONG, 25%, confidence: 0.85 }
   💾 Saves to signals_v3 with venue='MULTI'
   
2. Policy Processing (Agent How)
   🔄 Currently: pass-through
   🔮 Future: apply user preferences
   
3. Venue Routing (Agent Where)
   🎯 Check Hyperliquid: ETH available? → YES
   ✅ Select Hyperliquid
   📝 Log to venue_routing_history_v3
   🔄 Update signal.final_venue = 'HYPERLIQUID'
   
4. Execution
   🚀 Execute on Hyperliquid
   💾 Create position_v3 record
   📊 Update metrics
```

---

## 🛠️ Workers

### V3 Signal Worker

**Purpose**: Monitors context and generates signals automatically

**Start**:
```bash
./scripts/start-v3-workers.sh
```

**Stop**:
```bash
./scripts/stop-v3-workers.sh
```

**Logs**:
```bash
tail -f logs/v3-signal-worker.log
```

**What it does**:
1. Checks all active V3 agents every 30 seconds
2. Fetches new X posts & research signals
3. Generates venue-agnostic signals
4. Executes trades with automatic routing
5. Logs all routing decisions

---

## 📈 Monitoring & Analytics

### Database Queries

#### Check V3 vs V2 Separation
```sql
-- V2 Data (unchanged)
SELECT COUNT(*) FROM agents;           -- Your 10 existing agents
SELECT COUNT(*) FROM signals;          -- Your 628 existing signals
SELECT COUNT(*) FROM positions;        -- Your 181 existing positions

-- V3 Data (new system)
SELECT COUNT(*) FROM agents_v3;        -- New V3 agents
SELECT COUNT(*) FROM signals_v3;       -- New V3 signals
SELECT COUNT(*) FROM positions_v3;     -- New V3 positions
```

#### Routing Efficiency
```sql
SELECT 
  selected_venue,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage,
  AVG(routing_duration_ms) as avg_duration_ms
FROM venue_routing_history_v3
GROUP BY selected_venue
ORDER BY count DESC;
```

Expected output:
```
selected_venue | count | percentage | avg_duration_ms
---------------|-------|------------|----------------
HYPERLIQUID    | 95    | 79.2       | 42
OSTIUM         | 25    | 20.8       | 38
```

#### Performance by Venue
```sql
SELECT 
  venue,
  COUNT(*) as total_positions,
  COUNT(*) FILTER (WHERE status = 'OPEN') as open,
  COUNT(*) FILTER (WHERE status = 'CLOSED') as closed,
  SUM(pnl) as total_pnl,
  AVG(pnl) as avg_pnl
FROM positions_v3
GROUP BY venue;
```

---

## 🔐 Security & Isolation

### Complete Separation from V2

✅ **Different Tables**: V2 uses `agents`, V3 uses `agents_v3`
✅ **Different APIs**: V2 uses `/api/agents/*`, V3 uses `/api/v3/*`
✅ **Different Workers**: V2 and V3 workers are separate
✅ **No Shared State**: Agent IDs are completely independent

### What's Shared (Read-Only)

These tables are used by both V2 and V3 for reference data:
- `venue_markets` - Market pair availability
- `ct_accounts` - X/Twitter account data
- `ct_posts` - Tweet data
- `research_institutes` - Research sources
- `research_signals` - Research data

**Note**: Both systems only read from these tables, they don't modify them.

---

## 🎯 Next Steps

### Immediate
1. ✅ V3 tables created
2. ✅ API endpoints ready
3. ✅ Routing logic implemented
4. ✅ Workers available
5. 🔲 Create your first V3 agent
6. 🔲 Test signal generation
7. 🔲 Monitor routing decisions

### Future Enhancements
- **Agent How**: Implement user personalization
- **Advanced Routing**: Add liquidity, fees, latency considerations
- **More Venues**: Add GMX, Pendle, other venues
- **Portfolio Management**: Cross-agent position tracking
- **Risk Management**: Global exposure limits

---

## 📝 Summary

**V3 is completely operational and separate from V2:**

| Component | Status |
|-----------|--------|
| Database Tables | ✅ Created (6 new tables) |
| API Endpoints | ✅ Ready (9 endpoints) |
| Venue Router | ✅ Implemented |
| Signal Generator | ✅ Implemented |
| Trade Executor | ✅ Implemented |
| Workers | ✅ Ready to start |
| Market Data | ✅ Available (261 pairs) |
| Documentation | ✅ Complete |

**Your V2 system remains completely untouched:**
- 10 agents still working
- 628 signals preserved
- 181 positions intact
- All V2 functionality unchanged

**Ready to use V3!** 🚀

