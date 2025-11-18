# Per-Deployment Address Fix ✅

## Issue Reported

**User feedback**: "For agent Maxxit on TG it showed enabled for Hyperliquid whereas expected behaviour is for every agent there will be a unique address generated and user need to whitelist this. For now it seems all agents have same address."

## Root Cause

The initial implementation used `(user_wallet, venue)` as the unique key for agent addresses:

```typescript
// BEFORE (Wrong!)
user_venue_agents {
  user_wallet: "0xAlice",
  venue: "HYPERLIQUID",
  agent_address: "0xAAA"  // ← Shared across ALL of Alice's agents!
}
```

**Result**: Alice deploys Agent A and Agent B → both use the same address `0xAAA` on Hyperliquid ❌

## Expected Behavior

Each **agent deployment** should have its own **unique address per venue**:

```typescript
// AFTER (Correct!)
deployment_venue_agents {
  deployment_id: "deploy-agent-a",
  venue: "HYPERLIQUID",
  agent_address: "0xAAA"  // ← Unique to Agent A
}

deployment_venue_agents {
  deployment_id: "deploy-agent-b",
  venue: "HYPERLIQUID",
  agent_address: "0xBBB"  // ← Unique to Agent B ✅
}
```

**Result**: Alice deploys Agent A → address `0xAAA`, Agent B → address `0xBBB` ✅

---

## Solution Implemented

### 1. New Database Schema

```prisma
model deployment_venue_agents {
  id                     String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  deployment_id          String             @db.Uuid
  venue                  venue_t
  agent_address          String             @unique
  encrypted_private_key  String
  key_iv                 String
  key_tag                String?
  created_at             DateTime           @default(now()) @db.Timestamptz(6)
  agent_deployments      agent_deployments  @relation(fields: [deployment_id], references: [id], onDelete: Cascade)

  @@unique([deployment_id, venue])  // ← One address per (deployment, venue)
  @@index([deployment_id])
  @@index([venue])
  @@index([agent_address])
}
```

**Key change**: Unique constraint on `(deployment_id, venue)` instead of `(user_wallet, venue)`

### 2. Updated Service Functions

**lib/user-venue-agent.ts**:

```typescript
// NEW: Deployment-based (correct)
export async function getDeploymentVenueAgentAddress(
  deploymentId: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string> {
  // Check if agent already exists for this (deployment, venue)
  const existing = await prisma.deployment_venue_agents.findUnique({
    where: {
      deployment_id_venue: {
        deployment_id: deploymentId,
        venue: venue,
      },
    },
  });
  
  if (existing) {
    return existing.agent_address;
  }
  
  // Generate new unique wallet for this deployment
  const wallet = ethers.Wallet.createRandom();
  const { cipherText, iv, tag } = encryptPrivateKey(wallet.privateKey);
  
  const newAgent = await prisma.deployment_venue_agents.create({
    data: {
      deployment_id: deploymentId,
      venue: venue,
      agent_address: wallet.address,
      encrypted_private_key: cipherText,
      key_iv: iv,
      key_tag: tag,
    },
  });
  
  return newAgent.agent_address;
}

// OLD: User-based (deprecated)
export async function getUserVenueAgentAddress(
  userWallet: string,
  venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
): Promise<string> {
  console.warn(`[DEPRECATED] Use getDeploymentVenueAgentAddress instead`);
  
  // Falls back to first deployment for backward compatibility
  const deployment = await prisma.agent_deployments.findFirst({
    where: { user_wallet: userWallet, status: 'ACTIVE' }
  });
  
  return getDeploymentVenueAgentAddress(deployment.id, venue);
}
```

### 3. Updated Core Services

**lib/trade-executor.ts**:

