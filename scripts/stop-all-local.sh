#!/bin/bash

# Stop all local services and workers

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     🛑 STOPPING ALL LOCAL SERVICES                           ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if PID file exists
if [ -f /tmp/maxxit-local-pids.txt ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🔍 Stopping services by PID"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping process $pid..."
            kill $pid 2>/dev/null
        fi
    done < /tmp/maxxit-local-pids.txt
    
    rm /tmp/maxxit-local-pids.txt
    echo "✅ Stopped all processes from PID file"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 Stopping any remaining processes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Stop Python service
pkill -f "hyperliquid-service.py" && echo "✅ Stopped Hyperliquid service" || echo "ℹ️  No Hyperliquid service running"

# Stop Next.js
pkill -f "next-server" && echo "✅ Stopped Next.js" || echo "ℹ️  No Next.js server running"

# Stop all workers
pkill -f "tsx workers/tweet-ingestion" && echo "✅ Stopped Tweet Ingestion worker" || echo "ℹ️  No Tweet Ingestion worker running"
pkill -f "tsx workers/signal-generator" && echo "✅ Stopped Signal Generator" || echo "ℹ️  No Signal Generator running"
pkill -f "tsx workers/trade-executor" && echo "✅ Stopped Trade Executor" || echo "ℹ️  No Trade Executor running"
pkill -f "tsx workers/position-monitor-v2" && echo "✅ Stopped Position Monitor (SPOT/GMX)" || echo "ℹ️  No Position Monitor (SPOT/GMX) running"
pkill -f "tsx workers/position-monitor-hyperliquid" && echo "✅ Stopped Position Monitor (Hyperliquid)" || echo "ℹ️  No Position Monitor (Hyperliquid) running"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ CLEANUP COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if anything is still running
REMAINING=$(ps aux | grep -E "hyperliquid-service|next-server|tsx workers" | grep -v grep | wc -l)

if [ $REMAINING -gt 0 ]; then
    echo "⚠️  Some processes may still be running:"
    ps aux | grep -E "hyperliquid-service|next-server|tsx workers" | grep -v grep
    echo ""
    echo "To force kill:"
    echo "  pkill -9 -f 'hyperliquid-service|next-server|tsx workers'"
else
    echo "✅ All services stopped successfully"
fi

echo ""

