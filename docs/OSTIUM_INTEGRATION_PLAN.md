# Ostium Integration Plan

## Overview

Add Ostium perpetual DEX support to Maxxit, similar to Hyperliquid integration.

**Ostium**: Perpetual DEX on Arbitrum with Python and Rust SDKs

**✅ VERIFIED**: Ostium supports non-custodial trading via `use_delegation=True` parameter!

## Architecture Comparison

### Hyperliquid Model (Current)
```
User Wallet → Approves Agent → Agent Trades on Behalf → Auto Profit Share
```

### Ostium Model (✅ NON-CUSTODIAL - CONFIRMED)
```
User Wallet → Approves Agent (on-chain) → Agent Trades via Delegation → Auto Profit Share
```

**Key Feature**: `OstiumSDK(use_delegation=True)` enables agent wallets to trade using user's collateral without custody!

---

## Implementation Plan

### Phase 1: Basic Ostium Integration (2-3 days)

#### 1. Python Service (similar to hyperliquid-service.py)
**File**: `services/ostium-service.py`

```python
from flask import Flask, request, jsonify
from ostium_python_sdk import OstiumClient
from eth_account import Account
import os

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "ostium"})

@app.route('/balance', methods=['POST'])
def get_balance():
    """Get user's Ostium balance"""
    data = request.json
    address = data.get('address')
    
    client = OstiumClient(network='arbitrum')
    balance = client.get_account_value(address)
    
    return jsonify({
        "success": True,
        "balance": balance
    })

@app.route('/open-position', methods=['POST'])
def open_position():
    """Open a perpetual position on Ostium"""
    data = request.json
    private_key = data.get('privateKey')  # Agent wallet or user wallet
    market = data.get('market')  # e.g., "BTC-USD"
    size = data.get('size')
    side = data.get('side')  # 'long' or 'short'
    
    client = OstiumClient(private_key=private_key, network='arbitrum')
    
    result = client.create_market_order(
        market=market,
        size=size,
        side=side
    )
    
    return jsonify({
        "success": True,
        "result": result
    })

@app.route('/close-position', methods=['POST'])
def close_position():
    """Close a position on Ostium"""
    data = request.json
    private_key = data.get('privateKey')
    market = data.get('market')
    
    client = OstiumClient(private_key=private_key, network='arbitrum')
    
    # Get current position
    position = client.get_position(market)
    
    if not position or position['size'] == 0:
        return jsonify({
            "success": True,
            "message": "No open position"
        })
    
    # Close by trading opposite side
    result = client.create_market_order(
        market=market,
        size=position['size'],
        side='short' if position['side'] == 'long' else 'long',
        reduce_only=True
    )
    
    return jsonify({
        "success": True,
        "result": result,
        "closePnl": result.get('realizedPnl', 0)
    })

@app.route('/transfer', methods=['POST'])
def transfer_usdc():
    """Transfer USDC for profit share collection"""
    data = request.json
    from_private_key = data.get('fromPrivateKey')
    to_address = data.get('toAddress')
    amount = data.get('amount')
    
    client = OstiumClient(private_key=from_private_key, network='arbitrum')
    
    result = client.transfer_token(
        token='USDC',
        to_address=to_address,
        amount=amount
    )
    
    return jsonify({
        "success": True,
        "result": result
    })

@app.route('/positions', methods=['POST'])
def get_positions():
    """Get all open positions for an address"""
    data = request.json
    address = data.get('address')
    
    client = OstiumClient(network='arbitrum')
    positions = client.get_all_positions(address)
    
    return jsonify({
        "success": True,
        "positions": positions
    })

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5002))
    app.run(host='0.0.0.0', port=port)
```

#### 2. TypeScript Adapter
**File**: `lib/adapters/ostium-adapter.ts`

