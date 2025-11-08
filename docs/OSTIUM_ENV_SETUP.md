# Ostium Environment Variables Setup

## Required Environment Variables

Add these to your `.env` file or deployment platform (Railway, Render, etc.):

```bash
# ============================================
# OSTIUM CONFIGURATION
# ============================================

# Ostium Python Service URL
OSTIUM_SERVICE_URL=http://localhost:5002  # Local dev
# OSTIUM_SERVICE_URL=https://your-ostium-service.onrender.com  # Production

# Ostium Service Port (if running locally)
OSTIUM_SERVICE_PORT=5002

# Ostium Network (testnet vs mainnet)
OSTIUM_TESTNET=true  # Use 'false' for mainnet

# Arbitrum RPC URL (for Ostium on Arbitrum)
OSTIUM_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc  # Testnet
# OSTIUM_RPC_URL=https://arb1.arbitrum.io/rpc  # Mainnet

# Platform Wallet (receives profit shares)
OSTIUM_PLATFORM_WALLET=0x...  # Your platform wallet address on Arbitrum

# Profit Share Percentage
OSTIUM_PROFIT_SHARE=10  # 10% of profits (default)

# Fee Model (PROFIT_SHARE is recommended)
OSTIUM_FEE_MODEL=PROFIT_SHARE
```

---

## Installation & Setup

### 1. Install Python Dependencies

```bash
cd services
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements-ostium.txt
```

### 2. Start Ostium Service

```bash
# In services directory with venv activated
python ostium-service.py
```

The service will start on port 5002 (or `OSTIUM_SERVICE_PORT`).

### 3. Test Service Health

```bash
curl http://localhost:5002/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "ostium",
  "network": "testnet",
  "timestamp": "2025-11-08T..."
}
```

---

## Testing on Testnet

### 1. Get Arbitrum Sepolia ETH (for gas)

Visit: https://www.alchemy.com/faucets/arbitrum-sepolia

### 2. Get Testnet USDC from Ostium Faucet

```bash
curl -X POST http://localhost:5002/faucet \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYourArbitrumAddress"}'
```

Or via TypeScript:
```typescript
import { requestOstiumFaucet } from './lib/adapters/ostium-adapter';

const result = await requestOstiumFaucet('0xYourArbitrumAddress');
console.log(`Received ${result.amount} USDC`);
```

### 3. Check Balance

```bash
curl -X POST http://localhost:5002/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYourArbitrumAddress"}'
```

### 4. Test Opening a Position

```bash
curl -X POST http://localhost:5002/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "0xYourPrivateKey",
    "market": "BTC-USD",
    "size": 10,
    "side": "long",
    "leverage": 10
  }'
```

---

## Production Deployment

### Railway / Render

1. **Deploy Ostium Service:**
   ```bash
   # Add to railway.json or render.yaml
   services:
     - name: ostium-service
       type: web
       env: python
       buildCommand: pip install -r services/requirements-ostium.txt
       startCommand: python services/ostium-service.py
       envVars:
         - key: OSTIUM_TESTNET
           value: false
         - key: OSTIUM_RPC_URL
           value: https://arb1.arbitrum.io/rpc
         - key: OSTIUM_PLATFORM_WALLET
           value: 0x...
   ```

2. **Update Main App:**
   ```bash
   # Add to main app environment
   OSTIUM_SERVICE_URL=https://your-ostium-service-url.com
   OSTIUM_PROFIT_SHARE=10
   ```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   MAXXIT PLATFORM                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. User connects Arbitrum wallet                        │
