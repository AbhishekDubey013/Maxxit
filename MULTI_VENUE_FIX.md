# MULTI Venue Agent Signal Generation Fix ✅

## Problem

Agents with `venue = 'MULTI'` were not generating or executing trades because:

1. **Signal generation code** was trying to query `venues_status` with `venue: 'MULTI'`, but no such records exist in the database (only specific venues like 'HYPERLIQUID', 'OSTIUM', 'GMX', 'SPOT')
2. **Signal creation code** was setting `signal.venue = 'MULTI'`, but the database schema only accepts specific venue values, not 'MULTI'
3. **Result**: No signals were created for MULTI venue agents, so no trades were executed

## Solution

### Approach

For MULTI venue agents:
1. **During signal generation**: Check if token is available on ANY enabled venue (HYPERLIQUID or OSTIUM)
2. **During signal creation**: Default to `HYPERLIQUID` as the initial venue (Agent Where routing will dynamically re-route to the best venue during execution)

### Files Fixed

#### 1. `/pages/api/admin/generate-signals.ts`
**Issue**: Line 106-113 tried to query `venues_status` with `venue: agent.venue` (which is 'MULTI')

**Fix**:
```typescript
// OLD:
const venueStatus = await prisma.venues_status.findUnique({
  where: {
    venue_token_symbol: {
      venue: agent.venue, // 'MULTI' doesn't exist!
      token_symbol: token,
    },
  },
});

// NEW:
let venueStatus: any;

if (agent.venue === 'MULTI') {
  // Check if token is available on Hyperliquid OR Ostium
  const multiVenueStatuses = await prisma.venues_status.findMany({
    where: {
      token_symbol: token,
      venue: { in: ['HYPERLIQUID', 'OSTIUM'] },
    },
  });
  
  if (multiVenueStatuses.length === 0) {
    // Skip - token not available
    continue;
  }
  
  venueStatus = multiVenueStatuses[0];
} else {
  // Single venue agent
  venueStatus = await prisma.venues_status.findUnique({
    where: {
      venue_token_symbol: {
        venue: agent.venue,
        token_symbol: token,
      },
    },
  });
}
```

**Signal Creation Fix** (Line 212):
```typescript
// For MULTI venue agents, default to HYPERLIQUID (Agent Where will route dynamically)
const signalVenue = agent.venue === 'MULTI' ? 'HYPERLIQUID' : agent.venue;

const signal = await prisma.signal.create({
  data: {
    venue: signalVenue, // MULTI → HYPERLIQUID
    // ...
  },
});
```

#### 2. `/pages/api/admin/run-signal-once.ts`
**Issue**: Line 252 set `venue: agent.venue` (which is 'MULTI')

**Fix** (Line 219, 255):
```typescript
// For MULTI venue agents, default to HYPERLIQUID (Agent Where will route dynamically)
const signalVenue = agent.venue === 'MULTI' ? 'HYPERLIQUID' : agent.venue;

const signal = await prisma.signals.create({
  data: {
    venue: signalVenue, // MULTI → HYPERLIQUID
    // ...
  },
});
```

#### 3. `/pages/api/admin/generate-signals-simple.ts`
**Issue**: Lines 142, 167 set `venue: agent.venue` (which is 'MULTI')

**Fix** (Lines 137, 170, 195):
```typescript
// For MULTI venue agents, default to HYPERLIQUID
const signalVenue = agent.venue === 'MULTI' ? 'HYPERLIQUID' : agent.venue;

// Use signalVenue for LLM generation
const tradingSignal = await signalGenerator.generateSignal({
  venue: signalVenue,
  // ...
});

// Use signalVenue for signal creation
const signal = await prisma.signal.create({
  data: {
    venue: signalVenue,
    // ...
  },
});
```

#### 4. `/services/signal-generator-worker/src/worker.ts`
**Issue**: Line 247 set `venue: agent.venue` (which is 'MULTI'), but venue_markets check was already correct (lines 163-199)

