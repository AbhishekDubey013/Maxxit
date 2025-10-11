# 🔒 Profit Share Reconciliation via FIFO

## Problem
User can manually swap tokens from Safe, bypassing system profit sharing when those tokens were from automated trades.

## Solution: FIFO Reconciliation with Smart Contract Enforcement

---

## 📊 Example Scenario

**Initial State:**
- Auto positions: 10 WETH (from agent signals)
- Manual positions: 10 WETH (from Telegram trades)
- Total in Safe: 20 WETH

**User Action:**
- User manually swaps 12 WETH → 12 USDC via Safe UI

**System Detection:**
- Expected: 20 WETH
- Actual: 8 WETH
- Deficit: 12 WETH
- Manual positions: 10 WETH
- **Auto positions affected: 12 - 10 = 2 WETH**

**FIFO Reconciliation:**
1. Use FIFO to close oldest auto positions totaling 2 WETH
2. Calculate PnL for those positions
3. Calculate agent owner's profit share (20% of profit)
4. **Deduct from Safe's USDC balance → Send to agent owner**

---

## 🔧 Smart Contract Implementation

### Modified Module Functions

```solidity
// contracts/modules/MaxxitTradingModule.sol

// Track expected token balances per Safe
mapping(address => mapping(address => uint256)) public expectedBalances;

// Track position details for FIFO reconciliation
struct PositionRecord {
    address token;
    uint256 amount;
    uint256 costBasis; // USDC spent
    uint256 timestamp;
    bool isAuto; // true for agent signals, false for manual
}

mapping(address => PositionRecord[]) public safePositions;

/**
 * @notice Check for manual exits and reconcile profit sharing
 * @dev Called before any position close or periodically
 */
function reconcileProfitShare(
    address safe,
    address token
) external onlyAuthorizedExecutor returns (uint256 amountReconciled) {
    uint256 expectedBalance = expectedBalances[safe][token];
    uint256 actualBalance = IERC20(token).balanceOf(safe);
    
    if (actualBalance >= expectedBalance) {
        return 0; // No deficit, nothing to reconcile
    }
    
    uint256 deficit = expectedBalance - actualBalance;
    
    // Get current token price in USDC
    uint256 currentTokenPriceUSDC = getTokenPriceInUSDC(token);
    
    // Calculate USDC value of deficit
    uint256 deficitValueUSDC = (deficit * currentTokenPriceUSDC) / 1e18;
    
    // Use FIFO to find affected auto positions
    PositionRecord[] storage positions = safePositions[safe];
    uint256 remainingDeficit = deficit;
    uint256 totalProfitOwed = 0;
    
    for (uint i = 0; i < positions.length && remainingDeficit > 0; i++) {
        PositionRecord storage pos = positions[i];
        
        // Skip manual positions and wrong tokens
        if (!pos.isAuto || pos.token != token) continue;
        
        uint256 positionAmount = pos.amount;
        uint256 amountToClose = remainingDeficit > positionAmount 
            ? positionAmount 
            : remainingDeficit;
        
        // Calculate PnL for this portion
        uint256 currentValue = (amountToClose * currentTokenPriceUSDC) / 1e18;
        uint256 costBasis = (pos.costBasis * amountToClose) / positionAmount;
        
        if (currentValue > costBasis) {
            uint256 profit = currentValue - costBasis;
            uint256 agentShare = (profit * profitShareBps) / 10000; // 20% = 2000 bps
            totalProfitOwed += agentShare;
        }
        
        // Update position
        pos.amount -= amountToClose;
        remainingDeficit -= amountToClose;
        
        // Remove if fully closed
        if (pos.amount == 0) {
            // Remove from array (shift left)
            positions[i] = positions[positions.length - 1];
            positions.pop();
            i--; // Re-check this index
        }
    }
    
    // Deduct profit share from Safe's USDC and send to agent owner
    if (totalProfitOwed > 0) {
        address usdc = getUSDCAddress();
        uint256 safeUSDCBalance = IERC20(usdc).balanceOf(safe);
        
        require(safeUSDCBalance >= totalProfitOwed, "Insufficient USDC for profit share");
        
        // Execute transfer from Safe → Agent owner
        bytes memory transferData = abi.encodeWithSignature(
            "transfer(address,uint256)",
            profitReceiverAddress,
            totalProfitOwed
        );
        
        bool success = ISafe(safe).execTransactionFromModule(
            usdc,
            0,
            transferData,
            0 // CALL operation
        );
        
        require(success, "Profit share transfer failed");
        
        emit ProfitShareReconciled(safe, token, deficit, totalProfitOwed);
    }
    
    // Update expected balance
    expectedBalances[safe][token] = actualBalance;
    
    return totalProfitOwed;
}

/**
 * @notice Track new position (auto or manual)
 */
function recordPosition(
    address safe,
    address token,
    uint256 amount,
    uint256 costBasis,
    bool isAuto
) internal {
    safePositions[safe].push(PositionRecord({
        token: token,
        amount: amount,
        costBasis: costBasis,
        timestamp: block.timestamp,
        isAuto: isAuto
    }));
    
    expectedBalances[safe][token] += amount;
}

/**
 * @notice Modified executeTrade to record positions
 */
function executeTrade(
    address safe,
    address fromToken,
    address toToken,
    uint256 amountIn,
    address dexRouter,
    bytes calldata swapData,
    uint256 minAmountOut,
    address profitReceiver,
    bool isManualTrade // NEW PARAMETER
) external onlyAuthorizedExecutor returns (uint256 amountOut) {
    // ... existing swap logic ...
    
    // Record the position
    if (fromToken == getUSDCAddress()) {
        // Opening position (USDC → Token)
        recordPosition(safe, toToken, amountOut, amountIn, !isManualTrade);
    } else {
        // Closing position (Token → USDC)
        // First, reconcile any manual exits
        reconcileProfitShare(safe, fromToken);
        
        // Then close normally
        // ... existing close logic ...
    }
    
    // ... rest of function ...
}

event ProfitShareReconciled(
    address indexed safe,
    address indexed token,
    uint256 deficit,
    uint256 profitShareDeducted
);
```

