# Maxxit Microservices Architecture

## 🎯 Overview

This document outlines the transformation of Maxxit from a monolithic application into a microservices architecture, enabling independent development, deployment, and scaling of different components.

---

## 🏗️ Microservices Breakdown

### 1. **Frontend Service** (`frontend/`)
**Technology**: React 18 + Vite + TypeScript
**Port**: 3000
**Responsibility**: User interface and client-side logic

**Components**:
- Landing pages
- Agent marketplace
- Agent creation UI
- Deployment dashboards
- Admin panels

**Dependencies**:
- API Gateway (for all backend communication)

**Repository**: `maxxit-frontend`

---

### 2. **API Gateway** (`api-gateway/`)
**Technology**: Node.js + Express/NestJS
**Port**: 4000
**Responsibility**: Single entry point, request routing, authentication

**Features**:
- Route requests to appropriate microservices
- JWT authentication & authorization
- Rate limiting
- Request/response transformation
- API versioning (v2, v3)
- Load balancing

**Routes**:
```
/api/v2/*          → V2 Services
/api/v3/*          → V3 Services
/api/auth/*        → Auth Service
/api/agents/*      → Agent Management Service
/api/signals/*     → Signal Service
/api/deployments/* → Deployment Service
/api/trades/*      → Trade Execution Service
```

**Repository**: `maxxit-api-gateway`

---

### 3. **Auth Service** (`auth-service/`)
**Technology**: Node.js + Express
**Port**: 4001
**Responsibility**: Authentication & authorization

**Features**:
- SIWE (Sign-In With Ethereum)
- JWT token generation/validation
- User session management
- Proof of Intent verification
- Wallet signature validation

**Database**: PostgreSQL (shared or dedicated)
**Tables**: `users`, `sessions`, `proof_of_intent`

**Repository**: `maxxit-auth-service`

---

### 4. **Agent Management Service** (`agent-service/`)
**Technology**: Node.js + NestJS + Prisma
**Port**: 4002
**Responsibility**: Agent CRUD operations (V2 + V3)

**Features**:
- Create/update/delete agents
- Agent configuration management
- Agent performance metrics (APR, Sharpe)
- Leaderboard generation
- Impact Factor calculation

**Database**: PostgreSQL
**Tables**: 
- V2: `agents`, `agent_accounts`
- V3: `agents_v3`

**API Endpoints**:
```
POST   /v2/agents/create
GET    /v2/agents/list
PATCH  /v2/agents/:id
DELETE /v2/agents/:id
GET    /v2/agents/leaderboard

POST   /v3/agents/create
GET    /v3/agents/list
GET    /v3/agents/:id
```

**Repository**: `maxxit-agent-service`

---

### 5. **Signal Service** (`signal-service/`)
**Technology**: Node.js + NestJS + Prisma
**Port**: 4003
**Responsibility**: Signal generation and classification (V2 + V3)

**Features**:
- Tweet ingestion from X API
- LLM-based signal classification
- Research signal parsing
- Market indicator analysis
- Signal validation and scoring
- **V3**: Venue-agnostic signal generation

**Database**: PostgreSQL
**Tables**: 
- V2: `signals`, `ct_accounts`, `ct_posts`, `market_indicators_6h`
- V3: `signals_v3`

**External Dependencies**:
- OpenAI/Anthropic API (LLM)
- LunarCrush API
- Twitter Proxy Service

**API Endpoints**:
```
POST /v2/signals/generate
GET  /v2/signals/list
GET  /v2/signals/:id

POST /v3/signals/generate
GET  /v3/signals/list
```

**Repository**: `maxxit-signal-service`

---

### 6. **Trade Execution Service** (`trade-execution-service/`)
**Technology**: Node.js + NestJS + Prisma
**Port**: 4004
**Responsibility**: Trade execution across all venues

**Features**:
- Multi-venue trade execution (SPOT, GMX, HYPERLIQUID, OSTIUM)
- Position management
- Risk management (slippage, size validation)
- **V3**: Intelligent venue routing (Agent Where)
- Profit share distribution
- Transaction monitoring

**Database**: PostgreSQL
**Tables**: 
- V2: `positions`, `billing_events`
- V3: `positions_v3`, `venue_routing_history_v3`

**External Dependencies**:
- Hyperliquid Service (Python)
- Ostium Service (Python)
- Safe Wallet Service
- Blockchain RPC nodes

**API Endpoints**:
```
POST /v2/execute/trade
POST /v2/execute/close
GET  /v2/positions/list

POST /v3/execute/trade
GET  /v3/positions/list
GET  /v3/routing-history
```

**Repository**: `maxxit-trade-execution-service`

---

