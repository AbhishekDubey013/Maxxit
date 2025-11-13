# 🚂 Railway Deployment - Exact Configuration

Complete deployment guide with **exact environment variables** from your `.env` file.

---

## 🗄️ Step 0: Create PostgreSQL Database FIRST

**In Railway Dashboard:**
1. Click "New" → "Database" → "PostgreSQL"
2. Railway will create a database automatically
3. Copy the `DATABASE_URL` (you'll use this for all services)

**Your Current Database:**
```
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 1️⃣ Agent API

**Root Directory:** `services/agent-api`

**Start Command:** `npm install && npm run build && npm start`

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Service Config
PORT=4001
NODE_ENV=production

# CORS (update with your Vercel frontend URL)
CORS_ORIGIN=https://your-frontend.vercel.app

# Optional
LOG_LEVEL=info
```

**Health Check:** `https://[your-service].railway.app/health`

---

## 2️⃣ Deployment API

**Root Directory:** `services/deployment-api`

**Start Command:** `npm install && npm run build && npm start`

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Service Config
PORT=4002
NODE_ENV=production

# CORS (update with your Vercel frontend URL)
CORS_ORIGIN=https://your-frontend.vercel.app

# Optional
LOG_LEVEL=info
```

**Health Check:** `https://[your-service].railway.app/health`

---

## 3️⃣ Signal API

**Root Directory:** `services/signal-api`

**Start Command:** `npm install && npm run build && npm start`

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Service Config
PORT=4003
NODE_ENV=production

# CORS (update with your Vercel frontend URL)
CORS_ORIGIN=https://your-frontend.vercel.app

# Optional
LOG_LEVEL=info
```

**Health Check:** `https://[your-service].railway.app/health`

---

## 4️⃣ Trade Executor Worker

**Root Directory:** `services/trade-executor-worker`

**Start Command:** `npm install && npm run build && npm start`

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Service Config
PORT=5001
NODE_ENV=production
WORKER_INTERVAL=30000

# External Services (Python on Render)
HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com

# Optional
LOG_LEVEL=info
```

**Interval:** 30 seconds

**Health Check:** `https://[your-service].railway.app/health`

---

## 5️⃣ Position Monitor Worker

**Root Directory:** `services/position-monitor-worker`

**Start Command:** `npm install && npm run build && npm start`

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Service Config
PORT=5002
NODE_ENV=production
WORKER_INTERVAL=60000

# External Services (Python on Render)
HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com

# Optional
LOG_LEVEL=info
```

**Interval:** 60 seconds

**Health Check:** `https://[your-service].railway.app/health`

---

## 6️⃣ Tweet Ingestion Worker

**Root Directory:** `services/tweet-ingestion-worker`

**Start Command:** `npm install && npm run build && npm start`

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Service Config
PORT=5003
NODE_ENV=production
WORKER_INTERVAL=300000

# External Services (Python on Render)
X_API_PROXY_URL=https://maxxit.onrender.com

# Game API (for tweets)
GAME_API_KEY=apx-090643fe359939fd167201c7183dc2dc

# Optional
LOG_LEVEL=info
```

**Interval:** 5 minutes (300000ms)

**Health Check:** `https://[your-service].railway.app/health`

---

## 7️⃣ Metrics Updater Worker

**Root Directory:** `services/metrics-updater-worker`

**Start Command:** `npm install && npm run build && npm start`

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Service Config
PORT=5004
NODE_ENV=production
WORKER_INTERVAL=3600000

# Optional
LOG_LEVEL=info
```

**Interval:** 1 hour (3600000ms)

**Health Check:** `https://[your-service].railway.app/health`

---

## 8️⃣ Research Signal Worker

**Root Directory:** `services/research-signal-worker`

**Start Command:** `npm install && npm run build && npm start`

### Environment Variables:
```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require

# Service Config
PORT=5005
NODE_ENV=production
WORKER_INTERVAL=120000

# Optional
LOG_LEVEL=info
```

**Interval:** 2 minutes (120000ms)

**Health Check:** `https://[your-service].railway.app/health`

---

## 📋 Quick Reference Table

| # | Service | Root Directory | Port | Key Env Variables |
|---|---------|----------------|------|-------------------|
| 1 | Agent API | `services/agent-api` | 4001 | DATABASE_URL, CORS_ORIGIN |
| 2 | Deployment API | `services/deployment-api` | 4002 | DATABASE_URL, CORS_ORIGIN |
| 3 | Signal API | `services/signal-api` | 4003 | DATABASE_URL, CORS_ORIGIN |
| 4 | Trade Executor | `services/trade-executor-worker` | 5001 | DATABASE_URL, HYPERLIQUID_SERVICE_URL, OSTIUM_SERVICE_URL |
| 5 | Position Monitor | `services/position-monitor-worker` | 5002 | DATABASE_URL, HYPERLIQUID_SERVICE_URL, OSTIUM_SERVICE_URL |
| 6 | Tweet Ingestion | `services/tweet-ingestion-worker` | 5003 | DATABASE_URL, X_API_PROXY_URL, GAME_API_KEY |
| 7 | Metrics Updater | `services/metrics-updater-worker` | 5004 | DATABASE_URL, WORKER_INTERVAL |
| 8 | Research Signal | `services/research-signal-worker` | 5005 | DATABASE_URL, WORKER_INTERVAL |

---

## 🚀 Deployment Steps for Each Service

### In Railway Dashboard:

1. **New Project** → Click "New Project"
2. **Connect GitHub** → Select your `Maxxit` repository
3. **Select Branch** → Choose `Vprime`
4. **For each service:**
   
   a. Click **"New Service"** → **"GitHub Repo"**
   
   b. **Configure Service:**
   - **Root Directory:** Copy from table above (e.g., `services/agent-api`)
   - **Start Command:** `npm install && npm run build && npm start`
   
   c. **Add Environment Variables:**
   - Click "Variables" tab
   - Copy-paste the env variables from sections above
   - **Important:** Update `CORS_ORIGIN` with your actual Vercel URL
   
   d. **Deploy!**

---

## ⚠️ Important Notes

### 1. Database URL
All services use the **same** `DATABASE_URL`:
```
postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 2. External Services (Already Running on Render)
These URLs should **NOT** be changed:
- **Hyperliquid:** `https://hyperliquid-service.onrender.com`
- **Ostium:** `https://maxxit-1.onrender.com`
- **X API Proxy:** `https://maxxit.onrender.com`

### 3. CORS Origin
For API services (1-3), update `CORS_ORIGIN` with your Vercel frontend URL:
```
CORS_ORIGIN=https://your-app.vercel.app
```

### 4. Sensitive Keys (Keep Secret!)
These are already in your env but **DO NOT** expose them:
- `GAME_API_KEY=apx-090643fe359939fd167201c7183dc2dc`
- `DATABASE_URL` (contains password)

---

## ✅ Verification After Deployment

For each service, test the health endpoint:

```bash
# Agent API
curl https://agent-api-[your-id].railway.app/health

# Expected response:
{
  "status": "ok",
  "service": "agent-api",
  "port": 4001,
  "timestamp": "..."
}
```

Repeat for all 8 services!

---

## 🎯 Deployment Order (Recommended)

1. ✅ **Agent API** (No dependencies)
2. ✅ **Deployment API** (No dependencies)
3. ✅ **Signal API** (No dependencies)
4. ✅ **Trade Executor Worker** (Needs Hyperliquid/Ostium URLs)
5. ✅ **Position Monitor Worker** (Needs Hyperliquid/Ostium URLs)
6. ✅ **Tweet Ingestion Worker** (Needs X API Proxy URL)
7. ✅ **Metrics Updater Worker** (No external dependencies)
8. ✅ **Research Signal Worker** (No external dependencies)

---

## 💡 Quick Copy-Paste for Railway Variables

### For API Services (1-3):
```
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
LOG_LEVEL=info
```

### For Workers with External Services (4-5):
```
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com
LOG_LEVEL=info
```

### For Tweet Ingestion Worker (6):
```
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
X_API_PROXY_URL=https://maxxit.onrender.com
GAME_API_KEY=apx-090643fe359939fd167201c7183dc2dc
LOG_LEVEL=info
```

### For Simple Workers (7-8):
```
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
LOG_LEVEL=info
```

---

**🚀 You're ready to deploy all 8 services with exact configuration!**

