# Token Registry & Venue Status - Complete Setup ✅

**Date:** October 5, 2025  
**Status:** ✅ COMPLETE

---

## Overview

Successfully populated the token registry and venue status for trading across:
- **SPOT:** Arbitrum & Base (20 tokens)
- **GMX:** Arbitrum Perpetuals (15 tokens)  
- **Hyperliquid:** Perpetuals (27 tokens)

---

## Database Setup

### Token Registry: 27 Tokens
- **Arbitrum:** 18 tokens with verified contract addresses
- **Base:** 9 tokens with verified contract addresses

### Venue Status: 61 Entries
- Tracks which tokens are available on which venues
- Enables pre-trade validation

---

## Token Registry (Arbitrum)

| Symbol | Contract Address | Description |
|--------|------------------|-------------|
| WBTC | `0x2f2a...5B0f` | Wrapped Bitcoin |
| WETH | `0x82aF...Bab1` | Wrapped Ethereum |
| USDC | `0xaf88...5831` | USD Coin (Native) |
| USDT | `0xFd08...Cbb9` | Tether USD |
| ARB | `0x912C...6548` | Arbitrum Token |
| GMX | `0xfc5A...d0a` | GMX Token |
| LINK | `0xf97f...458539FB4` | Chainlink |
| UNI | `0xFa7F...f1F7f0` | Uniswap |
| AAVE | `0xba5D...67196` | Aave |
| SOL | `0xb74D...617124` | Bridged Solana |
| AVAX | `0x5656...23e514` | Bridged Avalanche |
| OP | `0x6f62...566746` | Bridged Optimism |
| MATIC | `0x7c9f...1AAD2D43` | Polygon |
| DOGE | `0xC4da...883d8` | Dogecoin |
| PEPE | `0x25d8...FaEbB00` | Pepe |
| LDO | `0x13Ad...85EfA60` | Lido DAO |
| CRV | `0x11cD...A034978` | Curve DAO |
| MKR | `0x2e9a...8F2879` | Maker |

---

## Token Registry (Base)

| Symbol | Contract Address | Description |
|--------|------------------|-------------|
| cbBTC | `0x0555...d2B9c` | Coinbase Wrapped BTC |
| WETH | `0x4200...00006` | Wrapped Ethereum |
| USDC | `0x8335...02913` | USD Coin (Native) |
| USDT | `0xfde4...699bb2` | Tether USD |
| OP | `0x4200...00042` | Optimism (Native) |
| LINK | `0x88Fb...C6e196` | Chainlink |
| UNI | `0xc3De...114a3C83` | Uniswap |
| AERO | `0x9401...FD98631` | Aerodrome Finance |
| PEPE | `0x6982...5933` | Pepe |

---

## Venue Availability

### SPOT Trading (20 tokens)
**Chains:** Arbitrum & Base  
**Type:** Swap USDC → Token

Tokens: BTC, ETH, USDC, USDT, ARB, GMX, LINK, UNI, AAVE, SOL, AVAX, OP, POL, DOGE, PEPE, LDO, CRV, MKR, AERO, cbBTC

**Trading Flow:**
```
1. User deposits USDC to Safe wallet (Arbitrum or Base)
2. Agent signal triggers
3. Swap USDC → Token on DEX (Uniswap, Camelot, Aerodrome)
4. Hold token position
5. Swap back Token → USDC when closing
```

---

### GMX Perpetuals (15 tokens)
**Chain:** Arbitrum  
**Type:** Leveraged perpetual futures (up to 50x)

Tokens: BTC, ETH, SOL, AVAX, ARB, LINK, UNI, AAVE, OP, POL, DOGE, LTC, XRP, ATOM, NEAR

**Trading Flow:**
```
1. User deposits USDC to Safe wallet (Arbitrum)
2. Agent signal with leverage (1-10x)
3. Open perpetual position on GMX
4. Collateral: USDC
5. Automatic stop loss & take profit
6. Close position → USDC back to wallet
```

**GMX Features:**
- Zero price impact trades
- Deep liquidity (GLP pool)
- No funding fees for first hour
- Decentralized & non-custodial

---

### Hyperliquid Perpetuals (27 tokens)
**Chain:** Hyperliquid L1  
**Type:** Leveraged perpetual futures (up to 50x)

Tokens: BTC, ETH, SOL, AVAX, ARB, OP, POL, SUI, APT, SEI, DOGE, PEPE, WIF, LINK, UNI, AAVE, LDO, CRV, MKR, ATOM, NEAR, INJ, TIA, JUP, BONK, JTO, PYTH

**Trading Flow:**
```
1. User deposits USDC to Safe wallet
2. Bridge USDC to Hyperliquid
3. Agent signal with leverage (1-10x)
4. Open perpetual position
5. Automatic stop loss & take profit
6. Close position → Bridge back to Arbitrum
```

**Hyperliquid Features:**
- Highest liquidity for alt perpetuals
- Native alt-coin perps (SUI, APT, SEI, WIF)
- Low fees (0.02% maker, 0.05% taker)
- On-chain order book

---

## Trading System Architecture

### Per-User Per-Agent Trading

```
User Wallet (USDC)
  ↓
Deploys Agent (e.g., "My GMX Bot")
  ↓
Agent subscribes to CT accounts
  ↓
CT tweets → Signals generated
  ↓
Signal checks venue availability
  ↓
Trade executed on agent's venue
```

