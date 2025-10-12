# 🚀 GMX ONE-CLICK Setup Guide

## Overview

Users can now set up GMX trading with **ONE transaction** that includes:
1. ✅ Enable Maxxit Trading Module
2. ✅ Authorize GMX Executor

**First trade auto-initializes:**
- USDC approval to module (for 0.2 USDC fees)
- USDC approval to Uniswap (for swaps)
- Capital tracking

---

## 🎯 Option 1: Custom UI Page (RECOMMENDED)

**Best UX!** User just clicks one button and signs one transaction.

### How It Works:

1. User goes to `/gmx-setup` page
2. Enters their Safe address
3. Clicks "Setup GMX Trading"
4. Signs **ONE transaction** via wallet
5. Done! ✅

### Implementation:

```typescript
// pages/gmx-setup.tsx (ALREADY CREATED)
// Uses Safe SDK to create batch transaction programmatically
// User only signs once!
```

### Add to Your UI:

**Option A: Link to dedicated page**
```tsx
<Link href="/gmx-setup">
  Setup GMX Trading
</Link>
```

**Option B: Embed button component**
```tsx
import GMXSetupButton from '@/components/GMXSetupButton';

<GMXSetupButton safeAddress={userSafeAddress} />
```

---

## 🎯 Option 2: Safe Transaction Builder (Manual)

For users who prefer using Safe's official interface.

### Steps:

1. Go to Safe Transaction Builder
2. Create batch transaction with TWO transactions:

#### Transaction 1: Enable Module
```
To: <User's Safe Address>
ABI: enableModule(address)
module: 0x07627aef95CBAD4a17381c4923Be9B9b93526d3D
```

#### Transaction 2: Authorize GMX
```
To: 0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6
ABI: setSubaccount(address,bool)
subaccount: <Executor Address from API>
authorized: true
```

3. Execute batch

---

## 🎯 Option 3: API + JSON Import

**For advanced users or programmatic setup**

### Steps:

1. **Generate transaction JSON:**

```bash
curl -X POST https://maxxit.vercel.app/api/gmx/generate-setup-tx \
  -H "Content-Type: application/json" \
  -d '{"safeAddress":"0x9A85f7140776477F1A79Ea29b7A32495636f5e20"}'
```

2. **Response includes:**
- `transactionBuilderJSON` - Import into Safe Transaction Builder
- `sdkTransactions` - Use with Safe SDK
- `instructions` - Manual step-by-step
- `safeAppLink` - Deep link to Safe app

3. **Import JSON into Safe Transaction Builder:**
- Copy `transactionBuilderJSON` from response
- Go to Safe Transaction Builder
- Click "Import"
- Paste JSON
- Execute

---

## 📊 Comparison

| Method | UX Rating | Tech Level | Setup Time |
|--------|-----------|------------|------------|
| **Option 1: Custom UI** | ⭐⭐⭐⭐⭐ | Non-technical | 30 seconds |
| **Option 2: Safe Builder** | ⭐⭐⭐⭐ | Semi-technical | 2 minutes |
| **Option 3: API + JSON** | ⭐⭐⭐ | Technical | 3 minutes |

---

## 🎨 UI Integration Examples

### Example 1: Deployment Page

```tsx
// pages/my-deployments.tsx
import GMXSetupButton from '@/components/GMXSetupButton';

{deployment.agent.venue === 'GMX' && !deployment.moduleEnabled && (
  <div>
    <p>⚠️ Setup required before trading</p>
    <GMXSetupButton safeAddress={deployment.safe_wallet} />
  </div>
)}
```

### Example 2: Agent Detail Page

```tsx
// pages/agent/[id].tsx

{agent.venue === 'GMX' && (
  <div>
    <h3>Ready to trade GMX?</h3>
    <p>Complete one-click setup to start trading</p>
    <GMXSetupButton 
      safeAddress={userSafe}
      onSetupComplete={() => router.reload()}
    />
  </div>
)}
```

