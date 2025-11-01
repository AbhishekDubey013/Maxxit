#!/bin/bash

# Start all services and workers for local testing

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🚀 STARTING ALL LOCAL SERVICES                           ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Please create .env file with required variables"
    exit 1
fi

# Check for required env vars
if ! grep -q "AGENT_WALLET_ENCRYPTION_KEY" .env; then
    echo "⚠️  Warning: AGENT_WALLET_ENCRYPTION_KEY not found in .env"
    echo "   Hyperliquid agents may not work"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📦 Step 1: Starting Hyperliquid Python Service"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd services
HYPERLIQUID_TESTNET=true python3 hyperliquid-service.py > /tmp/hyperliquid-service.log 2>&1 &
HYPERLIQUID_PID=$!
cd ..

echo "✅ Hyperliquid service started (PID: $HYPERLIQUID_PID)"
echo "   Logs: /tmp/hyperliquid-service.log"
echo "   Health: curl http://localhost:5001/health"
echo ""

# Wait for service to start
sleep 3

# Test health
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Hyperliquid service is healthy"
else
    echo "⚠️  Hyperliquid service health check failed (may need more time)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📦 Step 2: Starting Next.js Web App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PORT=3000 npm run dev > /tmp/nextjs-dev.log 2>&1 &
NEXTJS_PID=$!

echo "✅ Next.js started (PID: $NEXTJS_PID)"
echo "   URL: http://localhost:3000"
echo "   Logs: /tmp/nextjs-dev.log"
echo ""

echo "⏳ Waiting for Next.js to start..."
sleep 5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📦 Step 3: Starting Workers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Start Tweet Ingestion Worker
echo "Starting Tweet Ingestion Worker..."
npx tsx workers/tweet-ingestion-worker.ts > logs/tweet-ingestion.log 2>&1 &
TWEET_PID=$!
echo "✅ Tweet Ingestion (PID: $TWEET_PID) - logs/tweet-ingestion.log"

# Start Signal Generator
echo "Starting Signal Generator..."
npx tsx workers/signal-generator.ts > logs/signal-generator.log 2>&1 &
SIGNAL_PID=$!
echo "✅ Signal Generator (PID: $SIGNAL_PID) - logs/signal-generator.log"

# Start Trade Executor
echo "Starting Trade Executor..."
npx tsx workers/trade-executor-worker.ts > logs/trade-executor.log 2>&1 &
EXECUTOR_PID=$!
echo "✅ Trade Executor (PID: $EXECUTOR_PID) - logs/trade-executor.log"

# Start Position Monitor (SPOT/GMX)
echo "Starting Position Monitor (SPOT/GMX)..."
npx tsx workers/position-monitor-v2.ts > logs/position-monitor.log 2>&1 &
MONITOR1_PID=$!
echo "✅ Position Monitor SPOT/GMX (PID: $MONITOR1_PID) - logs/position-monitor.log"

# Start Position Monitor (Hyperliquid)
echo "Starting Position Monitor (Hyperliquid)..."
npx tsx workers/position-monitor-hyperliquid.ts > logs/position-monitor-hl.log 2>&1 &
MONITOR2_PID=$!
echo "✅ Position Monitor Hyperliquid (PID: $MONITOR2_PID) - logs/position-monitor-hl.log"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ ALL SERVICES STARTED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Services:"
echo "  🔵 Hyperliquid Service: http://localhost:5001 (PID: $HYPERLIQUID_PID)"
echo "  🟢 Next.js Web App:     http://localhost:3000 (PID: $NEXTJS_PID)"
echo ""
echo "Workers:"
echo "  📱 Tweet Ingestion:     PID $TWEET_PID"
echo "  📊 Signal Generator:    PID $SIGNAL_PID"
echo "  ⚡ Trade Executor:      PID $EXECUTOR_PID"
echo "  📈 Position Monitor 1:  PID $MONITOR1_PID"
echo "  📈 Position Monitor 2:  PID $MONITOR2_PID"
echo ""
echo "Process IDs saved to: /tmp/maxxit-local-pids.txt"
echo "$HYPERLIQUID_PID" > /tmp/maxxit-local-pids.txt
echo "$NEXTJS_PID" >> /tmp/maxxit-local-pids.txt
echo "$TWEET_PID" >> /tmp/maxxit-local-pids.txt
echo "$SIGNAL_PID" >> /tmp/maxxit-local-pids.txt
echo "$EXECUTOR_PID" >> /tmp/maxxit-local-pids.txt
echo "$MONITOR1_PID" >> /tmp/maxxit-local-pids.txt
echo "$MONITOR2_PID" >> /tmp/maxxit-local-pids.txt

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📝 QUICK COMMANDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Watch all logs:"
echo "  tail -f logs/*.log"
echo ""
echo "Check service health:"
echo "  curl http://localhost:5001/health"
echo "  curl http://localhost:3000/api/health"
echo ""
echo "Stop all services:"
echo "  ./scripts/stop-all-local.sh"
echo ""
echo "View running processes:"
echo "  ps aux | grep -E 'hyperliquid-service|next-server|tsx workers'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All services started successfully!"
echo ""
echo "💡 Next steps:"
echo "   1. Visit http://localhost:3000 to access the UI"
echo "   2. Watch logs: tail -f logs/*.log"
echo "   3. Test flow: npx tsx scripts/test-complete-hyperliquid-flow.ts"
echo ""

