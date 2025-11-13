# Maxxit Agent Framework - Complete Architecture

## 🎯 Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT WHAT (Signal Layer)                     │
│                                                                   │
│  Purpose: Generate trading signals (venue-agnostic)              │
│                                                                   │
│  Input:                                                           │
│    • X accounts (verified CT traders)                            │
│    • Research institutes (alpha providers)                       │
│    • On-chain feeds                                              │
│    • Market context (24h metrics)                                │
│                                                                   │
│  Processing:                                                      │
│    • EigenAI scoring → {is_signal, token, confidence}            │
│    • Contextualization with market metrics                       │
│    • Exponential normalization → Rate (0-10)                     │
│                                                                   │
│  Output (Venue-Agnostic):                                        │
│    ✅ token: "BTC"                                               │
│    ✅ side: "LONG" | "SHORT"                                     │
│    ✅ fund_percentage: 25  // % of available capital             │
│    ✅ confidence: 0.85                                            │
│    ✅ risk_model: { type, params }                               │
│    ❌ venue: NOT SPECIFIED (decided by Agent Where)              │
│                                                                   │
│  Accountability:                                                  │
│    • PoEX attestation (tweet → signal)                           │
│    • Impact Factor tracking (for X sources)                      │
│    • Agent APR shown in marketplace                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   AGENT HOW (Policy Layer)                       │
│                                                                   │
│  Purpose: Personalization & policy (FUTURE - placeholder now)   │
│                                                                   │
│  Planned Features:                                               │
│    • Wallet-style learning (opt-in)                              │
│      → Read user's historical trades                             │
│      → Derive User Style Vector (risk, sizing, timing)           │
│                                                                   │
│    • Policy Application:                                         │
│      → Combine (signal context + style vector)                   │
│      → Decide: trade/skip, adjust size %, modify TP/SL           │
│                                                                   │
│    • Safety Rails:                                               │
│      → Risk caps, max leverage, slippage/funding veto            │
│      → Circuit breakers                                          │
│                                                                   │
│    • Privacy:                                                    │
│      → Publish coarse parameters via EAS                         │
│      → Raw history stays off-chain                               │
│      → Revocable/upgradeable                                     │
│                                                                   │
│  Current Status: 🚧 INFRASTRUCTURE PLACEHOLDER                   │
│    • Database schema ready                                       │
│    • Flow integration points defined                             │
│    • Awaiting implementation                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              AGENT WHERE (Execution & Venue Layer) ✅            │
│                                                                   │
│  Purpose: Venue selection & trade execution                      │
│                                                                   │
│  Input:                                                           │
│    • Token symbol (from Agent What)                              │
│    • Fund percentage (from Agent What)                           │
│    • Side & risk model (from Agent What)                         │
│                                                                   │
│  Venue Selection:                                                │
│    1. Query venue_markets database                               │
│    2. Check Hyperliquid: Token available?                        │
│       → YES: Select Hyperliquid ✅                               │
│       → NO: Continue to step 3                                   │
│    3. Check Ostium: Token available?                             │
│       → YES: Select Ostium ✅                                    │
│       → NO: Skip trade (log reason)                              │
│                                                                   │
│  Execution:                                                       │
│    • Route to selected venue adapter                             │
│    • Execute trade with venue-specific logic                     │
│    • Non-custodial: Funds stay in user wallet                   │
│    • Gasless relays (where possible)                             │
│                                                                   │
│  Audit:                                                          │
│    • Log routing decision (venue_routing_history)                │
│    • PoEX/EAS attestation                                        │
│    • Complete transaction trail                                  │
│                                                                   │
│  Supported Venues:                                               │
│    ✅ Hyperliquid (220+ perp markets)                            │
│    ✅ Ostium (8 synthetic markets)                               │
│    🔜 GMX (V2 perpetuals)                                        │
│    🔜 Spot (Arbitrum DEX routing)                                │
│    🔜 Future venues...                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Example

### Scenario: BTC Long Signal from CT Account

