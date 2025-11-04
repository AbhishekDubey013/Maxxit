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
echo "Workers starting in continuous mode:"
echo "  ✅ Tweet Ingestion (every 5 mins)"
echo "  ✅ Signal Generator (every 1 min)"
echo "  ✅ Trade Executor (every 30 sec)"
echo "  ✅ Position Monitor (every 1 min)"
echo ""

# Start the continuous runner (runs all workers on scheduled intervals)
node workers/continuous-runner.js &
RUNNER_PID=$!
echo "Continuous Runner PID: $RUNNER_PID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All services started successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Keep the script running to prevent Railway from thinking it's done
wait

