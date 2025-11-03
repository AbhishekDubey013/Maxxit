#!/bin/bash

# Start all Python services (Hyperliquid + Twitter Proxy)
# For Render/local deployment

echo "🚀 Starting All Python Services..."

# Determine port (Render sets PORT env var)
HYPERLIQUID_PORT=${PORT:-5001}
TWITTER_PORT=5002

# Load environment variables if .env exists
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Get absolute path to services directory
SERVICES_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start Hyperliquid service
echo "Starting Hyperliquid service on port $HYPERLIQUID_PORT..."
cd "$SERVICES_DIR/hyperliquid-service"
PORT=$HYPERLIQUID_PORT python3 app.py &
HYPERLIQUID_PID=$!
echo "✅ Hyperliquid service started (PID: $HYPERLIQUID_PID)"

# Wait for Hyperliquid to start
sleep 3

# Start Twitter proxy
echo "Starting Twitter proxy on port $TWITTER_PORT..."
cd "$SERVICES_DIR"
TWITTER_PROXY_PORT=$TWITTER_PORT python3 twitter-proxy.py &
TWITTER_PID=$!
echo "✅ Twitter proxy started (PID: $TWITTER_PID)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ ALL SERVICES RUNNING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Hyperliquid Service: http://0.0.0.0:$HYPERLIQUID_PORT"
echo "Twitter Proxy:       http://0.0.0.0:$TWITTER_PORT"
echo ""
echo "Health checks:"
echo "  curl http://localhost:$HYPERLIQUID_PORT/health"
echo "  curl http://localhost:$TWITTER_PORT/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Handle shutdown gracefully
trap "kill $HYPERLIQUID_PID $TWITTER_PID 2>/dev/null" EXIT

# Wait for both processes
wait

