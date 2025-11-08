# 🧪 Ostium Backend Testing - Quick Start

## 🚀 **Get Started in 5 Minutes**

Follow these steps to test the Ostium backend integration:

---

## **Step 1: Get Testnet Funds** (5 min)

1. **Get Arbitrum Sepolia ETH** (for gas):
   - Visit: https://www.alchemy.com/faucets/arbitrum-sepolia
   - Connect your wallet
   - Request testnet ETH (~0.01 ETH)

2. **Note your wallet details:**
   - Wallet Address: `0x...`
   - Private Key: (from MetaMask → Account Details → Export Private Key)

---

## **Step 2: Start Ostium Service** (2 min)

Open Terminal 1:

```bash
cd /Users/abhishekdubey/Downloads/Maxxit/services

# Create virtual environment (first time only)
python3 -m venv venv
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements-ostium.txt

# Start the service
python ostium-service.py
```

**Expected output:**
```
🚀 Ostium Service Starting...
   Network: TESTNET
   RPC URL: https://sepolia-rollup.arbitrum.io/rpc
 * Running on http://0.0.0.0:5002
```

✅ **Service is now running!**

---

## **Step 3: Run Automated Tests** (3 min)

Open Terminal 2:

```bash
cd /Users/abhishekdubey/Downloads/Maxxit

# Run the test script
./scripts/test-ostium-backend.sh
```

The script will guide you through:
1. ✅ Health check
2. ✅ Market info
3. ✅ Balance check (needs your address)
4. ✅ Position check
5. ✅ Optional: Faucet request for testnet USDC
6. ✅ Optional: Open/close test position

**You'll be prompted for:**
- Your Arbitrum wallet address
- Your private key (optional, for trading tests)

---

## **Step 4: Manual Testing** (Optional)

If you prefer manual testing, use curl:

### Health Check
```bash
curl http://localhost:5002/health
```

### Get Testnet USDC
```bash
curl -X POST http://localhost:5002/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_WALLET_ADDRESS"}'
```

### Check Balance
```bash
curl -X POST http://localhost:5002/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_WALLET_ADDRESS"}'
```

### Open Position (Small Test)
```bash
curl -X POST http://localhost:5002/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "YOUR_PRIVATE_KEY",
    "market": "BTC-USD",
    "size": 10,
    "side": "long",
    "leverage": 2,
    "useDelegation": false
  }'
```

---

## **Step 5: Check Results**

After running tests, check:
- ✅ Test output in terminal (color-coded)
- ✅ `ostium-test-results.log` file for detailed results
- ✅ Service logs in `logs/ostium-service.log`

---

## **Expected Results**

### ✅ **Success Criteria:**
- All basic tests (health, market info, balance) pass
- Faucet successfully provides testnet USDC
- Position opens and closes successfully
- No critical errors in logs

### ⚠️ **Known Limitations:**
- **Delegation tests** may not work yet (needs SDK research)
- Agent approval mechanism needs verification
- This is testnet only (mainnet not tested)

---

## **What's Next?**

### **If Tests Pass ✅**
→ **Ready to build UI!**
- Backend is fully functional
- Can proceed with frontend components
- Delegation can be added later if needed

### **If Tests Fail ❌**
→ **Troubleshooting:**
1. Check service logs: `tail -f logs/ostium-service.log`
2. Verify RPC URL is working
3. Ensure you have testnet ETH for gas
4. Check Ostium SDK version: `pip show ostium-python-sdk`

---

## **Full Documentation**

For detailed testing instructions, see:
- **Testing Guide**: `docs/OSTIUM_BACKEND_TESTING.md`
- **Environment Setup**: `docs/OSTIUM_ENV_SETUP.md`
- **Integration Plan**: `docs/OSTIUM_INTEGRATION_PLAN.md`

---

## **Common Issues**

### "Service not running"
```bash
# Check if port 5002 is in use
lsof -i :5002

# Kill if needed
kill -9 <PID>

# Restart service
python services/ostium-service.py
```

### "Cannot request tokens yet"
- Faucet has 24-hour cooldown
- Try a different wallet address
- Or wait 24 hours

### "Insufficient balance"
- Request USDC from faucet first
- Reduce position size to 10 USDC

### "Gas estimation failed"
- Need Arbitrum Sepolia ETH
- Get from: https://www.alchemy.com/faucets/arbitrum-sepolia

---

## **Quick Test Checklist**

- [ ] Terminal 1: Service running on port 5002
- [ ] Terminal 2: Test script executed
- [ ] Health check: PASS
- [ ] Market info: PASS
- [ ] Balance check: PASS
- [ ] Faucet request: SUCCESS (or SKIP if already done)
- [ ] Position open: SUCCESS (optional)
- [ ] Position close: SUCCESS (optional)
- [ ] Test log created: ostium-test-results.log

---

## **Ready to Test?**

1. ✅ Start service (Terminal 1)
2. ✅ Run test script (Terminal 2)
3. ✅ Follow prompts
4. ✅ Report results!

**Good luck with testing! 🚀**

---

## **Report Your Results**

After testing, let me know:
- ✅ Which tests passed
- ❌ Which tests failed (and error messages)
- 📊 Overall success rate

Based on your results, I'll:
- ✅ Build the UI if backend is stable
- ⚠️ Fix any issues discovered
- 🔧 Research delegation implementation if needed

**Happy testing! 🧪✨**

