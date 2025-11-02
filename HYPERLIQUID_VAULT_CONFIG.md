# Hyperliquid Vault Configuration

## What are Hyperliquid Vaults?

Hyperliquid Vaults are managed trading strategies where users can deposit USDC and have it traded by the vault's strategy. Users earn a share of the profits (minus vault fees).

### Benefits:
- ✅ Automated strategy execution
- ✅ Professional management
- ✅ Transparent on-chain performance
- ✅ Easy deposit/withdraw
- ✅ Non-custodial (you keep control)

## Testnet Vault Configuration

### Default Test Vaults

Hyperliquid testnet typically has several test vaults available. You can find them at:
- **Testnet App**: https://app.hyperliquid-testnet.xyz/vaults

### Example Test Vault Addresses

```typescript
// These are example addresses - check testnet app for actual vaults
const TESTNET_VAULTS = {
  // Example test vault (check actual addresses on testnet)
  TEST_VAULT_1: '0x...', // Replace with actual testnet vault address
  TEST_VAULT_2: '0x...', // Replace with actual testnet vault address
};
```

## Using Vaults in Your Agent

### Step 1: Configure Vault Address

Add to your `.env`:

```bash
# Testnet vault address
HYPERLIQUID_VAULT_ADDRESS=0xYourTestnetVaultAddress

# Or configure per-agent in the database
```

### Step 2: Deposit to Vault

#### Via API:

```bash
curl -X POST http://localhost:5001/vault/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "0x...",
    "vaultAddress": "0x...",
    "amount": 100
  }'
```

#### Via TypeScript:

```typescript
const response = await fetch('http://localhost:5001/vault/deposit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentPrivateKey: process.env.AGENT_PRIVATE_KEY,
    vaultAddress: '0x...',
    amount: 100, // USDC
  }),
});
```

### Step 3: Check Vault Balance

```bash
curl -X POST http://localhost:5001/vault/balance \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xYourAgentAddress",
    "vaultAddress": "0xVaultAddress"
  }'
```

### Step 4: Withdraw from Vault

```bash
curl -X POST http://localhost:5001/vault/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "0x...",
    "vaultAddress": "0x...",
    "amount": 50
  }'
```

### Step 5: Get Vault Info

```bash
curl -X POST http://localhost:5001/vault/info \
  -H "Content-Type: application/json" \
  -d '{
    "vaultAddress": "0x..."
  }'
```

## Agent Configuration Schema

### Database Schema Addition

Add vault configuration to your agent deployments:

```sql
-- Add vault configuration to agent_deployments
ALTER TABLE agent_deployments 
ADD COLUMN vault_address VARCHAR(42),
ADD COLUMN vault_strategy VARCHAR(50),
ADD COLUMN vault_deposit_amount DECIMAL(20, 8);

-- Or store in agents metadata JSON
-- agents.metadata can include:
{
  "hyperliquid_vault_address": "0x...",
  "vault_auto_compound": true,
  "vault_min_balance": 100,
  "vault_deposit_percentage": 50
}
```

### Configuration Options

```typescript
interface VaultConfig {
  // Vault address on Hyperliquid
  vaultAddress: string;
  
  // Auto-deposit strategy
  autoDeposit?: boolean;
  
  // What percentage of balance to keep in vault vs direct trading
  vaultAllocationPercent?: number; // e.g., 50 = 50% in vault, 50% direct
  
  // Minimum balance to maintain outside vault (for gas/trading)
  minDirectBalance?: number;
  
  // Auto-compound vault earnings
  autoCompound?: boolean;
  
  // Rebalance frequency (hours)
  rebalanceFrequency?: number;
}
```

## Finding Testnet Vaults

### Method 1: Hyperliquid Testnet App

1. Go to https://app.hyperliquid-testnet.xyz/vaults
2. Browse available test vaults
3. Click on a vault to see details
4. Copy the vault address from URL or vault details

### Method 2: Via API

```bash
# Get all vaults
curl -X POST https://api.hyperliquid-testnet.xyz/info \
  -H "Content-Type: application/json" \
  -d '{"type": "vaultDetails"}'
```

### Method 3: Test Script

```bash
npx tsx scripts/list-testnet-vaults.ts
```

## Vault Trading Strategy Options

### Option 1: Vault Only (Passive)
User deposits 100% of funds into vault, lets vault strategy manage everything.

```typescript
{
  vaultAllocationPercent: 100,
  autoDeposit: true,
  autoCompound: true
}
```

### Option 2: Hybrid (Active + Passive)
Split funds between vault (passive) and direct trading (active).

