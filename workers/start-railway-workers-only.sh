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
# Check if python3 is available
if command -v python3 &> /dev/null; then
    echo "✅ Python3 found"
    pip3 install -r services/requirements-twitter.txt --quiet
else
    echo "⚠️  Python3 not found - Twitter proxy will not start"
    echo "   Workers will use existing tweets from database"
fi

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "📁 Creating logs directory..."
mkdir -p logs

echo ""
echo "🚀 Starting Twitter Proxy + Workers..."
echo ""

# Start Twitter Proxy (Python) first if Python is available
if command -v python3 &> /dev/null; then
    echo "Starting Twitter proxy on port 5002..."
    cd services
    TWITTER_PROXY_PORT=5002 python3 twitter-proxy.py > ../logs/twitter-proxy.log 2>&1 &
    TWITTER_PID=$!
    cd ..
    echo "✅ Twitter Proxy started with PID: $TWITTER_PID"
    
    # Wait and verify proxy started
    echo "Waiting for Twitter proxy to initialize..."
    sleep 5
    
    # Check if proxy is responding
    if curl -s http://localhost:5002/health > /dev/null 2>&1; then
        echo "✅ Twitter Proxy is healthy and ready"
    else
        echo "⚠️  Twitter Proxy health check failed - will use existing tweets"
    fi
else
    echo "⚠️  Skipping Twitter Proxy (Python not available)"
    echo "   Workers will process existing tweets from database"
fi

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

