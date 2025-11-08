#!/bin/bash

###############################################################################
# Ostium Backend Testing Script
# Tests all Ostium service endpoints automatically
###############################################################################

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OSTIUM_SERVICE_URL="http://localhost:5002"
TEST_LOG="ostium-test-results.log"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to print section header
print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Function to print test result
print_test() {
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC} - $1"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - $1"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Function to check if service is running
check_service() {
    response=$(curl -s -o /dev/null -w "%{http_code}" $OSTIUM_SERVICE_URL/health)
    if [ "$response" == "200" ]; then
        return 0
    else
        return 1
    fi
}

###############################################################################
# START TESTS
###############################################################################

clear
print_header "🧪 OSTIUM BACKEND TEST SUITE"

echo "Service URL: $OSTIUM_SERVICE_URL"
echo "Test Log: $TEST_LOG"
echo "Timestamp: $(date)"
echo ""

# Initialize log file
echo "OSTIUM BACKEND TEST RESULTS" > $TEST_LOG
echo "Timestamp: $(date)" >> $TEST_LOG
echo "Service URL: $OSTIUM_SERVICE_URL" >> $TEST_LOG
echo "========================================" >> $TEST_LOG
echo "" >> $TEST_LOG

###############################################################################
# TEST 0: Service Running Check
###############################################################################
print_header "Test 0: Check Service Status"

if check_service; then
    echo -e "${GREEN}✅ Service is running${NC}"
    echo "Service Status: RUNNING" >> $TEST_LOG
else
    echo -e "${RED}❌ Service is NOT running!${NC}"
    echo ""
    echo "Please start the service first:"
    echo "  cd services"
    echo "  source venv/bin/activate"
    echo "  python ostium-service.py"
    echo ""
    echo "Service Status: NOT RUNNING" >> $TEST_LOG
    exit 1
fi

###############################################################################
# TEST 1: Health Check
###############################################################################
print_header "Test 1: Health Check"

response=$(curl -s $OSTIUM_SERVICE_URL/health)
echo "Response: $response"

if echo "$response" | grep -q '"status":"ok"'; then
    print_test "Health check endpoint" 0
    echo "Test 1: PASS" >> $TEST_LOG
else
    print_test "Health check endpoint" 1
    echo "Test 1: FAIL" >> $TEST_LOG
fi

###############################################################################
# TEST 2: Market Info
###############################################################################
print_header "Test 2: Market Info"

response=$(curl -s $OSTIUM_SERVICE_URL/market-info)
echo "Response (first 200 chars): ${response:0:200}..."

if echo "$response" | grep -q '"success":true'; then
    print_test "Market info endpoint" 0
    echo "Test 2: PASS" >> $TEST_LOG
else
    print_test "Market info endpoint" 1
    echo "Test 2: FAIL" >> $TEST_LOG
fi

###############################################################################
# USER INPUT SECTION
###############################################################################
print_header "🔐 User Wallet Configuration"

echo "To continue testing, we need your wallet information."
echo ""
echo -e "${YELLOW}⚠️  Keep your private key secure! This script is for testing only.${NC}"
echo ""

# Get user address
read -p "Enter your Arbitrum Sepolia wallet address (0x...): " USER_ADDRESS

if [ -z "$USER_ADDRESS" ]; then
    echo -e "${RED}No address provided. Skipping wallet-dependent tests.${NC}"
    USER_ADDRESS="SKIP"
fi

# Get private key (optional)
read -p "Enter your private key for trading tests (or press Enter to skip): " USER_PRIVATE_KEY

if [ -z "$USER_PRIVATE_KEY" ]; then
    echo -e "${YELLOW}Private key not provided. Skipping trading tests.${NC}"
    USER_PRIVATE_KEY="SKIP"
fi

echo ""
echo "Configuration saved:"
echo "  Address: $USER_ADDRESS"
echo "  Private Key: ${USER_PRIVATE_KEY:0:10}... (hidden)"
echo ""