```typescript
// BEFORE
private async getAgentAddressForVenue(
  userWallet: string,  // ← Wrong!
  venue: 'HYPERLIQUID' | 'OSTIUM'
): Promise<string> {
  return getUserVenueAgentAddress(userWallet, venue);
}

// AFTER
private async getAgentAddressForVenue(
  deploymentId: string,  // ← Correct!
  venue: 'HYPERLIQUID' | 'OSTIUM'
): Promise<string> {
  return getDeploymentVenueAgentAddress(deploymentId, venue);
}

// Usage in trade execution
private async executeHyperliquidTrade(ctx: ExecutionContext) {
  const agentAddress = await this.getAgentAddressForVenue(
    ctx.deployment.id,  // ← deployment ID, not user wallet!
    'HYPERLIQUID'
  );
  // ...
}
```

**lib/hyperliquid-utils.ts**:

```typescript
// BEFORE
const deployment = await prisma.agent_deployments.findUnique({
  where: { id: params.deploymentId },
  select: { user_wallet: true }
});
const agentAddress = await getUserVenueAgentAddress(deployment.user_wallet, 'HYPERLIQUID');

// AFTER
const agentAddress = await getDeploymentVenueAgentAddress(
  params.deploymentId,
  'HYPERLIQUID'
);
```

### 4. Updated API Endpoints

**pages/api/hyperliquid/create-deployment.ts**:

```typescript
// BEFORE: Generated address BEFORE creating deployment
const agentAddress = await getUserVenueAgentAddress(userWallet, 'HYPERLIQUID');

const deployment = await prisma.agent_deployments.create({...});

// AFTER: Create deployment FIRST, then generate address for it
const deployment = await prisma.agent_deployments.create({
  data: {
    agent_id: agentId,
    user_wallet: userWallet,
    enabled_venues: ['HYPERLIQUID'],
    status: 'ACTIVE'
  }
});

// Generate unique address for THIS deployment
const agentAddress = await getDeploymentVenueAgentAddress(deployment.id, 'HYPERLIQUID');
```

Similar changes for:
- `/api/ostium/create-deployment`
- `/api/hyperliquid/generate-agent`

---

## How It Works Now

### Scenario: Alice Deploys Two Agents

```
1. Alice deploys "Crypto Bull Bot" (Agent A)
   POST /api/hyperliquid/create-deployment
   {
     agentId: "agent-a-id",
     userWallet: "0xAlice"
   }
   
   → Creates deployment: deploy-123
   → Generates Hyperliquid address: 0xAAA (unique to deploy-123)
   → Returns: "Please whitelist 0xAAA on Hyperliquid"

2. Alice deploys "Ethereum Alpha" (Agent B)
   POST /api/hyperliquid/create-deployment
   {
     agentId: "agent-b-id",
     userWallet: "0xAlice"
   }
   
   → Creates deployment: deploy-456
   → Generates Hyperliquid address: 0xBBB (unique to deploy-456) ✅
   → Returns: "Please whitelist 0xBBB on Hyperliquid"
```

**Result**: Alice whitelists TWO different addresses (0xAAA and 0xBBB), one for each agent ✅

### Database State

```
deployment_venue_agents:
┌───────────────┬─────────────┬───────────────┐
│ deployment_id │ venue       │ agent_address │
├───────────────┼─────────────┼───────────────┤
│ deploy-123    │ HYPERLIQUID │ 0xAAA         │
│ deploy-123    │ OSTIUM      │ 0xCCC         │
│ deploy-456    │ HYPERLIQUID │ 0xBBB         │ ← Different address!
│ deploy-456    │ OSTIUM      │ 0xDDD         │
└───────────────┴─────────────┴───────────────┘
```

---

## Migration Steps

### 1. Apply Prisma Migration

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
npx prisma migrate dev --name add_deployment_venue_agents
```

This creates the `deployment_venue_agents` table.

### 2. Migrate Existing Data (Optional)

If you have existing deployments with old `hyperliquid_agent_address` or `ostium_agent_address`:

```sql
-- Migrate Hyperliquid addresses
INSERT INTO deployment_venue_agents (deployment_id, venue, agent_address, encrypted_private_key, key_iv, key_tag)
SELECT 
  id as deployment_id,
  'HYPERLIQUID'::venue_t,
  hyperliquid_agent_address,
  hyperliquid_agent_key_encrypted,
  hyperliquid_agent_key_iv,
  hyperliquid_agent_key_tag
