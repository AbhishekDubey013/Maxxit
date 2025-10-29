# Testing Safe Deployment Locally

## 🧪 Test Script

This test script verifies that Safe deployment with module enablement works **without using Safe UI**.

## 🚀 Quick Start

### 1. Setup Test Wallet

You need a wallet with testnet ETH:

```bash
# Get testnet ETH from Arbitrum Sepolia faucet
https://faucet.quicknode.com/arbitrum/sepolia
```

### 2. Configure Environment

Create a `.env` file or `.env.test` with:

```bash
# Your test wallet private key
TEST_PRIVATE_KEY=0x1234...

# Or use existing executor private key
# EXECUTOR_PRIVATE_KEY=0x5678...
```

### 3. Run Test

```bash
# Install dependencies if needed
npm install

# Run the test
npx ts-node scripts/test-safe-deployment.ts
```

## 📋 What The Test Does

The test script will:

1. ✅ Connect to Arbitrum Sepolia testnet
2. ✅ Deploy a new Safe account (STEP 1)
3. ✅ Enable the trading module (STEP 2)
4. ✅ Verify module is enabled
5. ✅ Display results and timing

## ✅ Expected Output

```
============================================================
  SAFE DEPLOYMENT TEST
============================================================

🧪 Testing Safe Deployment with Module Enablement

Configuration:
- Chain ID: 421614
- RPC URL: https://sepolia-rollup.arbitrum.io/rpc
- Module Address: 0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE

📡 Connecting to RPC...
✅ Connected!
- Owner Address: 0x1234...
- Balance: 0.5 ETH

🔧 Creating Safe SDK adapter...
✅ Adapter created

🏭 Creating Safe Factory...
✅ Factory created

🚀 STEP 1/2: Deploying Safe...
This will take 30-60 seconds...
✅ Safe deployed successfully!
- Safe Address: 0xABCD...
- Time taken: 35.2 seconds

⏳ Waiting 2 seconds for deployment to settle...

🔐 STEP 2/2: Enabling trading module...
- Module Address: 0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE
📤 Module enable transaction sent
- Transaction Hash: 0x5678...
⏳ Waiting for confirmation...
✅ Module enable transaction confirmed!
- Time taken: 28.3 seconds

🔍 STEP 3: Verifying module status...
✅ SUCCESS! Module is enabled!

🎉 TEST PASSED! 🎉

Summary:
- Safe Address: 0xABCD...
- Module Enabled: true
- Total Time: 65.5 seconds
- Deploy Time: 35.2 seconds
- Enable Time: 28.3 seconds

View on Explorer:
https://sepolia.arbiscan.io/address/0xABCD...

✅ The two-step automated deployment WORKS!

============================================================
Test completed successfully!
============================================================
```

## 🔍 What This Proves

This test proves:

1. ✅ **No Safe UI needed** - Everything done programmatically
2. ✅ **Two signatures required** - User signs twice via wallet
3. ✅ **Fully automated** - No manual steps
4. ✅ **Takes ~1 minute** - Much faster than manual flow
5. ✅ **Module actually enabled** - Verified on-chain

## 🐛 Troubleshooting

### Error: "No private key found"
- Set `TEST_PRIVATE_KEY` in your `.env` file
- Or set `EXECUTOR_PRIVATE_KEY`

### Error: "Wallet has 0 balance"
- Get testnet ETH from: https://faucet.quicknode.com/arbitrum/sepolia
- Need ~0.01 ETH for gas

### Error: "Transaction failed"
- Check RPC is working: https://sepolia-rollup.arbitrum.io/rpc
- Check testnet is not congested
- Wait and try again

### Error: "Module not enabled"
- This shouldn't happen if transactions succeeded
- Check module address is correct
- Verify on Arbiscan

## 📊 Performance

Typical times on Arbitrum Sepolia:
- Safe Deployment: 30-40 seconds
- Module Enablement: 20-30 seconds
- Total: ~1 minute

## 🎯 Next Steps

After successful test:
1. ✅ Test passes - deployment works!
2. 🚀 Deploy to production (Arbitrum mainnet)
3. 🎉 Users can now create Safe + enable module easily

## 📚 Technical Details

The test uses:
- Safe Protocol Kit (`@safe-global/protocol-kit`)
- Ethers.js v5
- Arbitrum Sepolia testnet (chainId: 421614)
- Module address: 0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE

No Safe UI, no Safe Transaction Service - pure SDK!

