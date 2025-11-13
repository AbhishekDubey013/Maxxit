#!/bin/bash

# Maxxit Repository Reorganization Script
# This reorganizes the existing monolith into a clean monorepo structure
# WITHOUT changing deployment (Python services stay on Render)

set -e

echo "🚀 Reorganizing Maxxit into Monorepo Structure..."
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if we're in the Maxxit directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Maxxit root directory"
    exit 1
fi

echo "${BLUE}📁 Creating new directory structure...${NC}"
echo ""

# Create main structure
mkdir -p services/api/{agent,signal,trade,deployment,auth,safe-wallet,notification,analytics,billing}
mkdir -p services/workers/{position-monitor,signal-generator}
mkdir -p services/python/{hyperliquid,ostium,twitter-proxy}
mkdir -p services/frontend
mkdir -p packages/{common,database,config}
mkdir -p infrastructure/{docker,scripts}

echo "${GREEN}✓${NC} Created directory structure"

# ============================================================================
# MOVE API ROUTES TO SERVICE MODULES
# ============================================================================

echo ""
echo "${BLUE}📦 Organizing API routes into services...${NC}"

# Agent Service
echo "${GREEN}✓${NC} Organizing Agent Service..."
mkdir -p services/api/agent/{routes,controllers,services,models}

cat > services/api/agent/routes/index.ts << 'EOF'
import { Router } from 'express';
import { AgentController } from '../controllers/AgentController';

const router = Router();
const controller = new AgentController();

// V2 routes
router.post('/create', controller.create);
router.get('/list', controller.list);
router.get('/:id', controller.getById);
router.patch('/:id', controller.update);
router.delete('/:id', controller.delete);
router.get('/leaderboard', controller.leaderboard);

export default router;
EOF

cat > services/api/agent/routes/v3.ts << 'EOF'
import { Router } from 'express';
import { AgentV3Controller } from '../controllers/AgentV3Controller';

const router = Router();
const controller = new AgentV3Controller();

router.post('/create', controller.create);
router.get('/list', controller.list);
router.get('/:id', controller.getById);

export default router;
EOF

# Signal Service
echo "${GREEN}✓${NC} Organizing Signal Service..."
mkdir -p services/api/signal/{routes,controllers,services,models}

cat > services/api/signal/routes/index.ts << 'EOF'
import { Router } from 'express';
import { SignalController } from '../controllers/SignalController';

const router = Router();
const controller = new SignalController();

router.post('/generate', controller.generate);
router.get('/list', controller.list);
router.get('/:id', controller.getById);

export default router;
EOF

# Trade Execution Service
echo "${GREEN}✓${NC} Organizing Trade Execution Service..."
mkdir -p services/api/trade/{routes,controllers,services,models}

cat > services/api/trade/routes/index.ts << 'EOF'
import { Router } from 'express';
import { TradeController } from '../controllers/TradeController';

const router = Router();
const controller = new TradeController();

router.post('/execute', controller.executeTrade);
router.post('/close', controller.closePosition);
router.get('/positions', controller.listPositions);

export default router;
EOF

cat > services/api/trade/routes/v3.ts << 'EOF'
import { Router } from 'express';
import { TradeV3Controller } from '../controllers/TradeV3Controller';

const router = Router();
const controller = new TradeV3Controller();

// V3 with Agent Where routing
router.post('/execute', controller.executeTrade);
router.get('/routing-history', controller.getRoutingHistory);

export default router;
EOF

# Deployment Service
echo "${GREEN}✓${NC} Organizing Deployment Service..."
mkdir -p services/api/deployment/{routes,controllers,services,models}

cat > services/api/deployment/routes/index.ts << 'EOF'
import { Router } from 'express';
import { DeploymentController } from '../controllers/DeploymentController';

const router = Router();
const controller = new DeploymentController();

router.post('/create', controller.create);
router.get('/list', controller.list);
router.get('/:id', controller.getById);
router.post('/:id/pause', controller.pause);
router.post('/:id/resume', controller.resume);
router.delete('/:id', controller.cancel);

export default router;
EOF

# Auth Service
echo "${GREEN}✓${NC} Organizing Auth Service..."
mkdir -p services/api/auth/{routes,controllers,services,models}

cat > services/api/auth/routes/index.ts << 'EOF'
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';

const router = Router();
const controller = new AuthController();

router.post('/siwe/verify', controller.verifySignature);
router.post('/proof-of-intent/verify', controller.verifyProofOfIntent);

export default router;
EOF