```typescript
{
  vaultAllocationPercent: 50, // 50% in vault
  autoDeposit: true,
  minDirectBalance: 100, // Keep at least 100 USDC for direct trading
}
```

### Option 3: Direct Trading Only
No vault, all direct trading (current implementation).

```typescript
{
  vaultAllocationPercent: 0,
  // Agent trades directly
}
```

## Example: Agent with Vault

```typescript
// Agent configuration
const agentConfig = {
  name: "BTC Trader with Vault",
  venue: "HYPERLIQUID",
  vaultConfig: {
    vaultAddress: "0xTestVaultAddress",
    vaultAllocationPercent: 60, // 60% in vault
    minDirectBalance: 200, // Keep 200 USDC for direct trades
    autoCompound: true,
    rebalanceFrequency: 24, // Rebalance daily
  }
};

// On deployment:
// 1. User deposits 1000 USDC to agent wallet
// 2. Agent automatically deposits 600 USDC to vault (60%)
// 3. Agent keeps 400 USDC for direct trading (40%)
// 4. Vault generates passive returns
// 5. Agent executes active trades with remaining 400 USDC
// 6. Daily rebalancing maintains 60/40 split
```

## Vault Performance Tracking

```typescript
interface VaultPerformance {
  vaultAddress: string;
  depositedAmount: number;
  currentValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  vaultAPR: number;
  directTradingAPR: number;
  combinedAPR: number;
}
```

## Security Considerations

### Vault Risks
- ⚠️ Vault strategy risk (depends on vault manager)
- ⚠️ Vault fees (typically 10-20% performance fee)
- ⚠️ Withdrawal delays (some vaults have cooldown periods)
- ⚠️ Slippage on deposits/withdrawals

### Best Practices
- ✅ Start with small test amounts
- ✅ Monitor vault performance regularly
- ✅ Diversify across multiple vaults
- ✅ Keep some funds in direct trading
- ✅ Test withdrawals before depositing large amounts

## API Endpoints Summary

### Vault Deposit
```
POST /vault/deposit
{
  "agentPrivateKey": "0x...",
  "vaultAddress": "0x...",
  "amount": 100
}
```

### Vault Withdraw
```
POST /vault/withdraw
{
  "agentPrivateKey": "0x...",
  "vaultAddress": "0x...",
  "amount": 50
}
```

### Vault Balance
```
POST /vault/balance
{
  "address": "0x...",
  "vaultAddress": "0x..."
}
```

### Vault Info
```
POST /vault/info
{
  "vaultAddress": "0x..."
}
```

## Testing Vault Integration

```bash
# 1. Find a test vault
npx tsx scripts/list-testnet-vaults.ts

# 2. Deposit to vault
npx tsx scripts/test-vault-deposit.ts <agent-key> <vault-address> 100

# 3. Check balance
npx tsx scripts/test-vault-balance.ts <agent-address> <vault-address>

# 4. Withdraw
npx tsx scripts/test-vault-withdraw.ts <agent-key> <vault-address> 50
```

## Example Workflow

```bash
# 1. Generate test wallet
node -e "const {Wallet} = require('ethers'); const w = Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"

# 2. Get testnet USDC
# Go to https://app.hyperliquid-testnet.xyz and use faucet

# 3. Find test vault
curl -X POST http://localhost:5001/vault/info \
  -H "Content-Type: application/json" \
  -d '{"vaultAddress": "0xTestVaultAddress"}'

# 4. Deposit 100 USDC
curl -X POST http://localhost:5001/vault/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "agentPrivateKey": "0xYourPrivateKey",
    "vaultAddress": "0xTestVaultAddress",
    "amount": 100
  }'

# 5. Check vault balance
curl -X POST http://localhost:5001/vault/balance \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xYourAddress",
    "vaultAddress": "0xTestVaultAddress"
  }'
```

## Mainnet Vaults

When ready for mainnet:

1. **Browse vaults**: https://app.hyperliquid.xyz/vaults
2. **Check vault stats**: APR, TVL, strategy, manager reputation
3. **Start small**: Test with small amounts first
4. **Monitor performance**: Track returns regularly
5. **Diversify**: Don't put all funds in one vault

## Resources

- **Hyperliquid Vaults Docs**: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/vaults
- **Testnet Vaults**: https://app.hyperliquid-testnet.xyz/vaults
- **Mainnet Vaults**: https://app.hyperliquid.xyz/vaults
- **Discord**: https://discord.gg/hyperliquid (#vaults channel)

## Support

For vault-related issues:
1. Check vault is active on testnet app
2. Verify vault address is correct
3. Ensure sufficient balance for deposit
4. Check for vault cooldown periods
5. Ask in Hyperliquid Discord #vaults channel