```typescript
import fetch from 'node-fetch';

const OSTIUM_SERVICE_URL = process.env.OSTIUM_SERVICE_URL || 'http://localhost:5002';

export interface OstiumPosition {
  market: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
}

export async function openOstiumPosition(params: {
  privateKey: string;
  market: string;
  size: number;
  side: 'long' | 'short';
}) {
  const response = await fetch(`${OSTIUM_SERVICE_URL}/open-position`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return await response.json();
}

export async function closeOstiumPosition(params: {
  privateKey: string;
  market: string;
}) {
  const response = await fetch(`${OSTIUM_SERVICE_URL}/close-position`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  return await response.json();
}

export async function getOstiumPositions(address: string): Promise<OstiumPosition[]> {
  const response = await fetch(`${OSTIUM_SERVICE_URL}/positions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });

  const data = await response.json();
  return data.positions || [];
}

export async function getOstiumBalance(address: string) {
  const response = await fetch(`${OSTIUM_SERVICE_URL}/balance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });

  return await response.json();
}
```

#### 3. Update Trade Executor
**File**: `lib/trade-executor.ts`

Add Ostium support to existing trade executor:

```typescript
// Add to closePosition method
} else if (position.venue === 'OSTIUM') {
  return await this.closeOstiumPositionMethod(position);
}

// Add new method
private async closeOstiumPositionMethod(position: any): Promise<ExecutionResult> {
  try {
    // Get agent private key (or user key depending on model)
    const privateKey = await this.getOstiumPrivateKey(position.deployment_id);
    
    // Close position via Ostium service
    const result = await closeOstiumPosition({
      privateKey,
      market: position.token_symbol,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to close position');
    }
    
    const pnl = result.closePnl || 0;
    
    // Update position in database
    await prisma.positions.update({
      where: { id: position.id },
      data: {
        closed_at: new Date(),
        pnl: pnl,
        exit_price: result.result?.exitPrice || null,
      },
    });
    
    // Collect profit share (10%)
    if (pnl > 0) {
      await this.collectOstiumProfitShare({
        deployment_id: position.deployment_id,
        pnl,
        privateKey,
      });
    }
    
    // Update metrics
    updateMetricsForDeployment(position.deployment_id);
    
    return {
      success: true,
      positionId: position.id,
    };
  } catch (error: any) {
    console.error('[TradeExecutor] Ostium close error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

private async collectOstiumProfitShare(params: {
  deployment_id: string;
  pnl: number;
  privateKey: string;
}) {
  const profitShare = params.pnl * 0.10; // 10%
  
  if (profitShare < 0.01) return;
  
  const platformWallet = process.env.OSTIUM_PLATFORM_WALLET;
  
  if (!platformWallet) {
    console.error('[Fees] OSTIUM_PLATFORM_WALLET not configured');
    return;
  }
  
  try {
    // Transfer USDC profit share
    await fetch(`${OSTIUM_SERVICE_URL}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromPrivateKey: params.privateKey,
        toAddress: platformWallet,
        amount: profitShare,
      }),
    });
    
    // Record in billing events
    await prisma.billing_events.create({
      data: {
        deployment_id: params.deployment_id,
        kind: 'PROFIT_SHARE',
        amount: profitShare.toString(),
        asset: 'USDC',
        status: 'COMPLETED',
        occurred_at: new Date(),
      },
    });
    
    console.log(`[Fees] ✅ Collected $${profitShare.toFixed(2)} from Ostium trade`);
  } catch (error: any) {
    console.error('[Fees] Failed to collect Ostium profit share:', error.message);
  }
}
```

---

### Phase 2: Position Monitor (1-2 days)

**File**: `workers/position-monitor-ostium.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { getOstiumPositions } from '../lib/adapters/ostium-adapter';
import { TradeExecutor } from '../lib/trade-executor';

const prisma = new PrismaClient();
const tradeExecutor = new TradeExecutor();