### 7. **Deployment Service** (`deployment-service/`)
**Technology**: Node.js + NestJS + Prisma
**Port**: 4005
**Responsibility**: Agent deployment lifecycle management

**Features**:
- Deploy agents to user wallets
- Manage subscriptions
- Billing cycle management
- Safe wallet module management
- Hyperliquid agent delegation
- Ostium agent setup

**Database**: PostgreSQL
**Tables**: 
- V2: `agent_deployments`
- V3: `agent_deployments_v3`

**External Dependencies**:
- Safe Wallet Service
- Hyperliquid Service
- Ostium Service

**API Endpoints**:
```
POST   /v2/deployments/create
GET    /v2/deployments/list
PATCH  /v2/deployments/:id/pause
PATCH  /v2/deployments/:id/resume
DELETE /v2/deployments/:id

POST   /v3/deployments/create
GET    /v3/deployments/list
```

**Repository**: `maxxit-deployment-service`

---

### 8. **Position Monitor Service** (`position-monitor-service/`)
**Technology**: Node.js + NestJS
**Port**: 4006 (internal only)
**Responsibility**: Real-time position monitoring and risk management

**Features**:
- Monitor open positions across all venues
- Trailing stop management
- Take profit execution
- Auto-discovery of positions (Hyperliquid)
- Race condition prevention
- PnL tracking

**Database**: PostgreSQL
**Tables**: `positions`, `positions_v3`, `pnl_snapshots`

**External Dependencies**:
- Trade Execution Service
- Hyperliquid Service
- Ostium Service
- Price Oracle Service

**Workers**:
- Position Monitor (Hyperliquid) - 30s cycles
- Position Monitor (Ostium) - 30s cycles
- Position Monitor (SPOT/GMX) - 1m cycles

**Repository**: `maxxit-position-monitor-service`

---

### 9. **Hyperliquid Service** (`hyperliquid-service/`)
**Technology**: Python 3.9+ + Flask
**Port**: 5001
**Responsibility**: Hyperliquid API integration

**Features**:
- Place/cancel orders
- Fetch positions and balances
- Agent delegation management
- Internal USDC transfers
- Market data fetching

**External Dependencies**:
- Hyperliquid official Python SDK
- Hyperliquid API

**API Endpoints**:
```
POST /place-order
POST /cancel-order
GET  /positions
GET  /balance
POST /approve-agent
POST /transfer-internal
GET  /markets
```

**Repository**: `maxxit-hyperliquid-service`

---

### 10. **Ostium Service** (`ostium-service/`)
**Technology**: Python 3.9+ + Flask
**Port**: 5002
**Responsibility**: Ostium API integration

**Features**:
- Place/modify/cancel orders
- Fetch positions and balances
- Agent wallet management
- Market data fetching (41 pairs)
- PnL calculation

**External Dependencies**:
- Ostium Python SDK
- Ostium API

**API Endpoints**:
```
POST /place-order
POST /modify-order
POST /cancel-order
GET  /positions
GET  /balance
GET  /markets
GET  /funding-rates
```

**Repository**: `maxxit-ostium-service`

---

### 11. **Safe Wallet Service** (`safe-wallet-service/`)
**Technology**: Node.js + ethers.js
**Port**: 4007
**Responsibility**: Safe wallet integration and on-chain transactions

**Features**:
- Safe wallet deployment
- Module management (enable/disable)
- Transaction building and execution
- USDC approvals
- On-chain profit share distribution
- Gas management (gasless relays)

**External Dependencies**:
- Safe SDK
- Arbitrum RPC
- Uniswap V3 router

**API Endpoints**:
```
POST /safe/deploy
POST /safe/enable-module
POST /safe/execute-transaction
GET  /safe/:address/info
POST /safe/approve-token
```

**Repository**: `maxxit-safe-wallet-service`

---

### 12. **Twitter Proxy Service** (`twitter-proxy-service/`)
**Technology**: Python 3.9+ + Flask
**Port**: 5003
**Responsibility**: Twitter/X API integration

**Features**:
- Fetch tweets from monitored accounts
- Rate limit management
- Tweet data extraction
- User timeline fetching

**External Dependencies**:
- Twitter API v2
- Game Twitter client

**API Endpoints**:
```
GET  /user/:username/tweets
GET  /tweet/:id
POST /search
```

**Repository**: `maxxit-twitter-proxy-service`

---

### 13. **Notification Service** (`notification-service/`)
**Technology**: Node.js + Bull/BullMQ
**Port**: 4008
**Responsibility**: User notifications (Telegram, Email, Webhooks)

**Features**:
- Telegram bot integration
- Email notifications (SendGrid/AWS SES)
- Webhook delivery
- Notification preferences management
- Trade execution alerts
- Position alerts (profit/loss)

