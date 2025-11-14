# 🚀 Ostium Service Deployment Guide

## What Was Fixed

The Ostium service was missing the `psycopg2-binary` dependency, which is required to connect to the PostgreSQL database and fetch agent private keys from the `wallet_pool` table.

**Changes Made:**
- ✅ Added `psycopg2-binary>=2.9.9` to `services/requirements-ostium.txt`
- ✅ Added `requests>=2.31.0` for API calls
- ✅ Updated `render.yaml` with Ostium service configuration
- ✅ Pushed to GitHub (`Vprime` branch)

---

## 🔧 Deployment Steps on Render

### Option 1: Manual Redeploy (Quickest)

1. **Go to Render Dashboard**
   - Navigate to: https://dashboard.render.com/
   - Find your Ostium service (`maxxit-1` or similar)

2. **Trigger Manual Deploy**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Render will:
     - Pull latest code from GitHub
     - Run `pip install -r requirements-ostium.txt` (includes psycopg2-binary now)
     - Restart the service

3. **Wait 2-3 minutes** for the build and deployment to complete

4. **Verify** the service is running:
   ```bash
   curl https://maxxit-1.onrender.com/health
   ```
   Should return: `{"status": "ok", "service": "ostium", ...}`

---

### Option 2: Create New Service (If Needed)

If you haven't deployed the Ostium service yet:

1. **Create New Web Service**
   - Type: `Web Service`
   - Repository: Connect to your GitHub repo
   - Branch: `Vprime`
   - Name: `ostium-service`

2. **Build & Start Commands**
   ```bash
   Build Command: cd services && pip install -r requirements-ostium.txt
   Start Command: cd services && python3 ostium-service.py
   ```

3. **Environment Variables** (CRITICAL!)
   Set these in Render dashboard:
   
   | Key | Value |
   |-----|-------|
   | `OSTIUM_TESTNET` | `true` |
   | `OSTIUM_SERVICE_PORT` | `5002` |
   | `OSTIUM_RPC_URL` | `https://sepolia-rollup.arbitrum.io/rpc` |
   | `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` (Your Postgres connection string) |
   | `NEXTJS_API_URL` | `https://maxxit.vercel.app` (or your actual Next.js URL) |
   | `PYTHON_VERSION` | `3.11.0` |

4. **Health Check Path:** `/health`

5. **Deploy!**

---

## ✅ Testing After Deployment

Once the service is redeployed, test that it works:

```bash
# 1. Health check
curl https://maxxit-1.onrender.com/health

# 2. Available markets
curl https://maxxit-1.onrender.com/available-markets

# 3. Test position (use your actual addresses)
curl -X POST https://maxxit-1.onrender.com/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentAddress": "0x103725f6337Ba3a0aE65617e2dA55fEf64A80fFA",
    "userAddress": "0x3828dFCBff64fD07B963Ef11BafE632260413Ab3",
    "market": "BTC",
    "side": "long",
    "size": 5000,
    "leverage": 2
  }'
```

Expected response:
```json
{
  "success": true,
  "orderId": "...",
  "transactionHash": "0x...",
  "status": "pending",
  "message": "Order created, waiting for keeper to fill position"
}
```

---

## 🐛 Troubleshooting

### Issue: Still getting "No module named 'psycopg2'" error

**Solution:**
1. Check Render logs to see if the build command ran successfully
2. Manually trigger a **Clear Build Cache & Deploy** in Render
3. Verify the `requirements-ostium.txt` is being read from the correct path

### Issue: "DATABASE_URL not configured" error

**Solution:**
1. Go to Render Dashboard → Your Service → Environment
2. Add `DATABASE_URL` with your Postgres connection string
3. Format: `postgresql://username:password@host:port/database`
4. Redeploy the service

### Issue: Agent key not found

**Solution:**
1. Verify the agent address is in the `wallet_pool` table:
   ```sql
   SELECT address, assigned_to_user_wallet 
   FROM wallet_pool 
   WHERE address = '0x103725f6337Ba3a0aE65617e2dA55fEf64A80fFA';
   ```
2. If not found, run the wallet pool script locally:
   ```bash
   npx tsx scripts/add-wallets-to-pool.ts 20
   ```

---

## 📊 Current Status

**Local Database:**
- ✅ 30 wallets available in pool
- ✅ Agent `0x103725f6337Ba3a0aE65617e2dA55fEf64A80fFA` assigned to `0x3828dFCBff64fD07B963Ef11BafE632260413Ab3`
- ✅ On-chain delegation verified

**Production (Render):**
- ⚠️ Needs redeploy with updated dependencies
- ⚠️ Verify `DATABASE_URL` is set correctly

---

## 🎯 Next Steps

1. **Redeploy Ostium service** on Render (see Option 1 above)
2. **Wait 2-3 minutes** for deployment
3. **Test position opening** (see Testing section)
4. **Verify position** in database:
   ```sql
   SELECT * FROM positions WHERE user_wallet = '0x3828dFCBff64fD07B963Ef11BafE632260413Ab3' ORDER BY opened_at DESC LIMIT 1;
   ```

---

Once deployed, the agent should be able to execute trades successfully! 🚀

