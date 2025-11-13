# Maxxit Microservices Architecture

## Overview

This document outlines the microservices architecture for the Maxxit platform. The system is broken down into independent, deployable services that communicate via REST APIs and shared database.

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND SERVICE                         │
│                    (Next.js - Vercel/Railway)                    │
│                     Port: 3000 (Production)                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
        ┌───────────▼───┐   ┌───▼────────┐  ┌▼──────────────┐
        │  AGENT API     │   │ DEPLOYMENT │  │  SIGNAL API   │
        │   SERVICE      │   │    API     │  │   SERVICE     │
        │  Port: 4001    │   │ Port: 4002 │  │  Port: 4003   │
        └───────┬────────┘   └─────┬──────┘  └───┬───────────┘
                │                  │              │
                └──────────────────┼──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
        ┌───────────▼────────┐        ┌──────────▼──────────┐
        │  TRADE EXECUTION   │        │  POSITION MONITOR   │
        │     WORKER         │        │      WORKER         │
        │    Port: 5001      │        │     Port: 5002      │
        └───────┬────────────┘        └──────────┬──────────┘
                │                                 │
        ┌───────▼────────┐            ┌──────────▼──────────┐
        │  TWEET         │            │  METRICS UPDATER    │
        │  INGESTION     │            │     WORKER          │
        │  Port: 5003    │            │     Port: 5004      │
        └────────────────┘            └─────────────────────┘
                │
    ┌───────────┴───────────┐
    │                       │
┌───▼──────────┐   ┌────────▼────────┐
│  HYPERLIQUID │   │     OSTIUM      │
│   SERVICE    │   │    SERVICE      │
│   (Render)   │   │    (Render)     │
└──────────────┘   └─────────────────┘
         │
    ┌────▼────────┐
    │  X API      │
    │   PROXY     │
    │  (Render)   │
    └─────────────┘
         │
    ┌────▼──────────────────────┐
    │  SHARED POSTGRESQL DB     │
    │      (Railway/Neon)       │
    └───────────────────────────┘
```

---

## 📦 Services Breakdown

### 1. Frontend Service
- **Technology**: Next.js
- **Port**: 3000 (dev), Production (Vercel)
- **Deployment**: Vercel
- **Responsibilities**:
  - User interface
  - Client-side routing
  - Agent marketplace
  - Deployment UI
  - Dashboard and analytics
- **Directory**: `services/frontend/`
- **Dependencies**: All API services

---

### 2. Agent API Service
- **Technology**: Express.js
- **Port**: 4001
- **Deployment**: Railway
- **Responsibilities**:
  - Agent CRUD operations
  - Agent creation and management
  - Agent search and filtering
  - Agent accounts management
  - Research institute connections
- **Endpoints**:
  - `POST /api/agents` - Create agent
  - `GET /api/agents` - List agents
  - `GET /api/agents/:id` - Get agent details
  - `PUT /api/agents/:id` - Update agent
  - `DELETE /api/agents/:id` - Delete agent
  - `GET /api/agents/:id/routing-stats` - Get routing stats
- **Directory**: `services/agent-api/`

---

### 3. Deployment API Service
- **Technology**: Express.js
- **Port**: 4002
- **Deployment**: Railway
- **Responsibilities**:
  - Deployment management
  - Hyperliquid deployment
  - Ostium deployment
  - GMX/SPOT deployment (Safe-based)
  - Wallet pool management
  - Agent credential storage
- **Endpoints**:
  - `POST /api/deployments` - Create deployment
  - `GET /api/deployments/:id` - Get deployment
  - `PUT /api/deployments/:id` - Update deployment
  - `POST /api/hyperliquid/create-deployment` - Hyperliquid specific
  - `POST /api/ostium/create-deployment` - Ostium specific
- **Directory**: `services/deployment-api/`

---

### 4. Signal API Service
- **Technology**: Express.js
- **Port**: 4003
- **Deployment**: Railway
- **Responsibilities**:
  - Signal generation
  - Signal retrieval
  - Research signal processing
  - Signal validation
  - Venue routing decisions
- **Endpoints**:
  - `GET /api/signals` - List signals
  - `GET /api/signals/:id` - Get signal details
  - `POST /api/signals/generate` - Trigger signal generation
  - `GET /api/signals/research` - Research signals
- **Directory**: `services/signal-api/`

---

### 5. Trade Execution Worker
- **Technology**: Node.js (Worker)
- **Port**: 5001 (health check only)
- **Deployment**: Railway
- **Responsibilities**:
  - Execute trades based on signals
  - Route to correct venue (Vprime logic)
  - Interact with Hyperliquid/Ostium services
  - Position opening and management
  - Pre-trade validation
- **Schedule**: Runs every 30 seconds
- **Directory**: `services/trade-executor-worker/`

---

### 6. Position Monitor Worker
- **Technology**: Node.js (Worker)
- **Port**: 5002 (health check only)
- **Deployment**: Railway
- **Responsibilities**:
  - Monitor open positions
  - Check take-profit and stop-loss
  - Close positions when conditions met
  - Update position status
  - Trigger metrics updates
- **Schedule**: Runs every 60 seconds
- **Directory**: `services/position-monitor-worker/`

---

### 7. Tweet Ingestion Worker
- **Technology**: Node.js (Worker)
- **Port**: 5003 (health check only)
- **Deployment**: Railway
- **Responsibilities**:
  - Fetch tweets from monitored accounts
  - Call X API Proxy service
  - Store tweets in database
  - Classify tweets (signal/non-signal)
  - Calculate LunarCrush scores
- **Schedule**: Runs every 5 minutes
- **Directory**: `services/tweet-ingestion-worker/`

---

### 8. Metrics Updater Worker
- **Technology**: Node.js (Worker)
- **Port**: 5004 (health check only)
- **Deployment**: Railway
- **Responsibilities**:
  - Calculate APR (30d, 90d, SI)
  - Calculate Sharpe ratios
  - Update agent performance metrics
  - Aggregate multi-venue performance
- **Schedule**: Runs every 1 hour
- **Directory**: `services/metrics-updater-worker/`

---

### 9. Research Signal Generator Worker
- **Technology**: Node.js (Worker)
- **Port**: 5005 (health check only)
- **Deployment**: Railway
- **Responsibilities**:
  - Generate signals from research institutes
  - Process research reports
  - Parse sentiment and recommendations
- **Schedule**: Runs every 2 minutes
- **Directory**: `services/research-signal-worker/`

---

### 10. Hyperliquid Service (Existing)
- **Technology**: Python (FastAPI)
- **Deployment**: Render
- **URL**: `https://hyperliquid-service.onrender.com`
- **Responsibilities**:
  - Hyperliquid API interactions
  - Order placement
  - Position management
  - Market data