**Database**: PostgreSQL (or Redis for queuing)
**Tables**: `notification_preferences`, `notification_history`

**API Endpoints**:
```
POST /notify/telegram
POST /notify/email
POST /notify/webhook
POST /preferences/update
```

**Repository**: `maxxit-notification-service`

---

### 14. **Analytics Service** (`analytics-service/`)
**Technology**: Node.js + NestJS
**Port**: 4009
**Responsibility**: System analytics and reporting

**Features**:
- APR calculation (30d, 90d, SI)
- Sharpe ratio calculation
- Impact Factor tracking
- System health metrics
- Venue routing analytics (V3)
- Performance dashboards

**Database**: PostgreSQL (read replicas recommended)
**Tables**: All tables (read-only access)

**API Endpoints**:
```
GET /analytics/agent/:id/performance
GET /analytics/system/overview
GET /analytics/venue-routing/stats
GET /analytics/impact-factor/:account
```

**Repository**: `maxxit-analytics-service`

---

### 15. **Billing Service** (`billing-service/`)
**Technology**: Node.js + NestJS + Stripe
**Port**: 4010
**Responsibility**: Billing and subscription management

**Features**:
- Monthly subscription billing ($20/month)
- Per-trade fees ($0.20/trade)
- Profit share calculation (20% total: 10% creator, 10% sources)
- Payment processing (Stripe/crypto)
- Invoice generation
- Usage tracking

**Database**: PostgreSQL
**Tables**: `billing_events`, `subscriptions`, `invoices`

**API Endpoints**:
```
POST /billing/subscribe
POST /billing/charge-trade-fee
POST /billing/distribute-profit-share
GET  /billing/invoices/:userId
POST /billing/cancel-subscription
```

**Repository**: `maxxit-billing-service`

---

## 🔗 Inter-Service Communication

### Communication Patterns

1. **Synchronous (REST/HTTP)**:
   - API Gateway ↔ All services
   - Service-to-service direct calls (when needed)

2. **Asynchronous (Message Queue - Redis/RabbitMQ)**:
   - Signal Service → Trade Execution Service (signal created)
   - Trade Execution Service → Notification Service (trade executed)
   - Position Monitor → Trade Execution Service (close position)
   - Billing Service → All services (billing events)

3. **Event Bus (Redis Pub/Sub or Kafka)**:
   - System-wide events (agent created, deployment activated, position closed)
   - Real-time updates for frontend

---

## 📊 Shared Resources

### Database Strategy

**Option 1: Shared Database** (Easier migration)
- Single PostgreSQL instance
- Each service has its own schema
- Prisma client per service

**Option 2: Database per Service** (True microservices)
- Each service has dedicated database
- Data replication where needed
- Event-driven data synchronization

**Recommended**: Start with Option 1, migrate to Option 2 as needed

### Shared Libraries

Create npm packages for common code:
- `@maxxit/common` - Shared types, interfaces, utilities
- `@maxxit/prisma-client` - Prisma client (if shared DB)
- `@maxxit/auth-middleware` - JWT validation middleware
- `@maxxit/venue-adapters` - Venue adapter interfaces

---

## 🐳 Local Development Setup

### Docker Compose Structure

```yaml
version: '3.8'

services:
  # Infrastructure
  postgres:
    image: postgres:15
    ports: [5432:5432]
  
  redis:
    image: redis:7
    ports: [6379:6379]
  
  # API Gateway
  api-gateway:
    build: ./api-gateway
    ports: [4000:4000]
    depends_on: [postgres, redis]
  
  # Node.js Services
  agent-service:
    build: ./agent-service
    ports: [4002:4002]
  
  signal-service:
    build: ./signal-service
    ports: [4003:4003]
  
  trade-execution-service:
    build: ./trade-execution-service
    ports: [4004:4004]
  
  deployment-service:
    build: ./deployment-service
    ports: [4005:4005]
  
  position-monitor-service:
    build: ./position-monitor-service
    ports: [4006:4006]
  
  safe-wallet-service:
    build: ./safe-wallet-service
    ports: [4007:4007]
  
  notification-service:
    build: ./notification-service
    ports: [4008:4008]
  
  analytics-service:
    build: ./analytics-service
    ports: [4009:4009]
  
  billing-service:
    build: ./billing-service
    ports: [4010:4010]
  
  # Python Services
  hyperliquid-service:
    build: ./hyperliquid-service
    ports: [5001:5001]
  
  ostium-service:
    build: ./ostium-service
    ports: [5002:5002]
  
  twitter-proxy-service:
    build: ./twitter-proxy-service
    ports: [5003:5003]
  
  # Frontend
  frontend:
    build: ./frontend
    ports: [3000:3000]
    depends_on: [api-gateway]
```