### Example Flow

**User:** Alice  
**Agent:** "GMX Momentum Bot"  
**Venue:** GMX  
**CT Account:** AltcoinGordon

1. Alice deposits 1,000 USDC to Safe
2. Tweet: "$BTC going to $148k"
3. Signal generated: LONG BTC, 3x leverage
4. System checks: ✅ BTC available on GMX
5. Trade executed: Open 3x LONG BTC position
6. Stop loss: -4% | Take profit: +12%

---

## Pre-Trade Validation

Before executing any trade, the system checks:

### 1. Token Registry Check
```sql
SELECT * FROM token_registry
WHERE chain = 'arbitrum' 
AND tokenSymbol = 'WBTC'
```
✅ Gets contract address for SPOT trades

### 2. Venue Availability Check
```sql
SELECT * FROM venue_status
WHERE venue = 'GMX'
AND tokenSymbol = 'BTC'
```
✅ Confirms token is tradeable on venue

### 3. User Balance Check
```typescript
const balance = await getUserUSDCBalance(safeWallet);
if (balance < minRequired) revert;
```
✅ Ensures sufficient collateral

### 4. Signal Validation
```typescript
if (!signal.riskModel.stopLoss) revert;
if (!signal.sizeModel.leverage) revert;
```
✅ Validates signal parameters

---

## Database Schema

### token_registry
```sql
CREATE TABLE token_registry (
  id UUID PRIMARY KEY,
  chain STRING,                -- 'arbitrum' | 'base'
  token_symbol STRING,          -- 'WBTC', 'USDC', etc.
  token_address STRING,         -- Contract address
  preferred_router STRING,      -- DEX router (optional)
  
  UNIQUE(chain, token_symbol)
);
```

### venue_status
```sql
CREATE TABLE venue_status (
  id UUID PRIMARY KEY,
  venue ENUM,                   -- 'SPOT' | 'GMX' | 'HYPERLIQUID'
  token_symbol STRING,          -- 'BTC', 'ETH', etc.
  min_size DECIMAL,             -- Min position size (optional)
  tick_size DECIMAL,            -- Price tick size (optional)
  slippage_limit_bps INT,       -- Max slippage in bps (optional)
  
  UNIQUE(venue, token_symbol)
);
```

---

## Usage Examples

### Check if Token is Available

```bash
# Check if SUI is available on Hyperliquid
curl "http://localhost:5000/api/db/venue_status?venue=HYPERLIQUID&tokenSymbol=SUI"

# Response: ✅ Available
```

### Get Token Contract Address

```bash
# Get WBTC address on Arbitrum
curl "http://localhost:5000/api/db/token_registry?chain=arbitrum&tokenSymbol=WBTC"

# Response: 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f
```

### Validate Before Trade

```typescript
// Example: Validate signal before execution
async function validateSignal(signal: Signal): Promise<boolean> {
  // 1. Check venue availability
  const venueStatus = await prisma.venueStatus.findUnique({
    where: {
      venue_tokenSymbol: {
        venue: signal.venue,
        tokenSymbol: signal.tokenSymbol,
      },
    },
  });
  
  if (!venueStatus) {
    console.log(`❌ ${signal.tokenSymbol} not available on ${signal.venue}`);
    return false;
  }
  
  // 2. For SPOT, check token address
  if (signal.venue === 'SPOT') {
    const token = await prisma.tokenRegistry.findUnique({
      where: {
        chain_tokenSymbol: {
          chain: 'arbitrum', // or 'base'
          tokenSymbol: signal.tokenSymbol,
        },
      },
    });
    
    if (!token) {
      console.log(`❌ No contract address for ${signal.tokenSymbol}`);
      return false;
    }
  }
  
  return true;
}
```

---

## Next Steps

✅ **Token Registry:** Complete (27 tokens)  
✅ **Venue Status:** Complete (61 entries)  
✅ **Signal Generation:** Complete (with leverage)  
⏳ **Trade Execution:** Next phase

### Trade Execution Module

Need to implement:

1. **SPOT Adapter:**
   - Connect to Uniswap V3 on Arbitrum
   - Connect to Aerodrome on Base
   - Swap USDC ↔ Token
   
2. **GMX Adapter:**
   - Connect to GMX V2 contracts
   - Open/close perpetual positions
   - Manage collateral (USDC)
   
3. **Hyperliquid Adapter:**
   - Bridge USDC to Hyperliquid
   - Use Hyperliquid SDK
   - Manage positions via API

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Tokens (Registry) | 27 |
| Arbitrum Tokens | 18 |
| Base Tokens | 9 |
| SPOT Tradeable | 20 |
| GMX Tradeable | 15 |
| Hyperliquid Tradeable | 27 |
| Total Venue Entries | 61 |

---

## API Endpoints

```bash
# Get all tokens on Arbitrum
GET /api/db/token_registry?chain=arbitrum

# Get all tokens available on GMX
GET /api/db/venue_status?venue=GMX

# Check specific token availability
GET /api/db/venue_status?venue=HYPERLIQUID&tokenSymbol=SUI
```

---

✅ **Setup Complete!** The system now knows:
- Where tokens live (contract addresses)
- Which tokens can be traded on which venues
- Ready for trade execution implementation

**Next:** Implement venue adapters to actually execute the trades! 🚀
