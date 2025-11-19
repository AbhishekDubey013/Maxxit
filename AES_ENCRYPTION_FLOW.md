# AES Encryption Flow - Complete Guide

## Overview

The system uses **AES-256-GCM** encryption to secure private keys for agent addresses. This document shows exactly where encryption and decryption are executed.

---

## 🔐 Encryption Implementation

### Core Encryption Function

**Location:** `lib/deployment-agent-address.ts`

```typescript
function encryptPrivateKey(privateKey: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const key = getEncryptionKey();  // From ENCRYPTION_KEY env var
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}
```

**Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** `crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)`
- **IV:** Random 16 bytes (generated per encryption)
- **Auth Tag:** 16 bytes (for integrity verification)

---

## 📍 Where Encryption is Executed

### 1. **Agent Address Generation** (First Time User Deploys)

**File:** `lib/deployment-agent-address.ts`

**Function:** `generateAgentWallet()`
```typescript
export function generateAgentWallet(): {
  address: string;
  privateKey: string;
  encrypted: { encrypted: string; iv: string; tag: string; };
} {
  const wallet = ethers.Wallet.createRandom();
  const privateKey = wallet.privateKey;
  
  const encrypted = encryptPrivateKey(privateKey);  // 🔐 ENCRYPTION HAPPENS HERE
  
  return {
    address: wallet.address,
    privateKey,
    encrypted,
  };
}
```

**Called By:**
- `getOrCreateHyperliquidAgentAddress()` - Line 191
- `getOrCreateOstiumAgentAddress()` - Line 280

**API Endpoint:** `POST /api/agents/[id]/generate-deployment-address`

**Flow:**
```
User clicks "Deploy Agent"
  ↓
Frontend calls /api/agents/[id]/generate-deployment-address
  ↓
getOrCreateHyperliquidAgentAddress() or getOrCreateOstiumAgentAddress()
  ↓
generateAgentWallet() → encryptPrivateKey()  🔐 ENCRYPTION
  ↓
Store in user_agent_addresses table:
  - hyperliquid_agent_key_encrypted
  - hyperliquid_agent_key_iv
  - hyperliquid_agent_key_tag
```

---

## 🔓 Where Decryption is Executed

### 1. **Trade Execution** (Hyperliquid)

**File:** `lib/trade-executor.ts`

**Function:** `executeHyperliquidTrade()`
```typescript
// Gets user's Hyperliquid agent address
const userAddress = await prisma.user_agent_addresses.findUnique({
  where: { user_wallet: deployment.user_wallet.toLowerCase() },
  select: { hyperliquid_agent_address: true },
});

// Gets private key (decrypts automatically)
const agentPrivateKey = await getHyperliquidPrivateKey(deployment.id);  // 🔓 DECRYPTION
```

**Called By:**
- `getHyperliquidPrivateKey(deploymentId)` → `decryptPrivateKey()` - Line 358
- `getOstiumPrivateKey(deploymentId)` → `decryptPrivateKey()` - Line 400
- `getPrivateKeyByAddress(agentAddress)` → `decryptPrivateKey()` - Lines 436, 464

---

### 2. **Trade Execution Worker** (Microservice)

**File:** `services/trade-executor-worker/src/lib/wallet-helper.ts`

**Function:** `getPrivateKeyForAddress(agentAddress)`
```typescript
export async function getPrivateKeyForAddress(agentAddress: string): Promise<string | null> {
  // Query user_agent_addresses
  const hlUserAddress = await prisma.user_agent_addresses.findFirst({
    where: { hyperliquid_agent_address: normalizedAddress },
    select: {
      hyperliquid_agent_key_encrypted: true,
      hyperliquid_agent_key_iv: true,
      hyperliquid_agent_key_tag: true,
    },
  });

  if (hlUserAddress) {
    return decryptPrivateKey(  // 🔓 DECRYPTION
      hlUserAddress.hyperliquid_agent_key_encrypted,
      hlUserAddress.hyperliquid_agent_key_iv,
      hlUserAddress.hyperliquid_agent_key_tag
    );
  }
  // ... Ostium fallback ...
}
```

**Called By:**
- `services/trade-executor-worker/src/lib/trade-executor.ts`
  - `executeHyperliquidTrade()` - Line 65
  - `executeOstiumTrade()` - Line 141

---

### 3. **Position Closing** (Hyperliquid)

**File:** `lib/hyperliquid-utils.ts`

**Function:** `closeHyperliquidPosition()`
```typescript
// Get user's Hyperliquid agent address
const userAddress = await prisma.user_agent_addresses.findUnique({
  where: { user_wallet: deployment.user_wallet.toLowerCase() },
  select: { hyperliquid_agent_address: true },
});

// Get agent private key (decrypts)
const agentPrivateKey = await getPrivateKeyForAddress(userAddress.hyperliquid_agent_address);  // 🔓 DECRYPTION
```

**Called By:**
- `lib/trade-executor.ts` → `closeHyperliquidPositionMethod()`

---

### 4. **Existing Address Retrieval** (When User Already Has Address)

**File:** `lib/deployment-agent-address.ts`

**Function:** `getOrCreateHyperliquidAgentAddress()`
```typescript
// If address already exists, decrypt and return
if (userAddress && userAddress.hyperliquid_agent_address) {
  const privateKey = decryptPrivateKey(  // 🔓 DECRYPTION
    userAddress.hyperliquid_agent_key_encrypted,
    userAddress.hyperliquid_agent_key_iv,
    userAddress.hyperliquid_agent_key_tag
  );
  
  return {
    address: userAddress.hyperliquid_agent_address,
    privateKey,
    encrypted: { ... },
  };
}
```

