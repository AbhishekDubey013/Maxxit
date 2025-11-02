#!/bin/bash

# Complete Testnet Startup Script
# Starts Hyperliquid service + all workers + web app

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Maxxit Hyperliquid Testnet - Complete Startup         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Set testnet mode
export HYPERLIQUID_TESTNET=true

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found! Install Python 3.8+"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Install Node.js 14+"
    exit 1
fi

# Create logs directory
mkdir -p logs

echo "🧪 Network: TESTNET"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if services are already running
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 5001 already in use. Stopping existing services..."
    pkill -f hyperliquid-service || true
    sleep 2
fi

# Start Hyperliquid Python service
echo "1️⃣ Starting Hyperliquid service..."
python3 services/hyperliquid-service.py > logs/hyperliquid-service.log 2>&1 &
PYTHON_PID=$!
echo $PYTHON_PID > /tmp/hyperliquid-service.pid
sleep 3

# Verify Python service started
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "   ✅ Hyperliquid service running (PID: $PYTHON_PID)"
    NETWORK=$(curl -s http://localhost:5001/health | grep -o '"network":"[^"]*"' | cut -d'"' -f4)
    echo "   📍 Network: $NETWORK"
else
    echo "   ❌ Failed to start Hyperliquid service"
    kill $PYTHON_PID 2>/dev/null || true
    exit 1
fi

echo ""

# Start Trade Executor
echo "2️⃣ Starting trade executor worker..."
npx tsx workers/trade-executor-worker.ts > logs/trade-executor.log 2>&1 &
EXECUTOR_PID=$!
echo $EXECUTOR_PID > /tmp/trade-executor.pid
echo "   ✅ Trade executor running (PID: $EXECUTOR_PID)"

# Start Signal Generator
echo "3️⃣ Starting signal generator worker..."
npx tsx workers/signal-generator.ts > logs/signal-generator.log 2>&1 &
SIGNAL_PID=$!
echo $SIGNAL_PID > /tmp/signal-generator.pid
echo "   ✅ Signal generator running (PID: $SIGNAL_PID)"

# Start Position Monitor
echo "4️⃣ Starting position monitor worker..."
npx tsx workers/position-monitor-v2.ts > logs/position-monitor.log 2>&1 &
MONITOR_PID=$!
echo $MONITOR_PID > /tmp/position-monitor.pid
echo "   ✅ Position monitor running (PID: $MONITOR_PID)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ All services started successfully!"
echo ""
echo "📊 Services Running:"
echo "   • Hyperliquid Service: http://localhost:5001"
echo "   • Trade Executor: Monitoring for signals"
echo "   • Signal Generator: Watching Twitter"
echo "   • Position Monitor: Tracking positions"
echo ""
echo "📝 Logs:"
echo "   • Hyperliquid: tail -f logs/hyperliquid-service.log"
echo "   • Executor:    tail -f logs/trade-executor.log"
echo "   • Signals:     tail -f logs/signal-generator.log"
echo "   • Monitor:     tail -f logs/position-monitor.log"
echo "   • All:         tail -f logs/*.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Test Commands:"
echo ""
echo "   # Check service health"
echo "   curl http://localhost:5001/health"
echo ""
echo "   # Create test signal"
echo "   npx tsx scripts/create-test-signal.ts BTC LONG"
echo ""
echo "   # Check positions"
echo "   npx tsx scripts/check-positions.ts"
echo ""
echo "   # Check worker status"
echo "   ps aux | grep -E 'hyperliquid|executor|signal|monitor'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Next: Start the web app in a new terminal:"
echo "   npm run dev"
echo ""
echo "🛑 To stop all services:"
echo "   ./stop-testnet.sh"
echo ""
echo "Happy testing! 🚀"
echo ""

# Keep script running and show logs
echo "📊 Showing live logs (Ctrl+C to stop)..."
echo ""
tail -f logs/trade-executor.log

