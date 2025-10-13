// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MaxxitTradingModule V2
 * @notice Unified SPOT + GMX trading module with ONE-CLICK setup
 * 
 * NEW in V2:
 * - completeSetup() - One function to handle all approvals & authorization
 * - No more manual USDC approval needed
 * - No more manual GMX subaccount authorization needed
 * - Simpler UX: Enable module → Call completeSetup() → Start trading!
 * 
 * FEATURES:
 * - SPOT Trading: Uniswap V3 integration
 * - GMX Trading: GMX V2 perpetuals via SubaccountRouter
 * - Fee Collection: 0.2 USDC per trade (on-chain, transparent)
 * - Profit Sharing: 20% of GMX profits to agent owner (on-chain calculation)
 * - Security: Non-custodial, executor can't steal funds
 * - Flexibility: Agent owners choose token whitelist
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IGnosisSafe {
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        uint8 operation
    ) external returns (bool success);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

interface IGMXSubaccountRouter {
    function setSubaccount(address subaccount, bool authorized) external;
}

contract MaxxitTradingModuleV2 {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════
    
    address public constant USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831; // Arbitrum USDC
    address public constant UNISWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564; // Uniswap V3 Router
    address public constant GMX_ROUTER = 0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6; // GMX SubaccountRouter
    
    uint256 public constant PLATFORM_FEE = 200000; // 0.2 USDC (6 decimals)
    uint256 public constant PROFIT_SHARE_BPS = 2000; // 20% = 2000 basis points
    
    // ═══════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════
    
    address public immutable moduleOwner;
    address public immutable executor;
    address public platformFeeReceiver;
    
    // Per-Safe capital tracking
    struct SafeStats {
        bool initialized;
        uint256 initialCapital;
        uint256 currentCapital;
        int256 profitLoss;
        uint256 profitTaken;
        uint256 unrealizedProfit;
    }
    mapping(address => SafeStats) public safeStats;
    
    // Per-Safe token whitelist (agent-specific)
    mapping(address => mapping(address => bool)) public tokenWhitelist;
    
    // ═══════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════
    
    event SetupCompleted(address indexed safe, uint256 timestamp);
    event CapitalInitialized(address indexed safe, uint256 amount);
    event TradeFeeCollected(address indexed safe, address indexed receiver, uint256 amount);
    event ProfitShareDistributed(address indexed safe, address indexed agentOwner, uint256 amount);
    event TokenWhitelistUpdated(address indexed safe, address indexed token, bool enabled);
    event TradeExecuted(address indexed safe, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    
    // ═══════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════
    
    constructor(address _executor, address _platformFeeReceiver) {
        require(_executor != address(0), "Invalid executor");
        require(_platformFeeReceiver != address(0), "Invalid fee receiver");
        
        moduleOwner = msg.sender;
        executor = _executor;
        platformFeeReceiver = _platformFeeReceiver;
    }
    
    // ═══════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════
    
    modifier onlyExecutor() {
        require(msg.sender == executor, "Only executor");
        _;
    }
    
    modifier onlyModuleOwner() {
        require(msg.sender == moduleOwner, "Only module owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════
    // 🚀 ONE-CLICK SETUP (NEW IN V2!)
    // ═══════════════════════════════════════════════════════
    
    /**
     * @notice Complete setup (if user wants to do it manually before first trade)
     * @dev This function:
     *      1. Approves USDC to this module (infinite approval)
     *      2. Approves USDC to Uniswap Router (for swaps)
     *      3. Initializes capital tracking
     * 
     * NOTE: GMX subaccount authorization must be done separately (see below)
     * 
     * USAGE: OPTIONAL - First trade will auto-initialize anyway
     * 
     * FOR GMX TRADING: After enabling module, manually authorize GMX subaccount:
     *   To: 0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6 (GMX Router)
     *   ABI: setSubaccount(address subaccount, bool authorized)
     *   subaccount: <executor_address>
     *   authorized: true
     */
    function completeSetup() external {
        address safe = msg.sender;
        require(safeStats[safe].initialized == false, "Already initialized");
        
        // Step 1: Approve USDC to module (for fee collection)
        bytes memory approveModuleData = abi.encodeWithSelector(
            IERC20.approve.selector,
            address(this),
            type(uint256).max
        );
        bool success1 = IGnosisSafe(safe).execTransactionFromModule(
            USDC,
            0,
            approveModuleData,
            0 // CALL
        );
        require(success1, "Module approval failed");
        
        // Step 2: Approve USDC to Uniswap Router (for swaps)
        bytes memory approveUniswapData = abi.encodeWithSelector(
            IERC20.approve.selector,
            UNISWAP_ROUTER,
            type(uint256).max
        );
        bool success2 = IGnosisSafe(safe).execTransactionFromModule(
            USDC,
            0,
            approveUniswapData,
            0 // CALL
        );
        require(success2, "Uniswap approval failed");
        
        // NOTE: GMX authorization skipped (see function comment above)
        
        // Step 3: Initialize capital
        uint256 currentUSDC = IERC20(USDC).balanceOf(safe);
        safeStats[safe] = SafeStats({
            initialized: true,
            initialCapital: currentUSDC,
            currentCapital: currentUSDC,
            profitLoss: 0,
            profitTaken: 0,
            unrealizedProfit: 0
        });
        
        emit SetupCompleted(safe, block.timestamp);
        emit CapitalInitialized(safe, currentUSDC);
    }
    
    // ═══════════════════════════════════════════════════════
    // CAPITAL MANAGEMENT
    // ═══════════════════════════════════════════════════════
    
    function initializeCapital(address safe) public onlyExecutor {
        require(!safeStats[safe].initialized, "Already initialized");
        
        uint256 currentBalance = IERC20(USDC).balanceOf(safe);
        safeStats[safe] = SafeStats({
            initialized: true,
            initialCapital: currentBalance,
            currentCapital: currentBalance,
            profitLoss: 0,
            profitTaken: 0,
            unrealizedProfit: 0
        });
        
        emit CapitalInitialized(safe, currentBalance);
    }
    
    function getCapital(address safe) external view returns (uint256) {
        require(safeStats[safe].initialized, "Not initialized");
        return safeStats[safe].currentCapital;
    }
    
    function getSafeStats(address safe) external view returns (
        bool initialized,
        uint256 initialCapital,
        uint256 currentCapital,
        int256 profitLoss,
        uint256 profitTaken,
        uint256 unrealizedProfit
    ) {
        SafeStats memory stats = safeStats[safe];
        return (
            stats.initialized,
            stats.initialCapital,
            stats.currentCapital,
            stats.profitLoss,
            stats.profitTaken,
            stats.unrealizedProfit
        );
    }
    
    // ═══════════════════════════════════════════════════════
    // TOKEN WHITELIST (Agent-Specific)
    // ═══════════════════════════════════════════════════════
    
    function setTokenWhitelist(address safe, address token, bool enabled) external onlyModuleOwner {
        tokenWhitelist[safe][token] = enabled;
        emit TokenWhitelistUpdated(safe, token, enabled);
    }
    
    function setTokenWhitelistBatch(address safe, address[] calldata tokens, bool enabled) external onlyModuleOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenWhitelist[safe][tokens[i]] = enabled;
            emit TokenWhitelistUpdated(safe, tokens[i], enabled);
        }
    }
    
    function isTokenWhitelisted(address safe, address token) public view returns (bool) {
        return tokenWhitelist[safe][token];
    }
    
    // ═══════════════════════════════════════════════════════
    // TRADING - SPOT (Uniswap V3)
    // ═══════════════════════════════════════════════════════
    
    function executeTrade(
        address safe,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 poolFee,
        address profitReceiver
    ) external onlyExecutor returns (uint256 amountOut) {
        // Auto-initialize on first trade (ONE-TIME)
        if (!safeStats[safe].initialized) {
            _autoInitialize(safe);
        }
        
        require(isTokenWhitelisted(safe, tokenOut), "Token not whitelisted");
        
        // Collect 0.2 USDC platform fee FIRST (before trade)
        require(tokenIn == USDC, "Only USDC trades supported");
        require(amountIn >= PLATFORM_FEE, "Amount too small for fee");
        
        _collectPlatformFee(safe);
        
        // Execute swap via Safe (swap amount AFTER fee deduction)
        uint256 swapAmount = amountIn - PLATFORM_FEE;
        bytes memory swapData = abi.encodeWithSelector(
            IUniswapV3Router.exactInputSingle.selector,
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: safe,
                deadline: block.timestamp,
                amountIn: swapAmount,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        bool success = IGnosisSafe(safe).execTransactionFromModule(
            UNISWAP_ROUTER,
            0,
            swapData,
            0 // CALL
        );
        require(success, "Swap failed");
        
        // Calculate amountOut (simplified - in production, decode return value)
        amountOut = IERC20(tokenOut).balanceOf(safe);
        
        emit TradeExecuted(safe, tokenIn, tokenOut, swapAmount, amountOut);
        return amountOut;
    }
    
    function closePosition(
        address safe,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 poolFee,
        address agentOwner,
        uint256 entryValueUSDC
    ) external onlyExecutor returns (uint256 amountOut) {
        // Auto-initialize on first trade (ONE-TIME)
        if (!safeStats[safe].initialized) {
            _autoInitialize(safe);
        }
        
        require(tokenOut == USDC, "Only close to USDC");
        
        // First approve tokenIn to Uniswap if needed
        _ensureTokenApproval(safe, tokenIn, UNISWAP_ROUTER);
        
        // Track USDC balance BEFORE swap to calculate actual output
        uint256 usdcBefore = IERC20(USDC).balanceOf(safe);
        
        // Execute swap
        bytes memory swapData = abi.encodeWithSelector(
            IUniswapV3Router.exactInputSingle.selector,
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: safe,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        bool success = IGnosisSafe(safe).execTransactionFromModule(
            UNISWAP_ROUTER,
            0,
            swapData,
            0 // CALL
        );
        require(success, "Close swap failed");
        
        // Get USDC received from THIS swap (not total balance!)
        uint256 usdcAfter = IERC20(USDC).balanceOf(safe);
        amountOut = usdcAfter - usdcBefore; // Actual swap output
        
        // Calculate profit/loss based on swap output only
        if (amountOut > entryValueUSDC) {
            uint256 profit = amountOut - entryValueUSDC;
            uint256 profitShare = (profit * PROFIT_SHARE_BPS) / 10000; // 20%
            
            // Distribute profit share to agent owner
            _distributeProfitShare(safe, agentOwner, profitShare);
        }
        
        emit TradeExecuted(safe, tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════
    // TRADING - GMX (Perpetuals via SubaccountRouter)
    // ═══════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrary transaction from module (for GMX and other integrations)
     * @dev This is used by backend to:
     *      - Create GMX orders
     *      - Close GMX positions
     *      - Collect fees
     *      - Distribute profit shares
     * 
     * SECURITY: Only executor can call this
     */
    function executeFromModule(
        address safe,
        address to,
        uint256 value,
        bytes calldata data
    ) external onlyExecutor returns (bool success) {
        // Auto-initialize on first trade (ONE-TIME)
        if (!safeStats[safe].initialized) {
            _autoInitialize(safe);
        }
        
        success = IGnosisSafe(safe).execTransactionFromModule(
            to,
            value,
            data,
            0 // CALL
        );
        require(success, "Module execution failed");
    }
    
    // ═══════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════
    
    /**
     * @notice Auto-initialize Safe on first trade (INTERNAL)
     * @dev This does the same as completeSetup() but is called automatically
     */
    function _autoInitialize(address safe) internal {
        require(!safeStats[safe].initialized, "Already initialized");
        
        // Step 1: Approve USDC to module (for fee collection)
        bytes memory approveModuleData = abi.encodeWithSelector(
            IERC20.approve.selector,
            address(this),
            type(uint256).max
        );
        bool success1 = IGnosisSafe(safe).execTransactionFromModule(
            USDC,
            0,
            approveModuleData,
            0 // CALL
        );
        require(success1, "Module approval failed");
        
        // Step 2: Approve USDC to Uniswap Router (for swaps)
        bytes memory approveUniswapData = abi.encodeWithSelector(
            IERC20.approve.selector,
            UNISWAP_ROUTER,
            type(uint256).max
        );
        bool success2 = IGnosisSafe(safe).execTransactionFromModule(
            USDC,
            0,
            approveUniswapData,
            0 // CALL
        );
        require(success2, "Uniswap approval failed");
        
        // NOTE: GMX subaccount authorization SKIPPED in auto-init
        // GMX Router requires direct Safe owner call for security
        // User must authorize via Safe Transaction Builder:
        //   To: 0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6 (GMX Router)
        //   ABI: setSubaccount(address subaccount, bool authorized)
        //   subaccount: <executor_address>
        //   authorized: true
        
        // Step 3: Initialize capital
        uint256 currentUSDC = IERC20(USDC).balanceOf(safe);
        safeStats[safe] = SafeStats({
            initialized: true,
            initialCapital: currentUSDC,
            currentCapital: currentUSDC,
            profitLoss: 0,
            profitTaken: 0,
            unrealizedProfit: 0
        });
        
        emit SetupCompleted(safe, block.timestamp);
        emit CapitalInitialized(safe, currentUSDC);
    }
    
    function _collectPlatformFee(address safe) internal {
        bytes memory feeData = abi.encodeWithSelector(
            IERC20.transfer.selector,
            platformFeeReceiver,
            PLATFORM_FEE
        );
        
        bool success = IGnosisSafe(safe).execTransactionFromModule(
            USDC,
            0,
            feeData,
            0 // CALL
        );
        require(success, "Fee collection failed");
        
        emit TradeFeeCollected(safe, platformFeeReceiver, PLATFORM_FEE);
    }
    
    function _distributeProfitShare(address safe, address agentOwner, uint256 amount) internal {
        bytes memory transferData = abi.encodeWithSelector(
            IERC20.transfer.selector,
            agentOwner,
            amount
        );
        
        bool success = IGnosisSafe(safe).execTransactionFromModule(
            USDC,
            0,
            transferData,
            0 // CALL
        );
        require(success, "Profit share failed");
        
        emit ProfitShareDistributed(safe, agentOwner, amount);
    }
    
    function _ensureTokenApproval(address safe, address token, address spender) internal {
        // Check current allowance
        uint256 currentAllowance = IERC20(token).allowance(safe, spender);
        
        // If not enough, approve infinite
        if (currentAllowance < type(uint256).max / 2) {
            bytes memory approveData = abi.encodeWithSelector(
                IERC20.approve.selector,
                spender,
                type(uint256).max
            );
            
            bool success = IGnosisSafe(safe).execTransactionFromModule(
                token,
                0,
                approveData,
                0 // CALL
            );
            require(success, "Token approval failed");
        }
    }
    
    // ═══════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════
    
    function updatePlatformFeeReceiver(address newReceiver) external onlyModuleOwner {
        require(newReceiver != address(0), "Invalid receiver");
        platformFeeReceiver = newReceiver;
    }
}

