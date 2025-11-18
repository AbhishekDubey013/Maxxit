# Agent Address Design: One Address Per (User, Venue) ✅

## Problem Statement

Previously, agent addresses were stored per-deployment in the `agent_deployments` table with separate columns for each venue (`hyperliquid_agent_address`, `ostium_agent_address`). This created:
- **Schema bloat**: New venue = new column
- **Key management chaos**: Different encryption methods per venue
- **User confusion**: Multiple addresses to whitelist per agent
- **Broken flow**: Ostium integration failed due to inconsistent encryption

## Solution: `user_venue_agents` Table

### New Design
**One agent address per (user, venue) pair**, stored in a centralized table:

```sql
CREATE TABLE user_venue_agents (
  id UUID PRIMARY KEY,
  user_wallet VARCHAR NOT NULL,
  venue venue_t NOT NULL,
  agent_address VARCHAR NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  key_iv VARCHAR NOT NULL,
  key_tag VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_wallet, venue)
);
```

### Benefits
✅ **Cleaner schema**: No per-venue columns in `agent_deployments`  
✅ **Scalable**: Add new venues without schema changes  
✅ **User-friendly**: One address per venue, shared across all agents  
✅ **Unified encryption**: Single encryption service for all venues  
✅ **Backward compatible**: Fallback to legacy `wallet_pool` table  

---

## Implementation

### 1. New Service: `lib/user-venue-agent.ts`

Centralized management of agent addresses and encrypted keys:

```typescript
// Get or create agent address for a (user, venue) pair
export async function getUserVenueAgentAddress(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string>

// Get decrypted private key for a (user, venue) pair
export async function getUserVenueAgentPrivateKey(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string>

// Get private key by agent address (for backward compat)
export async function getPrivateKeyByAgentAddress(
  agentAddress: string
): Promise<string | null>
```

**Encryption**: AES-256-GCM with `AGENT_WALLET_ENCRYPTION_KEY`  
**Authorization**: Decryption requires `PLATFORM_MASTER_KEY` verification

### 2. Updated Core Services

#### `lib/wallet-pool.ts`
```typescript
// Now delegates to user-venue-agent service
import { getPrivateKeyByAgentAddress } from './user-venue-agent';

export async function getPrivateKeyForAddress(agentAddress: string): Promise<string | null> {
  // Try new user_venue_agents table first
  const privateKey = await getPrivateKeyByAgentAddress(agentAddress);
  if (privateKey) return privateKey;
  
  // Fallback to legacy wallet_pool
  // ...
}
```

#### `lib/trade-executor.ts`
```typescript
import { getUserVenueAgentAddress } from './user-venue-agent';

// Helper method
private async getAgentAddressForVenue(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string> {
  return getUserVenueAgentAddress(userWallet, venue);
}

// Hyperliquid trade execution
private async executeHyperliquidTrade(ctx: ExecutionContext): Promise<ExecutionResult> {
  const agentAddress = await this.getAgentAddressForVenue(ctx.deployment.user_wallet, 'HYPERLIQUID');
  const agentPrivateKey = await getPrivateKeyForAddress(agentAddress);
  // ...
}

// Ostium trade execution
private async executeOstiumTrade(ctx: ExecutionContext): Promise<ExecutionResult> {
  const agentAddress = await this.getAgentAddressForVenue(ctx.deployment.user_wallet, 'OSTIUM');
  const agentPrivateKey = await getPrivateKeyForAddress(agentAddress);
  // ...
}

// Fee collection (both venues)
async collectHyperliquidFee(...) {
  const agentAddress = await this.getAgentAddressForVenue(deployment.user_wallet, 'HYPERLIQUID');
  // ...
}

async collectOstiumFee(...) {
  const agentAddress = await this.getAgentAddressForVenue(deployment.user_wallet, 'OSTIUM');
  // ...
}
```

#### `lib/hyperliquid-utils.ts`
```typescript
export async function closeHyperliquidPosition(...) {
  const deployment = await prisma.agent_deployments.findUnique({
    where: { id: params.deploymentId },
    select: { user_wallet: true }
  });
  
  const { getUserVenueAgentAddress } = await import('./user-venue-agent');
  const agentAddress = await getUserVenueAgentAddress(deployment.user_wallet, 'HYPERLIQUID');
  
  const agentPrivateKey = await getPrivateKeyForAddress(agentAddress);
  // ...
}
```

### 3. Updated API Endpoints

#### `/api/hyperliquid/generate-agent`
```typescript
import { getUserVenueAgentAddress } from '../../../lib/user-venue-agent';

export default async function handler(req, res) {
  const deployment = await prisma.agent_deployments.findUnique({
    where: { id: deploymentId }
  });
  
  // Get or create agent address automatically
  const agentAddress = await getUserVenueAgentAddress(deployment.user_wallet, 'HYPERLIQUID');
  
  return res.json({
    success: true,
    agentAddress,
    instructions: [/* whitelist instructions */]
  });
}
```

