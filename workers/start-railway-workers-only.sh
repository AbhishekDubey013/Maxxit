#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   🟣 RAILWAY - WORKERS ONLY MODE                             ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo "📦 Installing Node.js dependencies..."
npm ci --legacy-peer-deps

echo ""
echo "🐍 Installing Python dependencies for Twitter proxy..."
pip3 install -r services/requirements-twitter.txt

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "🚀 Starting Twitter Proxy + Workers..."
echo ""

# Start Twitter Proxy (Python) first
echo "Starting Twitter proxy on port 5002..."
cd services
TWITTER_PROXY_PORT=5002 python3 twitter-proxy.py > ../logs/twitter-proxy.log 2>&1 &
TWITTER_PID=$!
cd ..
echo "✅ Twitter Proxy PID: $TWITTER_PID"
sleep 3

echo ""
echo "Workers starting:"
echo "  ✅ Tweet Ingestion"
echo "  ✅ Signal Generator"
echo "  ✅ Trade Executor"
echo "  ✅ Position Monitor"
echo ""

# Start all workers in background (use local tsx to avoid npx conflicts)
node_modules/.bin/tsx workers/tweet-ingestion-worker.ts &
TWEET_PID=$!
echo "Tweet Worker PID: $TWEET_PID"

node_modules/.bin/tsx workers/signal-generator.ts &
SIGNAL_PID=$!
echo "Signal Worker PID: $SIGNAL_PID"

node_modules/.bin/tsx workers/trade-executor-worker.ts &
EXECUTOR_PID=$!
echo "Executor Worker PID: $EXECUTOR_PID"

node_modules/.bin/tsx workers/position-monitor-hyperliquid.ts &
MONITOR_PID=$!
echo "Monitor Worker PID: $MONITOR_PID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All workers started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Keep the script running to prevent Railway from thinking it's done
wait