**Fix** (Lines 162, 181, 200, 250, 265):
```typescript
let venueMarket: any;
let signalVenue: string; // The actual venue to use for the signal

if (agent.venue === 'MULTI') {
  // Check if token is available on Hyperliquid OR Ostium
  const multiVenueMarkets = await prisma.venue_markets.findMany({
    where: {
      token_symbol: token.toUpperCase(),
      venue: { in: ['HYPERLIQUID', 'OSTIUM'] },
      is_active: true,
    },
  });
  
  if (multiVenueMarkets.length === 0) {
    return; // Skip
  }
  
  venueMarket = multiVenueMarkets[0];
  signalVenue = multiVenueMarkets[0].venue; // Use first available venue
} else {
  // Single venue agent
  venueMarket = await prisma.venue_markets.findFirst({
    where: {
      token_symbol: token.toUpperCase(),
      venue: agent.venue,
      is_active: true,
    },
  });
  
  signalVenue = agent.venue;
}

// Create signal with actual venue (not 'MULTI')
const signal = await prisma.signals.create({
  data: {
    venue: signalVenue, // MULTI → first available venue
    // ...
  },
});
```

#### 5. `/workers/research-signal-generator.ts`
**Issue**: Line 116 set `venue: agent.venue` (which is 'MULTI')

**Fix** (Lines 113, 119):
```typescript
// For MULTI venue agents, default to HYPERLIQUID
const signalVenue = agent.venue === 'MULTI' ? 'HYPERLIQUID' : agent.venue;

const tradingSignal = await prisma.signals.create({
  data: {
    venue: signalVenue, // MULTI → HYPERLIQUID
    // ...
  },
});
```

## How It Works Now

### Signal Generation Flow for MULTI Agents

```
1. Agent has venue = 'MULTI'
   ↓
2. Check if token available on HYPERLIQUID or OSTIUM
   ↓
3. If available → Create signal with venue = 'HYPERLIQUID' (default)
   ↓
4. During execution, Agent Where routing checks enabled venues:
   - If deployment.enabled_venues has both HYPERLIQUID and OSTIUM
   - Route to best venue based on liquidity, fees, etc.
   - Update signal.venue to the selected venue
   ↓
5. Execute trade on the selected venue
```

### Example

**Before (Broken)**:
```
Agent: "Crypto Alpha Bot" (venue: MULTI)
Token: ETH
Signal Creation: venue = 'MULTI' ❌ Database error!
```

**After (Fixed)**:
```
Agent: "Crypto Alpha Bot" (venue: MULTI)
Token: ETH
Check availability: ETH available on HYPERLIQUID, OSTIUM ✅
Signal Creation: venue = 'HYPERLIQUID' ✅
Execution: Agent Where routes to OSTIUM (better liquidity) ✅
Final signal.venue: OSTIUM ✅
```

## Benefits

✅ **MULTI venue agents now work**: Signals are generated and executed  
✅ **Agent Where routing works**: Signals default to HYPERLIQUID, then dynamically route  
✅ **Backward compatible**: Single-venue agents continue to work as before  
✅ **Database consistency**: All signals have valid venue values  

## Testing

1. **Create a MULTI venue agent**
2. **Link Twitter/Telegram sources**
3. **Run signal generation**: `POST /api/admin/run-signal-once`
4. **Verify signals created**: Check `signals` table - should have `venue = 'HYPERLIQUID'` or `venue = 'OSTIUM'`
5. **Verify trades execute**: Check `positions` table - trades should execute on either venue

## Deployment Checklist

- [x] Fixed signal generation endpoints
- [x] Fixed signal-generator-worker service
- [x] Fixed research-signal-generator worker
- [x] Build succeeds
- [ ] Deploy to production
- [ ] Test signal generation for MULTI agents
- [ ] Test trade execution for MULTI agents
- [ ] Verify Agent Where routing switches venues dynamically

---

**Status**: ✅ Fixed, built, ready to commit

