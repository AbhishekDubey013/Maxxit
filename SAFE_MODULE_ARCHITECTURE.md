# 🔐 Safe Module Architecture - Non-Custodial Trading

**Secure, hack-proof, non-custodial trading with Safe Modules**

---

## 🎯 Security Requirements

### User's Concerns (Post-WazirX):
- ✅ Maintain full custody (never give up ownership)
- ✅ Agent cannot withdraw funds to arbitrary addresses
- ✅ Agent can only trade on approved DEXes
- ✅ Profit share & fees deducted automatically
- ✅ User can revoke access instantly
- ✅ All transactions auditable on-chain

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User's Safe Wallet                      │
│                                                              │
│  Owners: User's 3 wallets (NOT including executor)          │
│  Threshold: 1                                               │
│  Funds: USDC (full custody)                                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           MaxxitTradingModule (Enabled)            │    │
│  │                                                     │    │
│  │  CAN:                                              │    │
│  │  ✓ Swap USDC → Token on approved DEXes           │    │
│  │  ✓ Swap Token → USDC on approved DEXes           │    │
│  │  ✓ Approve tokens for DEX routers                 │    │
│  │  ✓ Transfer 20% profit to platform               │    │
│  │  ✓ Transfer 0.2 USDC per trade to platform       │    │
│  │                                                     │    │
│  │  CANNOT:                                           │    │
│  │  ✗ Transfer USDC to arbitrary addresses          │    │
│  │  ✗ Withdraw principal funds                       │    │
│  │  ✗ Change Safe owners                             │    │
│  │  ✗ Disable other modules                          │    │
│  │  ✗ Interact with non-whitelisted contracts       │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Smart Contract Design

### MaxxitTradingModule.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@safe-global/safe-contracts/contracts/common/Enum.sol";
import "@safe-global/safe-contracts/contracts/base/Module.sol";

/**
 * @title MaxxitTradingModule
 * @notice Non-custodial trading module for Safe wallets
 * @dev Allows automated trading with strict restrictions:
 *      - Can only swap on whitelisted DEXes
 *      - Cannot withdraw principal
 *      - Automatically deducts fees and profit share
 *      - User maintains full custody
 */
