#!/bin/bash

# Stop all testnet services

echo "🛑 Stopping Maxxit Testnet Services..."
echo ""

# Stop Python service
if [ -f /tmp/hyperliquid-service.pid ]; then
    PID=$(cat /tmp/hyperliquid-service.pid)
    echo "Stopping Hyperliquid service (PID: $PID)..."
    kill $PID 2>/dev/null && echo "   ✓ Stopped" || echo "   ✗ Not running"
    rm /tmp/hyperliquid-service.pid
fi

# Stop trade executor
if [ -f /tmp/trade-executor.pid ]; then
    PID=$(cat /tmp/trade-executor.pid)
    echo "Stopping trade executor (PID: $PID)..."
    kill $PID 2>/dev/null && echo "   ✓ Stopped" || echo "   ✗ Not running"
    rm /tmp/trade-executor.pid
fi

# Stop signal generator
if [ -f /tmp/signal-generator.pid ]; then
    PID=$(cat /tmp/signal-generator.pid)
    echo "Stopping signal generator (PID: $PID)..."
    kill $PID 2>/dev/null && echo "   ✓ Stopped" || echo "   ✗ Not running"
    rm /tmp/signal-generator.pid
fi

# Stop position monitor
if [ -f /tmp/position-monitor.pid ]; then
    PID=$(cat /tmp/position-monitor.pid)
    echo "Stopping position monitor (PID: $PID)..."
    kill $PID 2>/dev/null && echo "   ✓ Stopped" || echo "   ✗ Not running"
    rm /tmp/position-monitor.pid
fi

# Fallback: kill by name
echo ""
echo "Checking for remaining processes..."
pkill -f "hyperliquid-service" && echo "   ✓ Killed remaining hyperliquid-service" || true
pkill -f "trade-executor-worker" && echo "   ✓ Killed remaining trade-executor" || true
pkill -f "signal-generator" && echo "   ✓ Killed remaining signal-generator" || true
pkill -f "position-monitor" && echo "   ✓ Killed remaining position-monitor" || true

echo ""
echo "✅ All services stopped"
echo ""
echo "To start again: ./start-testnet-complete.sh"

