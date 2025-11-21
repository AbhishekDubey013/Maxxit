# Regenerate Ostium Keys - Fix InvalidTag Error

## Problem

**Error:** `InvalidTag: Authentication tag verification failed`

**Root Cause:** Keys in database were encrypted with **old method** (hex conversion) but Ostium service is trying to decrypt with **new method** (scrypt). They're incompatible!

## Solution

Regenerate all Ostium agent addresses to create new encrypted keys using the correct scrypt method.

---

## Option 1: Use Admin API (Recommended)

**Call from production (Vercel/Railway) where ENCRYPTION_KEY is set:**

```bash
# Regenerate for all users
curl -X POST https://your-domain.com/api/admin/regenerate-ostium-keys \
  -H "Content-Type: application/json"

# Or regenerate for specific user
curl -X POST https://your-domain.com/api/admin/regenerate-ostium-keys \
  -H "Content-Type: application/json" \
  -d '{"userWallet": "0xa10846a81528d429b50b0dcbf8968938a572fac5"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Regenerated keys for 1 users",
  "results": [
    {
      "userWallet": "0xa10846a8...",
      "oldAddress": "0xAA7B3404...",
      "newAddress": "0xd34450E2..."
    }
  ],
  "warning": "Users must re-whitelist their new addresses on Ostium"
}
```

---

## Option 2: Run Script Locally (If ENCRYPTION_KEY is set)

```bash
# Make sure ENCRYPTION_KEY is in your .env
export ENCRYPTION_KEY=3295f0745260f0420509005dec8580174ef604c8cf7b1e9e2ccd4946d8f082e1

# Run script
npx tsx scripts/regenerate-ostium-keys.ts
```

---

## Important Notes

⚠️ **Users MUST re-whitelist their new Ostium addresses!**

After regeneration:
1. User gets a **new Ostium agent address**
2. Old address is deleted from database
3. User must go through Ostium setup again:
   - Approve delegation
   - Approve USDC
   - Whitelist new address

---

## After Regeneration

1. ✅ Keys are encrypted with correct scrypt method
2. ✅ Ostium service can decrypt them (after redeploy)
3. ✅ Trade executor will process signals successfully
4. ⚠️ Users need to re-whitelist addresses

---

## Verification

After regeneration, check that new keys work:

```bash
# Check trade executor logs - should see successful decryption
# No more "InvalidTag" errors
```

---

## Why This Happened

1. **Before:** Keys encrypted with `bytes.fromhex(key_hex)` (wrong)
2. **After fix:** Keys encrypted with `Scrypt(...).derive()` (correct)
3. **Problem:** Old keys in database can't be decrypted with new method
4. **Solution:** Regenerate all keys with new method