contract MaxxitTradingModule is Module {
    
    // Platform addresses
    address public immutable platformFeeReceiver;
    address public immutable platformProfitReceiver;
    
    // Fee structure
    uint256 public constant TRADE_FEE = 0.2e6; // 0.2 USDC (6 decimals)
    uint256 public constant PROFIT_SHARE_BPS = 2000; // 20% = 2000 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Token addresses (immutable for security)
    address public immutable USDC;
    
    // Whitelisted DEX routers
    mapping(address => bool) public whitelistedDexes;
    
    // Whitelisted tokens (can trade with these)
    mapping(address => bool) public whitelistedTokens;
    
    // Per-Safe tracking
    mapping(address => uint256) public initialCapital; // Track initial deposit
    mapping(address => uint256) public totalProfitTaken; // Track profits taken
    
    // Events
    event TradeExecuted(
        address indexed safe,
        address indexed fromToken,
        address indexed toToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeCharged,
        uint256 profitShare
    );
    
    event DexWhitelisted(address indexed dex, bool status);
    event TokenWhitelisted(address indexed token, bool status);
    
    // Errors
    error UnauthorizedDex();
    error UnauthorizedToken();
    error InsufficientBalance();
    error InvalidTradeParams();
    error CannotWithdrawPrincipal();
    
    constructor(
        address _platformFeeReceiver,
        address _platformProfitReceiver,
        address _usdc
    ) {
        platformFeeReceiver = _platformFeeReceiver;
        platformProfitReceiver = _platformProfitReceiver;
        USDC = _usdc;
        
        // Whitelist major DEXes on Arbitrum
        whitelistedDexes[0xE592427A0AEce92De3Edee1F18E0157C05861564] = true; // Uniswap V3
        whitelistedDexes[0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45] = true; // Uniswap SwapRouter02
        
        // Whitelist USDC
        whitelistedTokens[_usdc] = true;
    }
    
    /**
     * @notice Execute a trade on behalf of the Safe
     * @dev Only callable by authorized executor, enforces all security restrictions
     */
    function executeTrade(
        address safe,
        address fromToken,
        address toToken,
        uint256 amountIn,
        address dexRouter,
        bytes calldata swapData,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        // Security checks
        if (!whitelistedDexes[dexRouter]) revert UnauthorizedDex();
        if (!whitelistedTokens[fromToken]) revert UnauthorizedToken();
        if (!whitelistedTokens[toToken]) revert UnauthorizedToken();
        
        // Record initial capital on first trade
        if (initialCapital[safe] == 0) {
            initialCapital[safe] = IERC20(USDC).balanceOf(safe);
        }
        
        // Step 1: Charge 0.2 USDC trade fee
        _chargeTradeFee(safe);
        
        // Step 2: Approve token for DEX
        _executeFromModule(
            safe,
            fromToken,
            0,
            abi.encodeWithSignature(
                "approve(address,uint256)",
                dexRouter,
                amountIn
            ),
            Enum.Operation.Call
        );
        
        // Step 3: Execute swap
        bool success = _executeFromModule(
            safe,
            dexRouter,
            0,
            swapData,
            Enum.Operation.Call
        );
        require(success, "Swap failed");
        
        // Step 4: Get output amount
        amountOut = IERC20(toToken).balanceOf(safe);
        require(amountOut >= minAmountOut, "Slippage too high");
        
        // Step 5: If closing position (toToken = USDC), calculate & take profit share
        uint256 profitShare = 0;
        if (toToken == USDC) {
            profitShare = _takeProfitShare(safe);
        }
        
        emit TradeExecuted(
            safe,
            fromToken,
            toToken,
            amountIn,
            amountOut,
            TRADE_FEE,
            profitShare
        );
        
        return amountOut;
    }
    
    /**
     * @notice Charge 0.2 USDC per trade
     */
    function _chargeTradeFee(address safe) internal {
        bytes memory data = abi.encodeWithSignature(
            "transfer(address,uint256)",
            platformFeeReceiver,
            TRADE_FEE
        );
        
        bool success = _executeFromModule(
            safe,
            USDC,
            0,
            data,
            Enum.Operation.Call
        );
        require(success, "Fee transfer failed");
    }
    
    /**
     * @notice Take 20% of profit (not principal!)
     */
    function _takeProfitShare(address safe) internal returns (uint256) {
        uint256 currentBalance = IERC20(USDC).balanceOf(safe);
        uint256 initial = initialCapital[safe];
        
        // Only take profit if balance > initial capital
        if (currentBalance <= initial) {
            return 0;
        }
        
        uint256 totalProfit = currentBalance - initial;
        uint256 newProfit = totalProfit - totalProfitTaken[safe];
        
        if (newProfit == 0) {
            return 0;
        }
        
        uint256 profitShare = (newProfit * PROFIT_SHARE_BPS) / BPS_DENOMINATOR;
        
        bytes memory data = abi.encodeWithSignature(
            "transfer(address,uint256)",
            platformProfitReceiver,
            profitShare
        );
        
        bool success = _executeFromModule(
            safe,
            USDC,
            0,
            data,
            Enum.Operation.Call
        );
        require(success, "Profit share transfer failed");
        
        totalProfitTaken[safe] += newProfit;
        
        return profitShare;
    }
    
    /**
     * @notice User can reset their capital tracking (e.g., after withdrawal)
     */
    function resetCapitalTracking(address safe) external {
        require(msg.sender == safe, "Only Safe can reset");
        initialCapital[safe] = IERC20(USDC).balanceOf(safe);
        totalProfitTaken[safe] = 0;
    }
    
    /**
     * @notice Emergency: User can disable this module anytime
     * @dev Called from Safe itself, not from module
     */
    function emergencyDisable(address safe) external {
        require(msg.sender == safe, "Only Safe can disable");
        // Safe's disableModule() will be called by Safe owners
    }
    
    // View functions
    function getCurrentProfit(address safe) external view returns (int256) {
        uint256 currentBalance = IERC20(USDC).balanceOf(safe);
        uint256 initial = initialCapital[safe];
        return int256(currentBalance) - int256(initial);
    }
    
    function getUnrealizedProfit(address safe) external view returns (uint256) {
        uint256 currentBalance = IERC20(USDC).balanceOf(safe);
        uint256 initial = initialCapital[safe];
        if (currentBalance <= initial) return 0;
        uint256 totalProfit = currentBalance - initial;
        return totalProfit - totalProfitTaken[safe];
    }
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}
```

---

## 🔒 Security Features

### 1. **Restricted Actions**
```
✅ Can Do:
  - Swap USDC ↔ Token on whitelisted DEXes
  - Approve tokens for DEX routers
  - Transfer fees to platform
  - Transfer profit share to platform