---

## 🔄 Backend Integration

### Update trade-executor.ts

```typescript
// When opening position
const result = await moduleService.executeTrade({
  safeAddress: ctx.deployment.safeWallet,
  fromToken: usdcAddress,
  toToken: tokenRegistry.tokenAddress,
  amountIn: amountIn.toString(),
  dexRouter: routerAddress,
  swapData: swapTx.data as string,
  minAmountOut,
  profitReceiver: ctx.signal.agent.profitReceiverAddress,
  isManualTrade: ctx.signal.sourceTweets[0]?.startsWith('telegram_manual'), // NEW
});

// When closing position
const result = await moduleService.executeTrade({
  safeAddress: position.deployment.safeWallet,
  fromToken: tokenRegistry.tokenAddress,
  toToken: usdcAddress,
  amountIn: tokenAmountWei.toString(),
  dexRouter: routerAddress,
  swapData: swapTx.data as string,
  minAmountOut: '0',
  profitReceiver: position.deployment.agent.profitReceiverAddress,
  isManualTrade: position.source === 'telegram', // NEW
});
```

---

## 🎯 How It Works

### Normal Flow (No Manual Swaps)
1. Agent opens: 10 USDC → 1 WETH (auto)
2. User opens: 10 USDC → 1 WETH (manual)
3. Module tracks: expectedBalances[WETH] = 2
4. Agent closes: 1 WETH → 12 USDC
   - Check: actual (2) >= expected (2) ✅
   - No reconciliation needed
   - Take 20% profit share normally

### With Manual Swap
1. Agent opens: 10 USDC → 1 WETH (auto)
2. User opens: 10 USDC → 1 WETH (manual)
3. Module tracks: expectedBalances[WETH] = 2
4. **User manually swaps: 1.5 WETH → 18 USDC (outside system)**
5. Agent tries to close: Check actual balance
   - Expected: 2 WETH
   - Actual: 0.5 WETH
   - **Deficit: 1.5 WETH detected!**
6. Module runs reconciliation:
   - Manual positions: 1 WETH
   - Auto affected: 1.5 - 1 = 0.5 WETH
   - FIFO: Find oldest auto position (1 WETH)
   - Close 0.5 WETH worth: 10 USDC cost → 9 USDC current = -1 USDC loss
   - Agent share: $0 (no profit to share on loss)
7. Update expected balance: 0.5 WETH
8. Continue with normal close

### With Manual Swap (Profitable)
1. Same setup as above
2. User manually swaps: 1.5 WETH → 22.5 USDC
3. Reconciliation:
   - Auto affected: 0.5 WETH (cost: 5 USDC)
   - Current value: 7.5 USDC
   - Profit: 2.5 USDC
   - Agent share: 0.5 USDC (20%)
   - **Deduct 0.5 USDC from Safe → Send to agent owner**
4. Safe USDC: 22.5 - 0.5 = 22 USDC (user keeps 22 USDC)

---

## ✅ Benefits

1. **Automatic Enforcement**: Smart contract deducts profit share
2. **Fair to Both Parties**: User can still manually exit, but pays what's owed
3. **FIFO**: Oldest positions closed first (standard accounting)
4. **Gas Efficient**: Only reconciles when deficit detected
5. **Transparent**: Events emitted for tracking

---

## 📝 Next Steps

1. **Update Smart Contract**: Add reconciliation logic to module
2. **Deploy New Module**: Deploy updated contract
3. **Migrate Users**: Guide users to enable new module
4. **Update Backend**: Add `isManualTrade` flag to all calls
5. **Test**: Thoroughly test reconciliation scenarios

---

## 💡 Alternative: Simpler Approach (No Contract Change)

If you don't want to modify the contract, we can:

1. **Detect deficits in backend** (position monitor worker)
2. **Calculate owed profit share** using FIFO
3. **Store as debt** in database
4. **Require payment** before allowing new trades
5. **Deduct from next successful trade**

This is easier but less enforceable (user could ignore debt).

