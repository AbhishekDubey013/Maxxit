# Environment Variables Setup 🔧

**Required environment variables for trade execution**

---

## Required Variables

### 1. Database
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/maxxit"
```

### 2. GAME API (X/Twitter)
```bash
GAME_API_KEY="your-game-api-key-here"
```
Get your key from: https://app.virtuals.io/

### 3. LLM API (choose one or more)
```bash
# OpenAI
OPENAI_API_KEY="sk-..."

# OR Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# OR Perplexity (recommended for classification)
PERPLEXITY_API_KEY="pplx-..."
```

### 4. RPC URLs (for blockchain interactions)
```bash
# Arbitrum
ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"

# Base
BASE_RPC_URL="https://mainnet.base.org"
```

**Optional:** Use paid RPC providers for better reliability:
- Alchemy: `https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY`
- Infura: `https://arbitrum-mainnet.infura.io/v3/YOUR_KEY`
- QuickNode: Your custom endpoint

### 5. ⚠️ **EXECUTOR_PRIVATE_KEY** (REQUIRED for trade execution)
```bash
EXECUTOR_PRIVATE_KEY="0x..."
```

**What is this?**
- Private key of an EOA (Externally Owned Account) wallet
- This wallet will propose and execute Safe transactions
- **Must be an owner of the Safe wallets** that will be trading

**Security:**
- 🚨 **NEVER commit this to git!**
- 🚨 **NEVER share this key publicly!**
- 🔒 Keep it in `.env` (already in `.gitignore`)
- 🔐 Use a dedicated wallet just for this purpose
- 💰 Fund it with small amount of ETH for gas fees

**How to create a new wallet:**
```javascript
// Run this in Node.js console:
const ethers = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
```

Then:
1. Save the private key in `.env` as `EXECUTOR_PRIVATE_KEY`
2. Add the address as an owner to your Safe wallet(s)
3. Fund the address with ~0.1 ETH on Arbitrum for gas

---

## Optional Variables

### Safe Transaction Service (for multi-sig tracking)
```bash
# These are public API endpoints, no keys needed
SAFE_API_ARBITRUM="https://safe-transaction-arbitrum.safe.global"
SAFE_API_BASE="https://safe-transaction-base.safe.global"
```

### Server Configuration
```bash
PORT=5000
NODE_ENV=development
```

---

## Complete .env Template

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/maxxit"

# GAME API
GAME_API_KEY="your-game-api-key-here"

# LLM API (choose one)
PERPLEXITY_API_KEY="pplx-..."

# RPC URLs
ARBITRUM_RPC_URL="https://arb1.arbitrum.io/rpc"
BASE_RPC_URL="https://mainnet.base.org"

# EXECUTOR (REQUIRED for trade execution)
EXECUTOR_PRIVATE_KEY="0x..."

# Server
PORT=5000
NODE_ENV=development
```

---

## Verification

### Check if environment is set up correctly:

```bash
# In Node.js console or create test.js:
require('dotenv').config();

console.log('Database:', process.env.DATABASE_URL ? '✅' : '❌');
console.log('GAME API:', process.env.GAME_API_KEY ? '✅' : '❌');
console.log('LLM API:', 
  process.env.OPENAI_API_KEY || 
  process.env.ANTHROPIC_API_KEY || 
  process.env.PERPLEXITY_API_KEY ? '✅' : '❌');
console.log('Arbitrum RPC:', process.env.ARBITRUM_RPC_URL ? '✅' : '❌');
console.log('Executor Key:', process.env.EXECUTOR_PRIVATE_KEY ? '✅' : '❌');
```

---

## Security Best Practices

### 1. Executor Wallet Security
- ✅ Use a dedicated wallet only for execution
- ✅ Fund with minimal ETH (just for gas)
- ✅ Rotate keys periodically
- ✅ Monitor transactions
- ❌ Don't store large amounts in this wallet
- ❌ Don't reuse this key for other purposes

### 2. Safe Wallet Ownership
```
Example Safe Setup:
- Owner 1: Your main wallet (hardware wallet recommended)
- Owner 2: Executor wallet (from EXECUTOR_PRIVATE_KEY)
- Owner 3: Optional backup wallet
- Threshold: 2 of 3 signatures required
```

For single-sig testing:
```
- Owner: Executor wallet only
- Threshold: 1 signature
```

### 3. Environment File Security
```bash
# Verify .env is in .gitignore
cat .gitignore | grep .env

# Check .env file permissions (should be 600)
chmod 600 .env
ls -la .env
```

---

## Troubleshooting

### "No signer configured"
**Problem:** `EXECUTOR_PRIVATE_KEY` not set

**Solution:**
```bash
# Add to .env
EXECUTOR_PRIVATE_KEY="0x..."
```

### "Insufficient funds for gas"
**Problem:** Executor wallet has no ETH

**Solution:**
```bash
# Send ETH to executor address
# Check balance:
curl https://arb1.arbitrum.io/rpc \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["EXECUTOR_ADDRESS","latest"],"id":1}'
```

### "Transaction reverted"
**Problem:** Executor is not Safe owner

**Solution:**
1. Go to Safe UI (https://app.safe.global)
2. Add executor address as owner
3. Try transaction again

---

## Production Recommendations

### 1. Use Hardware Wallet for Main Ownership
```
Safe Owners:
- Main: Hardware wallet (Ledger/Trezor)
- Executor: Hot wallet (from EXECUTOR_PRIVATE_KEY)
- Backup: Hardware wallet or multi-sig
```

### 2. Use Paid RPC Providers
```bash
# Free public RPCs can be rate-limited
ARBITRUM_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY"
BASE_RPC_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_KEY"
```

### 3. Implement Rate Limiting
- Limit number of trades per hour
- Set maximum position sizes
- Add cooldown periods

### 4. Monitor Executor Wallet
- Set up alerts for low ETH balance
- Monitor for suspicious transactions
- Track gas spending

---

## Example Safe Wallet Setup

### Step 1: Create Executor Wallet
```javascript
const ethers = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Executor Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
// Save private key to .env as EXECUTOR_PRIVATE_KEY
```

### Step 2: Create Safe Wallet
1. Go to https://app.safe.global
2. Connect your main wallet
3. Create new Safe on Arbitrum
4. Add owners:
   - Your main wallet
   - Executor address (from Step 1)
5. Set threshold to 1 (for testing) or 2 (for production)

### Step 3: Fund Wallets
```bash
# Fund Safe with USDC for trading
# Send USDC to Safe address on Arbitrum

# Fund Executor with ETH for gas
# Send ~0.1 ETH to executor address on Arbitrum
```

### Step 4: Test
```bash
# Check Safe status
curl "http://localhost:5000/api/safe/status?safeAddress=YOUR_SAFE&chainId=42161"
```

---

✅ **Environment setup complete!** You're ready to execute trades.
