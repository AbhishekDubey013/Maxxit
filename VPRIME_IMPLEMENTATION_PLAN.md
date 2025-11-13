# Vprime Implementation Plan
## Intelligent Venue Routing with V2 Tables

---

## 🎯 Goal
Add Agent Where intelligent routing to existing V2 system without new tables.

---

## 🏗️ Three-Layer Framework

### 1. Agent What (Signal & Alpha Layer)
**Status**: ✅ Already exists in V2  
**Purpose**: Generate venue-agnostic signals  
**Output**: `{ token: 'ETH', side: 'LONG', size: '25%', confidence: 0.85 }`  
**No changes needed** - current signal generator already works

### 2. Agent How (Policy Layer)
**Status**: 🔄 Pass-through (future enhancement)  
**Purpose**: User policies, risk preferences  
**Current**: Just passes signals through  
**Future**: Custom stop-loss, position sizing, etc.

### 3. Agent Where (Execution & Routing)
**Status**: 🆕 **NEW** - This is what we're building!  
**Purpose**: Route signals to best available venue  
**Priority**: Hyperliquid → Ostium → GMX → SPOT

---

## 📋 Changes Required

### Change 1: Agent Creation (Venue-Agnostic)
**Current**: User must select venue during creation  
**New**: No venue selection OR default to "MULTI"

**Files to modify**:
- `pages/create-agent.tsx` - Remove/update venue selector
- `pages/api/agents/create.ts` - Accept null venue or "MULTI"
- Database: Use existing `agents.venue` field, just change UX

### Change 2: Agent Deployment (Venue Selection)
**Current**: Deployment inherits agent's single venue  
**New**: User selects which venues to enable

**UI Changes**:
```typescript
// Multi-venue selector during deployment
☑️ Hyperliquid (220 pairs)
☑️ Ostium (41 pairs)
☐ GMX
☐ SPOT
```

**Database Changes**:
```sql
-- Add new field to agent_deployments table
ALTER TABLE agent_deployments 
ADD COLUMN enabled_venues TEXT[] DEFAULT ARRAY['HYPERLIQUID'];
```

**Files to modify**:
- `pages/api/agents/deploy.ts` - Accept `enabled_venues` array
- Deployment UI components - Add venue checkboxes

### Change 3: Trade Execution (Intelligent Routing)
**Current**: Execute on agent's single venue  
**New**: Check enabled venues in priority order

**Routing Logic**:
```typescript
async function routeSignal(signal, deployment) {
  const enabledVenues = deployment.enabled_venues; // ['HYPERLIQUID', 'OSTIUM']
  const token = signal.token_symbol;
  
  // Try venues in priority order
  for (const venue of enabledVenues) {
    if (venue === 'HYPERLIQUID') {
      const available = await checkHyperliquidMarket(token);
      if (available) return { venue: 'HYPERLIQUID', reason: 'Available, 220 pairs' };
    }
    if (venue === 'OSTIUM') {
      const available = await checkOstiumMarket(token);
      if (available) return { venue: 'OSTIUM', reason: 'Hyperliquid unavailable' };
    }
    // ... GMX, SPOT
  }
  
  return { venue: null, reason: 'No venue has this pair' };
}
```

**Files to modify**:
- `lib/trade-executor.ts` - Add routing logic
- `workers/trade-executor-worker.ts` - Use new routing

### Change 4: Routing History (Optional but Recommended)
**Purpose**: Track routing decisions for transparency

**New Table** (minimal):
```sql
CREATE TABLE agent_routing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES signals(id),
  requested_venues TEXT[],          -- ['HYPERLIQUID', 'OSTIUM']
  selected_venue venue_t,           -- 'HYPERLIQUID'
  routing_reason TEXT,              -- 'Available on Hyperliquid (220 pairs)'
  checked_venues TEXT[],            -- ['HYPERLIQUID']
  routing_duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Alternative**: Add to existing `signals` table:
```sql
ALTER TABLE signals
ADD COLUMN routing_history JSONB;

-- Example:
{
  "requested_venues": ["HYPERLIQUID", "OSTIUM"],
  "selected_venue": "HYPERLIQUID",
  "reason": "BTC-USD available (220 pairs)",
  "checked": ["HYPERLIQUID"],
  "duration_ms": 145
}
```

---

## 🔄 Complete Flow

### Agent Creation (Venue-Agnostic)
```
User creates agent → 
  Selects X accounts + Research sources → 
  No venue selection needed → 
  Agent saved with venue = 'MULTI' or NULL
```

### Agent Deployment (Venue Selection)
```
User deploys agent → 
  ☑️ Select venues to enable:
    ☑️ Hyperliquid
    ☑️ Ostium
    ☐ GMX
    ☐ SPOT
  → Deploy with enabled_venues = ['HYPERLIQUID', 'OSTIUM']
```

### Signal Generation (No Change)
```
Worker generates signal →
  { token: 'ETH', side: 'LONG', size: '25%' } →
  No venue specified →
  Signal stored as PENDING
