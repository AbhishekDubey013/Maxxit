# Encryption Key Setup Guide

## 🔐 What is the Encryption Key?

The `ENCRYPTION_KEY` (or `MASTER_ENCRYPTION_KEY`) is used to encrypt/decrypt private keys for user agent addresses stored in the `user_agent_addresses` table.

**Purpose:**
- Encrypts agent private keys before storing in database
- Decrypts agent private keys when needed for trading
- Ensures private keys are never stored in plaintext

---

## 🔑 Where to Get the Encryption Key

**If you're setting up for the first time:**
1. Generate a secure random key (32+ characters recommended)
2. Store it securely (password manager, secrets manager)
3. Set it as environment variable

**If you have existing encrypted keys in database:**
- You MUST use the SAME key that was used to encrypt them
- If you don't know the original key, you'll need to regenerate agent addresses for all users

**Generate a new key:**
```bash
# Option 1: Using OpenSSL
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Example key format:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

---

## 📍 Which Services Need This Key?

### ✅ **REQUIRED Services:**

#### **1. Main Next.js App (Railway/Production)**
**Service:** Main web application  
**Why:** Handles API routes that generate/retrieve agent addresses

**Environment Variables:**
```bash
ENCRYPTION_KEY=your-encryption-key-here
# OR
MASTER_ENCRYPTION_KEY=your-encryption-key-here
```

**Used in:**
- `pages/api/agents/[id]/generate-deployment-address.ts` - Generates user agent addresses
- `lib/deployment-agent-address.ts` - Encrypts/decrypts private keys
- `lib/wallet-pool.ts` - Retrieves private keys for trading
- `lib/hyperliquid-utils.ts` - Closes Hyperliquid positions
- `lib/trade-executor.ts` - Executes trades (uses wallet-pool)

---

#### **2. Trade Executor Worker** (if running as separate service)
**Service:** `services/trade-executor-worker/`  
**Why:** Executes trades and needs to decrypt agent private keys

**Environment Variables:**
```bash
ENCRYPTION_KEY=your-encryption-key-here
DATABASE_URL=postgresql://...
```

**Used in:**
- `lib/trade-executor.ts` - Executes trades
- `lib/wallet-pool.ts` - Gets private keys
- `lib/hyperliquid-utils.ts` - Closes positions

---

#### **3. Position Monitor Worker** (if running as separate service)
**Service:** `services/position-monitor-worker/`  
**Why:** Closes positions and needs to decrypt agent private keys

**Environment Variables:**
```bash
ENCRYPTION_KEY=your-encryption-key-here
DATABASE_URL=postgresql://...
```

**Used in:**
- `lib/hyperliquid-utils.ts` - Closes Hyperliquid positions
- `lib/wallet-pool.ts` - Gets private keys

---

### ❌ **NOT Required Services:**

These services don't need the encryption key:
- `services/telegram-alpha-worker/` - Only processes messages
- `services/tweet-ingestion-worker/` - Only ingests tweets
- `services/signal-generator-worker/` - Only generates signals
- `services/research-signal-worker/` - Only processes research
- `services/metrics-updater-worker/` - Only calculates metrics
- `services/agent-api/` - Only manages agent data
- `services/deployment-api/` - Only manages deployments
- `services/signal-api/` - Only serves signals
- Python services (`hyperliquid-service.py`, `ostium-service.py`) - Don't use encryption

---

## 🚀 How to Set on Railway

### **For Main Next.js App:**

1. Go to your Railway project
2. Select the main web service
3. Go to **Variables** tab
4. Add new variable:
   - **Name:** `ENCRYPTION_KEY`
   - **Value:** `your-encryption-key-here` (paste the key)
5. Click **Add**
6. Redeploy the service

### **For Trade Executor Worker (if separate):**

1. Select the `trade-executor-worker` service
2. Go to **Variables** tab
3. Add `ENCRYPTION_KEY` with the same value
4. Redeploy

### **For Position Monitor Worker (if separate):**

1. Select the `position-monitor-worker` service
2. Go to **Variables** tab
3. Add `ENCRYPTION_KEY` with the same value
4. Redeploy

---

## ⚠️ **IMPORTANT Notes:**

### **1. Key Must Be Consistent**
- **ALL services** that need the key must use the **SAME** key
- If services use different keys, decryption will fail

### **2. Key Must Match Database**
- If you have existing encrypted keys in `user_agent_addresses` table
- You MUST use the key that was used to encrypt them
- Otherwise, you'll get decryption errors

### **3. Security Best Practices**
- ✅ Store key in environment variables (never in code)
- ✅ Use Railway secrets manager or similar
- ✅ Rotate key periodically (requires re-encrypting all keys)
- ✅ Never commit key to git
- ✅ Use different keys for dev/staging/production

### **4. If You Lost the Key**
If you don't know the original encryption key:
1. Users will need to regenerate their agent addresses
2. They'll need to re-whitelist on Hyperliquid/Ostium
3. Old positions may not be closable (if they still exist)

**To regenerate addresses:**
- Delete records from `user_agent_addresses` table
- Users redeploy agents (will generate new addresses)

---

## 🧪 Testing the Key

You can test if your encryption key is working:

```bash
# Test endpoint (if available)
curl https://your-domain.com/api/test-encryption-key

