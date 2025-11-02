# Hyperliquid User Wallet Architecture

## 🎯 Problem Statement

**Current Issue:**
- Hyperliquid only allows ONE agent address to be whitelisted per user account
- If a user subscribes to multiple agents, they get multiple agent addresses
- But they can only whitelist ONE address on Hyperliquid
- This breaks multi-agent subscriptions

**Solution:**
- Assign ONE agent address per USER (not per deployment)
- All agents the user subscribes to will use this same address
- User only needs to whitelist this one address on Hyperliquid

---

## 🏗️ Architecture Design

### Option 1: One Address Per User ⭐ RECOMMENDED

```
User (0xABC...) subscribes to:
  - Ring Agent → Uses shared address 0x123...
  - Vader Agent → Uses shared address 0x123... (SAME!)
  - Luna Agent → Uses shared address 0x123... (SAME!)

User only whitelists 0x123... once on Hyperliquid
All 3 agents can now trade on their behalf!
```

**Pros:**
- ✅ User-friendly (whitelist once)
- ✅ Supports multiple agent subscriptions
- ✅ One private key to manage per user
- ✅ Simpler for users

**Cons:**
- ⚠️ All agents share same wallet (security consideration)
- ⚠️ Need to track which agent initiated which trade

---

### Option 2: One Address Per Deployment (Current)

```
User (0xABC...) subscribes to:
  - Ring Agent → Gets unique address 0x123...
  - Vader Agent → Gets unique address 0x456...
  - Luna Agent → Gets unique address 0x789...

User can only whitelist ONE address at a time
Must choose which agent to activate
```

**Pros:**
- ✅ Better isolation between agents
- ✅ Easier to track which agent did what

**Cons:**
- ❌ User can only use one agent at a time
- ❌ Must whitelist/unwhitelist when switching agents
- ❌ Poor UX for multi-agent users

---

## ✅ Recommended: Option 1 (One Per User)

---

## 📊 Database Schema

### New Table: `user_hyperliquid_wallets`

```sql
CREATE TABLE user_hyperliquid_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet VARCHAR(42) UNIQUE NOT NULL,  -- User's MetaMask address
  agent_address VARCHAR(42) UNIQUE NOT NULL, -- Generated agent wallet
  agent_private_key_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted
  agent_key_iv TEXT NOT NULL,                -- Encryption IV
  agent_key_tag TEXT NOT NULL,               -- Encryption auth tag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  INDEX idx_user_wallet (user_wallet),
  INDEX idx_agent_address (agent_address)
);
```

### Updated: `agent_deployments`

```sql
-- Remove these fields (no longer needed):
-- hyperliquid_agent_address
-- hyperliquid_agent_private_key_encrypted
-- hyperliquid_agent_key_iv
-- hyperliquid_agent_key_tag

-- Keep:
-- venue (HYPERLIQUID, SPOT)
-- user_wallet
-- agent_id
```

---

## 🔧 Implementation

### 1. Wallet Generation Service

**File:** `lib/hyperliquid-user-wallet.ts`

