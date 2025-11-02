# 🚀 START HERE - Hyperliquid Service Setup

## What You Need (5 minutes to check)

### 1. Python 3.8+
```bash
python3 --version
```
If not installed: https://www.python.org/downloads/

### 2. pip (Python package manager)
```bash
pip3 --version
```
Usually comes with Python.

### 3. Node.js
```bash
node --version
```
Already installed (you're running the app).

## Quick Setup (10 minutes total)

### Step 1: Install Python Packages (2 minutes)

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
pip3 install -r services/requirements-hyperliquid.txt
```

**If you get errors**, try:
```bash
pip3 install --user -r services/requirements-hyperliquid.txt
```

### Step 2: Set Environment Variable (1 minute)

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env file (create if doesn't exist)
echo "HYPERLIQUID_TESTNET=true" >> .env
echo "AGENT_WALLET_ENCRYPTION_KEY=<paste-key-from-above>" >> .env
```

### Step 3: Start Service (30 seconds)

**Open a new terminal** and run:

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
HYPERLIQUID_TESTNET=true python3 services/hyperliquid-service.py
```

You should see:
```
🌐 Running on TESTNET
📡 Base URL: https://api.hyperliquid-testnet.xyz
 * Running on http://0.0.0.0:5001
```

**Keep this terminal open!**

### Step 4: Test It Works (1 minute)

**Open another terminal** and run:

```bash
cd /Users/abhishekdubey/Downloads/Maxxit
./quick-test.sh
```

Should show:
```
✅ All tests passed!
```

### Step 5: Get Testnet Funds (5 minutes)

1. **Generate a test wallet**:
   ```bash
   node -e "const {Wallet} = require('ethers'); const w = Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
   ```
   **Save these!** (just for testing)

2. **Get testnet ETH** (for gas):
   - Go to: https://faucet.quicknode.com/arbitrum/sepolia
   - Paste your address
   - Request ETH

3. **Get testnet USDC**:
   - Go to: https://app.hyperliquid-testnet.xyz
   - Connect wallet (MetaMask with your test wallet)
   - Click "Get Testnet USDC" or faucet button
   - Wait ~10 seconds

4. **Verify**:
   ```bash
   curl -X POST http://localhost:5001/balance \
     -H "Content-Type: application/json" \
     -d '{"address": "YOUR_TEST_WALLET_ADDRESS"}'
   ```
   Should show balance > 0

## Test a Trade (2 minutes)

```bash
# Test opening a position
npx tsx scripts/test-trade-testnet.ts YOUR_TEST_PRIVATE_KEY
```

Should show:
```
✅ Test Complete!
🎉 Your Hyperliquid testnet integration is working!
```

## You're Ready! 🎉

Now you can:

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Create an agent**:
   - Go to http://localhost:3000/create-agent
   - Select HYPERLIQUID venue

3. **Deploy and trade**!

## Quick Commands Reference

```bash
# Start service (testnet)
HYPERLIQUID_TESTNET=true python3 services/hyperliquid-service.py

# Check if working
./quick-test.sh

# Test status
npx tsx scripts/check-testnet-status.ts

# Test trade
npx tsx scripts/test-trade-testnet.ts <private-key>
```

## Need Help?

- **Service won't start**: Check Python is 3.8+
- **Import errors**: Run `pip3 install -r services/requirements-hyperliquid.txt`
- **Port in use**: Kill existing service: `lsof -ti:5001 | xargs kill -9`
- **Can't get testnet USDC**: Ask in Hyperliquid Discord #testnet

## Full Documentation

- **Setup Guide**: `SETUP_AND_TEST.md`
- **Testnet Guide**: `TESTNET_QUICKSTART.md`
- **Main Guide**: `HYPERLIQUID_SETUP.md`

---

**Keep these terminals open:**
- ✅ Terminal 1: Python service running
- ✅ Terminal 2: Your main app (`npm run dev`)

Happy testing! 🚀

