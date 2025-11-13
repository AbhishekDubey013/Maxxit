# Microservices Migration Plan

## 🎯 Goal
Transform Maxxit from a monolithic application into a microservices architecture with **15 independent services**.

---

## 📊 Current State Analysis

### Monolith Structure
```
Maxxit/
├── pages/api/          (95 API routes - needs splitting)
├── lib/                (40+ libraries - needs categorization)
├── workers/            (13 workers - needs service assignment)
├── services/           (3 Python services - already separate)
├── components/         (17 React components - stays in frontend)
├── client/src/         (Frontend - needs extraction)
└── prisma/             (Single schema - needs analysis)
```

### Database Tables (Current)
- **V2 Tables**: 13 tables (agents, signals, positions, etc.)
- **V3 Tables**: 6 tables (agents_v3, signals_v3, positions_v3, etc.)
- **Total**: 19 tables to distribute across services

---

## 🗺️ Service Ownership Map

### Service → Database Tables

| Service | Tables | Count |
|---------|--------|-------|
| **Agent Service** | `agents`, `agents_v3`, `agent_accounts`, `impact_factor_history` | 4 |
| **Signal Service** | `signals`, `signals_v3`, `ct_accounts`, `ct_posts`, `market_indicators_6h` | 5 |
| **Trade Execution** | `positions`, `positions_v3`, `venue_routing_config_v3`, `venue_routing_history_v3` | 4 |
| **Deployment Service** | `agent_deployments`, `agent_deployments_v3` | 2 |
| **Billing Service** | `billing_events`, `pnl_snapshots` | 2 |
| **Auth Service** | *New tables*: `users`, `sessions`, `proof_of_intent` | 3 |
| **Shared** | `venues_status`, `token_registry`, `audit_logs` | 3 |

---

## 🔄 Service → API Routes Mapping

### Agent Management Service
**From** `pages/api/agents/`
```
✅ create.ts
✅ list.ts
✅ [id].ts
✅ leaderboard.ts
✅ update-metrics.ts
```

**From** `pages/api/v3/agents/`
```
✅ create.ts
✅ list.ts
✅ deploy.ts
```

**Total**: 8 routes → Agent Service

---

### Signal Service
**From** `pages/api/signals/`
```
✅ generate.ts
✅ list.ts
✅ [id].ts
✅ classify.ts
```

**From** `pages/api/tweets/`
```
✅ ingest.ts
✅ list.ts
```

**From** `pages/api/v3/signals/`
```
✅ generate.ts
```

**Total**: 7 routes → Signal Service

---

### Trade Execution Service
**From** `pages/api/execute/`
```
✅ trade.ts
✅ close-position.ts
✅ manual-trade.ts
```

**From** `pages/api/positions/`
```
✅ list.ts
✅ [id].ts
✅ close.ts
```

**From** `pages/api/v3/execute/`
```
✅ trade.ts
```

**From** `pages/api/v3/stats/`
```
✅ routing-history.ts
```

**Total**: 8 routes → Trade Execution Service

---

### Deployment Service
**From** `pages/api/deployments/`
```
✅ create.ts
✅ list.ts
✅ [id].ts
✅ pause.ts
✅ resume.ts
✅ cancel.ts
```

**From** `pages/api/v3/agents/`
```
✅ deploy.ts (already listed, but deployment logic)
```

**Total**: 6 routes → Deployment Service

---

### Safe Wallet Service
**From** `pages/api/safe/`
```
✅ deploy.ts
✅ enable-module.ts
✅ approve-usdc.ts
✅ execute-transaction.ts
✅ info.ts
```

**Total**: 5 routes → Safe Wallet Service

---

### Hyperliquid Integration
**From** `pages/api/hyperliquid/`
```
✅ deploy-agent.ts
✅ approve-agent.ts
✅ check-approval.ts
✅ get-positions.ts
✅ get-balance.ts
✅ close-position.ts
✅ place-order.ts
✅ get-markets.ts
```

**Total**: 8 routes → Proxies to Python Hyperliquid Service

---

### Notification Service
**From** `pages/api/telegram/`
```
✅ link.ts
✅ unlink.ts
✅ send-notification.ts
```

**Total**: 3 routes → Notification Service

---

### Analytics Service
**From** `pages/api/analytics/`
```
✅ performance.ts
✅ system-stats.ts
```

**From** `pages/api/v3/stats/`
```
✅ overview.ts
```

**Total**: 3 routes → Analytics Service

---

### Billing Service
**From** `pages/api/billing/`
```
✅ charge-trade-fee.ts
✅ distribute-profit-share.ts
✅ subscription-check.ts
```

**Total**: 3 routes → Billing Service

---

