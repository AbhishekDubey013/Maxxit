# Hyperliquid Testnet Setup Guide 🧪

This guide walks through setting up Hyperliquid on **testnet** for safe testing without real funds.

## Why Testnet?

- ✅ Test with fake funds (no real money at risk)
- ✅ Practice the complete flow
- ✅ Debug issues safely
- ✅ Perfect for development and demos

## Quick Setup

### 1. Configure Environment Variables

Add to your `.env`:

```bash
# Enable testnet mode
HYPERLIQUID_TESTNET=true

# Same as before
HYPERLIQUID_SERVICE_URL=http://localhost:5001
AGENT_WALLET_ENCRYPTION_KEY=<your-32-byte-hex-key>
```

### 2. Start Python Service in Testnet Mode

```bash
# Set testnet environment variable
export HYPERLIQUID_TESTNET=true

# Start service
python services/hyperliquid-service.py

# You should see:
# 🌐 Running on TESTNET
# 📡 Base URL: https://api.hyperliquid-testnet.xyz
```

Or use the start script:

```bash
HYPERLIQUID_TESTNET=true ./services/start-hyperliquid.sh
```

### 3. Get Testnet USDC

Hyperliquid testnet provides free test USDC:

**Option A: Testnet Faucet**
1. Go to https://app.hyperliquid-testnet.xyz
2. Connect your wallet
3. Click "Get Testnet USDC" (usually in top-right menu)
4. Request testnet funds (typically 1000-10000 USDC)

**Option B: Bridge from Arbitrum Sepolia**
If you have Arbitrum Sepolia testnet ETH and USDC:
1. Use the testnet bridge
2. Bridge USDC from Arbitrum Sepolia to Hyperliquid testnet

### 4. Test the Integration

```bash
# Test service health (should show "testnet")
curl http://localhost:5001/health

# Should return:
# {
#   "status": "ok",
#   "service": "hyperliquid",
#   "network": "testnet",
#   "baseUrl": "https://api.hyperliquid-testnet.xyz"
# }
```

Run the integration test:

```bash
npx tsx scripts/test-hyperliquid-integration.ts
```

### 5. Deploy Agent on Testnet

1. **Start your app** with testnet mode:
   ```bash
   HYPERLIQUID_TESTNET=true npm run dev
   ```

2. **Create agent** with HYPERLIQUID venue

3. **Run setup** from My Deployments page
   - Click "Enable Hyperliquid (One-Click)"
   - This uses Arbitrum Sepolia testnet addresses

4. **Get agent wallet address** from setup output

5. **Fund agent wallet** on Hyperliquid testnet:
   - Go to https://app.hyperliquid-testnet.xyz
   - Transfer test USDC to your agent wallet address

### 6. Test Trading

Your agent will now trade on testnet:
- ✅ Monitor Twitter for signals
- ✅ Execute trades with testnet USDC
- ✅ No real funds at risk
- ✅ Full production-like experience

## Testnet Configuration

### Network Details

**Hyperliquid Testnet**
- API: `https://api.hyperliquid-testnet.xyz`
- Explorer: https://app.hyperliquid-testnet.xyz
- Chain ID: Same as mainnet (Hyperliquid L1)

**Arbitrum Sepolia** (for bridging)
- Chain ID: 421614
- RPC: https://sepolia-rollup.arbitrum.io/rpc
- USDC Address: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
- Bridge Address: `0xAf8912a3245a9E7Fc1881fAD1a07cdbc89905266`

### Environment Variables Summary

```bash
# Testnet mode
HYPERLIQUID_TESTNET=true

# Service URL (same for both)
HYPERLIQUID_SERVICE_URL=http://localhost:5001

# Encryption key (same for both)
AGENT_WALLET_ENCRYPTION_KEY=<your-key>

# Optional: Use Arbitrum Sepolia for testing
USE_SEPOLIA=true
```

## Testing Checklist

- [ ] Python service starts in testnet mode
- [ ] Health endpoint shows "testnet"
- [ ] Agent wallet registered
- [ ] Agent wallet funded with test USDC
- [ ] Module enabled on Safe (Sepolia)
- [ ] First test trade executes
- [ ] Position shows up in database
- [ ] Position monitoring works
- [ ] Position closes successfully

## Common Testnet Operations

### Check Balance on Testnet

```bash
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "<your-agent-wallet-address>"}'
```

### Get Testnet Market Info

```bash
curl -X POST http://localhost:5001/market-info \
  -H "Content-Type: application/json" \
  -d '{"coin": "BTC"}'
```

### Check Testnet Positions

```bash
curl -X POST http://localhost:5001/positions \
  -H "Content-Type: application/json" \
  -d '{"address": "<your-agent-wallet-address>"}'
```

### Open Test Position

```bash
curl -X POST http://localhost:5001/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "<test-private-key>",
    "coin": "BTC",
    "isBuy": true,
    "size": 0.001,
    "slippage": 0.01
  }'
```

## Switching Between Testnet and Mainnet

### Switch to Testnet

```bash
# 1. Stop services
pkill -f hyperliquid-service

# 2. Set testnet mode
export HYPERLIQUID_TESTNET=true

# 3. Restart services
python services/hyperliquid-service.py &
npm run dev
```

### Switch to Mainnet

```bash
# 1. Stop services
pkill -f hyperliquid-service

# 2. Unset or set to false
export HYPERLIQUID_TESTNET=false
# OR
unset HYPERLIQUID_TESTNET

# 3. Restart services
python services/hyperliquid-service.py &
npm run dev
```

### Database Separation

**Important**: Testnet and mainnet deployments should be kept separate!

