# Agent Framework: Adjustments to Match Vision

## 🎯 Your Exact Requirements

### Agent What (Signal Layer)
- ✅ Anyone can create using combinations of X accounts + research sources
- ✅ **Venue agnostic** - output is `token` + `percentage of fund`
- ✅ **NO venue specification** in output

### Agent How (Policy Layer)  
- 🚧 **Doesn't do anything now**
- ✅ **Keep infrastructure placeholder** for future

### Agent Where (Execution Layer)
- ✅ Check Hyperliquid first
- ✅ If not available, check Ostium
- ✅ Execute on first available venue

---

## ✅ What's Already Correct

1. **Agent Where** is fully implemented and works exactly as you specified
2. **Database tables** are separate and don't disturb existing flow
3. **Routing logic** follows Hyperliquid → Ostium priority
4. **Agent How** has placeholder infrastructure

---

## 🔧 Small Adjustments Needed

### 1. Make Agents Venue-Agnostic by Default

**Current:** Users must explicitly set `venue: 'MULTI'`

**Desired:** All new agents are venue-agnostic by default

**Change needed in agent creation flow:**

```typescript
// pages/api/agents/create.ts or wherever agents are created

// BEFORE (current):
const agent = await prisma.agents.create({
  data: {
    venue: req.body.venue,  // User specifies venue
    ...
  }
});

// AFTER (adjusted):
const agent = await prisma.agents.create({
  data: {
    // Default to MULTI (venue-agnostic)
    venue: req.body.venue || 'MULTI',  // Defaults to MULTI if not specified
    ...
  }
});
```

### 2. Update Signal Generation to Emphasize Fund Percentage

**Current:** Signal generator creates signals with various sizing models

**Desired:** Clear emphasis that output is `token` + `fund_percentage`

**No code change needed**, just documentation clarity:

```typescript
// Signal output format (already implemented):
{
  token_symbol: "BTC",
  side: "LONG",
  size_model: {
    type: "percentage",
    value: 25  // 25% of available fund ← This is the key output
  },
  venue: "MULTI",  // Always MULTI for venue-agnostic agents
  ...
}
```

### 3. UI/API Documentation Updates

Update any UI or API documentation to reflect:

```markdown
### Creating an Agent

Agents are **venue-agnostic by default**. They output:
- Token to trade
- Fund percentage to use
- Risk parameters

The system automatically selects the best venue (Hyperliquid or Ostium).

**Example:**
```json
{
  "name": "My Alpha Agent",
  "sources": {
    "x_accounts": ["account1", "account2"],
    "research_institutes": ["institute1"]
  }
  // No venue needed - system handles routing automatically
}
```
```

---

## 📋 Implementation Checklist

### Immediate (to match your vision exactly):

- [ ] **Update agent creation API** - Default venue to 'MULTI'
- [ ] **Update agent creation UI** - Remove venue selection (or make it advanced option)
- [ ] **Update documentation** - Emphasize venue-agnostic nature
- [ ] **Update signal generator docs** - Clarify output is token + fund %

### Already Done ✅:

- [x] Agent Where implementation (venue routing)
- [x] MULTI venue support in database
- [x] Hyperliquid → Ostium priority
- [x] Separate tables (no disruption to existing flow)
- [x] Agent How infrastructure placeholder

---

## 🚀 Quick Implementation Guide

### Step 1: Default Agents to MULTI

Find agent creation endpoints and update them:

```bash
# Files to update:
pages/api/agents/create.ts
pages/create-agent.tsx (if UI exists)
```

```typescript
// Example change:
const agent = await prisma.agents.create({
  data: {
    ...req.body,
    venue: req.body.venue || 'MULTI',  // Default to MULTI
  }
});
```

### Step 2: Update UI (if applicable)

```tsx
// Remove venue selection from agent creation form
// Or make it an "Advanced" option with MULTI as default

<AgentCreationForm>
  <Input name="name" placeholder="Agent Name" />
  <SelectXAccounts />
  <SelectResearchInstitutes />
  
  {/* Remove or hide venue selection */}
  {/* <Select name="venue">...</Select> */}
  
  {/* Or make it advanced with MULTI default */}
  <AdvancedSettings>
    <Select name="venue" defaultValue="MULTI">
      <Option value="MULTI">Auto-route (recommended)</Option>
      <Option value="HYPERLIQUID">Force Hyperliquid</Option>
      <Option value="OSTIUM">Force Ostium</Option>
    </Select>
  </AdvancedSettings>
</AgentCreationForm>
```