###############################################################################
# TEST 3: Balance Check
###############################################################################
if [ "$USER_ADDRESS" != "SKIP" ]; then
    print_header "Test 3: Check Balance"

    response=$(curl -s -X POST $OSTIUM_SERVICE_URL/balance \
        -H "Content-Type: application/json" \
        -d "{\"address\": \"$USER_ADDRESS\"}")
    
    echo "Response: $response"

    if echo "$response" | grep -q '"success":true'; then
        print_test "Balance check endpoint" 0
        echo "Test 3: PASS" >> $TEST_LOG
        
        # Extract balances
        usdc_balance=$(echo "$response" | grep -o '"usdcBalance":"[^"]*"' | cut -d'"' -f4)
        eth_balance=$(echo "$response" | grep -o '"ethBalance":"[^"]*"' | cut -d'"' -f4)
        
        echo "  USDC Balance: $usdc_balance"
        echo "  ETH Balance: $eth_balance"
        echo "  USDC: $usdc_balance" >> $TEST_LOG
        echo "  ETH: $eth_balance" >> $TEST_LOG
    else
        print_test "Balance check endpoint" 1
        echo "Test 3: FAIL" >> $TEST_LOG
    fi
else
    echo "Test 3: SKIPPED (no address)" >> $TEST_LOG
fi

###############################################################################
# TEST 4: Positions Check (Should be empty initially)
###############################################################################
if [ "$USER_ADDRESS" != "SKIP" ]; then
    print_header "Test 4: Check Open Positions"

    response=$(curl -s -X POST $OSTIUM_SERVICE_URL/positions \
        -H "Content-Type: application/json" \
        -d "{\"address\": \"$USER_ADDRESS\"}")
    
    echo "Response: $response"

    if echo "$response" | grep -q '"success":true'; then
        print_test "Positions check endpoint" 0
        echo "Test 4: PASS" >> $TEST_LOG
        
        # Count positions
        position_count=$(echo "$response" | grep -o '"positions":\[' | wc -l)
        echo "  Open Positions: $position_count"
        echo "  Positions: $position_count" >> $TEST_LOG
    else
        print_test "Positions check endpoint" 1
        echo "Test 4: FAIL" >> $TEST_LOG
    fi
else
    echo "Test 4: SKIPPED (no address)" >> $TEST_LOG
fi

###############################################################################
# TEST 5: Faucet Request (Optional)
###############################################################################
if [ "$USER_ADDRESS" != "SKIP" ]; then
    print_header "Test 5: Request Testnet USDC (Optional)"
    
    echo "Do you want to request testnet USDC from the faucet?"
    echo "(Note: Can only be done once every 24 hours per address)"
    read -p "Request faucet? (y/N): " request_faucet

    if [ "$request_faucet" == "y" ] || [ "$request_faucet" == "Y" ]; then
        response=$(curl -s -X POST $OSTIUM_SERVICE_URL/faucet \
            -H "Content-Type: application/json" \
            -d "{\"address\": \"$USER_ADDRESS\"}")
        
        echo "Response: $response"

        if echo "$response" | grep -q '"success":true'; then
            print_test "Faucet request" 0
            echo "Test 5: PASS" >> $TEST_LOG
            
            amount=$(echo "$response" | grep -o '"amount":"[^"]*"' | cut -d'"' -f4)
            tx_hash=$(echo "$response" | grep -o '"txHash":"[^"]*"' | cut -d'"' -f4)
            echo "  Amount: $amount USDC"
            echo "  TX Hash: $tx_hash"
        else
            print_test "Faucet request" 1
            echo "Test 5: FAIL - $response" >> $TEST_LOG
        fi
    else
        echo "Test 5: SKIPPED (user choice)" >> $TEST_LOG
    fi
else
    echo "Test 5: SKIPPED (no address)" >> $TEST_LOG
fi

