# Multi-User Trade Execution Fix

## Problem
When multiple users are subscribed to the same agent, only one trade was being executed instead of one trade per user.

## Root Cause
1. The query in `execute-trade-once.ts` was checking for `hyperliquid_agent_address` on `agent_deployments` table, but this field doesn't exist there (it's in `user_agent_addresses` table).
2. OSTIUM venue was not included in the filtering logic.
3. The query was incorrectly filtering deployments, causing valid deployments to be excluded.

## Changes Required

### File 1: `pages/api/admin/execute-trade-once.ts`

**Location:** Around lines 52-67

**Replace this code:**
```typescript
    // Find ACTIVE deployments for this agent
    // For SPOT/GMX signals: require module_enabled = true
    // For HYPERLIQUID signals: require hyperliquid_agent_address set (uses agent wallet, not Safe module)
    const deployments = await prisma.agent_deployments.findMany({
      where: {
        agent_id: signal.agent_id,
        status: 'ACTIVE',
        sub_active: true,
        OR: [
          { module_enabled: true }, // For SPOT/GMX signals (need Safe module)
          ...(signal.venue === 'HYPERLIQUID' ? [{ hyperliquid_agent_address: { not: null } }] : []), // For HYPERLIQUID signals (need agent wallet)
        ]
      },
    });

    console.log(`[TRADE] Found ${allDeployments.length} total active deployments, ${deployments.length} ready for execution (module enabled or Hyperliquid)`);
```

**With this code:**
```typescript
    // Find ACTIVE deployments for this agent
    // For SPOT/GMX signals: require module_enabled = true
    // For HYPERLIQUID signals: require hyperliquid_agent_address set (uses agent wallet, not Safe module)
    // For OSTIUM signals: require ostium_agent_address set (uses agent wallet, not Safe module)
    let deployments = await prisma.agent_deployments.findMany({
      where: {
        agent_id: signal.agent_id,
        status: 'ACTIVE',
        sub_active: true,
      },
    });

    // Filter deployments based on venue requirements
    if (signal.venue === 'HYPERLIQUID' || signal.venue === 'OSTIUM') {
      // For HYPERLIQUID and OSTIUM, check user_agent_addresses table
      const userWallets = deployments.map(d => d.user_wallet);
      
      // Get user agent addresses for these wallets
      const userAgentAddresses = await prisma.user_agent_addresses.findMany({
        where: {
          user_wallet: { in: userWallets },
          ...(signal.venue === 'HYPERLIQUID' 
            ? { hyperliquid_agent_address: { not: null } }
            : { ostium_agent_address: { not: null } }
          ),
        },
        select: { user_wallet: true },
      });

      const validUserWallets = new Set(userAgentAddresses.map(u => u.user_wallet));
      
      // Filter deployments to only those with valid agent addresses
      deployments = deployments.filter(d => validUserWallets.has(d.user_wallet));
    } else {
      // For SPOT/GMX, require module_enabled = true
      deployments = deployments.filter(d => d.module_enabled === true);
    }

    console.log(`[TRADE] Found ${allDeployments.length} total active deployments, ${deployments.length} ready for execution (venue: ${signal.venue})`);
```

**Also update the error message (around lines 69-77):**

**Replace:**
```typescript
      } else if (signal.venue === 'HYPERLIQUID') {
        message = `${allDeployments.length} active deployments found for Hyperliquid signal, but none are properly configured.`;
      } else {
```

**With:**
```typescript
      } else if (signal.venue === 'HYPERLIQUID') {
        message = `${allDeployments.length} active deployments found for Hyperliquid signal, but none have a Hyperliquid agent address configured.`;
      } else if (signal.venue === 'OSTIUM') {
        message = `${allDeployments.length} active deployments found for Ostium signal, but none have an Ostium agent address configured.`;
      } else {
```

---

### File 2: `workers/trade-executor-worker.ts`

**Location:** Around lines 39-51

**Replace this code:**
```typescript
      include: {
        agents: {
          include: {
            agent_deployments: {
              where: { 
                status: 'ACTIVE',
                OR: [
                  { module_enabled: true }, // For SPOT/GMX signals
                  { hyperliquid_agent_address: { not: null } }, // For HYPERLIQUID signals
                ]
              },
              take: 1,
            },
          },
        },
      },
```

**With this code:**
```typescript
      include: {
        agents: {
          include: {
            agent_deployments: {
              where: { 
                status: 'ACTIVE',
                sub_active: true,
              },
              // Note: Venue-specific filtering (module_enabled, agent addresses) 
              // is handled in the API endpoint, not here
            },
          },
        },
      },
```

---

## Summary of Changes

1. **`execute-trade-once.ts`**: 
   - Removed incorrect `hyperliquid_agent_address` check from `agent_deployments` query
   - Added proper filtering for HYPERLIQUID and OSTIUM by checking `user_agent_addresses` table
   - Changed query to get all active deployments first, then filter by venue requirements
   - Updated error messages to include OSTIUM

2. **`trade-executor-worker.ts`**:
   - Removed incorrect `hyperliquid_agent_address` check
   - Removed `take: 1` limit
   - Simplified query to just get active deployments (venue filtering happens in API)

## Testing

After applying these changes, when a signal is generated for an agent with multiple subscribed users:
- All active deployments that meet venue requirements should execute trades
- Each user should get their own position
- Verify by checking that multiple positions are created for the same signal

## Notes

- The `user_agent_addresses` table links `user_wallet` to agent addresses
- For HYPERLIQUID: check `hyperliquid_agent_address` field
- For OSTIUM: check `ostium_agent_address` field
- For SPOT/GMX: check `module_enabled` field on `agent_deployments`

