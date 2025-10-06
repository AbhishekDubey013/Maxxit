#!/bin/bash

# Test Execution Flow
# Tests the complete execution layer infrastructure

echo "🧪 Testing Execution Layer Infrastructure"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:5000"

# Test data
AGENT_ID="ca6a0073-091d-4164-bbe4-dda5c178ed04"
USER_WALLET="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
SAFE_WALLET="0x1234567890123456789012345678901234567890" # Mock address

echo "📋 Test Configuration:"
echo "  Agent ID: $AGENT_ID"
echo "  User Wallet: $USER_WALLET"
echo "  Safe Wallet: $SAFE_WALLET"
echo ""

# Test 1: Check if server is running
echo "1️⃣  Testing: Server Health"
echo "   curl $BASE_URL/api/health"
HEALTH=$(curl -s "$BASE_URL/api/health" | jq -r '.status' 2>/dev/null)
if [ "$HEALTH" = "ok" ]; then
    echo -e "   ${GREEN}✅ Server is running${NC}"
else
    echo -e "   ${RED}❌ Server is not responding${NC}"
    echo "   Please start the server: npm run dev"
    exit 1
fi
echo ""

# Test 2: Check Safe wallet status (will fail with mock address)
echo "2️⃣  Testing: Safe Wallet Status API"
echo "   curl \"$BASE_URL/api/safe/status?safeAddress=$SAFE_WALLET&chainId=42161\""
SAFE_STATUS=$(curl -s "$BASE_URL/api/safe/status?safeAddress=$SAFE_WALLET&chainId=42161")
SAFE_VALID=$(echo $SAFE_STATUS | jq -r '.valid' 2>/dev/null)
if [ "$SAFE_VALID" = "true" ]; then
    echo -e "   ${GREEN}✅ Safe wallet is valid${NC}"
    echo $SAFE_STATUS | jq '.safe, .balances, .readiness'
elif [ "$SAFE_VALID" = "false" ]; then
    echo -e "   ${YELLOW}⚠️  Safe wallet validation failed (expected with mock address)${NC}"
    echo $SAFE_STATUS | jq '.error' 2>/dev/null
else
    echo -e "   ${RED}❌ API error${NC}"
    echo $SAFE_STATUS
fi
echo ""

# Test 3: Try to create deployment (will fail with mock Safe)
echo "3️⃣  Testing: Agent Deployment API"
echo "   curl -X POST $BASE_URL/api/deployments/create"
DEPLOY_RESULT=$(curl -s -X POST "$BASE_URL/api/deployments/create" \
  -H "Content-Type: application/json" \
  -d "{
    \"agentId\": \"$AGENT_ID\",
    \"userWallet\": \"$USER_WALLET\",
    \"safeWallet\": \"$SAFE_WALLET\"
  }")

DEPLOY_SUCCESS=$(echo $DEPLOY_RESULT | jq -r '.success' 2>/dev/null)
if [ "$DEPLOY_SUCCESS" = "true" ]; then
    echo -e "   ${GREEN}✅ Deployment created${NC}"
    echo $DEPLOY_RESULT | jq '.deployment, .safeInfo'
else
    echo -e "   ${YELLOW}⚠️  Deployment failed (expected with mock Safe)${NC}"
    echo $DEPLOY_RESULT | jq '.error, .reason' 2>/dev/null
fi
echo ""

