# Microservices Migration Guide

This guide walks you through migrating the Maxxit monolith to a microservices architecture.

---

## 📋 Migration Checklist

### Phase 1: Create Service Structure ✅
- [x] Create `services/` directory
- [x] Set up service subdirectories
- [x] Copy shared dependencies
- [x] Create service-specific `package.json` files

### Phase 2: Extract API Services
- [ ] Agent API Service
- [ ] Deployment API Service
- [ ] Signal API Service

### Phase 3: Extract Workers
- [ ] Trade Execution Worker
- [ ] Position Monitor Worker
- [ ] Tweet Ingestion Worker
- [ ] Metrics Updater Worker
- [ ] Research Signal Worker

### Phase 4: Update Frontend
- [ ] Update API endpoint URLs
- [ ] Environment variable configuration
- [ ] Test frontend integration

### Phase 5: Deploy Services
- [ ] Railway deployment configuration
- [ ] Vercel frontend deployment
- [ ] Environment variables setup
- [ ] Health check verification

---

## 🚀 Phase 1: Create Service Structure

### 1.1 Service Directory Structure

```
services/
├── agent-api/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── deployment-api/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── signal-api/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── trade-executor-worker/
│   ├── src/
│   │   ├── worker.ts
│   │   └── server.ts (health check)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── position-monitor-worker/
│   ├── src/
│   │   ├── worker.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── tweet-ingestion-worker/
│   ├── src/
│   │   ├── worker.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── metrics-updater-worker/
│   ├── src/
│   │   ├── worker.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── research-signal-worker/
│   ├── src/
│   │   ├── worker.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── (Next.js app - migrated from root)
│   ├── package.json
│   └── .env.example
└── shared/
    ├── prisma/
    ├── lib/ (shared utilities)
    └── types/
```

---

## 🔧 Phase 2: Extract API Services

### 2.1 Agent API Service

**Files to migrate:**
- `pages/api/agents/index.ts` → `services/agent-api/src/routes/agents.ts`
- `pages/api/agents/[id].ts` → `services/agent-api/src/routes/agents.ts`
- `pages/api/agents/[id]/routing-stats.ts` → `services/agent-api/src/routes/routing-stats.ts`
- `pages/api/agent-accounts/*` → `services/agent-api/src/routes/agent-accounts.ts`

**New structure:**
```typescript
// services/agent-api/src/server.ts
import express from 'express';
import agentRoutes from './routes/agents';
import agentAccountsRoutes from './routes/agent-accounts';

const app = express();
const PORT = process.env.PORT || 4001;

app.use(express.json());
app.use('/api/agents', agentRoutes);
app.use('/api/agent-accounts', agentAccountsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent-api' });
});

app.listen(PORT, () => {
  console.log(`Agent API running on port ${PORT}`);
});
```

### 2.2 Deployment API Service

**Files to migrate:**
- `pages/api/deployments/*` → `services/deployment-api/src/routes/deployments.ts`
- `pages/api/hyperliquid/create-deployment.ts` → `services/deployment-api/src/routes/hyperliquid.ts`
- `pages/api/ostium/create-deployment.ts` → `services/deployment-api/src/routes/ostium.ts`
- `pages/api/wallet-pool/*` → `services/deployment-api/src/routes/wallet-pool.ts`

### 2.3 Signal API Service

**Files to migrate:**
- `pages/api/signals/*` → `services/signal-api/src/routes/signals.ts`
- `pages/api/research-signals/*` → `services/signal-api/src/routes/research-signals.ts`

---

## 🔄 Phase 3: Extract Workers

### 3.1 Trade Execution Worker

**Files to migrate:**
- `workers/trade-executor-worker.ts` → `services/trade-executor-worker/src/worker.ts`
- `lib/trade-executor.ts` → `services/trade-executor-worker/src/executor.ts`

**Structure:**
```typescript
// services/trade-executor-worker/src/worker.ts
import { executeAllPendingSignals } from './executor';

const INTERVAL = parseInt(process.env.TRADE_EXECUTION_INTERVAL || '30000');

async function runWorker() {
  console.log('[TradeExecutor] Starting worker...');
  
  setInterval(async () => {
    try {
      await executeAllPendingSignals();
    } catch (error) {
      console.error('[TradeExecutor] Error:', error);
    }
  }, INTERVAL);
}

if (require.main === module) {
  runWorker();
}
```

### 3.2 Position Monitor Worker

**Files to migrate:**
- `workers/position-monitor-combined.ts` → `services/position-monitor-worker/src/worker.ts`

### 3.3 Tweet Ingestion Worker

**Files to migrate:**
- `workers/tweet-ingestion-worker.ts` → `services/tweet-ingestion-worker/src/worker.ts`

### 3.4 Metrics Updater Worker

**Files to migrate:**
- `workers/metrics-updater-worker.ts` → `services/metrics-updater-worker/src/worker.ts`

### 3.5 Research Signal Worker

**Files to migrate:**
- `workers/research-signal-generator.ts` → `services/research-signal-worker/src/worker.ts`

---

## 🎨 Phase 4: Update Frontend

### 4.1 Environment Variables

Create `services/frontend/.env.local`:

```env
# API Service URLs (Railway)
NEXT_PUBLIC_AGENT_API_URL=https://agent-api.railway.app
NEXT_PUBLIC_DEPLOYMENT_API_URL=https://deployment-api.railway.app
NEXT_PUBLIC_SIGNAL_API_URL=https://signal-api.railway.app

# Existing Python Services (Render)
NEXT_PUBLIC_HYPERLIQUID_SERVICE_URL=https://hyperliquid-service.onrender.com
NEXT_PUBLIC_OSTIUM_SERVICE_URL=https://maxxit-1.onrender.com
NEXT_PUBLIC_X_API_PROXY_URL=https://maxxit.onrender.com

# Database
DATABASE_URL=postgresql://...
```

### 4.2 API Client Updates

Create `services/frontend/lib/api-client.ts`:

```typescript
const AGENT_API_URL = process.env.NEXT_PUBLIC_AGENT_API_URL;
const DEPLOYMENT_API_URL = process.env.NEXT_PUBLIC_DEPLOYMENT_API_URL;
const SIGNAL_API_URL = process.env.NEXT_PUBLIC_SIGNAL_API_URL;

export const agentApi = {
  createAgent: (data) => fetch(`${AGENT_API_URL}/api/agents`, { method: 'POST', body: JSON.stringify(data) }),
  getAgents: () => fetch(`${AGENT_API_URL}/api/agents`),
  // ... etc
};

export const deploymentApi = {
  createDeployment: (data) => fetch(`${DEPLOYMENT_API_URL}/api/deployments`, { method: 'POST', body: JSON.stringify(data) }),
  // ... etc
};

export const signalApi = {
  getSignals: () => fetch(`${SIGNAL_API_URL}/api/signals`),
  // ... etc
};
```

---

## 🚢 Phase 5: Deploy Services

### 5.1 Railway Deployment

**For each service:**

1. Create new Railway project/service
2. Connect to GitHub repository
3. Set root directory to service folder (e.g., `services/agent-api`)
4. Configure environment variables
5. Set start command in `package.json`

**Example `railway.json` for Agent API:**

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 5.2 Vercel Deployment (Frontend)

1. Import project from GitHub
2. Set root directory to `services/frontend`
3. Configure environment variables
4. Deploy

### 5.3 Health Check Verification

After deployment, verify each service:

```bash
# Agent API
curl https://agent-api.railway.app/health

# Deployment API
curl https://deployment-api.railway.app/health

# Signal API
curl https://signal-api.railway.app/health

# Workers (if health endpoints exposed)
curl https://trade-executor.railway.app/health
curl https://position-monitor.railway.app/health
```

---

## 🔍 Testing Strategy

### 1. Local Testing

Run all services locally:

```bash
# Terminal 1 - Agent API
cd services/agent-api && npm run dev

# Terminal 2 - Deployment API
cd services/deployment-api && npm run dev

# Terminal 3 - Signal API
cd services/signal-api && npm run dev

# Terminal 4 - Trade Executor
cd services/trade-executor-worker && npm start

# Terminal 5 - Position Monitor
cd services/position-monitor-worker && npm start

# Terminal 6 - Frontend
cd services/frontend && npm run dev
```

### 2. Integration Testing

Test complete flows:
- Agent creation → Deployment → Signal generation → Trade execution → Position monitoring
- Verify data flows between services
- Check database consistency

### 3. Load Testing

- Simulate multiple concurrent agent creations
- Test signal processing throughput
- Monitor worker performance under load

---

## 🐛 Troubleshooting

### Issue: Service can't connect to database

**Solution:**
- Verify `DATABASE_URL` environment variable
- Check database firewall rules
- Ensure service has database access permissions

### Issue: Frontend can't reach API services

**Solution:**
- Verify API URLs in frontend environment variables
- Check CORS configuration on API services
- Ensure services are deployed and healthy

### Issue: Worker not processing tasks

**Solution:**
- Check worker logs
- Verify database connection
- Ensure scheduled intervals are correct
- Check for errors in worker logic

---

## 📊 Monitoring & Maintenance

### 1. Service Health

- Set up uptime monitoring (e.g., UptimeRobot)
- Configure alerting for service failures
- Monitor resource usage (CPU, memory)

### 2. Database Performance

- Monitor connection pool usage
- Check for slow queries
- Set up database backups

### 3. Cost Optimization

- Review Railway/Vercel usage
- Optimize worker schedules if needed
- Consider spot instances for non-critical workers

---

## 🎯 Success Criteria

- ✅ All services deployed and healthy
- ✅ Frontend can communicate with all API services
- ✅ Workers processing tasks on schedule
- ✅ End-to-end flows working correctly
- ✅ No degradation in performance
- ✅ Monitoring and alerting in place

---

## 📚 Additional Resources

- Railway Documentation: https://docs.railway.app
- Vercel Documentation: https://vercel.com/docs
- Express.js Guide: https://expressjs.com/
- Node.js Workers Best Practices: https://nodejs.org/en/docs/guides/

---

## 🆘 Rollback Plan

If migration fails:

1. Keep monolith running in parallel during migration
2. Use feature flags to switch between monolith and microservices
3. Have database backup ready
4. Document all environment variable changes
5. Keep deployment rollback scripts ready

**Emergency Rollback Steps:**

```bash
# 1. Switch DNS/routing back to monolith
# 2. Restore database from backup if needed
# 3. Disable microservices
# 4. Verify monolith is functioning
# 5. Investigate microservices issues
```

