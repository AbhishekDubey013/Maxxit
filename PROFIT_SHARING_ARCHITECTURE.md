# 💰 Profit Sharing Architecture

## Overview

The MaxxitTradingModule now supports **dynamic profit sharing** where each agent creator receives their own 20% profit share directly. This is more flexible and fair than a fixed platform profit receiver.

## How It Works

### 1. Module Deployment (One Time)
```solidity
constructor(
    address _platformFeeReceiver,  // Executor wallet (gets 0.2 USDC per trade)
    address _usdc,                 // USDC token address
    address _moduleOwner           // Platform admin
)
```

**Key Point**: `platformProfitReceiver` is NO LONGER in the constructor!

### 2. Trade Execution (Per Trade)
```solidity
function executeTrade(
    address safe,
    address fromToken,
    address toToken,
    uint256 amountIn,
    address dexRouter,
    bytes calldata swapData,
    uint256 minAmountOut,
    address profitReceiver  // 👈 Agent creator's address!
)
```

**Key Point**: `profitReceiver` is now passed per-trade, allowing each agent to have its own profit receiver!

## Fee Structure

### Fixed Trading Fee
- **Amount**: 0.2 USDC per trade
- **Recipient**: `platformFeeReceiver` (Executor wallet)
- **Purpose**: Covers gas costs for gasless trading
- **When**: Charged before every trade

### Profit Share
- **Amount**: 20% of realized profits
- **Recipient**: `profitReceiver` (Agent creator's address - passed per trade)
- **Purpose**: Reward for agent creators/strategists
- **When**: Only when position is closed with profit
- **Protection**: Only profits are shared, NEVER principal

## Agent Creation Flow

### When User Creates Agent

```typescript
// Frontend: User fills out agent creation form
{
  name: "My Trading Agent",
  strategy: "Momentum",
  ctAccount: "@tradingSignals",
  venue: "SPOT",
  profitReceiverAddress: "0xUSER_ADDRESS" // 👈 User's address for profit
}
```

### Database: Agent Record
```typescript
{
  id: "agent-123",
  userId: "user-456",
  name: "My Trading Agent",
  strategy: "Momentum",
  ctAccount: "@tradingSignals",
  venue: "SPOT",
  profitReceiverAddress: "0xUSER_ADDRESS", // 👈 Stored here
  safeWalletAddress: "0xSAFE_ADDRESS",
  // ... other fields
}
```

### Backend: Execute Trade
```typescript
// When executing trade, backend looks up agent
const agent = await db.agent.findUnique({ where: { id: agentId } });

// Call module with agent creator's profit address
await moduleContract.executeTrade(
  agent.safeWalletAddress,
  fromToken,
  toToken,
  amountIn,
  dexRouter,
  swapData,
  minAmountOut,
  agent.profitReceiverAddress // 👈 Each agent has their own!
);
```

## Money Flow Example

### Scenario
- **User Alice** creates Agent A with profit receiver: `0xALICE`
- **User Bob** creates Agent B with profit receiver: `0xBOB`
- Both agents use the same MaxxitTradingModule

### Trade 1: Alice's Agent Makes $100 Profit
1. **Trade Fee**: 0.2 USDC → `platformFeeReceiver` (Executor)
2. **Profit Share**: $20 USDC (20% of $100) → `0xALICE`
3. **Remaining**: $80 USDC stays in Alice's Safe

### Trade 2: Bob's Agent Makes $50 Profit
1. **Trade Fee**: 0.2 USDC → `platformFeeReceiver` (Executor)
2. **Profit Share**: $10 USDC (20% of $50) → `0xBOB`
3. **Remaining**: $40 USDC stays in Bob's Safe

### Trade 3: Alice's Agent Loses Money
1. **Trade Fee**: 0.2 USDC → `platformFeeReceiver` (Executor)
2. **Profit Share**: $0 (no profit = no share)
3. **Principal Protection**: Loss absorbed by Alice's Safe, no additional fees

## Benefits

### ✅ For Platform
- Collects fixed fee to cover gas costs
- Gasless trading UX for users
- Scalable: One module serves all agents

### ✅ For Agent Creators
- Direct profit to their wallet
- Only pay when they make profit
- Principal is protected
- Can create multiple agents

### ✅ For Users (Safe Wallet Owners)
- Non-custodial: Full control of funds
- Fair fees: Only pay 0.2 USDC + 20% profit
- Can disable module anytime
- Transparent on-chain

## Database Schema Updates Needed

### Agent Table
```prisma
model Agent {
  id                    String   @id @default(cuid())
  userId                String
  name                  String
  strategy              String
  venue                 String
  profitReceiverAddress String   // 👈 Add this field!
  safeWalletAddress     String?
  // ... existing fields
}
```

## Implementation Checklist

- [x] Update smart contract to accept `profitReceiver` parameter
- [x] Update deployment script
- [ ] Update `Agent` table schema to include `profitReceiverAddress`
- [ ] Update agent creation API to accept profit receiver
- [ ] Update agent creation UI to capture profit receiver
- [ ] Update trade executor backend to pass `profitReceiverAddress` to module
- [ ] Update `lib/safe-module-service.ts` to include profit receiver in trade calls
- [ ] Add validation for profit receiver address
- [ ] Deploy module to Sepolia testnet
- [ ] Test with multiple agents having different profit receivers

## Security Considerations

### ✅ Safe
- `profitReceiver` validation (non-zero address)
- Only whitelisted DEXes
- Only whitelisted tokens
- Only authorized executors can call

### ⚠️ Important
- Validate `profitReceiverAddress` is a valid Ethereum address
- Consider allowing users to update their profit receiver address
- Backend must correctly map agent ID → profit receiver address
- Test profit calculation logic thoroughly

## Next Steps

1. **Update Database Schema**: Add `profitReceiverAddress` to Agent model
2. **Update Backend Services**: 
   - `lib/safe-module-service.ts`
   - `lib/trade-executor.ts`
   - `pages/api/agents/index.ts` (create agent)
3. **Update Frontend**:
   - Agent creation form
   - Deployment flow
4. **Deploy Module**: Run deployment script to Sepolia
5. **Test**: Create agents with different profit receivers and verify profit distribution

---

**Ready to deploy?** ✨ This architecture is more flexible, fair, and scalable!
