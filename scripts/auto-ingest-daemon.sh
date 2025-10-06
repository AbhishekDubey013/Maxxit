#!/bin/bash
# Auto-ingest daemon - Runs ingestion + classification every 6 hours
# Usage: bash scripts/auto-ingest-daemon.sh &

cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/auto-ingest.log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo "🚀 Starting Auto-Ingest Daemon" | tee -a "$LOG_FILE"
echo "📁 Working directory: $PROJECT_ROOT" | tee -a "$LOG_FILE"
echo "📝 Logging to: $LOG_FILE" | tee -a "$LOG_FILE"
echo "⏰ Running every 6 hours" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Run immediately on start
echo "$(date '+%Y-%m-%d %H:%M:%S') - 🏁 Initial run..." | tee -a "$LOG_FILE"
bash "$PROJECT_ROOT/scripts/ingest-and-classify.sh" 2>&1 | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Then run every 6 hours
INTERVAL=21600  # 6 hours in seconds

while true; do
  NEXT_RUN=$(date -v+6H '+%Y-%m-%d %H:%M:%S')
  echo "$(date '+%Y-%m-%d %H:%M:%S') - 💤 Sleeping until $NEXT_RUN..." | tee -a "$LOG_FILE"
  sleep $INTERVAL
  
  echo "" | tee -a "$LOG_FILE"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ⏰ Running scheduled ingestion..." | tee -a "$LOG_FILE"
  bash "$PROJECT_ROOT/scripts/ingest-and-classify.sh" 2>&1 | tee -a "$LOG_FILE"
  echo "" | tee -a "$LOG_FILE"
done
