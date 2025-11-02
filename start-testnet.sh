#!/bin/bash

# Start Maxxit in Testnet Mode
# Usage: ./start-testnet.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       Starting Maxxit in TESTNET MODE 🧪                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Python service is already running
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 5001 is already in use. Stopping existing service..."
    pkill -f hyperliquid-service || true
    sleep 2
fi

# Set testnet mode
export HYPERLIQUID_TESTNET=true

echo "🔧 Configuration:"
echo "   Network: TESTNET"
echo "   Python Service: Port 5001"
echo "   Web App: Port 3000 (or next available)"
echo ""

# Check if Python dependencies are installed
if ! python3 -c "import hyperliquid" &> /dev/null; then
    echo "📦 Installing Python dependencies..."
    pip3 install -r services/requirements-hyperliquid.txt
fi

# Start Python service in background
echo "🚀 Starting Hyperliquid service (testnet)..."
python3 services/hyperliquid-service.py &
PYTHON_PID=$!

# Wait for service to start
echo "⏳ Waiting for service to initialize..."
sleep 3

# Check if service is running
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo "✅ Hyperliquid service is running on port 5001"
    
    # Check network
    NETWORK=$(curl -s http://localhost:5001/health | grep -o '"network":"[^"]*"' | cut -d'"' -f4)
    if [ "$NETWORK" = "testnet" ]; then
        echo "✅ Service confirmed on TESTNET"
    else
        echo "❌ WARNING: Service is not on testnet!"
        kill $PYTHON_PID
        exit 1
    fi
else
    echo "❌ Failed to start Hyperliquid service"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "   1. Get testnet USDC:"
echo "      → https://app.hyperliquid-testnet.xyz"
echo ""
echo "   2. Get Arbitrum Sepolia ETH (for gas):"
echo "      → https://faucet.quicknode.com/arbitrum/sepolia"
echo ""
echo "   3. Deploy your agent on testnet"
echo ""
echo "   4. Fund agent wallet with testnet USDC"
echo ""
echo "   5. Start trading!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Starting web application..."
echo ""

# Start the main app
HYPERLIQUID_TESTNET=true npm run dev

# Cleanup on exit
trap "echo ''; echo '🛑 Shutting down...'; kill $PYTHON_PID 2>/dev/null; exit" INT TERM EXIT