**Option 1: Separate Databases**
```bash
# Testnet
DATABASE_URL=postgresql://localhost/maxxit_testnet

# Mainnet
DATABASE_URL=postgresql://localhost/maxxit_mainnet
```

**Option 2: Use Venue Flag**
- Tag testnet agents differently
- Filter by agent metadata
- Use separate profit receiver addresses

## Testnet Best Practices

### 1. Label Your Testnet Agents
```typescript
// When creating agent
agent.name = "[TESTNET] My Trading Agent"
```

### 2. Use Separate Wallets
- Don't use mainnet Safe wallets for testnet
- Create new Safe on Arbitrum Sepolia for testing

### 3. Monitor Testnet Logs
```bash
tail -f logs/trade-executor.log | grep TESTNET
```

### 4. Test Complete Flow
1. ✅ Agent creation
2. ✅ Module setup
3. ✅ Agent wallet registration
4. ✅ USDC funding
5. ✅ Signal generation
6. ✅ Trade execution
7. ✅ Position monitoring
8. ✅ Position closing
9. ✅ Profit collection

### 5. Document Test Results
Keep track of:
- Test trades executed
- Gas costs on Sepolia
- Position P&L
- Any errors encountered

## Troubleshooting

### Service Shows Mainnet Instead of Testnet

```bash
# Check environment
echo $HYPERLIQUID_TESTNET

# Should output: true

# If not set:
export HYPERLIQUID_TESTNET=true

# Restart service
pkill -f hyperliquid-service
python services/hyperliquid-service.py
```

### No Testnet USDC

1. Go to https://app.hyperliquid-testnet.xyz
2. Connect wallet
3. Look for faucet button (usually in top-right menu)
4. Request test USDC
5. If faucet is unavailable, ask in Hyperliquid Discord

### Bridge Transaction Fails

Make sure you're using:
- Arbitrum Sepolia (Chain ID: 421614)
- Testnet USDC address
- Testnet bridge address

### Market Not Found

Some markets might not be available on testnet. Stick to major pairs:
- BTC, ETH, SOL
- These are almost always available

### Position Not Opening

Check:
```bash
# 1. Agent has balance
curl -X POST http://localhost:5001/balance \
  -H "Content-Type: application/json" \
  -d '{"address": "<agent-address>"}'

# 2. Market exists
curl -X POST http://localhost:5001/market-info \
  -H "Content-Type: application/json" \
  -d '{"coin": "BTC"}'

# 3. Service is in testnet mode
curl http://localhost:5001/health
```

## Testnet Limitations

### Known Differences from Mainnet

1. **Liquidity**: Testnet has lower liquidity
2. **Markets**: Fewer markets available
3. **Performance**: May be slower
4. **Resets**: Testnet state may be reset periodically
5. **Faucet Limits**: Limited testnet USDC per account

### What Works the Same

- ✅ Order types
- ✅ Position management
- ✅ Leverage (up to 50x)
- ✅ API endpoints
- ✅ Trading logic
- ✅ Position monitoring

## Production Migration

### Before Going to Mainnet

- [ ] All tests pass on testnet
- [ ] No errors in logs
- [ ] Positions open/close correctly
- [ ] P&L calculations accurate
- [ ] Trading limits enforced
- [ ] Profit receiver works
- [ ] Module security verified

### Migration Checklist

1. **Switch to Mainnet**
   ```bash
   unset HYPERLIQUID_TESTNET
   # or
   export HYPERLIQUID_TESTNET=false
   ```

2. **Use Mainnet Database**
   ```bash
   DATABASE_URL=postgresql://localhost/maxxit_mainnet
   ```

3. **Update Safe Wallets**
   - Use Arbitrum One (not Sepolia)
   - Deploy new agents on mainnet

4. **Start Small**
   - Test with $10-100 first
   - Monitor closely
   - Scale gradually

5. **Enable Monitoring**
   - Set up alerts
   - Monitor logs continuously
   - Track all positions

## Example: Complete Testnet Flow

```bash
# 1. Setup environment
export HYPERLIQUID_TESTNET=true
export HYPERLIQUID_SERVICE_URL=http://localhost:5001
export AGENT_WALLET_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Start Python service
python services/hyperliquid-service.py &

# 3. Start app
npm run dev

# 4. In browser:
# - Create agent with HYPERLIQUID venue
# - Deploy to Arbitrum Sepolia
# - Run one-click setup
# - Note agent wallet address

# 5. Fund agent wallet
# - Go to https://app.hyperliquid-testnet.xyz
# - Get testnet USDC from faucet
# - Transfer to agent wallet

# 6. Test trade manually
curl -X POST http://localhost:5001/open-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "<agent-key>",
    "coin": "BTC",
    "isBuy": true,
    "size": 0.001,
    "slippage": 0.01
  }'

# 7. Check position
curl -X POST http://localhost:5001/positions \
  -H "Content-Type: application/json" \
  -d '{"address": "<agent-address>"}'

# 8. Close position
curl -X POST http://localhost:5001/close-position \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "<agent-key>",
    "coin": "BTC",
    "size": 0.001
  }'

# Success! 🎉
```

## Resources

- [Hyperliquid Testnet App](https://app.hyperliquid-testnet.xyz)
- [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- [Hyperliquid Discord](https://discord.gg/hyperliquid) - Ask for testnet help

## Support

If you encounter issues:
1. Check Python service logs
2. Verify testnet mode is enabled
3. Check agent wallet has testnet USDC
4. Review `logs/trade-executor.log`
5. Ask in Hyperliquid Discord #testnet channel

Happy testing! 🚀

