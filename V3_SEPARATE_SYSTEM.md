# V3 Separate System - Complete Independence from V2

## 🎯 Overview

V3 is now a **completely separate system** from V2, with zero overlap:

- ✅ **Separate database tables** (agents_v3, signals_v3, positions_v3, etc.)
- ✅ **Separate API endpoints** (/api/v3/*)
- ✅ **Separate services** (VenueRouterV3)
- ✅ **Separate enum** (venue_v3_t with MULTI support)

## 📊 Database Tables

### V2 Tables (Unchanged)
```
agents              - Your existing 10 agents
agent_deployments   - Existing deployments
signals             - Existing signals
positions           - Existing positions
```

### V3 Tables (New)
```
agents_v3                   - New agents (always MULTI venue)
agent_deployments_v3        - New deployments
signals_v3                  - New signals (venue-agnostic)
positions_v3                - New positions (across venues)
venue_routing_config_v3     - Routing configuration
venue_routing_history_v3    - Routing audit trail
```

### Shared Tables (Used by Both)
```
venue_markets           - Market data for all venues
ct_accounts            - X/Twitter accounts
ct_posts               - Tweets
research_institutes    - Research sources
research_signals       - Research data
```

## 🚀 V3 API Endpoints

### Create V3 Agent
```bash
POST /api/v3/agents/create
{
  "creator_wallet": "0x...",
  "name": "Multi-Venue Alpha Agent",
  "x_account_ids": ["1234567890"],
  "research_institute_ids": ["inst_id"],
  "weights": { "x": 0.5, "research": 0.5 },
  "profit_receiver_address": "0x..."
}
```

### List V3 Agents
```bash
GET /api/v3/agents/list
GET /api/v3/agents/list?creator_wallet=0x...
GET /api/v3/agents/list?status=ACTIVE
```

### Deploy V3 Agent
```bash
POST /api/v3/agents/deploy
{
  "agent_id": "uuid",
  "user_wallet": "0x...",
  "hyperliquid_agent_address": "0x...",
  "hyperliquid_agent_key_encrypted": "...",
  "hyperliquid_agent_key_iv": "...",
  "hyperliquid_agent_key_tag": "...",
  "ostium_agent_address": "0x...",
  "ostium_agent_key_encrypted": "...",
  "ostium_agent_key_iv": "...",
  "ostium_agent_key_tag": "..."
}
```

### Generate V3 Signal
```bash
POST /api/v3/signals/generate
{
  "agent_id": "uuid",
  "token_symbol": "ETH",
  "side": "LONG",
  "size_model": { "type": "percentage", "value": 25 },
  "risk_model": { "type": "trailing-stop", "stop": 0.03 },
  "confidence": 0.85,
  "source_tweets": ["tweet_id1"],
  "source_research": ["signal_id1"]
}
```

## 🎯 Agent Framework (V3)

### Agent What (Signal Generation)
- **Input**: X posts, research signals, market data
- **Output**: `{ token, side, size %, confidence }`
- **Status**: Venue-agnostic (doesn't care where trade happens)

### Agent How (Policy Layer)
- **Current**: Pass-through (no modifications)
- **Future**: User-specific policies, risk adjustments, personalization

### Agent Where (Venue Routing)
- **Priority**: Check Hyperliquid first, then Ostium
- **Logic**: 
  1. Check if pair available on Hyperliquid → execute there
  2. If not, check Ostium → execute there
  3. If neither, skip trade

## 🔄 Trade Flow (V3)

```
1. Signal Generation (Agent What)
   ├─ Analyzes X posts & research
   ├─ Determines: token, side, size
   └─ Creates signal with venue='MULTI'

2. Policy Processing (Agent How)
   ├─ Currently: pass-through
   └─ Future: apply user-specific rules

3. Venue Routing (Agent Where)
   ├─ Check Hyperliquid availability
   ├─ Check Ostium availability
   ├─ Select best venue
   └─ Update signal.final_venue

4. Execution
   ├─ Execute on selected venue
   ├─ Create position_v3 record
   └─ Log routing decision
```

## 📈 V2 vs V3 Comparison

| Feature | V2 | V3 |
|---------|----|----|
| **Venue Selection** | Fixed at creation | Dynamic per trade |
| **Agent Table** | `agents` | `agents_v3` |
| **Venue Field** | SPOT/GMX/HYPERLIQUID/OSTIUM | Always MULTI |
| **Routing** | None (fixed venue) | Intelligent (checks availability) |
| **History** | None | Full audit trail |
| **Flexibility** | Single venue per agent | Multi-venue per trade |

## 🚦 Current Status

✅ **Database**: All V3 tables created
✅ **API Endpoints**: All V3 endpoints created
✅ **Services**: VenueRouterV3 implemented
✅ **V2 Data**: Completely untouched (10 agents safe)

## 🎯 Next Steps

1. **Create your first V3 agent** via `/api/v3/agents/create`
2. **Deploy it** via `/api/v3/agents/deploy`
3. **Generate signals** via `/api/v3/signals/generate`
4. **Watch automatic routing** in `venue_routing_history_v3`

## 🔐 Security

- V2 and V3 data completely isolated
- No shared agent IDs
- No risk of V3 affecting V2 functionality
- Safe to run both systems simultaneously

## 📝 Example: Create First V3 Agent

```typescript
// Create agent
const agent = await fetch('/api/v3/agents/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creator_wallet: '0xYourWallet',
    name: 'Alpha Hunter V3',
    x_account_ids: ['123456789'],  // X account IDs
    research_institute_ids: [],
    weights: { x: 1.0, research: 0 },
    profit_receiver_address: '0xYourWallet',
  }),
});

// Deploy to your wallet
const deployment = await fetch('/api/v3/agents/deploy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agent_id: agent.id,
    user_wallet: '0xYourWallet',
    hyperliquid_agent_address: '0x...',
    // ... agent wallet keys
  }),
});

// Generate signal (venue-agnostic!)
const signal = await fetch('/api/v3/signals/generate', {
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
// Signal will be automatically routed to HYPERLIQUID or OSTIUM!
```

## 🎉 Success!

V3 is ready to use. Your V2 system continues running unchanged, and V3 operates completely independently with its own database tables, API endpoints, and routing logic.

