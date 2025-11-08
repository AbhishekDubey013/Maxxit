# Ostium Backend Testing Guide

## 🧪 Testing the Ostium Integration (Backend Only)

This guide walks you through testing the complete Ostium backend without the UI.

---

## 📋 Prerequisites

1. **Arbitrum Sepolia Testnet Wallet**
   - Get testnet ETH: https://www.alchemy.com/faucets/arbitrum-sepolia
   - You'll need ~0.01 ETH for gas fees

2. **Environment Variables**
   ```bash
   OSTIUM_TESTNET=true
   OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   OSTIUM_SERVICE_PORT=5002
   OSTIUM_PLATFORM_WALLET=0x3828dFCBff64fD07B963Ef11BafE632260413Ab3  # Your collector wallet
   OSTIUM_PROFIT_SHARE=10
   ```

3. **Test Wallet Info**
   - Private Key: (keep secure!)
   - Address: (from your Arbitrum wallet)

---

## 🚀 Step 1: Start Ostium Service

```bash
# Terminal 1: Start Ostium Python service
cd /Users/abhishekdubey/Downloads/Maxxit/services

# Create/activate venv
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-ostium.txt

# Start service
python ostium-service.py
```

Expected output:
```
🚀 Ostium Service Starting...
   Network: TESTNET
   RPC URL: https://sepolia-rollup.arbitrum.io/rpc
🚀 Starting Ostium Service on port 5002
   Network: TESTNET (Arbitrum Sepolia)
 * Running on http://0.0.0.0:5002
```

---

## 🧪 Step 2: Test Endpoints

### ✅ Test 1: Health Check

```bash
curl http://localhost:5002/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "ostium",
  "network": "testnet",
  "timestamp": "2025-11-08T..."
}
```

---

### ✅ Test 2: Get Testnet USDC from Faucet

Replace `YOUR_ADDRESS` with your Arbitrum wallet address:

```bash
curl -X POST http://localhost:5002/faucet \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "amount": "1000",
  "txHash": "0x..."
}
```

**⚠️ Note:** You can only request faucet once every 24 hours per address.

---

### ✅ Test 3: Check Balance

```bash
curl -X POST http://localhost:5002/balance \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "address": "0x...",
  "usdcBalance": "1000.0",
  "ethBalance": "0.01"
}
```

---

### ✅ Test 4: Get Market Info

```bash
curl http://localhost:5002/market-info
```

**Expected Response:**
```json
{
  "success": true,
  "pairs": [
    {
      "name": "BTC-USD",
      "id": "0",
      "maxLeverage": "50",
      ...
    },
    ...
  ]
}
```

---

### ✅ Test 5: Check Current Positions (Should be empty)

```bash
curl -X POST http://localhost:5002/positions \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "positions": []
}
```

---

### ✅ Test 6: Open a Position (WITHOUT Delegation First)

⚠️ **Important:** First, let's test direct trading (not delegated) to ensure SDK works:

```bash
curl -X POST http://localhost:5002/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "YOUR_PRIVATE_KEY",
    "market": "BTC-USD",
    "size": 10,
    "side": "long",
    "leverage": 10,
    "useDelegation": false
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "txHash": "0x...",
    "market": "BTC-USD",
    "side": "long",
    "size": 10,
    "entryPrice": 98000,
    "leverage": 10
  }
}
```

**If this works ✅, your SDK is functioning correctly!**

---

### ✅ Test 7: Verify Position is Open

```bash
curl -X POST http://localhost:5002/positions \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "positions": [
    {
      "market": "BTC-USD",
      "side": "long",
      "size": 10,
      "entryPrice": 98000,
      "leverage": 10,
      "unrealizedPnl": 0.5,
      "tradeId": "123"
    }
  ]
}
```

---

### ✅ Test 8: Close the Position

```bash
curl -X POST http://localhost:5002/close-position \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "YOUR_PRIVATE_KEY",
    "market": "BTC-USD",
    "useDelegation": false
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "txHash": "0x...",
    "market": "BTC-USD",
    "closePnl": 1.5
  },
  "closePnl": 1.5
}
```

---

### ✅ Test 9: Generate Agent Wallet (For Delegation Testing)

Create a new wallet to act as the "agent":

```bash
# Using Node.js
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Agent Address:', w.address); console.log('Agent Private Key:', w.privateKey);"
```

**Save these values:**
- Agent Address: `0x...`
- Agent Private Key: `0x...`

---

### ✅ Test 10: Approve Agent (Delegation Setup)

⚠️ **This is where delegation magic happens:**

```bash
curl -X POST http://localhost:5002/approve-agent \
  -H "Content-Type: application/json" \
  -d '{
    "userPrivateKey": "YOUR_USER_PRIVATE_KEY",
    "agentAddress": "YOUR_AGENT_ADDRESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Agent approval initiated",
  "agentAddress": "0x...",
  "note": "Approval implementation pending SDK method discovery"
}
```

**⚠️ Note:** The approval endpoint is a placeholder. We need to find the correct Ostium SDK method for operator approval.

---

### ✅ Test 11: Open Position WITH Delegation

**This is the key test - agent trading on behalf of user:**

```bash
curl -X POST http://localhost:5002/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "AGENT_PRIVATE_KEY",
    "market": "ETH-USD",
    "size": 10,
    "side": "long",
    "leverage": 5,
    "useDelegation": true,
    "userAddress": "YOUR_USER_ADDRESS"
  }'
```