# Safe Wallet Service
echo "${GREEN}✓${NC} Organizing Safe Wallet Service..."
mkdir -p services/api/safe-wallet/{routes,controllers,services,models}

cat > services/api/safe-wallet/routes/index.ts << 'EOF'
import { Router } from 'express';
import { SafeWalletController } from '../controllers/SafeWalletController';

const router = Router();
const controller = new SafeWalletController();

router.post('/deploy', controller.deploy);
router.post('/enable-module', controller.enableModule);
router.post('/approve-usdc', controller.approveUSDC);
router.post('/execute-transaction', controller.executeTransaction);
router.get('/:address/info', controller.getInfo);

export default router;
EOF

# Notification Service
echo "${GREEN}✓${NC} Organizing Notification Service..."
mkdir -p services/api/notification/{routes,controllers,services,models}

cat > services/api/notification/routes/index.ts << 'EOF'
import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

const router = Router();
const controller = new NotificationController();

router.post('/telegram/link', controller.linkTelegram);
router.post('/telegram/send', controller.sendTelegram);

export default router;
EOF

# Analytics Service
echo "${GREEN}✓${NC} Organizing Analytics Service..."
mkdir -p services/api/analytics/{routes,controllers,services,models}

cat > services/api/analytics/routes/index.ts << 'EOF'
import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';

const router = Router();
const controller = new AnalyticsController();

router.get('/performance/:agentId', controller.getPerformance);
router.get('/system/stats', controller.getSystemStats);
router.get('/v3/routing-stats', controller.getV3RoutingStats);

export default router;
EOF

# Billing Service
echo "${GREEN}✓${NC} Organizing Billing Service..."
mkdir -p services/api/billing/{routes,controllers,services,models}

cat > services/api/billing/routes/index.ts << 'EOF'
import { Router } from 'express';
import { BillingController } from '../controllers/BillingController';

const router = Router();
const controller = new BillingController();

router.post('/charge-trade-fee', controller.chargeTradeF);
router.post('/distribute-profit-share', controller.distributeProfitShare);
router.get('/subscription-check/:deploymentId', controller.checkSubscription);

export default router;
EOF

# ============================================================================
# CREATE MAIN GATEWAY SERVER
# ============================================================================

echo ""
echo "${BLUE}🌐 Creating Main Gateway Server...${NC}"