```typescript
import { ethers } from 'ethers';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = Buffer.from(
  process.env.AGENT_WALLET_ENCRYPTION_KEY || '',
  'hex'
);

/**
 * Generate a new agent wallet for a user
 */
export async function generateUserAgentWallet(userWallet: string): Promise<string> {
  console.log(`[Hyperliquid] Generating new agent wallet for user ${userWallet}`);

  // Generate random wallet
  const wallet = ethers.Wallet.createRandom();
  const agentAddress = wallet.address;
  const privateKey = wallet.privateKey;

  // Encrypt private key
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Store in database
  await prisma.user_hyperliquid_wallets.create({
    data: {
      user_wallet: userWallet.toLowerCase(),
      agent_address: agentAddress,
      agent_private_key_encrypted: encrypted,
      agent_key_iv: iv.toString('hex'),
      agent_key_tag: authTag.toString('hex'),
    },
  });

  console.log(`[Hyperliquid] Generated agent wallet: ${agentAddress} for user ${userWallet}`);
  return agentAddress;
}

/**
 * Get or create agent wallet for a user
 */
export async function getUserAgentWallet(userWallet: string): Promise<string> {
  // Check if user already has an agent wallet
  const existing = await prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: userWallet.toLowerCase() },
  });

  if (existing) {
    console.log(`[Hyperliquid] Using existing agent wallet ${existing.agent_address} for user ${userWallet}`);
    return existing.agent_address;
  }

  // Generate new one
  return await generateUserAgentWallet(userWallet);
}

/**
 * Get decrypted private key for user's agent wallet
 */
export async function getUserAgentPrivateKey(userWallet: string): Promise<string> {
  const wallet = await prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: userWallet.toLowerCase() },
  });

  if (!wallet) {
    throw new Error(`No agent wallet found for user ${userWallet}`);
  }

  // Decrypt private key
  const iv = Buffer.from(wallet.agent_key_iv, 'hex');
  const authTag = Buffer.from(wallet.agent_key_tag, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(wallet.agent_private_key_encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Get agent address for a user
 */
export async function getAgentAddressForUser(userWallet: string): Promise<string | null> {
  const wallet = await prisma.user_hyperliquid_wallets.findUnique({
    where: { user_wallet: userWallet.toLowerCase() },
  });

  return wallet?.agent_address || null;
}
```

---

### 2. Update Deployment Flow

**File:** `pages/api/safe/deploy-agent.ts` (or wherever deployment happens)

```typescript
import { getUserAgentWallet } from '../../../lib/hyperliquid-user-wallet';

// When user subscribes to an agent
async function createDeployment(userWallet: string, agentId: string, venue: string) {
  let agentAddress = null;

  // For Hyperliquid, get or create user's agent wallet
  if (venue === 'HYPERLIQUID') {
    agentAddress = await getUserAgentWallet(userWallet);
    console.log(`[Deploy] User ${userWallet} will use agent address: ${agentAddress}`);
  }

  // Create deployment (no need to store agent keys here anymore)
  const deployment = await prisma.agent_deployments.create({
    data: {
      agent_id: agentId,
      user_wallet: userWallet,
      venue: venue,
      // No hyperliquid_agent_address field needed!
      // We'll look it up via user_wallet when needed
    },
  });

  return { deployment, agentAddress };
}
```

---

### 3. Update Trade Execution

**File:** `workers/trade-executor-worker.ts`

```typescript
import { getUserAgentPrivateKey, getAgentAddressForUser } from '../lib/hyperliquid-user-wallet';

async function executeHyperliquidTrade(signal, deployment) {
  try {
    // Get user's agent wallet
    const agentAddress = await getAgentAddressForUser(deployment.user_wallet);
    if (!agentAddress) {
      throw new Error(`No agent wallet found for user ${deployment.user_wallet}`);
    }

    // Get decrypted private key
    const privateKey = await getUserAgentPrivateKey(deployment.user_wallet);

    // Initialize Hyperliquid adapter
    const hl = new HyperliquidAdapter(
      agentAddress,
      privateKey,
      deployment.chain === 'testnet'
    );

    // Execute trade
    const result = await hl.openPosition({
      symbol: signal.token_symbol,
      side: signal.side,
      usdAmount: calculatedSize,
      leverage: 1,
    });

    console.log(`✅ Executed: ${signal.token_symbol} for user ${deployment.user_wallet} via agent ${agentAddress}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to execute Hyperliquid trade:`, error.message);
    throw error;
  }
}
```

---

## 🎯 User Flow

### First Agent Subscription

1. User visits platform, connects MetaMask
2. User subscribes to "Ring Agent" (Hyperliquid)
3. Backend:
   - Checks if user has agent wallet → NO
   - Generates new wallet: `0x9fD20FACeeEf805Ed4D6Baba936d20d8C73f3176`
   - Encrypts private key and stores it
