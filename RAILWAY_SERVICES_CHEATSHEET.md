# 🚂 Railway Services Cheatsheet

Quick reference for deploying all 8 microservices to Railway.

---

## 📊 All Services at a Glance

| # | Service Name | Root Directory | Port | Start Command |
|---|--------------|----------------|------|---------------|
| 1 | Agent API | `services/agent-api` | 4001 | `npm install && npm run build && npm start` |
| 2 | Deployment API | `services/deployment-api` | 4002 | `npm install && npm run build && npm start` |
| 3 | Signal API | `services/signal-api` | 4003 | `npm install && npm run build && npm start` |
| 4 | Trade Executor | `services/trade-executor-worker` | 5001 | `npm install && npm run build && npm start` |
| 5 | Position Monitor | `services/position-monitor-worker` | 5002 | `npm install && npm run build && npm start` |
| 6 | Tweet Ingestion | `services/tweet-ingestion-worker` | 5003 | `npm install && npm run build && npm start` |
| 7 | Metrics Updater | `services/metrics-updater-worker` | 5004 | `npm install && npm run build && npm start` |
| 8 | Research Signal | `services/research-signal-worker` | 5005 | `npm install && npm run build && npm start` |

---

## 🔐 Common Environment Variables (All Services)

```env
DATABASE_URL=postgresql://neondb_owner:npg_fgk5cOK1xdHZ@ep-snowy-river-ad5rkc23-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
NODE_ENV=production
LOG_LEVEL=info
```

---

## 📦 Service-Specific Variables

### API Services (1-3): Agent, Deployment, Signal
**Additional Variables:**
```env
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Workers with External Services (4-5): Trade Executor, Position Monitor
**Additional Variables:**
```env
WORKER_INTERVAL=30000
HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com
```
*(Service 5 uses WORKER_INTERVAL=60000)*

### Tweet Ingestion Worker (6)
**Additional Variables:**
```env
WORKER_INTERVAL=300000
X_API_PROXY_URL=https://maxxit.onrender.com
GAME_API_KEY=apx-090643fe359939fd167201c7183dc2dc
```

### Simple Workers (7-8): Metrics Updater, Research Signal
**Additional Variables:**
```env
WORKER_INTERVAL=3600000
```
*(Service 8 uses WORKER_INTERVAL=120000)*

---

## 🚀 Railway Deployment Checklist

### For Each Service:

- [ ] Create new service in Railway
- [ ] Set repository: `Maxxit`
- [ ] Set branch: `Vprime`
- [ ] Set root directory from table above
- [ ] Set start command: `npm install && npm run build && npm start`
- [ ] Add environment variables (common + service-specific)
- [ ] Deploy
- [ ] Test health check: `https://[service].railway.app/health`

---

## ✅ Health Check URLs

After deployment, verify each service:

```bash
# 1. Agent API
curl https://agent-api-[id].railway.app/health

# 2. Deployment API
curl https://deployment-api-[id].railway.app/health

# 3. Signal API
curl https://signal-api-[id].railway.app/health

# 4. Trade Executor Worker
curl https://trade-executor-[id].railway.app/health

# 5. Position Monitor Worker
curl https://position-monitor-[id].railway.app/health

# 6. Tweet Ingestion Worker
curl https://tweet-ingestion-[id].railway.app/health

# 7. Metrics Updater Worker
curl https://metrics-updater-[id].railway.app/health

# 8. Research Signal Worker
curl https://research-signal-[id].railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "agent-api",
  "port": 4001,
  "timestamp": "2025-11-13T..."
}
```

---

## 🔗 External Services (Already on Render)

These are already deployed - **DO NOT REDEPLOY**:

1. **Hyperliquid Service**: `https://hyperliquid-service.onrender.com`
2. **Ostium Service**: `https://maxxit-1.onrender.com`
3. **X API Proxy**: `https://maxxit.onrender.com`

---

## 💰 Estimated Costs

- **8 Services on Railway**: ~$40/month ($5 per service)
- **PostgreSQL on Railway**: ~$5/month
- **Total**: **~$45/month**

*(Railway offers $5 free credit per month)*

---

## 🎯 Deployment Order

1. **Agent API** → No dependencies
2. **Deployment API** → No dependencies
3. **Signal API** → No dependencies
4. **Trade Executor** → Needs external services
5. **Position Monitor** → Needs external services
6. **Tweet Ingestion** → Needs X API Proxy
7. **Metrics Updater** → No dependencies
8. **Research Signal** → No dependencies

---

## 📝 Quick Notes

- **All services** share the same DATABASE_URL
- **API services** need CORS_ORIGIN updated with your frontend URL
- **Workers** run on intervals (configurable via WORKER_INTERVAL)
- **External services** (Hyperliquid, Ostium, X API) are on Render (don't change URLs)
- **Health checks** available on all services at `/health`

---

**🚂 Ready to deploy on Railway!**