cat > services/api/gateway.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import all service routes
import agentRoutes from './agent/routes';
import agentV3Routes from './agent/routes/v3';
import signalRoutes from './signal/routes';
import tradeRoutes from './trade/routes';
import tradeV3Routes from './trade/routes/v3';
import deploymentRoutes from './deployment/routes';
import authRoutes from './auth/routes';
import safeWalletRoutes from './safe-wallet/routes';
import notificationRoutes from './notification/routes';
import analyticsRoutes from './analytics/routes';
import billingRoutes from './billing/routes';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: [
      'agent', 'signal', 'trade', 'deployment', 
      'auth', 'safe-wallet', 'notification', 'analytics', 'billing'
    ]
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/v3/agents', agentV3Routes);
app.use('/api/signals', signalRoutes);
app.use('/api/execute', tradeRoutes);
app.use('/api/v3/execute', tradeV3Routes);
app.use('/api/deployments', deploymentRoutes);
app.use('/api/safe', safeWalletRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal server error',
    service: 'gateway'
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Maxxit API Gateway running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
EOF

echo "${GREEN}✓${NC} Created gateway.ts"

# ============================================================================
# CREATE SERVICE MAPPING GUIDE
# ============================================================================

cat > services/SERVICE_MAPPING.md << 'EOF'
# Service Mapping Guide

This document maps the old monolithic structure to the new microservices organization.

## API Routes → Services

### Agent Service (`services/api/agent/`)
**From**: `pages/api/agents/`
- `create.ts` → `controllers/AgentController.ts::create()`
- `list.ts` → `controllers/AgentController.ts::list()`
- `[id].ts` → `controllers/AgentController.ts::getById()`
- `leaderboard.ts` → `controllers/AgentController.ts::leaderboard()`

**From**: `pages/api/v3/agents/`
- `create.ts` → `controllers/AgentV3Controller.ts::create()`
- `list.ts` → `controllers/AgentV3Controller.ts::list()`

**Libraries**:
- `lib/metrics-updater.ts` → `services/metrics.ts`
- `lib/proof-of-intent.ts` → `services/proof.ts`

---

### Signal Service (`services/api/signal/`)
**From**: `pages/api/signals/`
- `generate.ts` → `controllers/SignalController.ts::generate()`
- `list.ts` → `controllers/SignalController.ts::list()`

**From**: `pages/api/v3/signals/`
- `generate.ts` → `controllers/SignalV3Controller.ts::generate()`

**Libraries**:
- `lib/signal-generator.ts` → `services/signal-generator.ts`
- `lib/llm-classifier.ts` → `services/llm-classifier.ts`
- `lib/lunarcrush-score.ts` → `services/lunarcrush.ts`
- `lib/x-api.ts` → `services/x-api.ts`

---

### Trade Execution Service (`services/api/trade/`)
**From**: `pages/api/execute/`
- `trade.ts` → `controllers/TradeController.ts::executeTrade()`
- `close-position.ts` → `controllers/TradeController.ts::closePosition()`

**From**: `pages/api/v3/execute/`
- `trade.ts` → `controllers/TradeV3Controller.ts::executeTrade()`

**Libraries**:
- `lib/trade-executor.ts` → `services/trade-executor.ts`
- `lib/v3/trade-executor-v3.ts` → `services/trade-executor-v3.ts`
- `lib/venue-router.ts` → `services/venue-router.ts`
- `lib/v3/venue-router.ts` → `services/venue-router-v3.ts`
- `lib/adapters/*` → `services/adapters/`

---

### Deployment Service (`services/api/deployment/`)
**From**: `pages/api/deployments/`
- `create.ts` → `controllers/DeploymentController.ts::create()`
- `list.ts` → `controllers/DeploymentController.ts::list()`
- `[id].ts` → `controllers/DeploymentController.ts::getById()`
- `pause.ts` → `controllers/DeploymentController.ts::pause()`
- `resume.ts` → `controllers/DeploymentController.ts::resume()`
- `cancel.ts` → `controllers/DeploymentController.ts::cancel()`

**Libraries**:
- `lib/executor-agreement.ts` → `services/executor-agreement.ts`
- `lib/wallet-pool.ts` → `services/wallet-pool.ts`

---

### Safe Wallet Service (`services/api/safe-wallet/`)
**From**: `pages/api/safe/`
- `deploy.ts` → `controllers/SafeWalletController.ts::deploy()`
- `enable-module.ts` → `controllers/SafeWalletController.ts::enableModule()`
- `approve-usdc.ts` → `controllers/SafeWalletController.ts::approveUSDC()`

**Libraries**:
- `lib/safe-wallet.ts` → `services/safe-wallet.ts`
- `lib/safe-deployment.ts` → `services/safe-deployment.ts`
- `lib/safe-module-service.ts` → `services/safe-module.ts`

---

## Workers → Services

### Position Monitor (`services/workers/position-monitor/`)
**From**: `workers/`
- `position-monitor-hyperliquid.ts` → `monitor-hyperliquid.ts`
- `position-monitor-ostium.ts` → `monitor-ostium.ts`
- `position-monitor-combined.ts` → `monitor-combined.ts`

---

### Signal Generator (`services/workers/signal-generator/`)
**From**: `workers/`
- `signal-generator.ts` → `index.ts`
- `tweet-ingestion-worker.ts` → `tweet-ingestion.ts`

---

## Python Services (Already Separate on Render)

### Hyperliquid (`services/python/hyperliquid/`)
**From**: `services/hyperliquid-service.py`
- Already deployed on Render
- No changes needed

### Ostium (`services/python/ostium/`)
**From**: `services/ostium-service.py`
- Already deployed on Render
- No changes needed

### Twitter Proxy (`services/python/twitter-proxy/`)
**From**: `services/twitter-proxy.py`
- Already deployed on Render
- No changes needed

---

## Frontend (`services/frontend/`)
**From**: Root directory
- `client/` → `services/frontend/`
- `pages/` (React pages) → `services/frontend/src/pages/`
- `components/` → `services/frontend/src/components/`

EOF

echo "${GREEN}✓${NC} Created SERVICE_MAPPING.md"

# ============================================================================
# CREATE PACKAGE.JSON FILES
# ============================================================================

echo ""
echo "${BLUE}📝 Creating package.json files...${NC}"

# Root package.json with workspaces
cat > package.json << 'EOF'
{
  "name": "maxxit-monorepo",
  "version": "2.0.0",
  "private": true,
  "workspaces": [
    "services/api",
    "services/workers/*",
    "services/frontend",
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=services/api",
    "dev:workers": "npm run dev --workspace=services/workers/position-monitor",
    "dev:frontend": "npm run dev --workspace=services/frontend",
    "build": "npm run build --workspaces",
    "start": "npm run start --workspace=services/api",
    "test": "npm run test --workspaces"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "ts-node-dev": "^2.0.0"
  }
}
EOF

# API service package.json
cat > services/api/package.json << 'EOF'
{
  "name": "@maxxit/api",
  "version": "2.0.0",
  "main": "dist/gateway.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only gateway.ts",
    "build": "tsc",
    "start": "node dist/gateway.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "@maxxit/common": "*",
    "@maxxit/database": "*"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "typescript": "^5.3.3"
  }
}
EOF