# Should return:
# { "hasKey": true }
```

Or check logs when deploying an agent:
- ✅ Should see: `[UserAgentAddress] ✅ Created new Hyperliquid agent address`
- ❌ Should NOT see: `⚠️  WARNING: No ENCRYPTION_KEY found!`

---

## 📋 Checklist

- [ ] Generated secure encryption key (32+ characters)
- [ ] Set `ENCRYPTION_KEY` in main Next.js app
- [ ] Set `ENCRYPTION_KEY` in trade-executor-worker (if separate)
- [ ] Set `ENCRYPTION_KEY` in position-monitor-worker (if separate)
- [ ] Verified key is the same across all services
- [ ] Verified key matches existing encrypted keys (if any)
- [ ] Tested agent deployment (should work without warnings)
- [ ] Tested position closing (should work without decryption errors)

---

## 🔍 Troubleshooting

### **Error: "Decryption failed: ENCRYPTION_KEY environment variable is missing"**
**Solution:** Set `ENCRYPTION_KEY` or `MASTER_ENCRYPTION_KEY` environment variable

### **Error: "Decryption failed: The encryption key does not match"**
**Solution:** 
- Verify you're using the correct key
- Check if key was changed after encryption
- May need to regenerate agent addresses

### **Warning: "No ENCRYPTION_KEY found - using fallback"**
**Solution:** Set `ENCRYPTION_KEY` environment variable (fallback won't decrypt existing keys)

### **Position close fails with decryption error**
**Solution:** 
- Check `ENCRYPTION_KEY` is set in the service closing positions
- Verify key matches the one used to encrypt

---

## 📚 Related Files

- `lib/deployment-agent-address.ts` - Encryption/decryption logic
- `lib/wallet-pool.ts` - Retrieves private keys
- `lib/hyperliquid-utils.ts` - Uses keys for position closing
- `lib/trade-executor.ts` - Uses keys for trade execution

---

## 🔄 Migration Notes

**Old System (deprecated):**
- Used `AGENT_WALLET_ENCRYPTION_KEY` (different key)
- Stored in `user_hyperliquid_wallets` table
- Still supported for backward compatibility

**New System (current):**
- Uses `ENCRYPTION_KEY` or `MASTER_ENCRYPTION_KEY`
- Stores in `user_agent_addresses` table
- One address per user (shared across all agents)

**If migrating:**
- You may need BOTH keys temporarily
- Old keys in `user_hyperliquid_wallets` use `AGENT_WALLET_ENCRYPTION_KEY`
- New keys in `user_agent_addresses` use `ENCRYPTION_KEY`