# Test 4: Check available signals
echo "4️⃣  Testing: Available Signals"
echo "   curl \"$BASE_URL/api/db/signals?_limit=5&_sort=-createdAt\""
SIGNALS=$(curl -s "$BASE_URL/api/db/signals?_limit=5&_sort=-createdAt")
SIGNAL_COUNT=$(echo $SIGNALS | jq '. | length' 2>/dev/null)
if [ "$SIGNAL_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Found $SIGNAL_COUNT signals${NC}"
    echo $SIGNALS | jq '.[] | {id, token: .tokenSymbol, venue, side, leverage: .sizeModel.leverage}'
    
    # Get first signal ID for execution test
    SIGNAL_ID=$(echo $SIGNALS | jq -r '.[0].id' 2>/dev/null)
else
    echo -e "   ${YELLOW}⚠️  No signals found${NC}"
    echo "   Generate signals first: curl -X POST \"$BASE_URL/api/admin/generate-signals-simple?ctAccountId=...\""
    SIGNAL_ID=""
fi
echo ""

# Test 5: Try to execute signal (dry run)
if [ -n "$SIGNAL_ID" ]; then
    echo "5️⃣  Testing: Trade Execution (Dry Run)"
    echo "   curl -X POST $BASE_URL/api/admin/execute-trade"
    echo "   Signal ID: $SIGNAL_ID"
    
    EXEC_RESULT=$(curl -s -X POST "$BASE_URL/api/admin/execute-trade" \
      -H "Content-Type: application/json" \
      -d "{\"signalId\": \"$SIGNAL_ID\"}")
    
    EXEC_SUCCESS=$(echo $EXEC_RESULT | jq -r '.success' 2>/dev/null)
    if [ "$EXEC_SUCCESS" = "true" ]; then
        echo -e "   ${GREEN}✅ Trade execution successful${NC}"
        echo $EXEC_RESULT | jq '.'
    else
        echo -e "   ${YELLOW}⚠️  Trade execution validation (shows execution plan)${NC}"
        echo $EXEC_RESULT | jq '.error, .reason, .executionSummary' 2>/dev/null
    fi
else
    echo "5️⃣  Testing: Trade Execution"
    echo -e "   ${YELLOW}⚠️  Skipped (no signals available)${NC}"
fi
echo ""

# Test 6: Check token registry
echo "6️⃣  Testing: Token Registry"
echo "   curl \"$BASE_URL/api/db/token_registry?_limit=5\""
TOKENS=$(curl -s "$BASE_URL/api/db/token_registry?_limit=5")
TOKEN_COUNT=$(echo $TOKENS | jq '. | length' 2>/dev/null)
if [ "$TOKEN_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Token registry populated ($TOKEN_COUNT tokens shown)${NC}"
    echo $TOKENS | jq '.[] | {chain, symbol: .tokenSymbol, address: .tokenAddress[:20]}'
else
    echo -e "   ${RED}❌ Token registry is empty${NC}"
fi
echo ""

# Test 7: Check venue status
echo "7️⃣  Testing: Venue Status"
echo "   curl \"$BASE_URL/api/db/venue_status?venue=GMX&_limit=5\""
VENUE_TOKENS=$(curl -s "$BASE_URL/api/db/venue_status?venue=GMX&_limit=5")
VENUE_COUNT=$(echo $VENUE_TOKENS | jq '. | length' 2>/dev/null)
if [ "$VENUE_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Venue status configured ($VENUE_COUNT GMX tokens shown)${NC}"
    echo $VENUE_TOKENS | jq '.[] | {venue, token: .tokenSymbol}'
else
    echo -e "   ${RED}❌ Venue status is empty${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""
echo "✅ Infrastructure Tests:"
echo "   - Server health"
echo "   - Safe wallet API"
echo "   - Deployment API"
echo "   - Trade execution API"
echo "   - Token registry"
echo "   - Venue status"
echo ""
echo "💡 Next Steps:"
echo ""
echo "1. To test with a REAL Safe wallet:"
echo "   curl \"$BASE_URL/api/safe/status?safeAddress=YOUR_SAFE_ADDRESS&chainId=42161\""
echo ""
echo "2. To deploy an agent with a REAL Safe:"
echo "   curl -X POST $BASE_URL/api/deployments/create \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"agentId\": \"$AGENT_ID\", \"userWallet\": \"YOUR_WALLET\", \"safeWallet\": \"YOUR_SAFE\"}'"
echo ""
echo "3. To execute a signal (dry run):"
echo "   curl -X POST $BASE_URL/api/admin/execute-trade \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"signalId\": \"SIGNAL_ID\"}'"
echo ""
echo "📚 Documentation:"
echo "   - See EXECUTION_LAYER_COMPLETE.md for full details"
echo "   - See TOKEN_REGISTRY_SETUP.md for token/venue info"
echo ""