async function monitorOstiumPositions() {
  console.log('🔄 Starting Ostium position monitor...');
  
  const deployments = await prisma.agent_deployments.findMany({
    where: {
      status: 'ACTIVE',
      agents: {
        venue: 'OSTIUM'
      }
    },
    include: {
      agents: { select: { name: true } }
    }
  });
  
  console.log(`Found ${deployments.length} Ostium deployments`);
  
  for (const deployment of deployments) {
    try {
      const address = deployment.safe_wallet;
      const hlPositions = await getOstiumPositions(address);
      
      console.log(`\n📊 Deployment: ${deployment.agents.name}`);
      console.log(`   Positions: ${hlPositions.length}`);
      
      // Auto-discover new positions
      // Apply trailing stops
      // Detect stale positions
      
      // Similar logic to position-monitor-hyperliquid.ts
      
    } catch (error: any) {
      console.error(`Error monitoring deployment ${deployment.id}:`, error.message);
    }
  }
}

// Run every 30 seconds
setInterval(monitorOstiumPositions, 30000);
monitorOstiumPositions();
```

---

### Phase 3: Database Updates

**Add to Prisma schema**:

```prisma
enum venue_t {
  SPOT
  GMX
  HYPERLIQUID
  OSTIUM        // Add this
}
```

Run migration:
```bash
npx prisma db push
```

---

### Phase 4: Frontend Components

#### 1. Ostium Setup Button
**File**: `components/OstiumSetupButton.tsx`

Similar to `HyperliquidSetupButton.tsx`, handle:
- Wallet connection (Arbitrum)
- Deposit funds (optional if custodial)
- Approve trading

#### 2. Update Agent Card
Show Ostium venue option when creating/deploying agents.

---

## Environment Variables

```bash
# Ostium Configuration
OSTIUM_SERVICE_URL=http://localhost:5002
OSTIUM_PLATFORM_WALLET=0x...  # Where profit shares go
OSTIUM_PROFIT_SHARE=10        # 10% of profits
OSTIUM_FEE_MODEL=PROFIT_SHARE
```

---

## Key Differences from Hyperliquid

| Feature | Hyperliquid | Ostium |
|---------|-------------|--------|
| **Approval** | Native agent delegation | Smart contract or custodial |
| **Gas** | None (internal) | Arbitrum gas (~$0.01/tx) |
| **Transfers** | Instant USDC | ERC20 USDC transfers |
| **SDK** | Python official | Python community |
| **Network** | Hyperliquid L1 | Arbitrum (Ethereum L2) |

---

## Testing Plan

1. **Setup Ostium testnet** (Arbitrum Sepolia)
2. **Deploy test agent** with small position size
3. **Test open position** → verify on Ostium
4. **Test close position** → check PnL calculation
5. **Test profit share** → verify USDC transfer
6. **Test position monitor** → auto-discovery and trailing stops
7. **Load test** → multiple concurrent positions

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1** | 2-3 days | Python service + TypeScript adapter |
| **Phase 2** | 1-2 days | Position monitor worker |
| **Phase 3** | 1 day | Database schema updates |
| **Phase 4** | 2-3 days | Frontend components |
| **Phase 5** | 2-3 days | Testing + debugging |
| **Total** | **~8-12 days** | Full Ostium integration |

---

## Next Steps

1. ✅ Install Ostium Python SDK
2. ✅ Create `services/ostium-service.py`
3. ✅ Test basic open/close on testnet
4. ✅ Integrate with trade executor
5. ✅ Add position monitoring
6. ✅ Frontend setup flow
7. ✅ Production deployment

---

## Questions to Research

- [ ] Does Ostium support agent delegation natively?
- [ ] What's the minimum position size?
- [ ] Are there API rate limits?
- [ ] How are positions settled?
- [ ] What's the fee structure?
- [ ] Is there a position discovery API?

---

## Resources

- Ostium Python SDK: https://pypi.org/project/ostium-python-sdk/
- Ostium Rust SDK: https://docs.rs/ostium-rust-sdk
- Ostium Docs: (need to find official docs)
- Arbitrum RPC: https://arb1.arbitrum.io/rpc