## 📦 Service → Libraries Mapping

### Agent Service Libraries
```
lib/
├── metrics-updater.ts           ✅
├── proof-of-intent.ts           ✅
├── proof-verification-service.ts ✅
```

### Signal Service Libraries
```
lib/
├── signal-generator.ts          ✅
├── llm-classifier.ts            ✅
├── lunarcrush-score.ts          ✅
├── research-signal-parser.ts    ✅
├── x-api.ts                     ✅
├── x-api-multi.ts               ✅
├── game-twitter-client.ts       ✅
```

### Trade Execution Service Libraries
```
lib/
├── trade-executor.ts            ✅
├── adapters/
│   ├── spot-adapter.ts          ✅
│   ├── gmx-adapter.ts           ✅
│   ├── hyperliquid-adapter.ts   ✅
│   ├── ostium-adapter.ts        ✅
├── venue-router.ts              ✅
├── v3/
│   ├── venue-router.ts          ✅
│   ├── trade-executor-v3.ts     ✅
├── position-sizing.ts           ✅
├── price-oracle.ts              ✅
```

### Deployment Service Libraries
```
lib/
├── executor-agreement.ts        ✅
├── wallet-pool.ts               ✅
```

### Safe Wallet Service Libraries
```
lib/
├── safe-wallet.ts               ✅
├── safe-deployment.ts           ✅
├── safe-module-service.ts       ✅
├── safe-transaction-service.ts  ✅
├── relayer.ts                   ✅
```

### Hyperliquid Service Libraries
```
lib/
├── hyperliquid-utils.ts         ✅
├── hyperliquid-signing.ts       ✅
├── hyperliquid-user-wallet.ts   ✅
```

### Notification Service Libraries
```
lib/
├── telegram-bot.ts              ✅
├── telegram-command-parser.ts   ✅
```

### Shared Libraries (All Services)
```
lib/
├── time-utils.ts                ✅
├── prisma-serializer.ts         ✅
├── token-whitelist-arbitrum.ts  ✅
```

---

## 🏗️ Monorepo Directory Structure

```
maxxit-platform/
├── .github/
│   └── workflows/
│       ├── api-gateway.yml
│       ├── agent-service.yml
│       ├── signal-service.yml
│       └── ... (one per service)
│
├── services/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── config/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── agent-service/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma (agent tables only)
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── signal-service/
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── trade-execution-service/
│   ├── deployment-service/
│   ├── position-monitor-service/
│   ├── safe-wallet-service/
│   ├── notification-service/
│   ├── analytics-service/
│   ├── billing-service/
│   ├── auth-service/
│   │
│   ├── hyperliquid-service/ (Python)
│   │   ├── app.py
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── README.md
│   │
│   ├── ostium-service/ (Python)
│   └── twitter-proxy-service/ (Python)
│
├── apps/
│   └── frontend/
│       ├── src/
│       ├── public/
│       ├── package.json
│       ├── Dockerfile
│       └── README.md
│
├── packages/
│   ├── common/
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── interfaces/
│   │   │   ├── constants/
│   │   │   └── utils/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── auth-middleware/
│   │   ├── src/
│   │   │   ├── jwt-validator.ts
│   │   │   ├── auth-guard.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── prisma-schemas/
│       ├── agent-schema/
│       ├── signal-schema/
│       └── shared-schema/
│
├── infrastructure/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   ├── kubernetes/
│   │   ├── api-gateway.yaml
│   │   ├── agent-service.yaml
│   │   └── ...
│   └── terraform/ (optional)
│
├── scripts/
│   ├── setup-monorepo.sh
│   ├── migrate-service.sh
│   ├── start-all-services.sh
│   └── generate-service-template.sh
│
├── .gitignore
├── package.json (root workspace)
├── turbo.json (if using Turborepo)
├── pnpm-workspace.yaml (if using pnpm)
├── README.md
├── MICROSERVICES_ARCHITECTURE.md
└── MICROSERVICES_MIGRATION_PLAN.md (this file)
```

---

## 🚀 Step-by-Step Migration Process

### Week 1-2: Setup & Infrastructure

#### Day 1-2: Monorepo Setup
```bash
# 1. Create monorepo structure
mkdir -p maxxit-platform/{services,apps,packages,infrastructure,scripts}

# 2. Initialize root package.json with workspaces
cd maxxit-platform
npm init -y

# 3. Install Turborepo (or Nx)
npm install turbo --save-dev

# 4. Create turbo.json for build orchestration
```

