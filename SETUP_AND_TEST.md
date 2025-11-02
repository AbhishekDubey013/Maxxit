# Hyperliquid Service - Setup and Test Guide

## Prerequisites Checklist

### Required Software
- [ ] Python 3.8 or higher installed
- [ ] pip (Python package manager) installed
- [ ] Node.js and npm installed
- [ ] PostgreSQL database running
- [ ] Git (for cloning/pulling)

### Check Your Versions
```bash
python3 --version  # Should be 3.8+
pip3 --version
node --version     # Should be 14+
npm --version
psql --version     # PostgreSQL
```

## Step-by-Step Setup

### Step 1: Install Python Dependencies (2 minutes)

```bash
# Navigate to project
cd /Users/abhishekdubey/Downloads/Maxxit

# Install Python packages
pip3 install -r services/requirements-hyperliquid.txt

# This installs:
# - hyperliquid-python-sdk
# - eth-account
# - flask
# - web3
# - requests
```

**If you get permission errors:**
```bash
# Use --user flag
pip3 install --user -r services/requirements-hyperliquid.txt

# Or use a virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate
pip install -r services/requirements-hyperliquid.txt
```

### Step 2: Set Environment Variables (1 minute)

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copy the output and add to .env
echo "AGENT_WALLET_ENCRYPTION_KEY=<paste-key-here>" >> .env
echo "HYPERLIQUID_TESTNET=true" >> .env
echo "HYPERLIQUID_SERVICE_URL=http://localhost:5001" >> .env
```

### Step 3: Start Python Service (30 seconds)

```bash
# Start in testnet mode
HYPERLIQUID_TESTNET=true python3 services/hyperliquid-service.py

# You should see:
# 🌐 Running on TESTNET
# 📡 Base URL: https://api.hyperliquid-testnet.xyz
#  * Running on http://0.0.0.0:5001
```

**Keep this terminal open!** The service needs to stay running.

### Step 4: Test the Service (2 minutes)

Open a **new terminal** and run these tests:

```bash
# Test 1: Health check
curl http://localhost:5001/health

# Expected output:
# {
#   "status": "ok",
#   "service": "hyperliquid",
#   "network": "testnet",
#   "baseUrl": "https://api.hyperliquid-testnet.xyz"
# }
```

```bash
# Test 2: Get BTC market info
curl -X POST http://localhost:5001/market-info \
  -H "Content-Type: application/json" \
  -d '{"coin": "BTC"}'

# Expected: Price, max leverage, decimals
```

```bash
# Test 3: Check a random address balance
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "0x0000000000000000000000000000000000000000"}'

# Expected: Balance of 0 (it's a test address)
```

### Step 5: Get Testnet Funds (5 minutes)

1. **Get a Test Wallet**
   ```bash
   # Generate a test wallet
   node -e "const {Wallet} = require('ethers'); const w = Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
   
   # Save these somewhere safe (just for testing)
   ```

2. **Get Arbitrum Sepolia ETH** (for gas)
   - Go to: https://faucet.quicknode.com/arbitrum/sepolia
   - Paste your test wallet address
   - Request ETH (you'll get ~0.05 ETH)

3. **Get Hyperliquid Testnet USDC**
   - Go to: https://app.hyperliquid-testnet.xyz
   - Connect your test wallet (MetaMask)
   - Look for "Faucet" or "Get Testnet USDC" button
   - Request testnet USDC (usually get 1000-10000)
   - Wait ~10 seconds for confirmation

4. **Verify You Got Funds**
   ```bash
   curl -X POST http://localhost:5001/balance \
     -H "Content-Type: application/json" \
     -d '{"address": "YOUR_TEST_WALLET_ADDRESS"}'
   
   # Should show withdrawable balance > 0
   ```

### Step 6: Test a Real Trade (3 minutes)

**⚠️ IMPORTANT:** This uses testnet funds only!

```bash
# Open a small BTC position
curl -X POST http://localhost:5001/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "YOUR_TEST_PRIVATE_KEY",
    "coin": "BTC",
    "isBuy": true,
    "size": 0.001,
    "slippage": 0.02
  }'

# Expected: {"success": true, "result": {...}}
```

```bash
# Check your positions
curl -X POST http://localhost:5001/positions \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_TEST_WALLET_ADDRESS"}'

