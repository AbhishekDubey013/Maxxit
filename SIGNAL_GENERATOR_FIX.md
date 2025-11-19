# Signal Generator Service Not Running - Fix Guide

## Problem

Signal generator service shows no logs, nothing running.

---

## Quick Fix (Railway)

### **Step 1: Check Service Configuration**

Go to Railway → **Signal Generator Worker** → **Settings**

**Verify:**
- ✅ **Root Directory:** `services/signal-generator-worker`
- ✅ **Build Command:** `npm install && npm run build`
- ✅ **Start Command:** `npm start`
- ✅ **Health Check Path:** `/health`

### **Step 2: Check Environment Variables**

Go to Railway → **Signal Generator Worker** → **Variables**

**Required:**
- `DATABASE_URL` - Must be set (PostgreSQL connection string)

**Optional:**
- `PORT` - Defaults to 5008
- `WORKER_INTERVAL` - Defaults to 300000ms (5 minutes)

### **Step 3: Check Build Logs**

Go to Railway → **Signal Generator Worker** → **Deployments** → Latest → **Build Logs**

**Should see:**
```
npm install
npm run build
npx prisma generate
tsc
```

**If build fails:**
- Check for TypeScript errors
- Verify Prisma schema exists
- Check for missing dependencies

### **Step 4: Check Runtime Logs**

Go to Railway → **Signal Generator Worker** → **Logs**

**✅ Should see:**
```
🚀 Signal Generator Worker starting...
⏱️  Interval: 300000ms (5 minutes)
✅ Database connection: OK
✅ Signal Generator Worker started successfully
```

**❌ If you see nothing:**
- Service isn't starting
- Check build logs for errors
- Verify start command is `npm start`

---

## Common Issues

### Issue 1: Wrong Root Directory

**Problem:** Railway is looking in the wrong directory

**Fix:**
- Set Root Directory to: `services/signal-generator-worker`
- Not: `/` (repo root)

### Issue 2: Build Command Missing Prisma Generate

**Problem:** Prisma client not generated

**Fix:**
- Build Command should be: `npm install && npm run build`
- This runs: `npx prisma generate && tsc`

### Issue 3: Start Command Wrong

**Problem:** Trying to run TypeScript directly

**Fix:**
- Start Command should be: `npm start`
- This runs: `node dist/worker.js`
- ❌ Don't use: `node src/worker.ts`

### Issue 4: DATABASE_URL Not Set

**Problem:** Service can't connect to database

**Fix:**
- Add `DATABASE_URL` in Railway Variables
- Copy from your database service
- Format: `postgresql://user:pass@host:port/dbname`

### Issue 5: Service Crashes Immediately

**Problem:** Unhandled error on startup

**Fix:**
- Check Railway logs for error messages
- Common causes:
  - Missing `DATABASE_URL`
  - Prisma client not generated
  - TypeScript compilation errors

---

## Verify Service is Running

### 1. Check Health Endpoint

```bash
curl https://your-service-url.railway.app/health
```

**Expected:**
```json
{
  "status": "ok",
  "service": "signal-generator-worker",
  "interval": 300000,
  "database": "connected",
  "isRunning": true
}
```

### 2. Check Logs for Signal Generation

Look for:
```
🔍 Signal Generator Worker - Starting cycle...
📊 Found X Twitter + Y Telegram unprocessed signal candidate(s)
✅ Generated signal for SOL LONG on HYPERLIQUID
```

### 3. Check Database

```sql
-- Recent signals
SELECT COUNT(*) FROM signals 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## Railway Configuration Template

If creating a new service:

**Service Name:** `signal-generator-worker`

**Settings:**
- Root Directory: `services/signal-generator-worker`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Health Check: `/health`

**Environment Variables:**
```
DATABASE_URL=postgresql://...
PORT=5008
WORKER_INTERVAL=300000
```

---

## Files Added

1. **`services/signal-generator-worker/railway.toml`**
   - Railway configuration file
   - Defines build, deploy, and environment settings

2. **`services/signal-generator-worker/RAILWAY_SETUP.md`**
   - Step-by-step Railway setup guide
   - Configuration checklist

3. **`services/signal-generator-worker/DIAGNOSTIC.md`**
   - Troubleshooting guide
   - Common issues and fixes

---

## Next Steps

1. ✅ Check Railway service configuration
2. ✅ Verify build and start commands
3. ✅ Set `DATABASE_URL` environment variable
4. ✅ Check Railway logs
5. ✅ Test health endpoint
6. ✅ Monitor for signal generation

---

## Still Not Working?

1. **Check Railway Build Logs:**
   - Look for errors during `npm install` or `npm run build`
   - Verify `dist/worker.js` is created

2. **Check Railway Runtime Logs:**
   - Look for startup errors
   - Check for database connection errors

3. **Test Locally:**
   ```bash
   cd services/signal-generator-worker
   npm install
   npm run build
   DATABASE_URL="your-db-url" npm start
   ```

4. **Verify Prisma Schema:**
   - Check `services/signal-generator-worker/prisma/schema.prisma` exists
   - Run `npx prisma generate` manually

---

See also:
- `services/signal-generator-worker/RAILWAY_SETUP.md` - Full setup guide
- `services/signal-generator-worker/DIAGNOSTIC.md` - Detailed troubleshooting