#### Day 3-4: Shared Libraries
```bash
# 1. Create @maxxit/common package
mkdir -p packages/common/src/{types,interfaces,constants,utils}

# 2. Move shared utilities
cp ../Maxxit/lib/time-utils.ts packages/common/src/utils/
cp ../Maxxit/lib/prisma-serializer.ts packages/common/src/utils/

# 3. Extract TypeScript interfaces from all services
# (automated script recommended)
```

#### Day 5-7: Docker Infrastructure
```bash
# 1. Create docker-compose.yml
# 2. Set up PostgreSQL container
# 3. Set up Redis container
# 4. Test database connectivity
```

#### Day 8-10: API Gateway
```bash
# 1. Create services/api-gateway
# 2. Set up Express/NestJS server
# 3. Add JWT middleware
# 4. Add rate limiting
# 5. Add request logging
# 6. Create health check endpoint
```

---

### Week 3-4: Extract Core Services

#### Auth Service (Days 11-13)
```bash
# 1. Create services/auth-service
# 2. Move SIWE logic from pages/api/auth
# 3. Create JWT token generation
# 4. Add proof-of-intent verification
# 5. Test authentication flow
# 6. Update API Gateway routes
```

#### Agent Service (Days 14-17)
```bash
# 1. Create services/agent-service
# 2. Move pages/api/agents/* routes
# 3. Move pages/api/v3/agents/* routes
# 4. Move lib/metrics-updater.ts
# 5. Create Prisma schema (agents, agents_v3 tables)
# 6. Add CRUD endpoints
# 7. Add leaderboard logic
# 8. Test all endpoints
# 9. Update API Gateway routes
```

#### Signal Service (Days 18-21)
```bash
# 1. Create services/signal-service
# 2. Move pages/api/signals/* routes
# 3. Move pages/api/v3/signals/* routes
# 4. Move LLM classification logic
# 5. Move X API integration
# 6. Create Prisma schema (signals, signals_v3, ct_accounts, ct_posts)
# 7. Add signal generation endpoints
# 8. Test signal flow
# 9. Update API Gateway routes
```

---

### Week 5-6: Execution & Monitoring

#### Trade Execution Service (Days 22-26)
```bash
# 1. Create services/trade-execution-service
# 2. Move pages/api/execute/* routes
# 3. Move pages/api/v3/execute/* routes
# 4. Move lib/trade-executor.ts and adapters
# 5. Move lib/v3/venue-router.ts and trade-executor-v3.ts
# 6. Create Prisma schema (positions, positions_v3, routing tables)
# 7. Add venue routing logic
# 8. Test multi-venue execution
# 9. Update API Gateway routes
```

#### Position Monitor Service (Days 27-30)
```bash
# 1. Create services/position-monitor-service
# 2. Move workers/position-monitor-*.ts
# 3. Add trailing stop logic
# 4. Add auto-discovery (Hyperliquid)
# 5. Add race condition prevention
# 6. Test monitoring cycles
# 7. Deploy as background worker
```

---

### Week 7: Deployment & Wallet Services

#### Deployment Service (Days 31-33)
```bash
# 1. Create services/deployment-service
# 2. Move pages/api/deployments/* routes
# 3. Move deployment logic
# 4. Create Prisma schema (agent_deployments, agent_deployments_v3)
# 5. Test deployment flow
# 6. Update API Gateway routes
```

#### Safe Wallet Service (Days 34-36)
```bash
# 1. Create services/safe-wallet-service
# 2. Move pages/api/safe/* routes
# 3. Move lib/safe-*.ts files
# 4. Add Safe SDK integration
# 5. Test wallet operations
# 6. Update API Gateway routes
```

---

### Week 8: Supporting Services

#### Notification Service (Days 37-39)
```bash
# 1. Create services/notification-service
# 2. Move pages/api/telegram/* routes
# 3. Move lib/telegram-*.ts files
# 4. Add email notification support
# 5. Add webhook delivery
# 6. Test notification delivery
```

#### Analytics Service (Days 40-42)
```bash
# 1. Create services/analytics-service
# 2. Move pages/api/analytics/* routes
# 3. Move pages/api/v3/stats/* routes
# 4. Add APR calculation
# 5. Add Sharpe ratio calculation
# 6. Add routing analytics
# 7. Test analytics endpoints
```

#### Billing Service (Days 43-45)
```bash
# 1. Create services/billing-service
# 2. Move pages/api/billing/* routes
# 3. Add subscription management
# 4. Add profit share distribution
# 5. Test billing flow
```

---

### Week 9: Python Services Integration

#### Hyperliquid Service (Days 46-47)
```bash
# 1. Move services/hyperliquid-service.py to monorepo
# 2. Create Dockerfile
# 3. Add to docker-compose.yml
# 4. Test integration with Trade Execution Service
```

