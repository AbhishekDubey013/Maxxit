# Python Services Encryption Fix

## Problem

The Python services (`ostium-service.py`) were looking for agent addresses in the old `wallet_pool` table, but the new system stores them in `user_agent_addresses` with encrypted private keys.

Error:
```
Agent address 0xAA7B3404BE0ff8fA0ab4d322d19A90F013B8202b not found in wallet pool
```

---

## Solution

### 1. Created `encryption_helper.py`

Added Python AES-256-GCM decryption to match the Node.js encryption:

**Location:** `services/encryption_helper.py`

**Features:**
- Reads `ENCRYPTION_KEY` or `MASTER_ENCRYPTION_KEY` from environment
- Decrypts private keys using AES-256-GCM (matches `lib/deployment-agent-address.ts`)
- Clear error messages if key is missing or incorrect

---

### 2. Updated `ostium-service.py`

**Changes:**
- `/open-position` endpoint now queries `user_agent_addresses` first
- Decrypts the private key using `encryption_helper.decrypt_private_key()`
- Falls back to `wallet_pool` for legacy addresses

**Query:**
```python
cur.execute(
    """
    SELECT 
        ostium_agent_key_encrypted,
        ostium_agent_key_iv,
        ostium_agent_key_tag
    FROM user_agent_addresses 
    WHERE LOWER(ostium_agent_address) = LOWER(%s)
    """,
    (agent_address,)
)
```

---

## Requirements

### Python Dependencies

Add to your `requirements.txt` or install manually:

```bash
pip install cryptography
```

**Required packages:**
- `cryptography>=41.0.0` - For AES-256-GCM decryption

---

## Environment Variables (Railway)

The Python services need the **SAME** `ENCRYPTION_KEY` as the Node.js services:

### **Ostium Service** (Railway)

1. Go to Railway → Ostium Service → Variables
2. Add:
   - **Name:** `ENCRYPTION_KEY`
   - **Value:** `3295f0745260f0420509005dec8580174ef604c8cf7b1e9e2ccd4946d8f082e1`

### **Hyperliquid Service** (if you use it)

1. Go to Railway → Hyperliquid Service → Variables
2. Add the same `ENCRYPTION_KEY`

---

## Verification

### Test the Encryption Helper

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
python services/encryption_helper.py
```

**Expected output:**
```
✅ ENCRYPTION_KEY found
   Key length: 32 bytes (expected: 32)
```

### Test Ostium Trade

After deploying the fix, retry the trade. You should see:

```
[Ostium] ✅ Found and decrypted agent key for 0xAA7B3404... from user_agent_addresses
```

Instead of:

```
Agent address 0xAA7B3404... not found in wallet pool
```

---

## How It Works

### Old Flow (Broken)
```
trade-executor → ostium-service
                    ↓
                wallet_pool (not found ❌)
```

### New Flow (Fixed)
```
trade-executor → ostium-service
                    ↓
                user_agent_addresses
                    ↓
                decrypt with ENCRYPTION_KEY
                    ↓
                private_key ✅
```

---

## Deployment Checklist

- [ ] Install `cryptography` package on Ostium Service (Railway)
  ```bash
  pip install cryptography
  ```
- [ ] Set `ENCRYPTION_KEY` in Ostium Service environment variables
- [ ] Redeploy Ostium Service
- [ ] Verify logs show "Found and decrypted agent key from user_agent_addresses"
- [ ] Test trade execution (should succeed now)

---

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable not set"

**Solution:** Add `ENCRYPTION_KEY` to Railway service environment variables.

### Error: "The encryption key does not match"

**Solution:** 
- Verify you're using the correct key (the one that encrypted the data)
- If you regenerated the key, you'll need to regenerate agent addresses for all users

### Error: "No module named 'cryptography'"

**Solution:** Install the cryptography package:
```bash
pip install cryptography
```

### Error: "Agent address not found in user_agent_addresses or wallet_pool"

**Solution:** 
- Check that the agent address exists in the database
- Verify the user has completed the deployment flow (generated agent address)
- Check the `user_agent_addresses` table has a row for this agent address

---

## Files Modified

1. **`services/encryption_helper.py`** (NEW)
   - AES-256-GCM decryption helper

2. **`services/ostium-service.py`** (MODIFIED)
   - Updated `/open-position` endpoint
   - Updated `/close-position` endpoint
   - Now queries `user_agent_addresses` and decrypts keys

---

## Next Steps

1. Deploy the fix to Railway
2. Set `ENCRYPTION_KEY` environment variable
3. Test trade execution
4. If Hyperliquid service has the same issue, apply the same fix

---

## Related Documentation

- `ENCRYPTION_KEY_QUICK_SETUP.md` - How to generate and set the encryption key
- `ENCRYPTION_KEY_SETUP.md` - Full encryption key documentation
- `AES_ENCRYPTION_FLOW.md` - Encryption/decryption flow


