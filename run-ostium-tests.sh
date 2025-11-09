#!/bin/bash
# Ostium Integration Test Runner

echo "🚀 OSTIUM TESTNET INTEGRATION TESTS"
echo "===================================="
echo ""

# Check if service is running
if ! curl -s http://localhost:5002/health > /dev/null 2>&1; then
    echo "⚠️  Ostium service not running. Starting..."
    cd services
    source venv/bin/activate
    python ostium-service.py > logs/ostium-service.log 2>&1 &
    sleep 6
    cd ..
    echo "✅ Service started"
else
    echo "✅ Ostium service is running"
fi

echo ""
echo "📋 Test Suite 1: TypeScript API Tests"
echo "--------------------------------------"
export OSTIUM_SERVICE_URL="http://localhost:5002"
npx tsx scripts/test-ostium-comprehensive.ts

echo ""
echo ""
echo "📋 Test Suite 2: Python SDK Direct Tests"
echo "-----------------------------------------"
cd services
source venv/bin/activate
python test-ostium-direct.py
cd ..

echo ""
echo "🎉 All tests complete!"
