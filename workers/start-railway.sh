#!/bin/bash

# Railway Worker Starter
# Starts Python proxy + all Node workers in parallel for 24/7 operation

set -e

echo "🚂 Starting Maxxit Services on Railway..."

# Start Python Twitter API Proxy (port 8001)
echo "🐍 Starting Python Twitter API Proxy..."
python3 -m uvicorn twitter_api_proxy:app --host 0.0.0.0 --port 8001 > /tmp/twitter_proxy.log 2>&1 &
PROXY_PID=$!
echo "✅ Python Proxy started (PID: $PROXY_PID, port 8001)"

# Wait for proxy to be ready
sleep 3
curl -s http://localhost:8001/health > /dev/null && echo "✅ Proxy health check passed" || echo "⚠️ Proxy health check failed"

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

echo ""
echo "📦 Starting Node.js Workers..."

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
echo "🎉 All services started successfully!"
echo "Python Proxy: $PROXY_PID | Workers: $PID1, $PID2, $PID3, $PID4"

# Keep container alive - wait for all background processes
wait