```
[AGENT WHAT]
  Input:
    • Tweet: "@trader: BTC looking bullish, targeting $50k"
    • Tweet confidence: 0.85
    • CT account impact factor: 0.72
    • Market metrics: RSI=45, MACD=positive, 24h vol=$25B
  
  Processing:
    • LLM classifier: is_signal=true, sentiment=bullish
    • Contextualization: Strong volume, neutral RSI → good entry
    • Rate calculation: 7.5/10
    • Position sizing: Exponential normalization → 25% of fund
  
  Output:
    {
      token: "BTC",
      side: "LONG",
      fund_percentage: 25,
      confidence: 0.85,
      risk_model: {
        type: "trailing-stop",
        stop_loss_pct: 0.03,
        take_profit_pct: 0.10
      },
      source_tweets: ["tweet_id_123"],
      reasoning: "Bullish CT signal + strong volume + room to run"
    }
    
    ⚠️ NO VENUE SPECIFIED - venue agnostic!

---

[AGENT HOW] - Currently passes through unchanged
  
  Future:
    • Check user style: "prefers conservative sizing"
    • Adjust: fund_percentage: 25% → 15%
    • Apply risk caps: leverage ≤ 3x
  
  Current:
    • Pass through to Agent Where

---

[AGENT WHERE]
  Input:
    • token: "BTC"
    • fund_percentage: 25
    • side: "LONG"
  
  Venue Selection:
    1. Load routing config: ["HYPERLIQUID", "OSTIUM"]
    2. Check HYPERLIQUID:
       → Query: SELECT * FROM venue_markets 
                WHERE venue='HYPERLIQUID' AND token_symbol='BTC'
       → Result: ✅ Market found (Index: 0, BTC/USD)
       → Decision: SELECT HYPERLIQUID
    3. (Skip Ostium check - already found)
  
  Execution:
    • Venue: HYPERLIQUID
    • Calculate position size: 25% of $10,000 = $2,500
    • Leverage: 5x (from risk model)
    • Execute: Open BTC LONG, $2,500 collateral, 5x leverage
  
  Audit:
    • Log to venue_routing_history:
      {
        signal_id: "sig-123",
        token_symbol: "BTC",
        requested_venue: "MULTI",
        selected_venue: "HYPERLIQUID",
        routing_reason: "HYPERLIQUID: Market BTC/USD available",
        routing_duration_ms: 42
      }
```

---

## 🏗️ Implementation Details

### Agent What: Signal Creation

**Location:** `lib/signal-generator.ts`, `workers/signal-generator.ts`

**Database:**
```sql
CREATE TABLE signals (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  
  -- Agent What outputs (venue-agnostic)
  token_symbol TEXT,              -- "BTC"
  side TEXT,                      -- "LONG" | "SHORT"
  size_model JSONB,               -- { type: "percentage", value: 25 }
  risk_model JSONB,               -- { type: "trailing-stop", stop: 0.03 }
  confidence FLOAT,               -- 0.85
  
  -- NOT specified by Agent What
  venue venue_t DEFAULT 'MULTI',  -- Always MULTI for new agents
  
  -- Source tracking
  source_tweets TEXT[],
  lunarcrush_score FLOAT,
  
  -- Proof & attestation
  proof_verified BOOLEAN,
  executor_agreement_verified BOOLEAN,
  
  created_at TIMESTAMPTZ
);
```

**Key Principle:**
- Signal specifies **WHAT** to trade (token, side, size)
- Signal does NOT specify **WHERE** to trade (venue)
- Venue is determined by Agent Where at execution time

### Agent How: Policy Layer (Placeholder)

**Location:** `lib/agent-how-policy.ts` (future)

**Current Status:**
- Infrastructure in place (database schema)
- Flow integration points defined
- **Not implemented yet** - signals pass through unchanged

**Future Schema:**
```sql
CREATE TABLE user_style_vectors (
  id UUID PRIMARY KEY,
  user_wallet TEXT,
  style_data JSONB,          -- Risk profile, sizing preferences
  last_updated TIMESTAMPTZ
);

CREATE TABLE policy_rules (
  id UUID PRIMARY KEY,
  agent_id UUID,
  rule_type TEXT,            -- "risk_cap" | "venue_preference" | "timing"
  rule_config JSONB,
  enabled BOOLEAN
);
```