```

### Trade Execution (Agent Where!)
```
Worker reads PENDING signal →
  Get deployment.enabled_venues = ['HYPERLIQUID', 'OSTIUM'] →
  
  Check Hyperliquid:
    GET /api/markets → "ETH available" ✅
  
  Selected venue: HYPERLIQUID
  Routing reason: "ETH-USD available on Hyperliquid (220 pairs)"
  
  Execute trade on Hyperliquid →
  Update signal: venue = 'HYPERLIQUID', routing_history = {...}
```

---

## 📊 Database Schema Changes (Minimal!)

### Option A: Use Existing Tables (Simplest)
```sql
-- 1. Add enabled_venues to deployments
ALTER TABLE agent_deployments 
ADD COLUMN enabled_venues TEXT[] DEFAULT ARRAY['HYPERLIQUID'];

-- 2. Add routing_history to signals (JSONB)
ALTER TABLE signals
ADD COLUMN routing_history JSONB;

-- That's it! No new tables needed.
```

### Option B: Add Routing History Table (Better Transparency)
```sql
-- All changes from Option A +

CREATE TABLE agent_routing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES signals(id) ON DELETE CASCADE,
  requested_venues TEXT[],
  selected_venue venue_t,
  routing_reason TEXT,
  checked_venues TEXT[],
  routing_duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routing_history_signal ON agent_routing_history(signal_id);
CREATE INDEX idx_routing_history_venue ON agent_routing_history(selected_venue);
```

---

## 🎨 UI/UX Changes

### Agent Creation Page
**Before**:
```
Agent Name: [________]
Venue: [Dropdown: HYPERLIQUID | OSTIUM | GMX | SPOT]
```

**After**:
```
Agent Name: [________]
Venue: Multi-Venue (Auto-routing) ✨
(You'll select venues during deployment)
```

### Deployment Page
**New Section**:
```
┌─────────────────────────────────────────────────┐
│  Select Trading Venues                          │
├─────────────────────────────────────────────────┤
│  ☑️ Hyperliquid (220 pairs, low fees)          │
│  ☑️ Ostium (41 pairs, synthetics)              │
│  ☐ GMX (perpetuals)                             │
│  ☐ SPOT (Uniswap/DEX)                          │
│                                                  │
│  Agent will try venues in this order            │
└─────────────────────────────────────────────────┘
```

### Agent Card (Display)
**New Badge**:
```
Agent Name: "CT Alpha Pro"
Venue: 🌐 Multi-Venue (Hyperliquid + Ostium)
APR: +45.2%
```

### Stats/Dashboard
**New Section**: "Venue Breakdown"
```
Trades by Venue:
- Hyperliquid: 78% (142 trades)
- Ostium: 22% (40 trades)

Most Common Route:
- ETH → Hyperliquid (100% available)
- LINK → Ostium (fallback, 60% of time)
```

---

## 🚀 Implementation Steps

### Phase 1: Database (5 mins)
1. Add `enabled_venues` to `agent_deployments`
2. Add `routing_history` to `signals` (JSONB)
3. Optional: Create `agent_routing_history` table

### Phase 2: Backend (30 mins)
1. Update agent creation API - accept venue-agnostic
2. Update deployment API - accept `enabled_venues` array
3. Create `lib/venue-router.ts` - routing logic
4. Update `lib/trade-executor.ts` - integrate routing

### Phase 3: Frontend (30 mins)
1. Update create-agent page - remove/hide venue selector
2. Update deployment page - add venue checkboxes
3. Update agent card - show multi-venue badge
4. Update dashboard - show venue breakdown stats

### Phase 4: Testing (15 mins)
1. Create multi-venue agent
2. Deploy with Hyperliquid + Ostium
3. Generate signal for available token (ETH)
4. Verify routes to Hyperliquid
5. Generate signal for Ostium-only token
6. Verify routes to Ostium

---

## ✅ Success Criteria

1. ✅ User can create agent without selecting venue
2. ✅ User can select multiple venues during deployment
3. ✅ Signals are venue-agnostic (no venue in signal)
4. ✅ Trade executor routes to best available venue
5. ✅ Routing decisions are logged and transparent
6. ✅ Agent card shows "Multi-Venue" badge
7. ✅ Dashboard shows venue breakdown stats
8. ✅ V2 tables remain unchanged (just added fields)
9. ✅ Existing single-venue agents still work

---

## 🎯 Benefits

- ✅ **Maximum Market Coverage**: 220 + 41 = 261 trading pairs
- ✅ **Automatic Failover**: If Hyperliquid down, use Ostium
- ✅ **User Choice**: Users decide which venues to enable
- ✅ **Transparency**: Full routing history logged
- ✅ **Backward Compatible**: Old agents still work
- ✅ **No New Tables**: Uses existing V2 schema
- ✅ **Simple Implementation**: Minimal code changes

---

## 📝 Next Steps

1. Run database migration (add 2 fields)
2. Implement venue router service
3. Update agent creation & deployment APIs
4. Update frontend components
5. Test end-to-end flow
6. Deploy to production

---

**Estimated Total Time**: 90 minutes  
**Database Changes**: 2 new fields + 1 optional table  
**Breaking Changes**: None (fully backward compatible)

🚀 Let's build Vprime!