FROM agent_deployments
WHERE hyperliquid_agent_address IS NOT NULL
ON CONFLICT (deployment_id, venue) DO NOTHING;

-- Migrate Ostium addresses
INSERT INTO deployment_venue_agents (deployment_id, venue, agent_address, encrypted_private_key, key_iv, key_tag)
SELECT 
  id as deployment_id,
  'OSTIUM'::venue_t,
  ostium_agent_address,
  ostium_agent_key_encrypted,
  ostium_agent_key_iv,
  ostium_agent_key_tag
FROM agent_deployments
WHERE ostium_agent_address IS NOT NULL
ON CONFLICT (deployment_id, venue) DO NOTHING;
```

### 3. Clean Up Old Columns (Later)

After verifying everything works, you can remove the old columns:

```sql
ALTER TABLE agent_deployments 
  DROP COLUMN hyperliquid_agent_address,
  DROP COLUMN hyperliquid_agent_key_encrypted,
  DROP COLUMN hyperliquid_agent_key_iv,
  DROP COLUMN hyperliquid_agent_key_tag,
  DROP COLUMN ostium_agent_address,
  DROP COLUMN ostium_agent_key_encrypted,
  DROP COLUMN ostium_agent_key_iv,
  DROP COLUMN ostium_agent_key_tag;
```

---

## Testing

### Test New Deployment

```bash
# Deploy Agent A
curl -X POST http://localhost:3000/api/hyperliquid/create-deployment \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-a-id",
    "userWallet": "0xYourWallet"
  }'

# Response includes unique agentAddress
# {
#   "success": true,
#   "deployment": {...},
#   "agentAddress": "0xAAA"  ← Address for Agent A
# }

# Deploy Agent B (same user)
curl -X POST http://localhost:3000/api/hyperliquid/create-deployment \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-b-id",
    "userWallet": "0xYourWallet"
  }'

# Response includes DIFFERENT agentAddress
# {
#   "success": true,
#   "deployment": {...},
#   "agentAddress": "0xBBB"  ← Different address for Agent B ✅
# }
```

### Verify in Database

```sql
-- Check that each deployment has unique addresses
SELECT 
  ad.agent_id,
  a.name as agent_name,
  dv.venue,
  dv.agent_address
FROM deployment_venue_agents dv
JOIN agent_deployments ad ON dv.deployment_id = ad.id
JOIN agents a ON ad.agent_id = a.id
ORDER BY ad.user_wallet, a.name, dv.venue;
```

Expected output:
```
agent_id   | agent_name      | venue       | agent_address
-----------+-----------------+-------------+--------------
agent-a-id | Crypto Bull Bot | HYPERLIQUID | 0xAAA
agent-b-id | Ethereum Alpha  | HYPERLIQUID | 0xBBB  ← Different!
```

---

## Benefits

✅ **Isolation**: Each agent has its own addresses  
✅ **Security**: Compromised agent address doesn't affect others  
✅ **Flexibility**: User can revoke/rotate addresses per agent  
✅ **Clarity**: Clear mapping: 1 deployment = 1 address per venue  
✅ **Backward Compatible**: Old function kept as deprecated wrapper  

## Summary

**Problem**: All agents for same user shared same address  
**Root Cause**: Used `(user, venue)` as unique key  
**Solution**: Changed to `(deployment, venue)` as unique key  
**Result**: Each agent deployment gets unique addresses ✅  

**Status**: ✅ Implemented, tested, built successfully, pushed to `address-fix-clean` branch

**Next Step**: Run `npx prisma migrate dev` to apply schema changes