###############################################################################
# TEST 6: Open Position (Direct - No Delegation)
###############################################################################
if [ "$USER_PRIVATE_KEY" != "SKIP" ]; then
    print_header "Test 6: Open Position (Direct Trading)"
    
    echo "This will open a SMALL test position (10 USDC, 2x leverage)"
    read -p "Proceed with opening a test position? (y/N): " proceed_trade

    if [ "$proceed_trade" == "y" ] || [ "$proceed_trade" == "Y" ]; then
        response=$(curl -s -X POST $OSTIUM_SERVICE_URL/open-position \
            -H "Content-Type: application/json" \
            -d "{
                \"privateKey\": \"$USER_PRIVATE_KEY\",
                \"market\": \"BTC-USD\",
                \"size\": 10,
                \"side\": \"long\",
                \"leverage\": 2,
                \"useDelegation\": false
            }")
        
        echo "Response: $response"

        if echo "$response" | grep -q '"success":true'; then
            print_test "Open position (direct)" 0
            echo "Test 6: PASS" >> $TEST_LOG
            
            tx_hash=$(echo "$response" | grep -o '"txHash":"[^"]*"' | cut -d'"' -f4)
            echo "  TX Hash: $tx_hash"
            echo ""
            echo -e "${GREEN}✅ Position opened successfully!${NC}"
            echo "  Market: BTC-USD"
            echo "  Side: LONG"
            echo "  Size: 10 USDC"
            echo "  Leverage: 2x"
            
            POSITION_OPENED=true
        else
            print_test "Open position (direct)" 1
            echo "Test 6: FAIL - $response" >> $TEST_LOG
            POSITION_OPENED=false
        fi
    else
        echo "Test 6: SKIPPED (user choice)" >> $TEST_LOG
        POSITION_OPENED=false
    fi
else
    echo "Test 6: SKIPPED (no private key)" >> $TEST_LOG
    POSITION_OPENED=false
fi

###############################################################################
# TEST 7: Close Position (If opened)
###############################################################################
if [ "$POSITION_OPENED" = true ]; then
    print_header "Test 7: Close Position"
    
    echo "Waiting 5 seconds for position to settle..."
    sleep 5
    
    read -p "Close the test position? (y/N): " close_position

    if [ "$close_position" == "y" ] || [ "$close_position" == "Y" ]; then
        response=$(curl -s -X POST $OSTIUM_SERVICE_URL/close-position \
            -H "Content-Type: application/json" \
            -d "{
                \"privateKey\": \"$USER_PRIVATE_KEY\",
                \"market\": \"BTC-USD\",
                \"useDelegation\": false
            }")
        
        echo "Response: $response"

        if echo "$response" | grep -q '"success":true'; then
            print_test "Close position (direct)" 0
            echo "Test 7: PASS" >> $TEST_LOG
            
            pnl=$(echo "$response" | grep -o '"closePnl":[^,}]*' | cut -d':' -f2)
            echo "  P&L: $pnl USDC"
        else
            print_test "Close position (direct)" 1
            echo "Test 7: FAIL - $response" >> $TEST_LOG
        fi
    else
        echo "Test 7: SKIPPED (user choice)" >> $TEST_LOG
    fi
else
    echo "Test 7: SKIPPED (no position opened)" >> $TEST_LOG
fi

###############################################################################
# TEST SUMMARY
###############################################################################
print_header "📊 TEST SUMMARY"

echo "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

# Calculate success rate
if [ $TESTS_TOTAL -gt 0 ]; then
    success_rate=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    echo "Success Rate: $success_rate%"
    echo ""
    
    echo "" >> $TEST_LOG
    echo "========================================" >> $TEST_LOG
    echo "SUMMARY" >> $TEST_LOG
    echo "Total: $TESTS_TOTAL" >> $TEST_LOG
    echo "Passed: $TESTS_PASSED" >> $TEST_LOG
    echo "Failed: $TESTS_FAILED" >> $TEST_LOG
    echo "Success Rate: $success_rate%" >> $TEST_LOG
fi

# Final verdict
if [ $TESTS_FAILED -eq 0 ] && [ $TESTS_PASSED -gt 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ ALL TESTS PASSED - Backend is ready!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Backend Status: READY FOR UI" >> $TEST_LOG
elif [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ❌ SOME TESTS FAILED - Review errors above${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Backend Status: NEEDS WORK" >> $TEST_LOG
else
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}  ⚠️  NO TESTS RUN - Provide wallet info to test${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Backend Status: INCOMPLETE TESTING" >> $TEST_LOG
fi

echo "Detailed results saved to: $TEST_LOG"
echo ""