**Expected Behavior:**
- ✅ If approval works: Position opens using USER's collateral, AGENT's signature
- ❌ If approval not set: Error about unauthorized operator

---

### ✅ Test 12: Close Position WITH Delegation

```bash
curl -X POST http://localhost:5002/close-position \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "AGENT_PRIVATE_KEY",
    "market": "ETH-USD",
    "useDelegation": true,
    "userAddress": "YOUR_USER_ADDRESS"
  }'
```

---

### ✅ Test 13: Transfer USDC (Profit Share Simulation)

Test the profit share transfer mechanism:

```bash
curl -X POST http://localhost:5002/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "AGENT_PRIVATE_KEY",
    "toAddress": "0x3828dFCBff64fD07B963Ef11BafE632260413Ab3",
    "amount": 1.0,
    "vaultAddress": "YOUR_USER_ADDRESS"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "txHash": "0x...",
    "amount": 1.0,
    "to": "0x3828dFCBff64fD07B963Ef11BafE632260413Ab3"
  }
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot request tokens yet"
**Cause:** Faucet has 24-hour cooldown
**Solution:** Wait 24 hours or use a different wallet address

### Issue 2: "Insufficient balance"
**Cause:** Not enough USDC in wallet
**Solution:** Request more from faucet or reduce position size

### Issue 3: "Gas estimation failed"
**Cause:** Not enough Arbitrum Sepolia ETH for gas
**Solution:** Get more ETH from faucet: https://www.alchemy.com/faucets/arbitrum-sepolia

### Issue 4: "Agent not approved" (delegation test)
**Cause:** Approval mechanism not fully implemented in SDK
**Solution:** Need to find correct Ostium SDK method or call smart contract directly

### Issue 5: "Connection refused"
**Cause:** Ostium service not running
**Solution:** Start service: `python services/ostium-service.py`

---

## 📊 Test Results Checklist

Mark each test as you complete it:

- [ ] ✅ Test 1: Health Check
- [ ] ✅ Test 2: Get Testnet USDC
- [ ] ✅ Test 3: Check Balance
- [ ] ✅ Test 4: Get Market Info
- [ ] ✅ Test 5: Check Positions (empty)
- [ ] ✅ Test 6: Open Position (no delegation)
- [ ] ✅ Test 7: Verify Position Open
- [ ] ✅ Test 8: Close Position (no delegation)
- [ ] ✅ Test 9: Generate Agent Wallet
- [ ] ✅ Test 10: Approve Agent
- [ ] ✅ Test 11: Open Position WITH Delegation
- [ ] ✅ Test 12: Close Position WITH Delegation
- [ ] ✅ Test 13: Transfer USDC (profit share)

---

## 🎯 Success Criteria

**Backend is ready for UI if:**
1. ✅ All non-delegation tests (1-8) pass
2. ✅ Agent wallet generation works (Test 9)
3. ⚠️ Delegation tests (10-13) may need SDK research

**If delegation doesn't work:**
- Option A: Research Ostium SDK docs for correct approval method
- Option B: Interact with smart contract directly (like Hyperliquid does)
- Option C: Build UI with "manual approval" flow (user approves on Ostium UI)

---

## 🔍 Next Steps After Testing

### If All Tests Pass ✅
→ **Ready to build UI!** Backend is fully functional.

### If Delegation Tests Fail ⚠️
→ **Need to:**
1. Check Ostium SDK documentation for approval methods
2. Inspect smart contract ABI on Arbiscan
3. Possibly implement direct contract interaction
4. Or: Build UI with manual approval flow (like Hyperliquid's Option B)

---

## 📝 Test Log Template

Save your test results:

```
OSTIUM BACKEND TEST LOG
Date: 2025-11-08
Tester: [Your Name]
Network: Arbitrum Sepolia

Test Results:
-------------
Test 1 (Health):        ✅ PASS
Test 2 (Faucet):        ✅ PASS / ❌ FAIL - [Error message]
Test 3 (Balance):       ✅ PASS / ❌ FAIL - [Error message]
Test 4 (Market Info):   ✅ PASS / ❌ FAIL - [Error message]
Test 5 (Positions):     ✅ PASS / ❌ FAIL - [Error message]
Test 6 (Open Direct):   ✅ PASS / ❌ FAIL - [Error message]
Test 7 (Verify Open):   ✅ PASS / ❌ FAIL - [Error message]
Test 8 (Close Direct):  ✅ PASS / ❌ FAIL - [Error message]
Test 9 (Agent Wallet):  ✅ PASS / ❌ FAIL - [Error message]
Test 10 (Approve):      ✅ PASS / ❌ FAIL - [Error message]
Test 11 (Open Deleg):   ✅ PASS / ❌ FAIL - [Error message]
Test 12 (Close Deleg):  ✅ PASS / ❌ FAIL - [Error message]
Test 13 (Transfer):     ✅ PASS / ❌ FAIL - [Error message]

Notes:
------
[Add any observations, errors, or issues encountered]

Conclusion:
-----------
Backend Status: ✅ READY FOR UI / ⚠️ NEEDS WORK / ❌ MAJOR ISSUES

Next Actions:
-------------
[What needs to be done next]
```

---

## 🚀 Ready to Start Testing?

1. **Start the service** (Terminal 1)
2. **Run tests in order** (Terminal 2)
3. **Document results** in the test log
4. **Report back** with any issues

**Let me know how the tests go!** 🧪✨

