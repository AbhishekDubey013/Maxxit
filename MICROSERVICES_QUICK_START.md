# Microservices Quick Start Guide

This guide will help you get started with the Maxxit microservices architecture in **under 30 minutes**.

---

## 🚀 Prerequisites

- **Node.js** 20+ installed
- **Docker** & **Docker Compose** installed
- **Git** installed
- **Basic understanding** of TypeScript and microservices

---

## 📋 Step 1: Review the Architecture (5 mins)

Read the following documents to understand the system:

1. **`MICROSERVICES_ARCHITECTURE.md`** - Complete architecture overview
2. **`MICROSERVICES_MIGRATION_PLAN.md`** - Step-by-step migration plan

**Key Concepts**:
- **15 Microservices**: 11 Node.js + 3 Python + 1 Frontend
- **API Gateway**: Single entry point for all requests
- **Shared Database**: (initially) Single PostgreSQL instance
- **Docker Compose**: Local development environment

---

## 📂 Step 2: Set Up the Monorepo (5 mins)

Run the setup script to create the complete directory structure:

```bash
# Make the script executable
chmod +x scripts/setup-microservices-monorepo.sh

# Run the setup
./scripts/setup-microservices-monorepo.sh
```

This creates:
```
maxxit-platform/
├── services/       (15 microservices)
├── apps/           (frontend)
├── packages/       (shared libraries)
├── infrastructure/ (Docker, K8s configs)
└── scripts/        (helper scripts)
```

---

## 🔧 Step 3: Configure Environment (2 mins)

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your favorite editor
```

**Minimum required**:
```env
DATABASE_URL=postgresql://maxxit:maxxit_dev_password@localhost:5432/maxxit
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
RPC_URL_ARBITRUM=https://arb1.arbitrum.io/rpc
```

---

## 📦 Step 4: Install Dependencies (5 mins)

```bash
# Install root dependencies and workspace packages
npm install

# This installs dependencies for all services in the monorepo
```

---

## 🐳 Step 5: Start Infrastructure (3 mins)

```bash
# Start PostgreSQL and Redis
docker-compose -f docker-compose.microservices.yml up -d postgres redis

# Wait for services to be healthy
docker-compose -f docker-compose.microservices.yml ps
```

You should see:
- ✅ `maxxit-postgres` - healthy
- ✅ `maxxit-redis` - healthy

---

## 🏗️ Step 6: Run Database Migrations (2 mins)

```bash
# Apply existing Prisma schema
cd services/agent-service  # or any service with Prisma
npx prisma db push

# Seed database (optional)
npx prisma db seed
```

---

## 🎯 Step 7: Start Services (One by One)

### Option A: Start All Services with Docker

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Option B: Start Individual Services (Recommended for Development)

**Terminal 1: API Gateway**
```bash
cd services/api-gateway
npm run dev
# Runs on http://localhost:4000
```

**Terminal 2: Agent Service**
```bash
cd services/agent-service
npm run dev
# Runs on http://localhost:4002
```

**Terminal 3: Signal Service**
```bash
cd services/signal-service
npm run dev
# Runs on http://localhost:4003
```

**Terminal 4: Frontend**
```bash
cd apps/frontend
npm run dev
# Runs on http://localhost:3000
```

---

## ✅ Step 8: Verify Everything Works

### Health Check: API Gateway
```bash
curl http://localhost:4000/health
# Expected: {"status": "healthy", "timestamp": "..."}
```

### Health Check: Agent Service
```bash
curl http://localhost:4002/health
# Expected: {"status": "healthy"}
```

### Test API via Gateway
```bash
# List agents (should return empty array initially)
curl http://localhost:4000/api/v3/agents/list
# Expected: {"agents": [], "total": 0}
```

### Open Frontend
Visit: http://localhost:3000

You should see the Maxxit homepage!

---

## 🔄 Development Workflow

### Making Changes to a Service

1. **Navigate to service**:
   ```bash
   cd services/agent-service
   ```

2. **Make code changes** in `src/`

3. **Service auto-reloads** (thanks to `ts-node-dev`)

4. **Test your changes**:
   ```bash
   npm test
   ```

5. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat(agent-service): add new feature"
   ```

### Using Shared Packages

**Shared Types** (`packages/common`):
```typescript
// In any service:
import { AgentStatus, VenueType } from '@maxxit/common';
```

**Auth Middleware** (`packages/auth-middleware`):
```typescript
// In any service:
import { authenticateJWT } from '@maxxit/auth-middleware';

app.get('/protected', authenticateJWT, (req, res) => {
  // req.user is available
});
```

### Adding a New Endpoint

**1. Add route in the service** (`services/agent-service/src/routes/agents.ts`):
```typescript
router.get('/agents/:id/performance', async (req, res) => {
  // Your logic here
});
```