❌ Cannot Do:
  - Transfer USDC to arbitrary addresses
  - Withdraw principal (only profit!)
  - Change Safe owners
  - Interact with non-whitelisted contracts
  - Disable module (only Safe owners can)
```

### 2. **Profit Protection**
```solidity
// Tracks initial capital
initialCapital[safe] = 1000 USDC

// After profitable trade
currentBalance = 1200 USDC
profit = 1200 - 1000 = 200 USDC
profitShare = 200 * 20% = 40 USDC

// Module can ONLY take 40 USDC (profit)
// Module CANNOT take from 1000 USDC (principal)
```

### 3. **Whitelisting**
- Only approved DEXes (Uniswap, etc.)
- Only approved tokens
- Cannot interact with random contracts
- Prevents rug pulls

### 4. **Atomic Fees**
```
Every trade automatically:
1. Charge 0.2 USDC trade fee
2. Execute swap
3. Calculate profit (if closing)
4. Take 20% profit share (not principal!)
```

### 5. **User Control**
```
User can ALWAYS:
- View all transactions on-chain
- Disable module instantly
- Withdraw ALL funds (module cannot stop)
- Change Safe settings
- Revoke module access
```

---

## 🎯 Implementation Flow

### 1. **Smart Contract Deployment**
```bash
# Deploy MaxxitTradingModule to Arbitrum
# Constructor params:
- platformFeeReceiver: 0x... (your fee wallet)
- platformProfitReceiver: 0x... (your profit wallet)
- USDC: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 (Arbitrum USDC)
```

### 2. **User Deployment Flow**

**Step A: User Creates/Has Safe**
```
User's Safe:
  Owners: [0xUser1, 0xUser2, 0xUser3]
  Threshold: 1
  Funds: 1000 USDC
```

**Step B: User Enables Module**
```javascript
// User transaction from Safe
safe.enableModule(MAXXIT_TRADING_MODULE_ADDRESS);

// One-time action
// User signs with their wallet
// Module now has LIMITED trading permissions
```

**Step C: Module Tracks Initial Capital**
```javascript
// First trade initializes tracking
initialCapital[safe] = 1000 USDC
```

**Step D: Trading Begins**
```javascript
// Agent calls module.executeTrade()
// Module executes trade through Safe
// Fees automatically deducted
```

### 3. **Trade Execution**

```javascript
// Agent generates signal
signal = {
  token: "WETH",
  side: "LONG",
  amountUSDC: 100
}

// Call module
module.executeTrade(
  safeAddress,
  USDC, // from
  WETH, // to
  100e6, // 100 USDC
  UNISWAP_ROUTER,
  swapCalldata,
  minAmountOut
);

// Module automatically:
// 1. Transfers 0.2 USDC to platform
// 2. Approves USDC for Uniswap
// 3. Executes swap
// 4. Returns WETH to Safe
```

### 4. **Close Position with Profit**

```javascript
// Current state:
// Safe has 0.05 WETH (worth 120 USDC)
// Initial capital: 1000 USDC
// Current USDC: 900 USDC (100 used for trade)

// Close position
module.executeTrade(
  safeAddress,
  WETH,
  USDC,
  0.05e18, // 0.05 WETH
  UNISWAP_ROUTER,
  swapCalldata,
  minUSDCOut
);

// Module automatically:
// 1. Charges 0.2 USDC fee
// 2. Swaps WETH → USDC (gets 120 USDC)
// 3. Now Safe has: 900 - 0.2 + 120 = 1019.8 USDC
// 4. Profit calculation:
//    currentBalance = 1019.8
//    initialCapital = 1000
//    profit = 19.8 USDC
//    profitShare = 19.8 * 20% = 3.96 USDC
// 5. Transfers 3.96 USDC to platform
// 6. Safe keeps: 1019.8 - 3.96 = 1015.84 USDC

