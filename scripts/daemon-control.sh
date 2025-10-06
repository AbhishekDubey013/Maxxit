#!/bin/bash
# Control script for auto-ingest daemon
# Usage: bash scripts/daemon-control.sh [start|stop|status|restart|logs]

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$PROJECT_ROOT/logs/daemon.pid"
LOG_FILE="$PROJECT_ROOT/logs/auto-ingest.log"

start_daemon() {
  if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
    echo "❌ Daemon is already running (PID: $(cat "$PID_FILE"))"
    return 1
  fi
  
  echo "🚀 Starting auto-ingest daemon..."
  mkdir -p "$PROJECT_ROOT/logs"
  
  # Start daemon in background
  nohup bash "$PROJECT_ROOT/scripts/auto-ingest-daemon.sh" > /dev/null 2>&1 &
  echo $! > "$PID_FILE"
  
  sleep 2
  
  if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
    echo "✅ Daemon started successfully (PID: $(cat "$PID_FILE"))"
    echo "📝 Logs: $LOG_FILE"
    echo "⏰ Running every 6 hours"
    echo ""
    echo "Commands:"
    echo "  • Stop:    bash scripts/daemon-control.sh stop"
    echo "  • Status:  bash scripts/daemon-control.sh status"
    echo "  • Logs:    bash scripts/daemon-control.sh logs"
  else
    echo "❌ Failed to start daemon"
    rm -f "$PID_FILE"
    return 1
  fi
}

stop_daemon() {
  if [ ! -f "$PID_FILE" ]; then
    echo "❌ Daemon is not running (no PID file found)"
    return 1
  fi
  
  PID=$(cat "$PID_FILE")
  
  if ! kill -0 $PID 2>/dev/null; then
    echo "❌ Daemon is not running (stale PID file)"
    rm -f "$PID_FILE"
    return 1
  fi
  
  echo "🛑 Stopping daemon (PID: $PID)..."
  kill $PID
  
  # Wait for process to stop
  for i in {1..10}; do
    if ! kill -0 $PID 2>/dev/null; then
      rm -f "$PID_FILE"
      echo "✅ Daemon stopped successfully"
      return 0
    fi
    sleep 1
  done
  
  # Force kill if still running
  echo "⚠️  Force killing daemon..."
  kill -9 $PID 2>/dev/null
  rm -f "$PID_FILE"
  echo "✅ Daemon stopped (forced)"
}

status_daemon() {
  if [ ! -f "$PID_FILE" ]; then
    echo "❌ Daemon is not running"
    return 1
  fi
  
  PID=$(cat "$PID_FILE")
  
  if kill -0 $PID 2>/dev/null; then
    echo "✅ Daemon is running (PID: $PID)"
    echo "📝 Log file: $LOG_FILE"
    echo ""
    echo "Recent activity:"
    tail -20 "$LOG_FILE"
  else
    echo "❌ Daemon is not running (stale PID file)"
    rm -f "$PID_FILE"
    return 1
  fi
}

show_logs() {
  if [ ! -f "$LOG_FILE" ]; then
    echo "❌ No log file found"
    return 1
  fi
  
  echo "📝 Showing last 50 lines of log:"
  echo ""
  tail -50 "$LOG_FILE"
  echo ""
  echo "💡 To follow logs in real-time: tail -f $LOG_FILE"
}

case "$1" in
  start)
    start_daemon
    ;;
  stop)
    stop_daemon
    ;;
  status)
    status_daemon
    ;;
  restart)
    echo "🔄 Restarting daemon..."
    stop_daemon
    sleep 2
    start_daemon
    ;;
  logs)
    show_logs
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the auto-ingest daemon"
    echo "  stop    - Stop the daemon"
    echo "  status  - Check if daemon is running"
    echo "  restart - Restart the daemon"
    echo "  logs    - Show recent logs"
    exit 1
    ;;
esac