#### `/api/hyperliquid/create-deployment`
```typescript
export default async function handler(req, res) {
  const { agentId, userWallet } = req.body; // No agentAddress needed!
  
  // Get or create agent address automatically
  const agentAddress = await getUserVenueAgentAddress(userWallet, 'HYPERLIQUID');
  
  const deployment = await prisma.agent_deployments.upsert({
    where: { agent_id_user_wallet: { agent_id: agentId, user_wallet: userWallet } },
    create: {
      agent_id: agentId,
      user_wallet: userWallet,
      safe_wallet: userWallet,
      enabled_venues: ['HYPERLIQUID'],
      status: 'ACTIVE'
    }
  });
  
  return res.json({ success: true, deployment, agentAddress });
}
```

#### `/api/ostium/create-deployment`
```typescript
export default async function handler(req, res) {
  const { agentId, userWallet } = req.body; // No agentAddress needed!
  
  // Get or create agent address automatically
  const agentAddress = await getUserVenueAgentAddress(userWallet, 'OSTIUM');
  
  const deployment = await prisma.agent_deployments.upsert({
    where: { agent_id_user_wallet: { agent_id: agentId, user_wallet: userWallet } },
    create: {
      agent_id: agentId,
      user_wallet: userWallet,
      safe_wallet: userWallet,
      enabled_venues: ['OSTIUM'],
      status: 'ACTIVE'
    }
  });
  
  return res.json({ success: true, deployment, agentAddress });
}
```

---

## User Flow

### Before (Per-Deployment):
```
1. User deploys Agent A
   → Generate Hyperliquid address #1
   → Whitelist address #1
2. User deploys Agent B
   → Generate Hyperliquid address #2
   → Whitelist address #2
3. User enables Ostium on Agent A
   → Generate Ostium address #3
   → Whitelist address #3
```
**Result**: 3 addresses, 3 whitelisting operations 😫

### After (Per User-Venue):
```
1. User deploys Agent A (Hyperliquid)
   → Get/create Hyperliquid address (0xAAA)
   → Whitelist 0xAAA once
2. User deploys Agent B (Hyperliquid)
   → Reuse Hyperliquid address (0xAAA)
   → No new whitelisting needed! ✅
3. User enables Ostium on Agent A
   → Get/create Ostium address (0xBBB)
   → Whitelist 0xBBB once
4. User enables Ostium on Agent B
   → Reuse Ostium address (0xBBB)
   → No new whitelisting needed! ✅
```
**Result**: 2 addresses, 2 whitelisting operations 🎉

---

## Database Schema Changes

### Before:
```prisma
model agent_deployments {
  // ... other fields
  hyperliquid_agent_address       String?
  hyperliquid_agent_key_encrypted String?
  hyperliquid_agent_key_iv        String?
  hyperliquid_agent_key_tag       String?
  ostium_agent_address            String?
  ostium_agent_key_encrypted      String?
  ostium_agent_key_iv             String?
  ostium_agent_key_tag            String?
  // Add more columns for each new venue... 😫
}
```

### After:
```prisma
model agent_deployments {
  // ... other fields
  enabled_venues String[] // Just track which venues are enabled
}

model user_venue_agents {
  id                     String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_wallet            String
  venue                  venue_t
  agent_address          String
  encrypted_private_key  String
  key_iv                 String
  key_tag                String?
  created_at             DateTime @default(now()) @db.Timestamptz(6)

  @@unique([user_wallet, venue])
  @@index([user_wallet])
  @@index([venue])
}
```

---

## Environment Variables

### Required:
- `AGENT_WALLET_ENCRYPTION_KEY` - 32-byte hex string (64 chars) for AES-256-GCM encryption
- `PLATFORM_MASTER_KEY` - 32-byte hex string (64 chars) for authorization verification

### Generate:
```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate master key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Migration Path

### For Existing Users:
1. **Legacy addresses still work**: `wallet_pool.ts` has fallback logic
2. **New deployments use new system**: Automatically create entries in `user_venue_agents`
3. **Gradual migration**: Old deployments continue working, new ones use new system

### To Migrate Old Deployments:
```sql
-- For each user with old deployments, create user_venue_agents entries
INSERT INTO user_venue_agents (user_wallet, venue, agent_address, encrypted_private_key, key_iv, key_tag)
SELECT 
  user_wallet,
  'HYPERLIQUID'::venue_t,
  hyperliquid_agent_address,
  hyperliquid_agent_key_encrypted,
  hyperliquid_agent_key_iv,
  hyperliquid_agent_key_tag
FROM agent_deployments
WHERE hyperliquid_agent_address IS NOT NULL
ON CONFLICT (user_wallet, venue) DO NOTHING;

-- Similar for Ostium...
```

---

## Testing Checklist

- [x] Build succeeds (`npm run build`)
- [ ] Generate Hyperliquid agent address
- [ ] Generate Ostium agent address
- [ ] Execute Hyperliquid trade
- [ ] Execute Ostium trade
- [ ] Close Hyperliquid position
- [ ] Close Ostium position
- [ ] Collect Hyperliquid fee
- [ ] Collect Ostium fee
- [ ] Deploy second agent (should reuse address)
- [ ] Verify encryption/decryption

---

## Summary

✅ **Schema**: Cleaner, scalable, no per-venue columns  
✅ **Encryption**: Unified AES-256-GCM for all venues  
✅ **User Experience**: One address per venue, shared across agents  
✅ **Developer Experience**: Single service for all venue address management  
✅ **Backward Compatible**: Legacy wallet_pool fallback  
✅ **Build Status**: All TypeScript errors resolved  

**Next Steps**: Deploy to production, test flows, migrate existing deployments.