### Agent Where: Venue Routing ✅

**Location:** `lib/venue-router.ts`, `lib/trade-executor.ts`

**Database:**
```sql
-- Configuration
CREATE TABLE venue_routing_config (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),  -- null = global
  venue_priority TEXT[],                 -- ["HYPERLIQUID", "OSTIUM"]
  routing_strategy TEXT,                 -- "FIRST_AVAILABLE"
  failover_enabled BOOLEAN
);

-- Audit trail
CREATE TABLE venue_routing_history (
  id UUID PRIMARY KEY,
  signal_id UUID REFERENCES signals(id),
  token_symbol TEXT,
  requested_venue venue_t,               -- MULTI
  selected_venue venue_t,                -- HYPERLIQUID or OSTIUM
  routing_reason TEXT,
  venue_availability JSONB,
  routing_duration_ms INT,
  created_at TIMESTAMPTZ
);

-- Market availability
CREATE TABLE venue_markets (
  id UUID PRIMARY KEY,
  venue venue_t,
  token_symbol TEXT,
  market_name TEXT,
  market_index INT,
  is_active BOOLEAN,
  min_position DECIMAL,
  max_leverage INT,
  UNIQUE(venue, token_symbol)
);
```

**Routing Logic:**
```typescript
// 1. Signal arrives with venue='MULTI'
const signal = { token: "BTC", venue: "MULTI", ... };

// 2. VenueRouter selects venue
const routingResult = await venueRouter.routeToVenue({
  tokenSymbol: "BTC",
  agentId: signal.agent_id
});
// Result: { selectedVenue: "HYPERLIQUID", reason: "...", ... }

// 3. Update signal with selected venue
await prisma.signals.update({
  where: { id: signal.id },
  data: { venue: routingResult.selectedVenue }
});

// 4. Execute on selected venue
await tradeExecutor.executeHyperliquidTrade(signal);
```

---

## 🎨 Agent Creation Flow

### Creating a Venue-Agnostic Agent

```typescript
// User creates agent via UI or API
const agent = await prisma.agents.create({
  data: {
    name: "BTC Maximalist",
    creator_wallet: "0x...",
    profit_receiver_address: "0x...",
    
    // Agent What configuration
    weights: [1, 1, 1],  // X accounts, research, on-chain weights
    
    // Venue configuration
    venue: 'MULTI',  // 👈 Venue-agnostic (default for new agents)
    
    status: 'ACTIVE'
  }
});

// Connect signal sources (X accounts, research institutes)
await prisma.agent_accounts.createMany({
  data: [
    { agent_id: agent.id, ct_account_id: "account1" },
    { agent_id: agent.id, ct_account_id: "account2" }
  ]
});

await prisma.agent_research_institutes.createMany({
  data: [
    { agent_id: agent.id, institute_id: "institute1" }
  ]
});
```

### Signal Generation (Venue-Agnostic)

```typescript
// Signal generator reads tweets/research
// Generates signal WITHOUT specifying venue
const signal = await prisma.signals.create({
  data: {
    agent_id: agent.id,
    
    // Agent What outputs
    token_symbol: "BTC",
    side: "LONG",
    size_model: {
      type: "percentage",
      value: 25  // 25% of available fund
    },
    risk_model: {
      type: "trailing-stop",
      stop_loss_pct: 0.03,
      take_profit_pct: 0.10
    },
    
    // Venue: NOT specified (defaults to MULTI)
    venue: agent.venue,  // "MULTI"
    
    // Source tracking
    source_tweets: ["tweet_123"],
    confidence: 0.85
  }
});
```

### Execution (Agent Where Decides Venue)

```typescript
// Trade executor picks up signal
// Agent Where selects venue automatically
await tradeExecutor.executeSignal(signal.id);

// Internally:
// 1. Detect venue='MULTI'
// 2. Call VenueRouter
// 3. Check Hyperliquid → Ostium
// 4. Select first available
// 5. Execute
```