---

## 📦 Repository Structure

### Monorepo vs Multi-Repo

**Option 1: Monorepo** (Recommended for initial migration)
```
maxxit-platform/
├── packages/
│   ├── api-gateway/
│   ├── agent-service/
│   ├── signal-service/
│   ├── trade-execution-service/
│   ├── deployment-service/
│   ├── position-monitor-service/
│   ├── safe-wallet-service/
│   ├── notification-service/
│   ├── analytics-service/
│   ├── billing-service/
│   ├── hyperliquid-service/
│   ├── ostium-service/
│   ├── twitter-proxy-service/
│   └── frontend/
├── shared/
│   ├── common/
│   ├── prisma-client/
│   └── auth-middleware/
├── docker-compose.yml
├── package.json (root)
└── README.md
```

**Tools**: Turborepo, Nx, or Lerna

**Option 2: Multi-Repo**
- Each service in separate repository
- Shared libraries as npm packages
- More complex CI/CD but better isolation

---

## 🚀 Migration Strategy

### Phase 1: Preparation (Week 1-2)
1. ✅ Create microservices architecture document
2. ✅ Set up monorepo structure
3. ✅ Create shared libraries
4. ✅ Set up Docker infrastructure
5. ✅ Create API Gateway skeleton

### Phase 2: Extract Services (Week 3-6)
**Priority Order**:
1. **Auth Service** (foundation)
2. **Agent Management Service** (core domain)
3. **Signal Service** (independent)
4. **Trade Execution Service** (critical path)
5. **Deployment Service**
6. **Position Monitor Service**
7. **Safe Wallet Service**
8. **Notification Service**
9. **Analytics Service**
10. **Billing Service**

**For each service**:
- Create service structure
- Move API routes
- Move business logic
- Update imports
- Add service-specific tests
- Update API Gateway routes
- Deploy and test

### Phase 3: Python Services (Week 7)
- Containerize existing Python services
- Add proper health checks
- Integrate with API Gateway

### Phase 4: Frontend Migration (Week 8)
- Update API calls to use API Gateway
- Environment-based configuration
- Deploy separately from backend

### Phase 5: Production Deployment (Week 9-10)
- Set up Kubernetes cluster (or similar)
- Configure service discovery
- Set up monitoring (Prometheus + Grafana)
- Set up logging (ELK stack)
- Load testing
- Gradual rollout

---

## 📈 Monitoring & Observability

### Tools
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana) or Loki
- **Tracing**: Jaeger or Zipkin
- **Health Checks**: Custom /health endpoints per service
- **APM**: DataDog, New Relic, or Sentry

### Key Metrics per Service
- Request rate
- Error rate
- Response time (p50, p95, p99)
- Database query time
- External API latency
- Queue depth (for async services)

---

## 🔒 Security Considerations

1. **API Gateway**: Rate limiting, JWT validation
2. **Service-to-Service**: Mutual TLS or API keys
3. **Secrets Management**: Vault, AWS Secrets Manager, or k8s secrets
4. **Network Isolation**: Private network for inter-service communication
5. **Database Access**: Each service has dedicated DB user with minimal permissions

---

## 💰 Cost Optimization

### Development Environment
- Local: Docker Compose (free)
- Cloud Dev: Single VM with all services ($50-100/month)

### Production Environment
- **Small Scale**: Single Kubernetes node or VPS ($200-500/month)
- **Medium Scale**: 3-node Kubernetes cluster ($500-1000/month)
- **Large Scale**: Auto-scaling Kubernetes cluster ($1000+/month)

### Service Scaling Priorities
1. **Position Monitor** (CPU-intensive, needs fast response)
2. **Trade Execution** (critical path, needs high availability)
3. **Signal Service** (can be scaled horizontally)
4. **Agent Management** (low load, single instance OK)

---

## 📋 Service Health Check Endpoints

Each service should implement:
```
GET /health
GET /health/ready
GET /health/live
GET /metrics (Prometheus format)
```

---

## 🎯 Success Metrics

After migration, you should see:
- ✅ Independent deployments per service
- ✅ Faster development cycles (teams work in parallel)
- ✅ Better fault isolation (one service down ≠ system down)
- ✅ Easier scaling (scale only what needs scaling)
- ✅ Clearer code ownership
- ✅ Simplified onboarding (devs focus on specific services)

---

## 🔧 Next Steps

1. Review and approve this architecture
2. Set up monorepo structure
3. Create service templates (boilerplate)
4. Start with Auth Service extraction
5. Iterate service by service

---

**Ready to start migration? Let's begin with setting up the monorepo structure!**

