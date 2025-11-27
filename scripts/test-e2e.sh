#!/bin/bash

# ===========================================
# EPOCHI END-TO-END TEST SCRIPT
# ===========================================

set -e

echo "🧪 Running Epochi End-to-End Tests..."
echo ""

BASE_URL=${1:-"http://localhost:3001"}
PASS=0
FAIL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected="$3"
    
    echo -n "Testing: $name... "
    
    response=$(curl -s "$url" 2>/dev/null || echo "CURL_FAILED")
    
    if [[ "$response" == *"$expected"* ]]; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: ${response:0:100}..."
        ((FAIL++))
    fi
}

echo "=========================================="
echo "Testing Backend API"
echo "=========================================="
echo ""

# Test 1: Health Check
test_endpoint "Health Check" "$BASE_URL/health" '"status":"healthy"'

# Test 2: API Status
test_endpoint "API Status" "$BASE_URL/api/status" '"message":"Epochi API is running"'

# Test 3: Calendar Status
test_endpoint "Calendar Status" "$BASE_URL/api/calendar/status" '"success":true'

# Test 4: Wallet Info
test_endpoint "Wallet Info" "$BASE_URL/api/wallet/primary" '"address":"0x'

# Test 5: Agent Status
test_endpoint "Agent Status" "$BASE_URL/api/agent/status" '"success":true'

# Test 6: Agent Queue
test_endpoint "Agent Queue" "$BASE_URL/api/agent/queue" '"success":true'

# Test 7: Streams Schema
test_endpoint "Streams Schema" "$BASE_URL/api/streams/schema" '"schemaId"'

# Test 8: Network Status
test_endpoint "Network Status" "$BASE_URL/api/wallet/network/status" '"network"'

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check the output above.${NC}"
    exit 1
fi