---

## 🔄 Migration Strategy

### For Existing System

**Phase 1: Keep Backward Compatibility** ✅ (Current)
- Existing agents with specific venues (HYPERLIQUID, OSTIUM, etc.) continue to work
- New agents can be created as MULTI (venue-agnostic)
- Both flows coexist

**Phase 2: Migrate Existing Agents** (Optional)
- Gradually convert existing agents to MULTI
- Update signals to use Agent Where routing
- Maintain audit trail of migration

**Phase 3: Default to MULTI** (Future)
- All new agents default to MULTI
- Specific venues become opt-in exceptions
- Agent Where becomes primary execution path

### Migration Script

```typescript
// Optional: Convert existing agent to venue-agnostic
async function migrateAgentToMultiVenue(agentId: string) {
  // 1. Update agent
  await prisma.agents.update({
    where: { id: agentId },
    data: { venue: 'MULTI' }
  });
  
  // 2. Create routing config (optional - inherits global if not set)
  await prisma.venue_routing_config.create({
    data: {
      agent_id: agentId,
      venue_priority: ['HYPERLIQUID', 'OSTIUM'],
      routing_strategy: 'FIRST_AVAILABLE',
      failover_enabled: true
    }
  });
  
  console.log(`✅ Agent ${agentId} migrated to MULTI venue`);
}
```

---

## 📊 Current Implementation Status

| Layer | Status | Description |
|-------|--------|-------------|
| **Agent What** | ✅ **90% Complete** | Signal generation working, venue-agnostic outputs |
| **Agent How** | 🚧 **Placeholder** | Infrastructure ready, not implemented |
| **Agent Where** | ✅ **Complete** | Venue routing fully implemented |

### Agent What - Current Features

✅ X account integration (CT posts)
✅ Research institute integration  
✅ LLM-based signal classification
✅ Market contextualization (24h metrics)
✅ Position sizing (exponential normalization)
✅ Confidence scoring
✅ PoEX attestation
✅ Impact Factor tracking
⚠️ **Needs adjustment:** Make venue='MULTI' default

### Agent How - Planned Features

🚧 User style learning (opt-in)
🚧 Policy rules engine
🚧 Risk caps & safety rails
🚧 Personalized sizing adjustments
🚧 EAS privacy integration
**Status:** Infrastructure placeholder only

### Agent Where - Complete Features

✅ MULTI venue support
✅ Venue routing (Hyperliquid → Ostium)
✅ Configuration API
✅ Statistics API
✅ Audit logging
✅ Backward compatibility
✅ Performance optimized

---

## 🎯 Summary

### Key Principles

1. **Agent What = Alpha Generation (Venue-Agnostic)**
   - Input: X accounts + research
   - Output: Token + Side + Fund % + Confidence
   - **NO venue decision**

2. **Agent How = Policy & Personalization (Future)**
   - Transform signal with user preferences
   - Apply safety rails
   - **Currently: Pass-through placeholder**

3. **Agent Where = Venue Selection & Execution** ✅
   - Input: Token + Fund %
   - Logic: Check Hyperliquid → Ostium
   - Output: Executed trade on best venue

### For Users

**Creating an agent:**
```typescript
// Venue-agnostic agent (default for new agents)
const agent = { 
  name: "My Agent",
  venue: 'MULTI',  // Let Agent Where decide
  ...
};
```

**Result:**
- Agent generates signals based on X accounts + research
- Signals specify WHAT to trade (token, size %)
- Agent Where decides WHERE to trade (Hyperliquid or Ostium)
- User sees complete audit trail

### Next Steps

1. ✅ Agent Where implemented
2. 🚧 Make new agents default to MULTI
3. 🚧 Implement Agent How (when ready)
4. ✅ System ready for production

---

**Last Updated:** 2025-11-13  
**Status:** Architecture Complete, Agent Where Implemented  
**Branch:** `agent-where-venue-routing`

