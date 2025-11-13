#!/bin/bash

# Start V3 Workers

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              🚀 STARTING V3 WORKERS                           ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Kill existing V3 workers
echo "🧹 Cleaning up existing V3 workers..."
pkill -f "v3-signal-worker" || true
echo ""

# Start V3 Signal Worker
echo "🤖 Starting V3 Signal Worker..."
nohup npx tsx workers/v3-signal-worker.ts > logs/v3-signal-worker.log 2>&1 &
V3_SIGNAL_PID=$!
echo "   PID: $V3_SIGNAL_PID"
echo "$V3_SIGNAL_PID" > .v3-signal-worker.pid
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ V3 WORKERS STARTED!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Workers:"
echo "  • V3 Signal Worker (PID: $V3_SIGNAL_PID)"
echo ""
echo "Logs:"
echo "  • tail -f logs/v3-signal-worker.log"
echo ""
echo "Stop:"
echo "  • ./scripts/stop-v3-workers.sh"
echo ""

