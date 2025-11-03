#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   🟣 RAILWAY - WORKERS ONLY MODE                             ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "🚀 Starting Workers (NO web server)..."
echo ""
echo "Workers starting:"
echo "  ✅ Tweet Ingestion"
echo "  ✅ Signal Generator"
echo "  ✅ Trade Executor"
echo "  ✅ Position Monitor"
echo ""

# Start all workers in background
npx tsx workers/tweet-ingestion-worker.ts &
TWEET_PID=$!
echo "Tweet Worker PID: $TWEET_PID"

npx tsx workers/signal-generator.ts &
SIGNAL_PID=$!
echo "Signal Worker PID: $SIGNAL_PID"

npx tsx workers/trade-executor-worker.ts &
EXECUTOR_PID=$!
echo "Executor Worker PID: $EXECUTOR_PID"

npx tsx workers/position-monitor-hyperliquid.ts &
MONITOR_PID=$!
echo "Monitor Worker PID: $MONITOR_PID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All workers started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Keep the script running to prevent Railway from thinking it's done
wait

