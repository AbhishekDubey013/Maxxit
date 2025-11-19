# Encryption Key: One Key for ALL Users

## 🔑 **Answer: ONE encryption key for ALL users**

The `ENCRYPTION_KEY` is a **master key** that encrypts/decrypts **all** user agent private keys.

---

## 📊 How It Works

```
┌─────────────────────────────────────────────────────────┐
│              ONE ENCRYPTION_KEY (Master)                │
│                                                          │
│  Used to encrypt/decrypt ALL user agent private keys     │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│         user_agent_addresses Table                       │
├─────────────────────────────────────────────────────────┤
│ User 1:                                                  │
│   - hyperliquid_agent_address: 0xABC...                 │
│   - hyperliquid_agent_key_encrypted: [encrypted]        │
│   - hyperliquid_agent_key_iv: [iv]                      │
│   - hyperliquid_agent_key_tag: [tag]                    │
│                                                          │
│ User 2:                                                  │
│   - hyperliquid_agent_address: 0xDEF...                 │
│   - hyperliquid_agent_key_encrypted: [encrypted]        │
│   - hyperliquid_agent_key_iv: [iv]                      │
│   - hyperliquid_agent_key_tag: [tag]                    │
│                                                          │
│ User 3:                                                  │
│   - hyperliquid_agent_address: 0x123...                 │
│   - hyperliquid_agent_key_encrypted: [encrypted]        │
│   - hyperliquid_agent_key_iv: [iv]                      │
│   - hyperliquid_agent_key_tag: [tag]                    │
└─────────────────────────────────────────────────────────┘
```

**Key Points:**
- ✅ **ONE** `ENCRYPTION_KEY` for the entire system
- ✅ Encrypts **ALL** user agent private keys
- ✅ Same key used to encrypt and decrypt
- ✅ Stored as environment variable (not in database)

---

## 🔐 Encryption Flow

### **When User Deploys First Agent:**

1. System generates new agent wallet (private key)
2. Uses `ENCRYPTION_KEY` to encrypt the private key
3. Stores encrypted key + IV + tag in `user_agent_addresses` table
4. Each user gets their own encrypted key (but all use same master key)

### **When Closing Position:**

1. System retrieves encrypted key from `user_agent_addresses` table
2. Uses `ENCRYPTION_KEY` to decrypt the private key
3. Uses decrypted key to sign transaction

---

## 💡 Why One Key for All?

**Advantages:**
- ✅ Simple to manage (one environment variable)
- ✅ Easy to rotate (change one key, re-encrypt all)
- ✅ Consistent security across all users
- ✅ No per-user key management complexity

**Security:**
- Each user still has a **unique agent address** and **unique private key**
- The encryption key just protects the private keys in storage
- Even if someone gets the encryption key, they'd need database access
- Each encrypted key has its own IV (initialization vector) for uniqueness

---

## 🔄 Key Rotation

If you need to rotate the encryption key:

1. **Generate new key:**
   ```bash
   openssl rand -hex 32
   ```

2. **Re-encrypt all keys:**
   - Read all encrypted keys from database
   - Decrypt with old key
   - Encrypt with new key
   - Update database

3. **Update environment variable:**
   - Set new `ENCRYPTION_KEY` in all services
   - Redeploy services

**Note:** This requires downtime or a migration script.

---

## ❌ NOT Per-User

**What it's NOT:**
- ❌ One key per user
- ❌ Different keys for different users
- ❌ User-specific encryption keys

**What it IS:**
- ✅ One master key for entire system
- ✅ Same key encrypts all user keys
- ✅ Stored as environment variable

---

## 📋 Summary

| Aspect | Details |
|--------|---------|
| **Number of Keys** | ONE master key for all users |
| **Storage** | Environment variable (`ENCRYPTION_KEY`) |
| **Usage** | Encrypts/decrypts all user agent private keys |
| **Per User** | Each user has unique agent address & private key |
| **Encryption** | All encrypted with same master key |
| **Security** | Each encrypted key has unique IV |

---

## 🎯 Quick Answer

**Q: Is it one key per user or same for all?**  
**A: ONE key for ALL users** - it's a master encryption key that protects all user agent private keys in the database.

