#!/bin/bash

# Railway Worker Starter
# Starts all 3 workers in parallel for 24/7 operation

echo "🚂 Starting Maxxit Workers on Railway..."

# Start all workers in background
npx tsx workers/signal-generator.ts &
PID1=$!
echo "✅ Signal Generator started (PID: $PID1)"

npx tsx workers/trade-executor-worker.ts &
PID2=$!
echo "✅ Trade Executor started (PID: $PID2)"

npx tsx workers/position-monitor.ts &
PID3=$!
echo "✅ Position Monitor started (PID: $PID3)"

echo "🎉 All workers started successfully!"
echo "Workers running: $PID1, $PID2, $PID3"

# Wait for all background processes
wait