### Step 3: Update Documentation

```markdown
# Creating Your First Agent

Agents in Maxxit are **venue-agnostic**. You focus on:
- **What** to trade (select X accounts + research sources)
- **How much** to trade (sizing handled automatically)

The system handles **where** to trade (Hyperliquid or Ostium).

## Simple Example

```typescript
const agent = await createAgent({
  name: "BTC Alpha",
  sources: {
    x_accounts: ["trader1", "trader2"],
    research: ["institution1"]
  }
});
// That's it! No venue configuration needed.
```
```

---

## 📊 Expected Flow After Adjustments

### User Creates Agent

```typescript
// User creates agent (venue-agnostic by default)
const agent = {
  name: "My Agent",
  x_accounts: ["ct_trader1", "ct_trader2"],
  research_institutes: ["research1"],
  venue: "MULTI"  // Automatic (default)
};
```

### Agent What Generates Signal

```typescript
// Signal generated from X posts + research
const signal = {
  token: "BTC",
  side: "LONG",
  fund_percentage: 25,  // Key output: % of fund to use
  confidence: 0.85,
  venue: "MULTI"  // Not decided yet
};
```

### Agent How (Pass-Through for Now)

```typescript
// Currently does nothing, just passes signal through
const processedSignal = signal;  // Future: apply personalization
```

### Agent Where Selects Venue & Executes

```typescript
// Routing logic (already implemented)
1. Check Hyperliquid: BTC available? → YES
2. Select Hyperliquid
3. Update signal.venue = "HYPERLIQUID"
4. Execute trade on Hyperliquid

// Result
position = {
  venue: "HYPERLIQUID",
  token: "BTC",
  side: "LONG",
  size: "25% of fund"
};
```

---

## 🎯 Summary of Changes

### What Needs Changing:

| Component | Change | Priority | Effort |
|-----------|--------|----------|--------|
| Agent creation API | Default venue to MULTI | High | 5 min |
| Agent creation UI | Hide/default venue selector | Medium | 15 min |
| Documentation | Update to emphasize venue-agnostic | High | 30 min |

### What's Already Perfect:

| Component | Status |
|-----------|--------|
| Agent Where (venue routing) | ✅ Complete |
| Database schema | ✅ Complete |
| Venue selection logic | ✅ Complete |
| Backward compatibility | ✅ Maintained |
| Agent How placeholder | ✅ Ready |

---

## 🔍 Verification

After implementing changes, verify:

### 1. Agent Creation
```typescript
// Create agent without specifying venue
const agent = await prisma.agents.create({
  data: {
    name: "Test Agent",
    creator_wallet: "0x...",
    profit_receiver_address: "0x...",
    // venue NOT specified
  }
});

// Check: agent.venue should be 'MULTI'
console.assert(agent.venue === 'MULTI', 'Agent should default to MULTI');
```

### 2. Signal Generation
```typescript
// Signal should have venue='MULTI'
const signal = await prisma.signals.findFirst({
  where: { agent_id: agent.id }
});

console.assert(signal.venue === 'MULTI', 'Signal should inherit MULTI from agent');
```

### 3. Execution & Routing
```typescript
// Execute signal - should route automatically
await tradeExecutor.executeSignal(signal.id);

// Check routing history
const routing = await prisma.venue_routing_history.findFirst({
  where: { signal_id: signal.id }
});

console.log(`Routed to: ${routing.selected_venue}`);  // HYPERLIQUID or OSTIUM
console.log(`Reason: ${routing.routing_reason}`);
```

---

## 💡 Design Philosophy Confirmed

### Agent What
✅ **Venue-agnostic alpha generation**
- Output: Token + Fund % + Confidence
- No venue decision
- Anyone can create with X accounts + research

### Agent How  
✅ **Infrastructure placeholder**
- Ready for future personalization
- Currently: pass-through
- Schema in place

### Agent Where
✅ **Intelligent execution**
- Check Hyperliquid → Ostium
- Select best venue
- Execute trade

---

## ✅ Final Checklist

Before considering this complete:

- [ ] Default agent creation to MULTI venue
- [ ] Update UI to hide/simplify venue selection
- [ ] Update documentation to emphasize venue-agnostic design
- [ ] Test: Create agent → Generate signal → Execute → Verify routing
- [ ] Verify existing agents still work (backward compatibility)

**Estimated time to implement: 1 hour**

---

**Current Status:** Agent Where complete, minor adjustments needed for perfect vision match  
**Branch:** `agent-where-venue-routing`  
**Next:** Implement checklist above