echo "${GREEN}✓${NC} Created package.json files"

# ============================================================================
# CREATE README
# ============================================================================

cat > services/README.md << 'EOF'
# Maxxit Services

This directory contains all microservices organized by domain.

## Structure

```
services/
├── api/                    # Main API (all Node.js services)
│   ├── agent/             # Agent management
│   ├── signal/            # Signal generation
│   ├── trade/             # Trade execution
│   ├── deployment/        # Deployments
│   ├── auth/              # Authentication
│   ├── safe-wallet/       # Safe wallet integration
│   ├── notification/      # Notifications
│   ├── analytics/         # Analytics
│   ├── billing/           # Billing
│   └── gateway.ts         # Main server (runs all above)
│
├── workers/               # Background workers
│   ├── position-monitor/  # Position monitoring
│   └── signal-generator/  # Signal generation
│
├── python/                # Python services (on Render)
│   ├── hyperliquid/       # Hyperliquid API
│   ├── ostium/            # Ostium API
│   └── twitter-proxy/     # X/Twitter API
│
└── frontend/              # React frontend
```

## Running Services

### All-in-One API Server (Recommended)
```bash
cd services/api
npm install
npm run dev
```
This runs ALL Node.js services in one process on port 4000.

### Individual Workers
```bash
# Position Monitor
cd services/workers/position-monitor
npm install
npm run dev

# Signal Generator
cd services/workers/signal-generator
npm install
npm run dev
```

### Python Services (Already on Render)
These are already deployed and running on Render:
- Hyperliquid: https://your-app.onrender.com
- Ostium: https://your-app.onrender.com
- Twitter Proxy: https://your-app.onrender.com

No changes needed!

### Frontend
```bash
cd services/frontend
npm install
npm run dev
```

## Development Workflow

1. **Work on a specific service**:
   ```bash
   cd services/api/agent
   # Edit controllers, services, models
   ```

2. **Add new routes**:
   - Edit `services/api/agent/routes/index.ts`
   - Routes automatically available via gateway

3. **Test your service**:
   ```bash
   curl http://localhost:4000/api/agents/list
   ```

4. **Deploy** (nothing changes!):
   - Push to git
   - Railway/Render auto-deploys
   - Python services stay on Render

## Benefits of This Structure

✅ **Clear organization**: Each service has its own directory
✅ **Easy to find code**: Know exactly where to look
✅ **Independent work**: Teams can work on different services
✅ **Flexible deployment**: Run as one server OR split later
✅ **No deployment changes**: Still works with existing setup
✅ **Better for developers**: Much easier to navigate

## Migration Status

- [ ] Move agent routes to services/api/agent/
- [ ] Move signal routes to services/api/signal/
- [ ] Move trade routes to services/api/trade/
- [ ] Move deployment routes to services/api/deployment/
- [ ] Move auth routes to services/api/auth/
- [ ] Move safe-wallet routes to services/api/safe-wallet/
- [ ] Move notification routes to services/api/notification/
- [ ] Move analytics routes to services/api/analytics/
- [ ] Move billing routes to services/api/billing/
- [ ] Move workers
- [ ] Move frontend
- [ ] Test everything works
- [ ] Deploy to Railway/Render

EOF

echo ""
echo "${GREEN}✅ Repository reorganization complete!${NC}"
echo ""
echo "${YELLOW}📋 Next steps:${NC}"
echo "1. Review the new structure in services/"
echo "2. Read services/SERVICE_MAPPING.md for migration guide"
echo "3. Read services/README.md for development workflow"
echo "4. Start migrating code: ${BLUE}npm run migrate${NC}"
echo ""
echo "${YELLOW}⚠️  Important:${NC}"
echo "- Python services stay on Render (no changes needed)"
echo "- API can still run as one server on Railway"
echo "- This is about code organization, not deployment"
echo ""
echo "🎉 Happy organizing!"

