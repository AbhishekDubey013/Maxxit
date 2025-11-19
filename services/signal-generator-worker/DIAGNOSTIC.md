# Signal Generator Worker - Diagnostic Guide

## Quick Check: Is Service Running?

### 1. Check Railway Logs

Go to Railway → Signal Generator Worker Service → Logs

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
- Verify Railway configuration

---

## Railway Configuration Checklist

### **Service Settings:**

1. **Root Directory:** `services/signal-generator-worker`
   - ✅ Correct: Service root is the worker directory
   - ❌ Wrong: Root is `/` (repo root)

2. **Build Command:**
   ```bash
   npm install && npm run build
   ```
   - This runs: `npx prisma generate && tsc`
   - Generates Prisma client and compiles TypeScript

3. **Start Command:**
   ```bash
   npm start
   ```
   - This runs: `node dist/worker.js`
   - ❌ Don't use: `node src/worker.ts` (not compiled)

4. **Health Check:**
   - Path: `/health`
   - Port: `$PORT` (or 5008)

---

## Environment Variables (Railway)

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Optional (defaults to 5008)

**Optional:**
- `WORKER_INTERVAL` - Signal generation interval in ms (default: 300000 = 5 min)
- `LUNARCRUSH_API_KEY` - For dynamic position sizing (optional)
- `NODE_ENV` - Set to `production`

---

## Common Issues & Fixes

### Issue 1: "No logs at all"

**Cause:** Service not starting or crashing immediately

**Fix:**
1. Check Railway build logs
2. Verify `dist/worker.js` exists after build
3. Check Railway deployment logs for errors
4. Verify `DATABASE_URL` is set

**Test locally:**
```bash
cd services/signal-generator-worker
npm install
npm run build
DATABASE_URL="your-db-url" npm start
```

---

### Issue 2: "Cannot find module 'dist/worker.js'"

**Cause:** Build didn't run or failed

**Fix:**
1. Check Railway build logs
2. Verify build command: `npm install && npm run build`
3. Check for TypeScript errors
4. Verify Prisma schema exists

**Test build:**
```bash
cd services/signal-generator-worker
npm run build
ls -la dist/worker.js  # Should exist
```

---

### Issue 3: "Prisma Client not generated"

**Cause:** `prisma generate` didn't run

**Fix:**
1. Verify build command includes `npm run build`
2. Check `package.json`: `"build": "npx prisma generate && tsc"`
3. Verify `prisma/schema.prisma` exists

**Test:**
```bash
cd services/signal-generator-worker
npx prisma generate
```

---

### Issue 4: "Database connection failed"

**Cause:** `DATABASE_URL` not set or incorrect

**Fix:**
1. Check Railway environment variables
2. Verify `DATABASE_URL` is set
3. Test connection: `psql $DATABASE_URL`
4. Check database is accessible from Railway

---

### Issue 5: "Service starts but no signals generated"

**Cause:** No classified tweets/telegram messages to process

**Check:**
```sql
-- Check for unprocessed tweets
SELECT COUNT(*) FROM ct_posts 
WHERE is_signal_candidate = true 
AND processed_for_signals = false;

-- Check for unprocessed telegram messages
SELECT COUNT(*) FROM telegram_posts 
WHERE is_signal_candidate = true 
AND processed_for_signals = false
AND alpha_user_id IS NOT NULL;
```

**If count is 0:**
- Tweets/messages haven't been classified yet
- Check `tweet-ingestion-worker` and `telegram-alpha-worker` are running
- Check LLM API keys are set

---

## Railway Configuration (Step-by-Step)

### **If Service Doesn't Exist:**

1. Go to Railway → New Service → GitHub Repo
2. Select your repo
3. Configure:
   - **Name:** `signal-generator-worker`
   - **Root Directory:** `services/signal-generator-worker`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add environment variables:
   - `DATABASE_URL` (from your database service)
   - `PORT` (optional, defaults to 5008)
5. Deploy

### **If Service Exists but Not Working:**

1. Go to Railway → Signal Generator Worker → Settings
2. Check:
   - **Root Directory:** Should be `services/signal-generator-worker`
   - **Build Command:** Should be `npm install && npm run build`
   - **Start Command:** Should be `npm start`
3. Go to Variables tab:
   - Verify `DATABASE_URL` is set
4. Go to Deployments:
   - Trigger a new deployment
5. Check Logs:
   - Should see startup messages

---

## Test Health Endpoint

Once service is running:

```bash
curl https://your-service-url.railway.app/health
```

**Expected response:**
```json
{
  "status": "ok",
  "service": "signal-generator-worker",
  "interval": 300000,
  "database": "connected",
  "isRunning": true,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**If status is "degraded":**
- Database connection failed
- Check `DATABASE_URL`

---

## Verify Signals Are Being Generated

### Check Database:

```sql
-- Recent signals
SELECT 
  id,
  token_symbol,
  side,
  venue,
  created_at
FROM signals
ORDER BY created_at DESC
LIMIT 10;

-- Signals in last hour
SELECT COUNT(*) 
FROM signals 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

### Check Logs:

Look for:
```
🔍 Signal Generator Worker - Starting cycle...
📊 Found X Twitter + Y Telegram unprocessed signal candidate(s)
✅ Generated signal for SOL LONG on HYPERLIQUID
```

---

## Quick Fix Commands

### **If service won't start:**

1. Check Railway build logs
2. Verify configuration:
   - Root: `services/signal-generator-worker`
   - Build: `npm install && npm run build`
   - Start: `npm start`
3. Redeploy service

### **If no signals generated:**

1. Check for unprocessed tweets/messages:
   ```sql
   SELECT COUNT(*) FROM ct_posts WHERE is_signal_candidate = true AND processed_for_signals = false;
   SELECT COUNT(*) FROM telegram_posts WHERE is_signal_candidate = true AND processed_for_signals = false;
   ```
2. If count is 0, check:
   - `tweet-ingestion-worker` is running
   - `telegram-alpha-worker` is running
   - LLM API keys are set

---

## Next Steps

1. ✅ Check Railway service configuration
2. ✅ Verify build and start commands
3. ✅ Check environment variables
4. ✅ Review Railway logs
5. ✅ Test health endpoint
6. ✅ Check database for signals