│  2. User approves agent address (one-time)               │
│  3. Agent trades via Ostium SDK (use_delegation=True)    │
│  4. Position monitor tracks positions every 30s          │
│  5. Trailing stops auto-close when triggered             │
│  6. Profit share (10%) auto-collected to platform wallet │
│                                                           │
└─────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│           OSTIUM PYTHON SERVICE (Flask)                  │
│              http://localhost:5002                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Endpoints:                                              │
│  - POST /balance       → Get USDC balance                │
│  - POST /positions     → Get open positions              │
│  - POST /open-position → Open trade                      │
│  - POST /close-position → Close trade (idempotent)       │
│  - POST /transfer      → Transfer USDC (profit share)    │
│  - POST /approve-agent → User approves agent             │
│  - POST /faucet        → Get testnet USDC                │
│  - GET  /market-info   → Get trading pairs               │
│  - GET  /health        → Health check                    │
│                                                           │
└─────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│          OSTIUM PYTHON SDK (ostium-python-sdk)           │
│          use_delegation=True for non-custodial           │
└─────────────────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│   OSTIUM SMART CONTRACTS (Arbitrum Sepolia/Mainnet)     │
│   - Trading:        0x2A9B...afe                         │
│   - TradingStorage: 0x0b9F...8b8                         │
│   - USDC:           0xe73B...548                         │
└─────────────────────────────────────────────────────────┘
```

---

## Monitoring

### Start Position Monitor

```bash
# In project root
npx ts-node workers/position-monitor-ostium.ts
```

Monitors:
- ✅ Position discovery (auto-tracks positions)
- ✅ Trailing stops (1% by default)
- ✅ Price updates every 30s
- ✅ Auto-close on trailing stop trigger

### Logs

Logs are written to:
- `logs/ostium-service.log` (Python service)
- Console output (position monitor)

---

## Troubleshooting

### Service Not Starting

```bash
# Check if port 5002 is in use
lsof -i :5002

# Kill process if needed
kill -9 <PID>

# Check Python installation
python3 --version  # Should be 3.8+

# Reinstall dependencies
pip install --upgrade ostium-python-sdk
```

### "Agent wallet not found"

Ensure the agent wallet is registered in the wallet pool:
```typescript
import { registerPrivateKey } from './lib/wallet-pool';

await registerPrivateKey(
  agentAddress,
  agentPrivateKey,
  userId
);
```

### "OSTIUM_PLATFORM_WALLET not configured"

Set the environment variable:
```bash
export OSTIUM_PLATFORM_WALLET=0xYourPlatformWallet
```

### Delegation Not Working

1. Check if user approved agent:
   ```bash
   # Call approve-agent endpoint first
   curl -X POST http://localhost:5002/approve-agent \
     -H "Content-Type: application/json" \
     -d '{
       "userPrivateKey": "0xUserKey",
       "agentAddress": "0xAgentAddress"
     }'
   ```

2. Verify `useDelegation=true` in open-position request

3. Check Ostium SDK version: `pip show ostium-python-sdk`

---

## Security Notes

- ⚠️ **Never commit private keys** to Git
- ⚠️ Store `OSTIUM_PLATFORM_WALLET` securely
- ⚠️ Use environment variables for all sensitive data
- ⚠️ Test on testnet before mainnet deployment
- ⚠️ Monitor gas costs on Arbitrum (~$0.01/tx)

---

## Next Steps

1. ✅ Set up environment variables
2. ✅ Install Python dependencies
3. ✅ Start Ostium service
4. ✅ Test on Arbitrum Sepolia testnet
5. ✅ Deploy position monitor
6. ✅ Create agent with OSTIUM venue
7. ✅ Test end-to-end trading flow
8. ✅ Monitor profit share collection
9. ✅ Deploy to production

---

## Support

For issues:
- Ostium SDK: https://github.com/0xOstium/ostium-python-sdk
- Ostium Docs: https://www.ostium.io/
- Arbitrum RPC: https://docs.arbitrum.io/

---

## Comparison: Hyperliquid vs. Ostium

| Feature | Hyperliquid | Ostium |
|---------|-------------|--------|
| **Network** | Hyperliquid L1 | Arbitrum L2 |
| **Gas Fees** | None (free) | ~$0.01/tx |
| **Delegation** | Native | Smart contract |
| **SDK** | Python | Python + Rust |
| **USDC Transfer** | Internal ledger | ERC20 transfer |
| **Testnet** | Yes | Yes (Arbitrum Sepolia) |
| **Setup** | Simple | Simple |

Both are non-custodial and support agent delegation! ✅

