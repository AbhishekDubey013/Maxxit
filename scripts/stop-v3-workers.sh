#!/bin/bash

# Stop V3 Workers

echo "🛑 Stopping V3 Workers..."

# Stop V3 Signal Worker
if [ -f .v3-signal-worker.pid ]; then
  PID=$(cat .v3-signal-worker.pid)
  if kill -0 $PID 2>/dev/null; then
    echo "  Stopping V3 Signal Worker (PID: $PID)..."
    kill $PID
    rm .v3-signal-worker.pid
    echo "  ✅ Stopped"
  else
    echo "  ⚠️  Process not running"
    rm .v3-signal-worker.pid
  fi
else
  echo "  ⚠️  No PID file found"
fi

# Fallback: kill by name
pkill -f "v3-signal-worker" 2>/dev/null && echo "  ✅ Cleaned up remaining processes"

echo ""
echo "✅ V3 Workers stopped"

