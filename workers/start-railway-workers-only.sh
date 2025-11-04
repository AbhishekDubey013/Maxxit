#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   🟣 RAILWAY - NODE.JS WORKERS                               ║"
echo "║   Signal Generator | Trade Executor | Position Monitor       ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo "📦 Installing Node.js dependencies..."
npm ci --legacy-peer-deps

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "🚀 Starting Workers..."
echo ""
echo "Note: Twitter proxy not available on Railway (Node.js env only)"
echo "Tweet ingestion will use existing database tweets."

echo ""
echo "Workers starting:"
echo "  ✅ Signal Generator (processes classified tweets)"
echo "  ✅ Trade Executor (opens Hyperliquid positions)"
echo "  ✅ Position Monitor (tracks PnL & auto-exits)"
echo ""

# Start all workers in background (use npx with --yes to auto-install)
# Note: Tweet ingestion worker disabled (no Twitter proxy in Railway Node.js env)
# The 12 existing signal candidates in the database will be processed

npx --yes tsx workers/signal-generator.ts &
SIGNAL_PID=$!
echo "Signal Worker PID: $SIGNAL_PID"

npx --yes tsx workers/trade-executor-worker.ts &
EXECUTOR_PID=$!
echo "Executor Worker PID: $EXECUTOR_PID"

npx --yes tsx workers/position-monitor-hyperliquid.ts &
MONITOR_PID=$!
echo "Monitor Worker PID: $MONITOR_PID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All workers started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Keep the script running to prevent Railway from thinking it's done
wait

