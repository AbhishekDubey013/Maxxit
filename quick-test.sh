#!/bin/bash

# Quick Test Script for Hyperliquid Service
# Usage: ./quick-test.sh

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Hyperliquid Service - Quick Test                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

SERVICE_URL="http://localhost:5001"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=${4:-}
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s "$url")
    else
        response=$(curl -s -X POST "$url" -H "Content-Type: application/json" -d "$data")
    fi
    
    if [ $? -eq 0 ] && [ ! -z "$response" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Check if service is running
echo "1️⃣  Checking if service is running..."
if ! curl -s $SERVICE_URL/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Service is not running!${NC}"
    echo ""
    echo "Start the service with:"
    echo "  HYPERLIQUID_TESTNET=true python3 services/hyperliquid-service.py"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ Service is running${NC}"
echo ""

# Test health endpoint
echo "2️⃣  Testing endpoints..."
test_endpoint "Health Check" "$SERVICE_URL/health"

# Check if testnet
NETWORK=$(curl -s $SERVICE_URL/health | grep -o '"network":"[^"]*"' | cut -d'"' -f4)
if [ "$NETWORK" = "testnet" ]; then
    echo -e "   Network: ${GREEN}TESTNET${NC} ✓"
else
    echo -e "   Network: ${YELLOW}$NETWORK${NC} ⚠️"
    echo "   (Set HYPERLIQUID_TESTNET=true for testnet)"
fi
echo ""

# Test market info
echo "3️⃣  Testing market data..."
test_endpoint "BTC Market Info" "$SERVICE_URL/market-info" "POST" '{"coin": "BTC"}'
test_endpoint "ETH Market Info" "$SERVICE_URL/market-info" "POST" '{"coin": "ETH"}'
test_endpoint "SOL Market Info" "$SERVICE_URL/market-info" "POST" '{"coin": "SOL"}'
echo ""

# Test balance check
echo "4️⃣  Testing balance query..."
test_endpoint "Balance Check" "$SERVICE_URL/balance" "POST" '{"address": "0x0000000000000000000000000000000000000000"}'
echo ""

# Test positions query
echo "5️⃣  Testing positions query..."
test_endpoint "Positions Check" "$SERVICE_URL/positions" "POST" '{"address": "0x0000000000000000000000000000000000000000"}'
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Test Results:"
echo -e "   ${GREEN}Passed: $PASSED${NC}"
echo -e "   ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "🎉 Your Hyperliquid service is working correctly!"
    echo ""
    echo "Next steps:"
    echo "  1. Get testnet USDC: https://app.hyperliquid-testnet.xyz"
    echo "  2. Test a real trade: npx tsx scripts/test-trade-testnet.ts <private-key>"
    echo "  3. Start the app: npm run dev"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Check the service logs for errors"
    exit 1
fi

