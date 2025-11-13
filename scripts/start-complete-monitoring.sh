#!/bin/bash

###############################################################################
# Complete Monitoring Stack Starter
# Starts all monitoring workers for Agent Where system
###############################################################################

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║          🚀 STARTING COMPLETE MONITORING STACK                ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if running in production or development
if [ "$NODE_ENV" = "production" ]; then
  echo "📍 Environment: PRODUCTION"
else
  echo "📍 Environment: DEVELOPMENT"
fi

echo ""
echo "Starting monitoring services..."
echo ""

# 1. Position Monitor (runs every 5 minutes)
echo "[1/4] 📊 Position Monitor"
echo "   Purpose: Monitor open positions across all venues"
echo "   Frequency: Every 5 minutes"
echo "   Command: npx tsx workers/position-monitor-combined.ts"
echo ""

# 2. Trade Executor (runs every 5 minutes)
echo "[2/4] ⚡ Trade Executor"
echo "   Purpose: Execute pending signals with venue routing"
echo "   Frequency: Every 5 minutes"
echo "   Command: npx tsx workers/trade-executor-worker.ts"
echo ""

# 3. Signal Generator (runs every 6 hours)
echo "[3/4] 📡 Signal Generator"
echo "   Purpose: Generate signals from tweets and research"
echo "   Frequency: Every 6 hours"
echo "   Command: npx tsx workers/signal-generator.ts"
echo ""

# 4. Monitoring Worker (runs every 10 minutes)
echo "[4/4] 🔍 Monitoring Worker"
echo "   Purpose: Health checks and alerting"
echo "   Frequency: Every 10 minutes"
echo "   Command: npx tsx workers/monitoring-worker.ts"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "📋 CRON SCHEDULE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Add to crontab (crontab -e):"
echo ""
echo "# Position Monitor - Every 5 minutes"
echo "*/5 * * * * cd /app && npx tsx workers/position-monitor-combined.ts >> /app/logs/position-monitor.log 2>&1"
echo ""
echo "# Trade Executor - Every 5 minutes"
echo "*/5 * * * * cd /app && npx tsx workers/trade-executor-worker.ts >> /app/logs/trade-executor.log 2>&1"
echo ""
echo "# Signal Generator - Every 6 hours"
echo "0 */6 * * * cd /app && npx tsx workers/signal-generator.ts >> /app/logs/signal-generator.log 2>&1"
echo ""
echo "# Monitoring Worker - Every 10 minutes"
echo "*/10 * * * * cd /app && npx tsx workers/monitoring-worker.ts >> /app/logs/monitoring.log 2>&1"
echo ""
echo "# Market Sync - Daily at 2 AM"
echo "0 2 * * * cd /app && npx tsx scripts/sync-hyperliquid-markets.ts >> /app/logs/market-sync.log 2>&1"
echo "0 2 * * * cd /app && npx tsx scripts/sync-ostium-markets.ts >> /app/logs/market-sync.log 2>&1"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "📊 MONITORING ENDPOINTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Health Check:"
echo "  GET /api/monitoring/health"
echo ""
echo "Analytics:"
echo "  GET /api/monitoring/analytics?timeWindow=day"
echo ""
echo "Dashboard:"
echo "  GET /api/monitoring/dashboard"
echo ""
echo "Venue Stats:"
echo "  GET /api/venue-routing/stats?timeWindow=day"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "🔔 EXTERNAL MONITORING"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Set up external monitoring (UptimeRobot, Datadog, etc.) to ping:"
echo ""
echo "  https://your-domain.com/api/monitoring/health"
echo ""
echo "Alert if:"
echo "  • HTTP status != 200"
echo "  • response.status != 'healthy'"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ Setup Complete"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Set up cron jobs (see above)"
echo "  2. Configure external monitoring"
echo "  3. Test endpoints:"
echo "     curl http://localhost:3000/api/monitoring/health"
echo ""
echo "For manual testing:"
echo "  npx tsx workers/monitoring-worker.ts"
echo ""