**Called By:**
- `POST /api/agents/[id]/generate-deployment-address` (when user already has address)

---

## 🔑 Encryption Key Management

### Key Source

**File:** `lib/deployment-agent-address.ts`

**Function:** `getEncryptionKey()`
```typescript
function getEncryptionKey(): Buffer {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.MASTER_ENCRYPTION_KEY;
  
  if (!ENCRYPTION_KEY) {
    // Fallback for development (NOT SECURE)
    console.warn('⚠️  WARNING: No ENCRYPTION_KEY found! Using fallback key.');
    return crypto.scryptSync('fallback-dev-key', 'salt', 32);
  }
  
  return crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
}
```

**Environment Variables:**
- `ENCRYPTION_KEY` (primary)
- `MASTER_ENCRYPTION_KEY` (fallback)

**Key Derivation:** `scryptSync(key, 'salt', 32)` → 32-byte key for AES-256

---

## 📊 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ENCRYPTION FLOW                          │
└─────────────────────────────────────────────────────────────┘

User Deploys Agent (First Time)
  ↓
POST /api/agents/[id]/generate-deployment-address
  ↓
getOrCreateHyperliquidAgentAddress()
  ↓
generateAgentWallet()
  ├─ ethers.Wallet.createRandom()
  └─ encryptPrivateKey(privateKey)  🔐 ENCRYPTION
      ├─ crypto.createCipheriv('aes-256-gcm', key, iv)
      ├─ cipher.update(privateKey, 'utf8', 'hex')
      ├─ cipher.final('hex')
      └─ cipher.getAuthTag()
  ↓
Store in user_agent_addresses:
  - hyperliquid_agent_key_encrypted
  - hyperliquid_agent_key_iv
  - hyperliquid_agent_key_tag


┌─────────────────────────────────────────────────────────────┐
│                    DECRYPTION FLOW                          │
└─────────────────────────────────────────────────────────────┘

Trade Execution Request
  ↓
lib/trade-executor.ts → executeHyperliquidTrade()
  ↓
getHyperliquidPrivateKey(deploymentId)
  ├─ Query user_agent_addresses table
  └─ decryptPrivateKey(encrypted, iv, tag)  🔓 DECRYPTION
      ├─ crypto.createDecipheriv('aes-256-gcm', key, iv)
      ├─ decipher.setAuthTag(tag)
      ├─ decipher.update(encrypted, 'hex', 'utf8')
      └─ decipher.final('utf8')
  ↓
Return plaintext privateKey
  ↓
Use for signing Hyperliquid trades
```

---

## 🗂️ Files Summary

| File | Purpose | Encryption | Decryption |
|------|---------|-----------|------------|
| `lib/deployment-agent-address.ts` | Core encryption/decryption logic | ✅ `encryptPrivateKey()` | ✅ `decryptPrivateKey()` |
| `pages/api/agents/[id]/generate-deployment-address.ts` | API endpoint for address generation | ✅ Calls `generateAgentWallet()` | ✅ Calls `getOrCreate*()` |
| `lib/trade-executor.ts` | Main trade execution | ❌ | ✅ `getHyperliquidPrivateKey()` |
| `lib/hyperliquid-utils.ts` | Hyperliquid utilities | ❌ | ✅ `getPrivateKeyForAddress()` |
| `lib/wallet-pool.ts` | Wallet pool (legacy) | ❌ | ✅ `getPrivateKeyForAddress()` |
| `services/trade-executor-worker/src/lib/wallet-helper.ts` | Microservice wallet helper | ❌ | ✅ `decryptPrivateKey()` |

---

## 🔒 Security Notes

1. **One Master Key:** `ENCRYPTION_KEY` is a single master key that encrypts ALL user private keys
2. **Per-Encryption IV:** Each encryption uses a unique random IV (prevents pattern attacks)
3. **Auth Tag:** GCM mode provides authentication (prevents tampering)
4. **Key Storage:** Encryption key is NEVER stored in database (only in environment variables)
5. **Fallback Warning:** If `ENCRYPTION_KEY` is missing, uses insecure fallback (development only)

---

## 🚨 Error Handling

**Decryption Errors:**
- `ERR_CRYPTO_INVALID_TAG`: Wrong encryption key or corrupted data
- `bad decrypt`: Key mismatch or missing `ENCRYPTION_KEY`

**Error Messages:**
```typescript
if (!hasEncryptionKey) {
  throw new Error(
    'Decryption failed: ENCRYPTION_KEY environment variable is missing.'
  );
} else {
  throw new Error(
    'Decryption failed: The encryption key does not match the key used to encrypt this data.'
  );
}
```

---

## ✅ Summary

**Encryption Executed:**
- ✅ `lib/deployment-agent-address.ts` → `encryptPrivateKey()` (Line 46)
- ✅ Called when: `generateAgentWallet()` creates new agent address (Line 123)

**Decryption Executed:**
- ✅ `lib/deployment-agent-address.ts` → `decryptPrivateKey()` (Line 69)
- ✅ Called when:
  - `getHyperliquidPrivateKey()` - Line 358
  - `getOstiumPrivateKey()` - Line 400
  - `getPrivateKeyByAddress()` - Lines 436, 464
  - `getOrCreateHyperliquidAgentAddress()` - Line 173 (existing address)
  - `getOrCreateOstiumAgentAddress()` - Line 280 (existing address)
- ✅ `services/trade-executor-worker/src/lib/wallet-helper.ts` → `decryptPrivateKey()` (Line 34)
  - Called by `getPrivateKeyForAddress()` - Lines 100, 128

**All encryption/decryption uses AES-256-GCM with a master `ENCRYPTION_KEY` environment variable.**