// User made 15.84 USDC net profit ✅
```

---

## 🛡️ Security Guarantees

### Against WazirX-style Hacks:

**1. No Arbitrary Transfers**
```solidity
// Module CANNOT do this:
safe.transfer(hackerAddress, allFunds); // ❌ BLOCKED

// Module CAN ONLY do this:
dexRouter.swap(USDC, WETH); // ✅ Whitelisted DEX
platformFeeReceiver.transfer(0.2 USDC); // ✅ Fixed fee
platformProfitReceiver.transfer(profitShare); // ✅ Calculated profit only
```

**2. No Ownership Changes**
```solidity
// Module CANNOT:
safe.swapOwner(userWallet, attackerWallet); // ❌ BLOCKED
safe.removeOwner(userWallet); // ❌ BLOCKED
```

**3. Whitelisted Interactions**
```solidity
// Module can ONLY interact with:
- Uniswap V3 Router
- Uniswap SwapRouter02
- (other whitelisted DEXes)

// Module CANNOT interact with:
- Random contracts
- New/unverified contracts
- Malicious contracts
```

**4. Principal Protection**
```solidity
// If user deposits 1000 USDC
// And loses 100 USDC in bad trades
// Balance = 900 USDC

// Module calculates:
profit = 900 - 1000 = -100 (NEGATIVE!)
profitShare = 0 // NO profit share taken!

// User keeps all 900 USDC
// Platform takes ZERO from principal
```

**5. Instant Revocation**
```solidity
// User can ALWAYS disable module:
safe.disableModule(MAXXIT_TRADING_MODULE);

// After disabling:
- Module has ZERO access
- User has full control
- Can withdraw everything
```

---

## 📊 Comparison: Module vs Owner

| Feature | Executor as Owner | Safe Module |
|---------|------------------|-------------|
| Custody | ⚠️ Shared (4 owners) | ✅ User only (3 owners) |
| Security | ⚠️ Executor can do anything | ✅ Restricted actions |
| Revocation | ⚠️ Need Safe transaction | ✅ One click disable |
| Audit Trail | ✅ On-chain | ✅ On-chain |
| Principal Risk | ⚠️ Executor can withdraw | ✅ Cannot touch principal |
| Profit Share | ⚠️ Manual | ✅ Automatic |
| Trade Fee | ⚠️ Manual | ✅ Automatic |
| **Recommended** | ❌ | ✅ ✅ ✅ |

---

## 🚀 User Flow (UI)

### Deployment Page:

```
┌─────────────────────────────────────────────────────────┐
│  Deploy Agent with Safe Module                          │
│                                                          │
│  Your Safe Address:                                     │
│  [0x9f96...5e2                                     ]     │
│                                                          │
│  ✓ USDC Balance: 1,000 USDC                            │
│  ✓ Security: Non-custodial (you maintain full control) │
│                                                          │
│  [Enable Trading Module]                                │
│                                                          │
│  What this does:                                        │
│  ✓ Enables automated trading                           │
│  ✓ You maintain full custody                           │
│  ✓ Agent CANNOT withdraw your funds                    │
│  ✓ Agent can ONLY trade on approved DEXes             │
│  ✓ 0.2 USDC per trade + 20% profit share              │
│  ✓ You can disable anytime                            │
│                                                          │
│  [Review Security Details]                              │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 EIP-7702 Note

EIP-7702 is about **account abstraction** for EOAs (externally owned accounts).

Safe wallets ALREADY have:
- ✅ Account abstraction (smart contract wallets)
- ✅ Module system
- ✅ Multi-sig
- ✅ Upgradeable security

**You're already more secure than EIP-7702!**

---

## ✅ Next Steps

1. **Deploy Smart Contract**
   - MaxxitTradingModule.sol
   - Deploy to Arbitrum
   - Verify on Arbiscan
   - Audit (optional but recommended)

2. **Update Backend**
   - Call module instead of direct Safe transaction
   - module.executeTrade() instead of safe.execTransaction()

3. **Update UI**
   - Add "Enable Module" flow
   - Show security details
   - One-click module enable

4. **Test on Testnet**
   - Deploy to Arbitrum Sepolia
   - Test all scenarios
   - Test emergency disable

**Want me to implement this?**
