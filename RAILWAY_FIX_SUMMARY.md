# Railway Service Fix - Workers Stopping After First Run

## Problem Identified

The Railway service was stopping after the first run because the workers were designed to run once and then exit with `process.exit(0)`. When all workers completed their first execution, the bash script's `wait` command would complete, causing Railway to consider the service as "finished" and stop it.

## Root Cause

All four workers had the same pattern:
- `workers/tweet-ingestion-worker.ts` - runs once, then calls `process.exit(0)`
- `workers/signal-generator.ts` - runs once, then calls `process.exit(0)`
- `workers/trade-executor-worker.ts` - runs once, then calls `process.exit(0)`
- `workers/position-monitor-hyperliquid.ts` - runs once, then calls `process.exit(0)`

This is fine for cron jobs or manual executions, but not for Railway's long-running service model.

## Solution Implemented

### 1. Created Continuous Runner (`workers/continuous-runner.js`)

A new Node.js script that:
- Wraps each worker in a scheduled interval loop
- Runs each worker on its configured schedule:
  - **Tweet Ingestion**: Every 5 minutes (300,000ms)
  - **Signal Generator**: Every 1 minute (60,000ms)
  - **Trade Executor**: Every 30 seconds (30,000ms)
  - **Position Monitor**: Every 1 minute (60,000ms)
- Runs immediately on startup (first execution)
- Handles graceful shutdown (SIGTERM/SIGINT)
- Logs heartbeat every 5 minutes to show service is alive
- **Stays alive indefinitely** - never exits unless terminated

### 2. Updated Startup Script (`workers/start-railway-workers-only.sh`)

Modified the Railway startup script to:
- Start the Twitter proxy as before
- Use the new continuous runner instead of running workers directly
- Keep the `wait` command to prevent script from exiting

### 3. Environment Variables for Intervals (Optional)

You can customize worker intervals via Railway environment variables:
```bash
TWEET_INGESTION_INTERVAL=300000    # 5 mins (default)
SIGNAL_GENERATION_INTERVAL=60000   # 1 min (default)
TRADE_EXECUTION_INTERVAL=30000     # 30 sec (default)
POSITION_MONITOR_INTERVAL=60000    # 1 min (default)
```

## How It Works

```
Railway Start Command: bash workers/start-railway-workers-only.sh
    │
    ├─> Install dependencies (npm, pip)
    │
    ├─> Generate Prisma client
    │
    ├─> Start Twitter Proxy (Python background process)
    │
    ├─> Start Continuous Runner (Node.js process)
    │   │
    │   ├─> Spawns Tweet Ingestion Worker every 5 mins
    │   │   (Worker runs once, exits, waits 5 mins, runs again)
    │   │
    │   ├─> Spawns Signal Generator every 1 min
    │   │   (Worker runs once, exits, waits 1 min, runs again)
    │   │
    │   ├─> Spawns Trade Executor every 30 sec
    │   │   (Worker runs once, exits, waits 30 sec, runs again)
    │   │
    │   └─> Spawns Position Monitor every 1 min
    │       (Worker runs once, exits, waits 1 min, runs again)
    │
    └─> Wait indefinitely (keeps Railway service alive)
```

## What Changed

### Files Modified:
1. **`workers/start-railway-workers-only.sh`** - Updated to use continuous runner
2. **`workers/continuous-runner.js`** - New file (continuous loop orchestrator)

### Files Unchanged:
- All worker files remain unchanged (still run once and exit)
- Railway configuration (`railway.json`) unchanged
- Environment variables unchanged

## Testing

### Local Testing:
```bash
cd /Users/abhishekdubey/Downloads/Maxxit
bash workers/start-railway-workers-only.sh
```

You should see:
1. Dependencies installing
2. Twitter proxy starting
3. Continuous runner starting
4. All 4 workers running immediately
5. Workers re-running on their schedules
6. Service staying alive (no exit)

Press `Ctrl+C` to stop.

### Railway Testing:
After deploying to Railway:

1. **Check Logs** - Should show:
   ```
   ✅ All workers started in continuous mode!
   ⏰ Workers will run automatically on their schedules
   🔄 Service will stay alive indefinitely
   ```

2. **Service Status** - Should show "Active" (not "Exited")

3. **Continuous Execution** - Every 5 minutes you should see:
   ```
   [timestamp] 💓 Continuous runner heartbeat - service is alive
   [timestamp] ▶️  Starting Tweet Ingestion...
   [timestamp] ✅ Tweet Ingestion completed successfully
   ```

## Deployment Steps

1. **Commit Changes**:
   ```bash
   git add workers/start-railway-workers-only.sh
   git add workers/continuous-runner.js
   git add RAILWAY_VERIFICATION.md
   git add RAILWAY_FIX_SUMMARY.md
   git commit -m "Fix: Railway workers now run continuously instead of stopping after first run"
   ```

2. **Push to Railway**:
   ```bash
   git push origin main
   ```

3. **Monitor Railway Deployment**:
   - Go to Railway dashboard
   - Watch the deployment logs
   - Verify service stays "Active"
   - Check that workers are running on schedule

## Benefits

✅ **Service Never Stops** - Continuous runner keeps Railway service alive indefinitely

✅ **Automatic Retries** - If a worker fails, it will retry on next interval

✅ **Resource Efficient** - Workers only run when scheduled (not continuously spinning)

✅ **Easy Debugging** - Each worker run is logged with timestamps

✅ **Configurable** - Adjust intervals via environment variables

✅ **Graceful Shutdown** - Handles Railway's shutdown signals properly

## Verification Checklist

After deploying, verify:

- [ ] Railway service status shows "Active" (not "Exited")
- [ ] Logs show continuous runner started
- [ ] Workers are executing on their schedules
- [ ] Heartbeat logs appear every 5 minutes
- [ ] Service stays alive for at least 30 minutes
- [ ] Workers complete successfully (exit code 0)
- [ ] Database is being updated (new tweets, signals, positions)

## Troubleshooting

### Service Still Stops
- Check Railway logs for errors
- Verify `continuous-runner.js` is being executed
- Check that `wait` command is at end of bash script

### Workers Not Running
- Check Railway environment variables are set
- Verify `npx tsx` is available (should be installed via npm ci)
- Check Prisma client is generated successfully

### High Memory Usage
- Reduce worker frequencies via environment variables
- Check for memory leaks in worker code
- Monitor Railway metrics

## Summary

The fix transforms the workers from **one-shot executables** into **continuously scheduled services** that keep Railway happy by never exiting. This is the standard pattern for Railway deployments that need to run background jobs on intervals.

