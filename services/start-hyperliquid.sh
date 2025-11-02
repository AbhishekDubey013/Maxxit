#!/bin/bash

# Start Hyperliquid Service
# Usage: ./services/start-hyperliquid.sh
# Testnet: HYPERLIQUID_TESTNET=true ./services/start-hyperliquid.sh

set -e

# Check if testnet mode
if [ "$HYPERLIQUID_TESTNET" = "true" ]; then
    echo "🧪 Starting Hyperliquid Service (TESTNET MODE)..."
else
    echo "🚀 Starting Hyperliquid Service (MAINNET MODE)..."
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip"
    exit 1
fi

# Install dependencies if needed
if ! python3 -c "import hyperliquid" &> /dev/null; then
    echo "📦 Installing dependencies..."
    pip3 install -r services/requirements-hyperliquid.txt
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Make sure to set AGENT_WALLET_ENCRYPTION_KEY"
fi

# Start service
PORT=${HYPERLIQUID_SERVICE_PORT:-5001}
echo "✅ Starting service on port $PORT..."

if [ "$HYPERLIQUID_TESTNET" = "true" ]; then
    echo "📍 Network: TESTNET (https://api.hyperliquid-testnet.xyz)"
    echo "💡 Get testnet USDC: https://app.hyperliquid-testnet.xyz"
else
    echo "📍 Network: MAINNET (https://api.hyperliquid.xyz)"
fi

python3 services/hyperliquid-service.py

