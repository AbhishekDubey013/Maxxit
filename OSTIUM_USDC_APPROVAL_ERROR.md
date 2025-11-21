# Ostium USDC Approval Error

## Error Message

```
Sufficient allowance for 0x482F913D4327E5f30EC4eB8301a0AEB4DB5780f6 not present. 
Please approve the trading contract to spend USDC.
```

## What This Means

The wallet `0x482F913D4327E5f30EC4eB8301a0AEB4DB5780f6` has **not approved** the Ostium trading contract to spend USDC on their behalf.

## Why This Happens

1. **User skipped USDC approval step** during Ostium setup
2. **Approval was done for wrong contract** (e.g., approved OSTIUM_STORAGE instead of OSTIUM_TRADING_CONTRACT)
3. **User is using a different wallet** than the one that was approved
4. **Approval expired** (unlikely for USDC, but possible if user revoked it)

## How to Fix

### Option 1: Re-run Ostium Setup (Recommended)

1. Go to the agent deployment page
2. Click on the Ostium venue
3. Complete the USDC approval step
4. Make sure you approve **OSTIUM_TRADING_CONTRACT** (`0x2A9B9c988393f46a2537B0ff11E98c2C15a95afe`)

### Option 2: Manual Approval via MetaMask

1. Open MetaMask
2. Switch to **Arbitrum Sepolia** network
3. Go to USDC token contract: `0xe73B11Fb1e3eeEe8AF2a23079A4410Fe1B370548`
4. Call `approve` function:
   - **Spender**: `0x2A9B9c988393f46a2537B0ff11E98c2C15a95afe` (OSTIUM_TRADING_CONTRACT)
   - **Amount**: `1000000000000` (1M USDC with 6 decimals)

### Option 3: Check Current Allowance

Run this script to check the current allowance:

```typescript
// Check USDC allowance
const USDC_TOKEN = '0xe73B11Fb1e3eeEe8AF2a23079A4410Fe1B370548';
const OSTIUM_TRADING_CONTRACT = '0x2A9B9c988393f46a2537B0ff11E98c2C15a95afe';
const userWallet = '0x482F913D4327E5f30EC4eB8301a0AEB4DB5780f6';

const usdcContract = new ethers.Contract(USDC_TOKEN, [
  'function allowance(address owner, address spender) view returns (uint256)'
], provider);

const allowance = await usdcContract.allowance(userWallet, OSTIUM_TRADING_CONTRACT);
console.log('Current allowance:', ethers.utils.formatUnits(allowance, 6), 'USDC');
```

## Important Notes

- **OSTIUM_TRADING_CONTRACT** (`0x2A9B9c988393f46a2537B0ff11E98c2C15a95afe`) is the correct spender
- **NOT** OSTIUM_STORAGE (`0x0b9F5243B29938668c9Cfbd7557A389EC7Ef88b8`)
- The trading contract needs approval to pull USDC for trades
- Approval amount should be at least $1M (1,000,000 USDC with 6 decimals)

## Prevention

The frontend (`OstiumConnect.tsx`) should:
1. Check allowance before attempting trade
2. Show clear error if allowance is insufficient
3. Prompt user to approve if needed
4. Verify approval was successful before proceeding