### Example 3: Onboarding Flow

```tsx
// pages/onboarding.tsx

<Steps>
  <Step title="Create Agent" />
  <Step title="Connect Safe" />
  <Step title="Setup Trading" active>
    <GMXSetupButton safeAddress={safe} />
  </Step>
  <Step title="Start Trading" />
</Steps>
```

---

## 🔧 Technical Details

### What Happens Behind the Scenes:

1. **User clicks setup button**
2. **Frontend generates batch transaction:**
   ```typescript
   const transactions = [
     { to: safeAddress, data: enableModuleData },
     { to: GMX_ROUTER, data: authorizeGMXData }
   ];
   ```
3. **Safe SDK creates transaction:**
   ```typescript
   const safeTransaction = await safeSdk.createTransaction({
     safeTransactionData: transactions
   });
   ```
4. **User signs ONCE**
5. **Transaction executed on-chain**
6. **Both actions complete in ONE transaction**

### First Trade Auto-Initialization:

When user makes their first trade, `MaxxitTradingModuleV2` automatically:

```solidity
function _autoInitialize(address safe) internal {
    // 1. Approve USDC to module
    // 2. Approve USDC to Uniswap
    // 3. Initialize capital tracking
    // GMX auth already done by user!
}
```

---

## 🔒 Security

- ✅ **Non-custodial**: User retains full control
- ✅ **Module permissions**: Only execute trades, not arbitrary transfers
- ✅ **GMX positions**: Owned by user's Safe, not executor
- ✅ **Revocable**: User can disable module anytime
- ✅ **Transparent**: All transactions visible on-chain

---

## ✅ Checklist for Implementation

- [x] Create `/gmx-setup` page
- [x] Create API endpoint `/api/gmx/generate-setup-tx`
- [x] Create `<GMXSetupButton>` component
- [ ] Add setup button to deployments page
- [ ] Add setup button to agent detail page
- [ ] Add setup check to trading flow
- [ ] Add setup status indicator
- [ ] Test on mainnet
- [ ] Update user documentation

---

## 🚀 Next Steps

1. **Deploy these files:**
   - `pages/gmx-setup.tsx`
   - `pages/api/gmx/generate-setup-tx.ts`
   - `components/GMXSetupButton.tsx`

2. **Add button to your UI** (choose placement):
   - Deployments page
   - Agent detail page
   - Onboarding flow

3. **Test the flow:**
   - User clicks button
   - Signs ONE transaction
   - First trade executes successfully

4. **Monitor:**
   - Setup success rate
   - Transaction failures
   - User feedback

---

## 💡 Tips

- **Show progress**: Display status during setup
- **Verify requirements**: Check Safe ownership before setup
- **Handle errors**: Clear error messages for common issues
- **Success confirmation**: Show clear success state after setup
- **One-time only**: Hide setup button after completion

---

## 📚 Further Reading

- [Safe Transaction Service API](https://docs.safe.global/safe-core-api/available-services)
- [Safe SDK Documentation](https://docs.safe.global/sdk/protocol-kit)
- [GMX V2 Documentation](https://gmx-docs.io/)

---

## 🆘 Troubleshooting

### "Not a Safe owner"
- User must be a signer on the Safe
- Multi-sig requires threshold signatures

### "Transaction failed"
- Check ETH balance for gas
- Verify Safe is on Arbitrum One
- Check Safe Transaction Service status

### "Module already enabled"
- User already completed setup
- Can proceed to trading

### "GMX authorization failed"
- This should NOT happen with batch transaction
- If it does, GMX Router might be updated
- Check GMX V2 documentation for latest Router address

---

**Need help?** Check the implementation in:
- `pages/gmx-setup.tsx` - Full UI implementation
- `pages/api/gmx/generate-setup-tx.ts` - Transaction generation
- `components/GMXSetupButton.tsx` - Reusable component

