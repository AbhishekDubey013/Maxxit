# 🧪 Ethereum Sepolia Deployment Guide

**Deploy and test MaxxitTradingModule on Ethereum Sepolia**

---

## 🎯 Why Ethereum Sepolia?

✅ Fully supported by Safe wallet  
✅ Easy to get testnet ETH from faucets  
✅ Same Uniswap contracts as mainnet  
✅ Free to test everything  

---

## 📋 Step 1: Get Testnet Assets

### A. Get Sepolia ETH (for gas)

**Free Faucets:**

1. **Alchemy Sepolia Faucet** (Recommended)
   - URL: https://sepoliafaucet.com
   - Requires: Email or social account
   - Amount: 0.5 ETH per day

2. **Infura Sepolia Faucet**
   - URL: https://www.infura.io/faucet/sepolia
   - Requires: Infura account
   - Amount: 0.5 ETH per day

3. **QuickNode Faucet**
   - URL: https://faucet.quicknode.com/ethereum/sepolia
   - Requires: Twitter account
   - Amount: 0.05 ETH per request

**How to use:**
```
1. Go to any faucet
2. Enter your wallet address
3. Complete verification (social login, captcha, etc.)
4. Receive testnet ETH (usually instant)
```

### B. Get Sepolia USDC (for trading)

**Circle Testnet Faucet:**
- URL: https://faucet.circle.com
- Network: Ethereum Sepolia
- Get free USDC for testing

**OR Use Uniswap Faucet:**
- URL: https://faucet.paradigm.xyz
- Provides USDC and other test tokens

---

## 🔧 Step 2: Setup Environment

### A. Install Dependencies

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-verify
```

### B. Configure .env

Create/update `.env` file:

```bash
# Deployment Wallet (needs Sepolia ETH for gas)
DEPLOYER_PRIVATE_KEY=0x...

# Platform Addresses (can use same address for testing)
PLATFORM_FEE_RECEIVER=0x...
PLATFORM_PROFIT_RECEIVER=0x...
MODULE_OWNER=0x...

# Executor (for calling module)
EXECUTOR_PRIVATE_KEY=0x...

# Optional: Etherscan API key for verification
ETHERSCAN_API_KEY=YOUR_KEY
```

**Getting a Deployer Private Key:**
```
1. Create a NEW MetaMask wallet (for testing only!)
2. Get the private key: Settings → Security → Export Private Key
3. Add to .env as DEPLOYER_PRIVATE_KEY
4. Send Sepolia ETH to this address (0.1 ETH is enough)
```

---

## 🚀 Step 3: Deploy Module

### A. Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 3 Solidity files successfully
```

### B. Deploy to Sepolia

```bash
npx hardhat run contracts/deploy/deploy-module.ts --network sepolia
```

Expected output:
```
Deploying MaxxitTradingModule with account: 0x...
Account balance: 100000000000000000

Deployment Configuration:
========================
Platform Fee Receiver: 0x...
Platform Profit Receiver: 0x...
Module Owner: 0x...
USDC Address: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
Chain ID: 11155111

Deploying MaxxitTradingModule...

✅ MaxxitTradingModule deployed to: 0x...
```

**Save the deployed address!**

### C. Verify on Etherscan (Optional but Recommended)

```bash
npx hardhat verify --network sepolia \
  [MODULE_ADDRESS] \
  [PLATFORM_FEE_RECEIVER] \
  [PLATFORM_PROFIT_RECEIVER] \
  [USDC_ADDRESS] \
  [MODULE_OWNER]
```

Example:
```bash
npx hardhat verify --network sepolia \
  0x123... \
  0xFEE... \
  0xPROFIT... \
  0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  0xOWNER...
```

---

## 🔐 Step 4: Create Safe Wallet

### A. Go to Safe UI

URL: https://app.safe.global

### B. Create New Safe

1. Click "Create new Safe"
2. **Select Network: Ethereum Sepolia**
3. Name your Safe: "Maxxit Test Safe"
4. Add owners (your wallet addresses)
5. Set threshold: 1 of 1 (for testing)
6. Review and create
7. Sign transaction (costs ~$0.01 in Sepolia ETH)

**Save your Safe address!**

Example: `0x9f96e1cc4D1798786D7168E4cc88fD883B2CD5e2`

### C. Fund Your Safe

1. Send Sepolia USDC to Safe address
   - Recommended: 100-500 USDC for testing
2. Send some Sepolia ETH for approvals
   - Recommended: 0.01 ETH

---

## 🎯 Step 5: Enable Module in Safe

### A. Via Safe UI (Easiest)

1. Go to Safe wallet: https://app.safe.global
2. Switch to Ethereum Sepolia network
3. Open your Safe
4. Go to: **Apps → Transaction Builder**
5. Add Transaction:
   ```
   To: [Your Safe Address]
   Contract: Safe
   Method: enableModule
   Module Address: [TRADING_MODULE_ADDRESS from deployment]
   ```
6. Click "Add Transaction"
7. Click "Create Batch"
8. Sign and execute

### B. Via Hardhat Script (Alternative)

Create `scripts/enable-module.ts`:

```typescript
import { ethers } from "hardhat";

async function main() {
  const SAFE_ADDRESS = "0x..."; // Your Safe
  const MODULE_ADDRESS = "0x..."; // Deployed module
  
  const Safe = await ethers.getContractAt("ISafe", SAFE_ADDRESS);
  const tx = await Safe.enableModule(MODULE_ADDRESS);
  await tx.wait();
  
  console.log("Module enabled!");
}

main();
```

Run:
```bash
npx hardhat run scripts/enable-module.ts --network sepolia
```

---

## ⚙️ Step 6: Configure Module

### A. Authorize Executor

