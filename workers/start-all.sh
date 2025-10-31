#!/bin/bash

# Start Next.js web app AND background workers
# For Railway deployment

set +e

echo "🚀 Starting Maxxit - Web App + Workers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start Next.js web server in the background
echo "🌐 Starting Next.js web server on port ${PORT:-3000}..."
npm start &
WEB_PID=$!
echo "✅ Web server started (PID: $WEB_PID)"

# Wait a bit for web server to initialize
sleep 5

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
echo "🤖 Starting Background Workers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Start Tweet Ingestion Worker (every 2 minutes)
run_worker_loop "tweet-ingestion" "workers/tweet-ingestion-worker.ts" 120 &
PID1=$!
echo "✅ Tweet Ingestion started (PID: $PID1, every 2 min)"

# Start Signal Generation Worker (every 5 minutes)
run_worker_loop "signal-generator" "workers/signal-generator.ts" 300 &
PID2=$!
echo "✅ Signal Generator started (PID: $PID2, every 5 min)"

# Start Trade Execution Worker (every 5 minutes)
run_worker_loop "trade-executor" "workers/trade-executor-worker.ts" 300 &
PID3=$!
echo "✅ Trade Executor started (PID: $PID3, every 5 min)"

# Start Position Monitor Worker (every 5 minutes)
run_worker_loop "position-monitor" "workers/position-monitor-v2.ts" 300 &
PID4=$!
echo "✅ Position Monitor started (PID: $PID4, every 5 min)"

echo ""
echo "🎉 All services started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Web Server: $WEB_PID"
echo "Workers: $PID1, $PID2, $PID3, $PID4"
echo ""

# Keep container alive - trap signals
trap "echo 'Received signal, keeping container alive...'; wait" SIGTERM SIGINT

echo "⏳ Container staying alive - all services running..."

# Infinite wait
while true; do
  # Check if web server is still running
  if ! kill -0 $WEB_PID 2>/dev/null; then
    echo "❌ Web server died! Restarting..."
    npm start &
    WEB_PID=$!
    echo "✅ Web server restarted (PID: $WEB_PID)"
  fi
  sleep 60
done