- **Status**: ✅ Already deployed, no changes needed

---

### 11. Ostium Service (Existing)
- **Technology**: Python (FastAPI)
- **Deployment**: Render
- **URL**: `https://maxxit-1.onrender.com`
- **Responsibilities**:
  - Ostium API interactions
  - Synthetic asset trading
  - Position management
  - Market data
- **Status**: ✅ Already deployed, no changes needed

---

### 12. X API Proxy Service (Existing)
- **Technology**: Python (FastAPI)
- **Deployment**: Render
- **URL**: `https://maxxit.onrender.com`
- **Responsibilities**:
  - Twitter/X API proxy
  - Tweet fetching
  - Account monitoring
- **Status**: ✅ Already deployed, no changes needed

---

## 🔄 Communication Patterns

### 1. Synchronous (REST API)
- Frontend → API Services
- API Services → Python Services (Hyperliquid, Ostium, X API)
- Workers → Python Services

### 2. Database-Driven
- All services share a PostgreSQL database
- Workers poll database for tasks
- API services write to database, workers read and process

### 3. Environment Variables
Each service has its own `.env` file with:
- Database connection strings
- Service URLs
- API keys
- Port configurations

---

## 🚀 Deployment Strategy

### Railway Services (6 services)
1. **Agent API** - Express server
2. **Deployment API** - Express server
3. **Signal API** - Express server
4. **Trade Execution Worker** - Background worker
5. **Position Monitor Worker** - Background worker
6. **Tweet Ingestion Worker** - Background worker
7. **Metrics Updater Worker** - Background worker
8. **Research Signal Worker** - Background worker
9. **PostgreSQL Database** - Managed database

### Vercel (1 service)
1. **Frontend** - Next.js application

### Render (3 services - existing)
1. **Hyperliquid Service** - Python FastAPI
2. **Ostium Service** - Python FastAPI
3. **X API Proxy** - Python FastAPI

---

## 📊 Benefits of This Architecture

### 1. **Independent Scaling**
- Scale workers independently based on load
- API services can scale horizontally
- Frontend CDN distribution via Vercel

### 2. **Fault Isolation**
- If one worker fails, others continue
- API service failures don't affect workers
- Frontend remains operational even if backend has issues

### 3. **Easier Development**
- Teams can work on different services
- Clear service boundaries
- Easier to test and debug

### 4. **Technology Flexibility**
- Can use different languages/frameworks per service
- Easier to upgrade or replace services

### 5. **Cost Optimization**
- Only scale what needs scaling
- Workers can run on smaller instances
- API services can use serverless options

---

## 🔐 Security Considerations

1. **API Gateway** (Future enhancement)
   - Single entry point for all APIs
   - Authentication and rate limiting
   - Request routing

2. **Service-to-Service Authentication**
   - Shared API keys
   - JWT tokens for internal communication

3. **Database Access**
   - Each service has minimal required permissions
   - Connection pooling
   - Read replicas for workers (future)

---

## 📈 Monitoring & Observability

1. **Health Checks**
   - Each service exposes `/health` endpoint
   - Railway/Render auto-restart on failures

2. **Logging**
   - Structured logging in all services
   - Centralized log aggregation (future)

3. **Metrics**
   - Service uptime
   - Request latency
   - Error rates
   - Queue depths

---

## 🛠️ Development Setup

Each service can be run independently:

```bash
# Agent API
cd services/agent-api && npm run dev

# Deployment API
cd services/deployment-api && npm run dev

# Signal API
cd services/signal-api && npm run dev

# Trade Execution Worker
cd services/trade-executor-worker && npm start

# Position Monitor Worker
cd services/position-monitor-worker && npm start

# Tweet Ingestion Worker
cd services/tweet-ingestion-worker && npm start

# Metrics Updater Worker
cd services/metrics-updater-worker && npm start

# Research Signal Worker
cd services/research-signal-worker && npm start

# Frontend
cd services/frontend && npm run dev
```

---

## 📝 Migration Plan

See `MICROSERVICES_MIGRATION.md` for step-by-step migration guide.

---

## 🔗 Related Documentation

- `MICROSERVICES_MIGRATION.md` - Migration guide
- `DEPLOYMENT_GUIDE.md` - Deployment instructions
- `API_REFERENCE.md` - API endpoints documentation
- `WORKER_GUIDE.md` - Worker configuration and scheduling