```typescript
import { createSafeModuleService } from './lib/safe-module-service';

const moduleService = createSafeModuleService(
  process.env.TRADING_MODULE_ADDRESS!,
  11155111, // Sepolia chain ID
  process.env.MODULE_OWNER_PRIVATE_KEY // Use module owner's key
);

// Authorize executor wallet
const executorAddress = "0x..."; // Wallet that will call executeTrade
await moduleService.setExecutorAuthorization(executorAddress, true);

console.log("Executor authorized!");
```

### B. Whitelist Test Tokens

```typescript
// Whitelist WETH on Sepolia
await moduleService.setTokenWhitelist(
  "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH Sepolia
  true
);

// Whitelist any other tokens you want to trade
```

---

## 🧪 Step 7: Test Trading

### A. Initialize Capital Tracking

```typescript
const moduleService = createSafeModuleService(
  process.env.TRADING_MODULE_ADDRESS!,
  11155111
);

// Initialize for your Safe
await moduleService.initializeCapital(SAFE_ADDRESS);

console.log("Capital tracking initialized!");
```

### B. Check Safe Stats

```typescript
const stats = await moduleService.getSafeStats(SAFE_ADDRESS);

console.log("Safe Stats:");
console.log("Initialized:", stats.initialized);
console.log("Initial Capital:", stats.initialCapital, "USDC");
console.log("Current Balance:", stats.currentBalance, "USDC");
```

### C. Execute Test Trade

```typescript
// Test trade: USDC → WETH
const result = await moduleService.executeTrade({
  safeAddress: SAFE_ADDRESS,
  fromToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC
  toToken: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // WETH
  amountIn: "10000000", // 10 USDC (6 decimals)
  dexRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E", // Uniswap Router
  swapData: "0x...", // Build swap calldata
  minAmountOut: "...", // Calculate minimum output
});

if (result.success) {
  console.log("✅ Trade executed!");
  console.log("TX:", result.txHash);
  console.log("Fee charged:", result.feeCharged, "USDC");
}
```

---

## 🔍 Step 8: Verify Everything

### A. Check on Etherscan

Sepolia Etherscan: https://sepolia.etherscan.io

1. View module contract
2. View Safe transactions
3. Verify trade execution
4. Check fee transfers

### B. Check in Safe UI

1. Go to Safe UI
2. View transaction history
3. Verify USDC/WETH balances
4. Check module is enabled

### C. Check Stats

```typescript
// Get updated stats
const stats = await moduleService.getSafeStats(SAFE_ADDRESS);

console.log("After Trade:");
console.log("Current Balance:", stats.currentBalance);
console.log("Profit/Loss:", stats.profitLoss);
console.log("Unrealized Profit:", stats.unrealizedProfit);
```

---

## 🚨 Step 9: Test Emergency Disable

### A. Disable Module

1. Go to Safe UI
2. Settings → Modules
3. Find MaxxitTradingModule
4. Click "Disable"
5. Sign and execute

### B. Verify Module Disabled

```typescript
// Try to execute trade (should fail)
const result = await moduleService.executeTrade({...});
// Expected: Transaction will revert
```

### C. Withdraw Everything

```typescript
// From Safe UI
// New Transaction → Send Funds
// Send all USDC to your personal wallet
```

---

## ✅ Testing Checklist

**Setup:**
- [ ] Got Sepolia ETH from faucet
- [ ] Got Sepolia USDC from faucet
- [ ] Configured .env with all keys
- [ ] Installed Hardhat dependencies

**Deployment:**
- [ ] Compiled contracts successfully
- [ ] Deployed module to Sepolia
- [ ] Verified on Etherscan
- [ ] Saved module address

**Safe Setup:**
- [ ] Created Safe on Sepolia
- [ ] Funded Safe with USDC
- [ ] Funded Safe with ETH for gas
- [ ] Enabled module in Safe

**Configuration:**
- [ ] Authorized executor wallet
- [ ] Whitelisted test tokens
- [ ] Initialized capital tracking

**Testing:**
- [ ] Executed test trade (USDC → WETH)
- [ ] Verified 0.2 USDC fee deducted
- [ ] Closed test trade (WETH → USDC)
- [ ] Verified profit share (20%) if profitable
- [ ] Checked stats are correct
- [ ] Tested emergency disable
- [ ] Withdrew all funds

---

## 📊 Sepolia Addresses Reference

```
Network:
Chain ID: 11155111
RPC: https://ethereum-sepolia.publicnode.com
Explorer: https://sepolia.etherscan.io

Tokens:
USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
WETH: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14

DEXes:
Uniswap V3 Router: 0xE592427A0AEce92De3Edee1F18E0157C05861564
Uniswap SwapRouter02: 0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45
Uniswap SwapRouter (Sepolia): 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E

Safe:
Safe UI: https://app.safe.global
Docs: https://docs.safe.global
```

---

## 🎊 Ready!

Once you've completed all tests on Sepolia and everything works:

1. ✅ Test with small amounts
2. ✅ Verify all security features
3. ✅ Check profit calculations
4. ✅ Test emergency disable

**Then you're ready to deploy to mainnet!** 🚀

---

## 💡 Quick Commands

```bash
# Compile
npx hardhat compile

# Deploy to Sepolia
npx hardhat run contracts/deploy/deploy-module.ts --network sepolia

# Verify
npx hardhat verify --network sepolia [ADDRESS] [ARGS]

# Test
npx hardhat test --network sepolia
```

---

## 🔗 Useful Links

```
Safe UI: https://app.safe.global
Sepolia Faucet: https://sepoliafaucet.com
Circle USDC Faucet: https://faucet.circle.com
Sepolia Explorer: https://sepolia.etherscan.io
Etherscan API Keys: https://etherscan.io/myapikey
```

---

**Let's start deploying!** 🚀
