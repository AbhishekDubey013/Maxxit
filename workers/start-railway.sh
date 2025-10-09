#!/bin/bash

# Railway Worker Starter
# Starts Node.js workers (connects to separate Python proxy service)

set -e

echo "🚂 Starting Maxxit Workers on Railway..."
echo "📦 Connecting to Python Proxy at: ${GAME_API_URL:-http://localhost:8001}"

# Function to run worker in loop
run_worker_loop() {
  WORKER_NAME=$1
  WORKER_FILE=$2
  INTERVAL_SECONDS=$3
  
  while true; do
    echo "[$(date)] Running $WORKER_NAME..."
    npx tsx "$WORKER_FILE" || echo "[ERROR] $WORKER_NAME failed"
    echo "[$(date)] $WORKER_NAME complete. Sleeping for $INTERVAL_SECONDS seconds..."
    sleep "$INTERVAL_SECONDS"
  done
}

# Start Tweet Ingestion Worker (every 5 minutes)
run_worker_loop "tweet-ingestion" "workers/tweet-ingestion-worker.ts" 300 &
PID1=$!
echo "✅ Tweet Ingestion started (PID: $PID1, every 5 min)"

# Start Signal Generation Worker (every 5 minutes)
run_worker_loop "signal-generator" "workers/signal-generator.ts" 300 &
PID2=$!
echo "✅ Signal Generator started (PID: $PID2, every 5 min)"

# Start Trade Execution Worker (every 30 minutes)
run_worker_loop "trade-executor" "workers/trade-executor-worker.ts" 1800 &
PID3=$!
echo "✅ Trade Executor started (PID: $PID3, every 30 min)"

# Start Position Monitor Worker (every 5 minutes)
run_worker_loop "position-monitor" "workers/position-monitor-v2.ts" 300 &
PID4=$!
echo "✅ Position Monitor started (PID: $PID4, every 5 min)"

echo ""
echo "🎉 All workers started successfully!"
echo "Workers: $PID1, $PID2, $PID3, $PID4"

# Keep container alive - wait for all background processes
wait

