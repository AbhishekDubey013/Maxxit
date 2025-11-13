# Railway Deployment Guide - Microservices

## ⚠️ Important: Root Directory Configuration

Railway needs to build from the **repository root** (not individual service directories) because services depend on the shared library.

## For Each Service on Railway

### Configuration Settings

**DO NOT set Root Directory** - Leave it empty or set to `.`

### Build Command

Use the helper script for each service:

```bash
bash railway-build-service.sh <service-name>
```

### Start Command

Use the helper script:

```bash
bash railway-start-service.sh <service-name>
```

## Service-Specific Commands

### 1. agent-api
- **Build**: `bash railway-build-service.sh agent-api`
- **Start**: `bash railway-start-service.sh agent-api`
- **Port**: `5000`

### 2. deployment-api
- **Build**: `bash railway-build-service.sh deployment-api`
- **Start**: `bash railway-start-service.sh deployment-api`
- **Port**: `5001`

### 3. signal-api
- **Build**: `bash railway-build-service.sh signal-api`
- **Start**: `bash railway-start-service.sh signal-api`
- **Port**: `5002`

### 4. tweet-ingestion-worker
- **Build**: `bash railway-build-service.sh tweet-ingestion-worker`
- **Start**: `bash railway-start-service.sh tweet-ingestion-worker`
- **Port**: `5003`

### 5. trade-executor-worker
- **Build**: `bash railway-build-service.sh trade-executor-worker`
- **Start**: `bash railway-start-service.sh trade-executor-worker`
- **Port**: `5004`

### 6. position-monitor-worker
- **Build**: `bash railway-build-service.sh position-monitor-worker`
- **Start**: `bash railway-start-service.sh position-monitor-worker`
- **Port**: `5005`

### 7. metrics-updater-worker
- **Build**: `bash railway-build-service.sh metrics-updater-worker`
- **Start**: `bash railway-start-service.sh metrics-updater-worker`
- **Port**: `5006`

### 8. research-signal-worker
- **Build**: `bash railway-build-service.sh research-signal-worker`
- **Start**: `bash railway-start-service.sh research-signal-worker`
- **Port**: `5007`

## Build Process Explained

The `railway-build-service.sh` script does:

1. **Build shared library**:
   ```bash
   cd services/shared
   npm install           # Install dependencies
   npm run build         # Run prisma generate && tsc
   ```

2. **Build specific service**:
   ```bash
   cd services/<service-name>
   npm install           # Install service dependencies
   npm run build         # Compile TypeScript (imports from ../shared/dist)
   ```

## Environment Variables

Each service needs:

```env
DATABASE_URL=<your-neon-postgres-url>
PORT=<service-port>
WORKER_INTERVAL=300000  # For workers only (5 minutes)

# Service-specific variables (see main deployment guide)
```

## Troubleshooting

### Error: "can't cd to ../shared"
- ✅ **Fix**: Remove "Root Directory" setting in Railway
- Build must run from repo root, not service subdirectory

### Error: "Cannot find module '../../shared/dist/...'"
- ✅ **Fix**: Ensure build script is running (it builds shared first)
- Check that Railway is using the bash scripts, not npm scripts directly

### Error: "@prisma/client did not initialize yet"
- ✅ **Fix**: shared library build script runs `prisma generate`
- Verify DATABASE_URL is set in Railway environment

## Quick Setup Checklist

For each service in Railway:

- [ ] Remove Root Directory (or set to `.`)
- [ ] Set Build Command: `bash railway-build-service.sh <service-name>`
- [ ] Set Start Command: `bash railway-start-service.sh <service-name>`
- [ ] Add all environment variables
- [ ] Deploy

## Notes

- All 8 services share the same codebase but are deployed independently
- The shared library is built once per service deployment
- Each service has its own compiled output in `services/<service-name>/dist/`