# Should show your 0.001 BTC position
```

```bash
# Close the position
curl -X POST http://localhost:5001/close-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "YOUR_TEST_PRIVATE_KEY",
    "coin": "BTC",
    "size": 0.001,
    "slippage": 0.02
  }'

# Expected: {"success": true, "result": {...}}
```

### Step 7: Run Automated Tests

```bash
# Run the integration test suite
npx tsx scripts/test-hyperliquid-integration.ts

# Run testnet status check
npx tsx scripts/check-testnet-status.ts
```

## Common Issues & Solutions

### Issue: "ModuleNotFoundError: No module named 'hyperliquid'"

**Solution:**
```bash
pip3 install hyperliquid-python-sdk
# or
pip3 install -r services/requirements-hyperliquid.txt
```

### Issue: "Port 5001 already in use"

**Solution:**
```bash
# Find and kill the process
lsof -ti:5001 | xargs kill -9

# Or use a different port
HYPERLIQUID_SERVICE_PORT=5002 python3 services/hyperliquid-service.py
```

### Issue: "Service shows 'mainnet' instead of 'testnet'"

**Solution:**
```bash
# Make sure environment variable is set
export HYPERLIQUID_TESTNET=true

# Then start service
python3 services/hyperliquid-service.py
```

### Issue: "Cannot get testnet USDC from faucet"

**Solutions:**
1. Try the Hyperliquid Discord (#testnet channel)
2. Ask community members for testnet funds
3. Check if you already received (there's a cooldown)
4. Try with a different wallet address

### Issue: "Order rejected" or "insufficient balance"

**Check:**
```bash
# 1. Verify balance
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_ADDRESS"}'

# 2. Verify market exists
curl -X POST http://localhost:5001/market-info \
  -H "Content-Type: application/json" \
  -d '{"coin": "BTC"}'

# 3. Check you're using correct private key format (starts with 0x)
```

## Quick Reference Commands

### Start Service (Testnet)
```bash
HYPERLIQUID_TESTNET=true python3 services/hyperliquid-service.py
```

### Start Service (Mainnet) - USE WITH CAUTION
```bash
python3 services/hyperliquid-service.py
```

### Check Service Status
```bash
curl http://localhost:5001/health
```

### Check Your Balance
```bash
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "YOUR_ADDRESS"}'
```

### Get Market Info
```bash
curl -X POST http://localhost:5001/market-info \
  -H "Content-Type: application/json" \
  -d '{"coin": "BTC"}'  # Or ETH, SOL, etc.
```

### View Service Logs
```bash
# Service logs appear in the terminal where you started it
# For detailed logging:
HYPERLIQUID_TESTNET=true python3 -u services/hyperliquid-service.py
```

## Next Steps After Testing

Once everything works:

1. **Start the Main App**
   ```bash
   npm run dev
   ```

2. **Deploy an Agent**
   - Go to http://localhost:3000/create-agent
   - Select HYPERLIQUID venue
   - Deploy

3. **Run Setup**
   - Go to "My Deployments"
   - Click "Enable Hyperliquid (One-Click)"
   - This generates an agent wallet automatically

4. **Fund Agent Wallet**
   - Transfer testnet USDC to the agent wallet address
   - Check balance to confirm

5. **Test Automated Trading**
   - Agent will monitor Twitter for signals
   - Execute trades automatically
   - Track positions and P&L

## Testnet Resources

- **Hyperliquid Testnet App**: https://app.hyperliquid-testnet.xyz
- **Arbitrum Sepolia Faucet**: https://faucet.quicknode.com/arbitrum/sepolia
- **Hyperliquid Discord**: https://discord.gg/hyperliquid (ask in #testnet)
- **Hyperliquid Docs**: https://hyperliquid.gitbook.io/

## Support

If you run into issues:

1. Check the terminal where Python service is running for errors
2. Run: `npx tsx scripts/check-testnet-status.ts`
3. Verify all environment variables are set
4. Make sure you're on testnet (check health endpoint)
5. Check you have testnet funds

## Security Notes

- ✅ These are testnet credentials - no real money at risk
- ✅ Never share mainnet private keys
- ✅ Keep encryption keys secure
- ✅ Test everything on testnet first
- ✅ Use separate databases for testnet/mainnet

---

**You're ready when:**
- ✅ Health check returns "testnet"
- ✅ Can get market info for BTC
- ✅ Can check balances
- ✅ Can open/close test positions
- ✅ Integration tests pass

🎉 **Happy Testing!**

