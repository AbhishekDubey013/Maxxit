# Signal Generator Worker - Railway Setup

## Problem: Service Not Running / No Logs

If the signal generator service shows no logs, it's likely not starting correctly.

---

## Quick Fix Checklist

### 1. **Verify Build Command**

Railway should run:
```bash
cd services/signal-generator-worker && npm install && npm run build
```

Or if using root directory:
```bash
npm install && cd services/signal-generator-worker && npm run build
```

### 2. **Verify Start Command**

Railway should run:
```bash
cd services/signal-generator-worker && npm start
```

Which executes: `node dist/worker.js`

### 3. **Check Environment Variables**

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Optional (defaults to 5008)
- `WORKER_INTERVAL` - Optional (defaults to 300000ms = 5 minutes)

### 4. **Check Health Endpoint**

Once running, the service should respond to:
```
GET http://your-service-url/health
```

Expected response:
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

---

## Railway Configuration

### **Service Settings:**

1. **Root Directory:** `services/signal-generator-worker`
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. **Health Check Path:** `/health`
5. **Health Check Port:** `$PORT` (or 5008)

### **Environment Variables:**

```bash
DATABASE_URL=postgresql://...
PORT=5008
WORKER_INTERVAL=300000
NODE_ENV=production
```

---

## Troubleshooting

### Issue: "No logs at all"

**Possible causes:**
1. Service not starting (check build logs)
2. Service crashing immediately (check error logs)
3. Wrong start command (should be `npm start`, not `node src/worker.ts`)

**Solution:**
1. Check Railway build logs for errors
2. Check Railway deployment logs
3. Verify `dist/worker.js` exists after build
4. Try running locally: `cd services/signal-generator-worker && npm run build && npm start`

### Issue: "Cannot find module 'dist/worker.js'"

**Solution:**
- Build command didn't run or failed
- Check Railway build logs
- Verify `tsconfig.json` is correct
- Manually build: `cd services/signal-generator-worker && npm run build`

### Issue: "Database connection failed"

**Solution:**
- Verify `DATABASE_URL` is set in Railway
- Check database is accessible
- Test connection: `psql $DATABASE_URL`

### Issue: "Prisma client not generated"

**Solution:**
- Build command should include `npx prisma generate`
- Check `package.json` build script: `"build": "npx prisma generate && tsc"`
- Verify Prisma schema exists: `services/signal-generator-worker/prisma/schema.prisma`

---

## Local Testing

Test the service locally before deploying:

```bash
cd services/signal-generator-worker

# Install dependencies
npm install

# Build
npm run build

# Check if dist/worker.js exists
ls -la dist/worker.js

# Start (with DATABASE_URL in .env)
npm start
```

**Expected output:**
```
🏥 Signal Generator Worker health check server listening on port 5008
🚀 Signal Generator Worker starting...
✅ Database connection: OK
✅ Signal Generator Worker started successfully
```

---

## Verify Service is Running

### 1. Check Railway Logs

Go to Railway → Signal Generator Service → Logs

**Should see:**
```
🚀 Signal Generator Worker starting...
✅ Database connection: OK
✅ Signal Generator Worker started successfully
```

### 2. Check Health Endpoint

```bash
curl https://your-service-url.railway.app/health
```

### 3. Check Database

Query to see if signals are being generated:
```sql
SELECT COUNT(*) FROM signals WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## Common Railway Configuration Issues

### Issue: Wrong Root Directory

**Wrong:**
- Root Directory: `/` (root of repo)
- Build Command: `cd services/signal-generator-worker && npm install && npm run build`

**Correct:**
- Root Directory: `services/signal-generator-worker`
- Build Command: `npm install && npm run build`

### Issue: Missing Prisma Generate

**Wrong:**
- Build Command: `npm install && tsc`

**Correct:**
- Build Command: `npm install && npm run build` (which includes `prisma generate`)

### Issue: Wrong Start Command

**Wrong:**
- Start Command: `node src/worker.ts` (TypeScript, not compiled)

**Correct:**
- Start Command: `npm start` (runs `node dist/worker.js`)

---

## Quick Fix Script

If the service isn't running, try this in Railway:

**Build Command:**
```bash
npm install && cd services/signal-generator-worker && npm install && npm run build
```

**Start Command:**
```bash
cd services/signal-generator-worker && npm start
```

**Or if Root Directory is `services/signal-generator-worker`:**
```bash
npm install && npm run build
npm start
```

---

## Next Steps

1. ✅ Check Railway service configuration
2. ✅ Verify build command includes `prisma generate`
3. ✅ Verify start command is `npm start`
4. ✅ Check Railway logs for startup errors
5. ✅ Test health endpoint
6. ✅ Monitor logs for signal generation cycles


