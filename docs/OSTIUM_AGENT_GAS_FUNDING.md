# Ostium Agent Gas Funding Guide

## Problem

Ostium agent wallets need **ETH (native token) for gas** even though positions use USDC as collateral.

### Common Error
```
insufficient funds for gas * price + value: 
address 0xc4e735A35fc8770F36D4583C94a938A06B0815A9 
have 13216400000000 want 18557200000000
```

This means the agent wallet doesn't have enough ETH to pay for transaction gas fees.

## Why This Happens

- **Positions use USDC**: Collateral is in USDC (ERC-20 token)
- **Gas uses ETH**: Every blockchain transaction requires native token (ETH on Arbitrum)
- **Agent wallets need both**: USDC for trading + ETH for gas

## Check Agent Balances

Run this script to check all agent wallet balances:

```bash
npx tsx scripts/check-ostium-agent-gas.ts
```

Output shows:
- ✅ **Good**: Balance > 0.005 ETH
- ⚠️  **Low**: 0.001 - 0.005 ETH (should top up soon)
- 🔴 **CRITICAL**: Balance < 0.001 ETH (cannot execute transactions!)

## How to Fund Agent Wallets

### Testnet (Arbitrum Sepolia)

#### Option 1: Faucet
1. Go to https://faucet.quicknode.com/arbitrum/sepolia
2. Enter agent wallet address
3. Request 0.01 ETH (enough for ~500 transactions)
4. Repeat for each agent that needs funding

#### Option 2: Manual Transfer
If you have testnet ETH in your wallet:

```bash
# Check which agents need funding
npx tsx scripts/check-ostium-agent-gas.ts

# Send ETH manually using MetaMask or similar
# Recommended: 0.005 ETH per agent
```

### Mainnet (Arbitrum One)

⚠️ **Use real ETH - costs real money!**

Recommended amount per agent: **0.01 ETH** (~$30 at $3000/ETH)

This is enough for approximately:
- Opening ~100 positions
- Closing ~100 positions
- Total: ~200 transactions

## Monitoring

### Set Up Alerts

Add monitoring to alert when agent balances are low:

```typescript
// In position monitor or separate service
const MIN_BALANCE = ethers.utils.parseEther('0.001');

for (const agent of agents) {
  const balance = await provider.getBalance(agent.address);
  if (balance.lt(MIN_BALANCE)) {
    // Send alert (email, Telegram, etc.)
    console.error(`🚨 Agent ${agent.address} low on gas!`);
  }
}
```

### Automated Top-Up

For production, consider implementing automated top-up:

```typescript
// Pseudo-code for auto top-up
if (agentBalance < 0.001 ETH) {
  // Top up from master wallet
  await masterWallet.sendTransaction({
    to: agentAddress,
    value: ethers.utils.parseEther('0.01')
  });
}
```

## Gas Cost Estimates

### Ostium Transactions (Arbitrum)

Typical gas costs:
- **Open Position**: ~450,000 gas × 0.02 Gwei = ~0.00001 ETH ($0.03)
- **Close Position**: ~440,000 gas × 0.02 Gwei = ~0.00001 ETH ($0.03)

With 0.01 ETH per agent:
- Can execute ~1,000 transactions
- Plenty for typical usage

## Troubleshooting

### Error: "insufficient funds for gas"

**Solution**: Fund the agent wallet with more ETH

1. Check balance:
   ```bash
   npx tsx scripts/check-ostium-agent-gas.ts
   ```

2. Identify the agent address from the error message

3. Send ETH (testnet: use faucet, mainnet: send from your wallet)

### Error: "gas required exceeds allowance"

**Possible causes**:
- Position already closed
- Invalid parameters
- Not related to gas funding

### Multiple Agents Running Out

If multiple agents are running out of gas frequently:

1. **Increase initial funding**: Give each agent 0.02 ETH instead of 0.01 ETH
2. **Implement auto-top-up**: Automatically refill when below threshold
3. **Set up monitoring**: Alert when balance < 0.005 ETH

## Best Practices

### Initial Setup
- Fund each agent with **0.01 ETH** (testnet or mainnet)
- This provides buffer for ~1,000 transactions

### Ongoing Monitoring
- Check balances **weekly** (or daily for high-frequency trading)
- Set alerts for balances < 0.005 ETH
- Top up before reaching critical levels

### Production
- Maintain **master funding wallet** with ETH reserve
- Implement **automated top-up** when agent balance < 0.001 ETH
- Monitor gas prices and adjust funding amounts accordingly

## Quick Reference

| Network | Token | Recommended Per Agent | Lasts For |
|---------|-------|----------------------|-----------|
| Arbitrum Sepolia (Testnet) | Testnet ETH | 0.01 ETH | ~1,000 txs |
| Arbitrum One (Mainnet) | Real ETH | 0.01 ETH (~$30) | ~1,000 txs |

## Scripts

### Check Balances
```bash
npx tsx scripts/check-ostium-agent-gas.ts
```

### Fund All Agents (Future)
```bash
# To be implemented
npx tsx scripts/fund-ostium-agents.ts
```

## Related Issues

- **USDC Balance**: Separate from gas - used for trading collateral
- **Approval Status**: Agent must be approved on Ostium to trade
- **Private Key**: Agent needs encrypted private key in database

## Status

✅ **Detection Script Ready**: `check-ostium-agent-gas.ts`  
⏳ **Auto-funding Script**: To be implemented  
⏳ **Monitoring Alerts**: To be implemented