4. UI shows:
   ```
   ✅ Agent wallet generated: 0x9fD20FACeeEf805Ed4D6Baba936d20d8C73f3176
   
   Next step: Whitelist this address on Hyperliquid
   1. Visit https://app.hyperliquid.xyz/API
   2. Add address: 0x9fD20FACeeEf805Ed4D6Baba936d20d8C73f3176
   3. Approve for trading
   ```

### Second Agent Subscription

1. User subscribes to "Vader Agent" (also Hyperliquid)
2. Backend:
   - Checks if user has agent wallet → YES
   - Reuses existing: `0x9fD20FACeeEf805Ed4D6Baba936d20d8C73f3176`
3. UI shows:
   ```
   ✅ Using your existing agent wallet: 0x9fD20...
   
   No additional setup needed!
   Both Ring Agent and Vader Agent will use the same whitelisted address.
   ```

---

## 🔒 Security Considerations

### Pros
- ✅ User only whitelists once
- ✅ Private keys encrypted with AES-256-GCM
- ✅ One key per user (simpler management)
- ✅ Non-custodial (agent can't withdraw)

### Cons & Mitigations

**1. Shared wallet across agents**
- **Risk:** If one agent is malicious, it has access to the wallet
- **Mitigation:** 
  - Hyperliquid agent can ONLY trade (no withdrawals)
  - Monitor all trades and allow user to revoke
  - Add per-agent position limits

**2. Trade attribution**
- **Risk:** Hard to know which agent initiated which trade
- **Mitigation:**
  - Store `agent_id` with each position
  - Query Hyperliquid for trade history
  - Cross-reference with database records

**3. Private key security**
- **Risk:** If encryption key is compromised, all user wallets exposed
- **Mitigation:**
  - Use strong 32-byte encryption key
  - Rotate key periodically
  - Consider HSM for production

---

## 📊 Comparison

| Aspect | One Per User | One Per Deployment |
|--------|-------------|-------------------|
| **Whitelisting** | Once | Multiple times |
| **Multi-agent support** | ✅ Yes | ❌ Limited |
| **User experience** | ✅ Simple | ❌ Complex |
| **Trade isolation** | ⚠️ Shared | ✅ Isolated |
| **Security** | ⚠️ Shared risk | ✅ Per-agent |
| **Management** | ✅ Simple | ❌ Complex |

---

## 🚀 Migration Path

If you already have deployments with individual agent addresses:

```typescript
async function migrateToUserWallets() {
  // Get all unique users with Hyperliquid deployments
  const users = await prisma.agent_deployments.findMany({
    where: { venue: 'HYPERLIQUID' },
    distinct: ['user_wallet'],
    select: { user_wallet: true },
  });

  for (const { user_wallet } of users) {
    // Generate user's agent wallet
    const agentAddress = await getUserAgentWallet(user_wallet);
    
    console.log(`Migrated user ${user_wallet} → agent ${agentAddress}`);
  }

  console.log(`✅ Migrated ${users.length} users`);
}
```

---

## ✅ Recommendation

**Use One Address Per User** because:

1. **Better UX:** User only whitelists once
2. **Simpler:** One address to manage
3. **Scalable:** User can subscribe to unlimited agents
4. **Secure:** Hyperliquid agent can't withdraw anyway

**Trade-off:** All agents share same wallet, but this is acceptable because:
- Hyperliquid agents are non-custodial (no withdrawals)
- User can revoke access anytime
- Positions are tracked per agent in database

---

## 📝 Action Items

1. Create `user_hyperliquid_wallets` table
2. Implement `lib/hyperliquid-user-wallet.ts`
3. Update deployment flow to use shared wallet
4. Update trade executor to look up by user_wallet
5. Update UI to show single agent address per user
6. Migrate existing deployments (if any)

---

**This architecture supports unlimited agent subscriptions per user with a single whitelist! 🚀**

