# Railway Microservices Deployment Guide

## ✅ TRUE MICROSERVICES - Self-Contained & Independent

Each service is now completely self-contained with its own:
- `prisma/` directory (schema + migrations)
- `src/lib/` utilities (Prisma client, graceful shutdown, error handling)
- `node_modules/@prisma/client` (generated from service's own schema)
- No cross-service dependencies

## Railway Configuration (SIMPLE!)

### For Each Service

#### 1. Root Directory
```
services/<service-name>
```

#### 2. Build Command
Leave empty (uses default `npm run build`)

Or explicitly:
```bash
npm install && npm run build
```

#### 3. Start Command
Leave empty (uses default `npm start`)

Or explicitly:
```bash
npm start
```

## Service List

### 1. agent-api
- **Root Directory**: `services/agent-api`
- **Port**: `5000`

### 2. deployment-api
- **Root Directory**: `services/deployment-api`
- **Port**: `5001`

### 3. signal-api
- **Root Directory**: `services/signal-api`
- **Port**: `5002`

### 4. tweet-ingestion-worker
- **Root Directory**: `services/tweet-ingestion-worker`
- **Port**: `5003`

### 5. trade-executor-worker
- **Root Directory**: `services/trade-executor-worker`
- **Port**: `5004`

### 6. position-monitor-worker
- **Root Directory**: `services/position-monitor-worker`
- **Port**: `5005`

### 7. metrics-updater-worker
- **Root Directory**: `services/metrics-updater-worker`
- **Port**: `5006`

### 8. research-signal-worker
- **Root Directory**: `services/research-signal-worker`
- **Port**: `5007`

## Build Process (Automatic)

When Railway runs `npm run build`, it executes:

```bash
npx prisma generate && tsc
```

This:
1. Generates Prisma client from the service's own schema
2. Compiles TypeScript to JavaScript

## Environment Variables

Each service needs:

```env
# Database
DATABASE_URL=<your-postgresql-url>

# Service Port
PORT=5000  # (or appropriate port for each service)

# Workers only
WORKER_INTERVAL=300000  # 5 minutes

# Service-specific variables
# (See main deployment guide for full list)
```

## Why This Works Now

### Before (BROKEN):
- ❌ Shared library in `services/shared/`
- ❌ Cross-service dependencies
- ❌ Railway Root Directory couldn't find `../shared`
- ❌ Complex build scripts with `cd ../shared`

### After (WORKS):
- ✅ Each service is self-contained
- ✅ No cross-service dependencies
- ✅ Railway Root Directory works perfectly
- ✅ Simple build: `npx prisma generate && tsc`
- ✅ True microservices architecture

## Quick Setup Checklist

For each service in Railway:

- [ ] Set Root Directory: `services/<service-name>`
- [ ] Leave Build Command empty (or set to `npm install && npm run build`)
- [ ] Leave Start Command empty (or set to `npm start`)
- [ ] Add all environment variables
- [ ] Deploy

## Testing Locally

To test any service locally:

```bash
cd services/<service-name>
npm install
npm run build
npm start
```

Each service runs independently! 🎉

## Notes

- Services share the same database but are deployed independently
- Each service has its own Prisma client generated from its own schema copy
- Prisma schema updates need to be propagated to all services
- Use a script or workspace tooling to keep schemas in sync if needed