#### Ostium Service (Days 48-49)
```bash
# 1. Move services/ostium-service.py to monorepo
# 2. Create Dockerfile
# 3. Add to docker-compose.yml
# 4. Test integration with Trade Execution Service
```

#### Twitter Proxy Service (Day 50)
```bash
# 1. Move services/twitter-proxy.py to monorepo
# 2. Create Dockerfile
# 3. Add to docker-compose.yml
# 4. Test integration with Signal Service
```

---

### Week 10: Frontend & Testing

#### Frontend Service (Days 51-53)
```bash
# 1. Move client/src to apps/frontend
# 2. Update API calls to use API Gateway
# 3. Add environment-based config
# 4. Test all user flows
# 5. Create Dockerfile
```

#### Integration Testing (Days 54-56)
```bash
# 1. Write end-to-end tests
# 2. Test agent creation → deployment → signal → trade flow
# 3. Test V2 and V3 flows separately
# 4. Load testing
# 5. Fix bugs
```

---

### Week 11: Production Deployment

#### Kubernetes Setup (Days 57-60)
```bash
# 1. Create Kubernetes manifests
# 2. Set up Ingress controller
# 3. Configure service discovery
# 4. Set up monitoring (Prometheus + Grafana)
# 5. Set up logging (ELK or Loki)
```

#### Deployment (Days 61-63)
```bash
# 1. Deploy to staging environment
# 2. Run smoke tests
# 3. Gradual rollout to production
# 4. Monitor metrics
# 5. Fix production issues
```

---

## 📋 Migration Checklist

### Infrastructure
- [ ] Monorepo structure created
- [ ] Root package.json with workspaces
- [ ] Turborepo/Nx configured
- [ ] Docker Compose setup
- [ ] PostgreSQL container
- [ ] Redis container
- [ ] Shared libraries created

### Services Created
- [ ] API Gateway
- [ ] Auth Service
- [ ] Agent Management Service
- [ ] Signal Service
- [ ] Trade Execution Service
- [ ] Deployment Service
- [ ] Position Monitor Service
- [ ] Safe Wallet Service
- [ ] Notification Service
- [ ] Analytics Service
- [ ] Billing Service
- [ ] Hyperliquid Service (Python)
- [ ] Ostium Service (Python)
- [ ] Twitter Proxy Service (Python)

### Frontend
- [ ] Frontend extracted to apps/frontend
- [ ] API calls updated to API Gateway
- [ ] Environment configuration
- [ ] Build and deployment working

### Testing
- [ ] Unit tests per service
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Load testing
- [ ] Security testing

### Documentation
- [ ] Architecture document ✅
- [ ] Migration plan ✅
- [ ] API documentation per service
- [ ] Deployment guides
- [ ] Developer onboarding guide

### Production
- [ ] Staging environment deployed
- [ ] Production environment deployed
- [ ] Monitoring configured
- [ ] Logging configured
- [ ] Alerting configured
- [ ] Backup strategy
- [ ] Disaster recovery plan

---

## 🎯 Success Criteria

Migration is complete when:
1. ✅ All 15 services are deployed and running
2. ✅ All API routes are accessible via API Gateway
3. ✅ All tests pass (unit, integration, e2e)
4. ✅ V2 and V3 flows work end-to-end
5. ✅ Frontend communicates with backend successfully
6. ✅ Monitoring and logging are operational
7. ✅ Documentation is complete
8. ✅ Performance is equal or better than monolith
9. ✅ Zero downtime deployment works
10. ✅ Development team can work independently on services

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data inconsistency across services | High | Use transactions, event sourcing, eventual consistency patterns |
| Increased latency (service-to-service calls) | Medium | Use caching, async patterns where possible |
| Complex debugging | Medium | Implement distributed tracing (Jaeger) |
| Breaking changes in shared libraries | High | Use semantic versioning, deprecation warnings |
| Database migration issues | High | Test migrations in staging, have rollback plan |
| Service discovery failures | High | Use health checks, circuit breakers |

---

## 💡 Best Practices

1. **Start Small**: Begin with Auth Service (simplest)
2. **Test Thoroughly**: Each service should have >80% test coverage
3. **Document Everything**: READMEs, API docs, architecture diagrams
4. **Use Feature Flags**: Gradual rollout of new services
5. **Monitor Continuously**: Set up alerts before migration
6. **Keep Rollback Plan**: Always have a way to revert
7. **Communicate**: Daily updates to team on migration progress

---

## 📞 Support & Communication

- **Daily Standup**: 15 min sync on migration progress
- **Weekly Review**: Demo migrated services
- **Slack Channel**: #microservices-migration
- **Documentation**: Keep this plan updated as we progress

---

**Ready to start? Let's begin with Week 1: Infrastructure Setup!**

