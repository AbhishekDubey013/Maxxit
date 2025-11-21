# 🔑 Encryption Key Quick Setup

## Generated Key (Keep This Secret!)

```
3295f0745260f0420509005dec8580174ef604c8cf7b1e9e2ccd4946d8f082e1
```

**⚠️ IMPORTANT:** This key encrypts all user private keys. Keep it secure!

---

## 🚀 Where to Set It

### **Railway Services That Need This Key:**

1. **Main Next.js App** (your web service)
2. **Trade Executor Worker** (if running separately)
3. **Position Monitor Worker** (if running separately)

---

## 📝 Step-by-Step: Railway Setup

### **For Each Service:**

1. Go to Railway dashboard
2. Select the service
3. Click **Variables** tab
4. Click **+ New Variable**
5. Add:
   - **Name:** `ENCRYPTION_KEY`
   - **Value:** `3295f0745260f0420509005dec8580174ef604c8cf7b1e9e2ccd4946d8f082e1`
6. Click **Add**
7. Service will auto-redeploy

---

## ✅ Verify It's Working

After setting the key, check logs:

**✅ Good (key is set):**
```
[DeploymentAgentAddress] ✅ Encryption key found
```

**❌ Bad (key missing):**
```
[WalletHelper] ⚠️  WARNING: No ENCRYPTION_KEY found!
```

---

## 🔄 If You Have Existing Encrypted Keys

**If you already have agent addresses in the database:**
- You MUST use the SAME key that encrypted them
- If you don't know the original key, you'll need to:
  1. Delete old addresses from `user_agent_addresses` table
  2. Users redeploy agents (will generate new addresses)
  3. Users re-whitelist on Hyperliquid/Ostium

**If this is a fresh setup:**
- Use the generated key above
- All new addresses will be encrypted with this key

---

## 📋 Quick Checklist

- [ ] Set `ENCRYPTION_KEY` in main Next.js app
- [ ] Set `ENCRYPTION_KEY` in trade-executor-worker
- [ ] Set `ENCRYPTION_KEY` in position-monitor-worker
- [ ] Verify same key in all services
- [ ] Check logs - no warnings about missing key
- [ ] Test agent deployment - should work without errors

---

## 🔍 About the Hyperliquid Error

The other error you saw:
```
Order must have minimum value of $10. asset=13
```

This is a **different issue** - Hyperliquid requires minimum $10 per trade. This is a trading constraint, not related to encryption.

---

## 💡 Generate a New Key (if needed)

If you want to generate a different key:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## 🔐 Security Notes

- ✅ Never commit this key to git
- ✅ Store in Railway secrets/environment variables
- ✅ Use same key across all services
- ✅ Keep a backup in a secure password manager
- ✅ Rotate periodically (requires re-encrypting all keys)