**2. Add route in API Gateway** (`services/api-gateway/src/routes/index.ts`):
```typescript
app.use('/api/v3/agents', proxy('http://agent-service:4002'));
```

**3. Test**:
```bash
curl http://localhost:4000/api/v3/agents/123/performance
```

---

## 📊 Monitoring & Debugging

### View All Service Logs
```bash
npm run docker:logs
```

### View Specific Service Logs
```bash
docker logs -f maxxit-agent-service
```

### Inspect Database
```bash
# Connect to PostgreSQL
docker exec -it maxxit-postgres psql -U maxxit -d maxxit

# List tables
\dt

# Query agents
SELECT * FROM agents_v3 LIMIT 10;
```

### Inspect Redis
```bash
# Connect to Redis
docker exec -it maxxit-redis redis-cli

# Check keys
KEYS *

# Get value
GET some:key
```

---

## 🧪 Testing

### Unit Tests (per service)
```bash
cd services/agent-service
npm test
```

### Integration Tests (all services)
```bash
# From root
npm test
```

### E2E Tests
```bash
cd tests/e2e
npm run test:e2e
```

---

## 🛠️ Troubleshooting

### Service Won't Start

**Check if port is already in use**:
```bash
lsof -i :4002  # Check port 4002
kill -9 <PID>  # Kill process if needed
```

**Check Docker services**:
```bash
docker-compose -f docker-compose.microservices.yml ps
docker-compose -f docker-compose.microservices.yml logs postgres
```

### Database Connection Issues

**Verify DATABASE_URL**:
```bash
echo $DATABASE_URL
# Should be: postgresql://maxxit:maxxit_dev_password@localhost:5432/maxxit
```

**Test connection**:
```bash
docker exec -it maxxit-postgres pg_isready -U maxxit
```

### API Gateway Can't Reach Service

**Check service URLs in .env**:
```env
AGENT_SERVICE_URL=http://agent-service:4002  # For Docker
# or
AGENT_SERVICE_URL=http://localhost:4002      # For local dev
```

### Dependency Issues

**Clean install**:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Rebuild shared packages**:
```bash
cd packages/common
npm run build

cd ../auth-middleware
npm run build
```

---

## 📚 Next Steps

### For Developers

1. **Pick a service to work on** from the migration plan
2. **Read the service README** in `services/<service-name>/README.md`
3. **Start migrating code** from the monolith
4. **Write tests** as you go
5. **Document your changes**

### For DevOps

1. **Set up CI/CD pipelines** (.github/workflows)
2. **Configure Kubernetes** (infrastructure/kubernetes)
3. **Set up monitoring** (Prometheus + Grafana)
4. **Set up logging** (ELK stack)
5. **Plan production deployment**

### For Product Managers

1. **Review API documentation** (each service has API docs)
2. **Test user flows** end-to-end
3. **Provide feedback** on service boundaries
4. **Plan feature releases** per service

---

## 🎓 Learning Resources

### Microservices Patterns
- API Gateway Pattern
- Service Discovery
- Circuit Breaker
- Event Sourcing
- CQRS (Command Query Responsibility Segregation)

### Tools
- **Turborepo**: https://turbo.build/repo/docs
- **Docker Compose**: https://docs.docker.com/compose/
- **NestJS**: https://nestjs.com/ (optional upgrade)
- **Prisma**: https://www.prisma.io/docs

### Books
- "Building Microservices" by Sam Newman
- "Microservices Patterns" by Chris Richardson

---

## 💬 Getting Help

### Documentation
- `MICROSERVICES_ARCHITECTURE.md` - Architecture overview
- `MICROSERVICES_MIGRATION_PLAN.md` - Migration details
- Service-specific READMEs in `services/<name>/README.md`

### Common Issues
- Check troubleshooting section above
- Search GitHub issues
- Ask in team Slack channel

### Team Communication
- **Daily Standup**: Share migration progress
- **Weekly Review**: Demo migrated services
- **Slack Channel**: #microservices-migration

---

## ✨ Success Checklist

After completing the quick start, you should be able to:

- [ ] All Docker containers running
- [ ] API Gateway accessible at http://localhost:4000
- [ ] At least 3 services running (Agent, Signal, Trade Execution)
- [ ] Frontend accessible at http://localhost:3000
- [ ] Can create a V3 agent via API
- [ ] Can view agents in frontend
- [ ] Database has V3 tables
- [ ] Health checks pass for all services

---

## 🎉 You're Ready!

You now have a fully functional microservices development environment!

**Start migrating services following the plan in `MICROSERVICES_MIGRATION_PLAN.md`**

Happy coding! 🚀

