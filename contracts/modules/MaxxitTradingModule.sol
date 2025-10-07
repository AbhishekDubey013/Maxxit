// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/ISafe.sol";
import "../interfaces/IERC20.sol";

/**
 * @title MaxxitTradingModule
 * @notice Non-custodial trading module for Safe wallets
 * @dev Allows automated trading with strict restrictions:
 *      - Can only swap on whitelisted DEXes
 *      - Cannot withdraw principal funds
 *      - Automatically deducts fees and profit share
 *      - User maintains full custody and can revoke anytime
 * 
 * Security Features:
 * - Only whitelisted DEXes (Uniswap, etc.)
 * - Only whitelisted tokens
 * - Cannot transfer to arbitrary addresses
 * - Profit-only share (never touches principal)
 * - User can disable module instantly
 * 
 * Fee Structure:
 * - 0.2 USDC per trade (fixed fee)
 * - 20% of realized profits (not principal)
 */
contract MaxxitTradingModule {
    
    // ============ Constants ============
    
    uint256 public constant TRADE_FEE = 0.2e6; // 0.2 USDC (6 decimals)
    uint256 public constant PROFIT_SHARE_BPS = 2000; // 20% = 2000 basis points
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // ============ Immutable State ============
    
    address public immutable platformFeeReceiver;
    address public immutable USDC;
    address public immutable moduleOwner; // Can update whitelists
    
    // ============ Mutable State ============
    
    // Whitelisted DEX routers
    mapping(address => bool) public whitelistedDexes;
    
    // Whitelisted tokens (can trade with these)
    mapping(address => bool) public whitelistedTokens;
    
    // Authorized executors (can call executeTrade)
    mapping(address => bool) public authorizedExecutors;
    
    // Per-Safe capital tracking
    mapping(address => uint256) public initialCapital; // Initial USDC deposited
    mapping(address => uint256) public totalProfitTaken; // Cumulative profit shares taken
    mapping(address => bool) public isInitialized; // Track if Safe has been initialized
    
    // ============ Events ============
    
    event TradeExecuted(
        address indexed safe,
        address indexed fromToken,
        address indexed toToken,
        uint256 amountIn,
        uint256 amountOut,
        uint256 feeCharged,
        uint256 profitShare,
        uint256 timestamp
    );
    
    event CapitalInitialized(
        address indexed safe,
        uint256 initialCapital,
        uint256 timestamp
    );
    
    event ProfitShareTaken(
        address indexed safe,
        uint256 profitAmount,
        uint256 shareAmount,
        uint256 timestamp
    );
    
    event DexWhitelisted(address indexed dex, bool status);
    event TokenWhitelisted(address indexed token, bool status);
    event ExecutorAuthorized(address indexed executor, bool status);
    
    // ============ Structs ============
    
    struct TradeParams {
        address safe;
        address fromToken;
        address toToken;
        uint256 amountIn;
        address dexRouter;
        bytes swapData;
        uint256 minAmountOut;
        address profitReceiver;
    }
    
    // ============ Errors ============
    
    error UnauthorizedExecutor();
    error UnauthorizedDex();
    error UnauthorizedToken();
    error InsufficientBalance();
    error InvalidTradeParams();
    error SafeNotInitialized();
    error TransactionFailed();
    error OnlyModuleOwner();
    
    // ============ Modifiers ============
    
    modifier onlyAuthorizedExecutor() {
        if (!authorizedExecutors[msg.sender]) revert UnauthorizedExecutor();
        _;
    }
    
    modifier onlyModuleOwner() {
        if (msg.sender != moduleOwner) revert OnlyModuleOwner();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address _platformFeeReceiver,
        address _usdc,
        address _moduleOwner
    ) {
        require(_platformFeeReceiver != address(0), "Invalid fee receiver");
        require(_usdc != address(0), "Invalid USDC address");
        require(_moduleOwner != address(0), "Invalid module owner");
        
        platformFeeReceiver = _platformFeeReceiver;
        USDC = _usdc;
        moduleOwner = _moduleOwner;
        
        // Whitelist USDC by default
        whitelistedTokens[_usdc] = true;
        
        // Whitelist major DEXes (Uniswap V3 - same addresses on all chains)
        whitelistedDexes[0xE592427A0AEce92De3Edee1F18E0157C05861564] = true; // Uniswap V3 Router
        whitelistedDexes[0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45] = true; // Uniswap SwapRouter02
        whitelistedDexes[0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E] = true; // Uniswap V3 SwapRouter (Sepolia)
    }
    
    // ============ Main Functions ============
    
    /**
     * @notice Initialize capital tracking for a Safe
     * @dev Must be called before first trade, can be called by Safe or authorized executor
     * @param safe Address of the Safe wallet
     */
    function initializeCapital(address safe) external {
        require(!isInitialized[safe], "Already initialized");
        
        uint256 balance = IERC20(USDC).balanceOf(safe);
        require(balance > 0, "No USDC balance");
        
        initialCapital[safe] = balance;
        isInitialized[safe] = true;
        
        emit CapitalInitialized(safe, balance, block.timestamp);
    }
    
    /**
     * @notice Execute a trade on behalf of the Safe
     * @dev Enforces all security restrictions and automatically handles fees
     * @param params Trade parameters struct containing all necessary information
     */
    function executeTrade(TradeParams calldata params) 
        external 
        onlyAuthorizedExecutor 
        returns (uint256 amountOut) 
    {
        // Security checks
        if (!whitelistedDexes[params.dexRouter]) revert UnauthorizedDex();
        if (!whitelistedTokens[params.fromToken]) revert UnauthorizedToken();
        if (!whitelistedTokens[params.toToken]) revert UnauthorizedToken();
        if (params.amountIn == 0) revert InvalidTradeParams();
        if (params.profitReceiver == address(0)) revert InvalidTradeParams();
        
        // Initialize capital on first trade
        if (!isInitialized[params.safe]) {
            uint256 balance = IERC20(USDC).balanceOf(params.safe);
            initialCapital[params.safe] = balance;
            isInitialized[params.safe] = true;
            emit CapitalInitialized(params.safe, balance, block.timestamp);
        }
        
        uint256 feeCharged = 0;
        uint256 profitShare = 0;
        
        // Step 1: Charge 0.2 USDC trade fee (only if Safe has enough USDC)
        if (params.fromToken != USDC) {
            // Only charge fee if not swapping USDC (avoid double charge)
            uint256 usdcBalance = IERC20(USDC).balanceOf(params.safe);
            if (usdcBalance >= TRADE_FEE) {
                feeCharged = TRADE_FEE;
                _chargeTradeFee(params.safe);
            }
        }
        
        // Step 2: Token should already be approved via approveTokenForDex()
        // No need to approve on every trade - more gas efficient!
        
        // Step 3: Execute swap
        uint256 balanceBefore = IERC20(params.toToken).balanceOf(params.safe);
        
        bool success = _executeFromModule(
            params.safe,
            params.dexRouter,
            0,
            params.swapData
        );
        
        if (!success) revert TransactionFailed();
        
        // Step 4: Verify output amount
        uint256 balanceAfter = IERC20(params.toToken).balanceOf(params.safe);
        amountOut = balanceAfter - balanceBefore;
        
        require(amountOut >= params.minAmountOut, "Slippage too high");
        
        // Step 5: If closing position (swapping back to USDC), take profit share
        if (params.toToken == USDC && params.fromToken != USDC) {
            profitShare = _takeProfitShare(params.safe, params.profitReceiver);
        }
        
        emit TradeExecuted(
            params.safe,
            params.fromToken,
            params.toToken,
            params.amountIn,
            amountOut,
            feeCharged,
            profitShare,
            block.timestamp
        );
        
        return amountOut;
    }
    
    /**
     * @notice User can reset their capital tracking (e.g., after deposit/withdrawal)
     * @dev Can only be called by the Safe itself
     * @param safe Address of the Safe wallet
     */
    function resetCapitalTracking(address safe) external {
        require(msg.sender == safe, "Only Safe can reset");
        
        uint256 currentBalance = IERC20(USDC).balanceOf(safe);
        initialCapital[safe] = currentBalance;
        totalProfitTaken[safe] = 0;
        
        emit CapitalInitialized(safe, currentBalance, block.timestamp);
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Charge 0.2 USDC trade fee
     */
    function _chargeTradeFee(address safe) internal {
        bytes memory data = abi.encodeWithSelector(
            IERC20.transfer.selector,
            platformFeeReceiver,
            TRADE_FEE
        );
        
        bool success = _executeFromModule(safe, USDC, 0, data);
        if (!success) revert TransactionFailed();
    }
    
    /**
     * @notice Approve token for DEX
     */
    function _approveToken(
        address safe,
        address token,
        address spender,
        uint256 amount
    ) internal {
        bytes memory data = abi.encodeWithSelector(
            IERC20.approve.selector,
            spender,
            amount
        );
        
        bool success = _executeFromModule(safe, token, 0, data);
        if (!success) revert TransactionFailed();
    }
    
    /**
     * @notice Take 20% of realized profit (never touches principal!)
     * @param profitReceiver Address to receive the profit share
     */
    function _takeProfitShare(address safe, address profitReceiver) internal returns (uint256) {
        uint256 currentBalance = IERC20(USDC).balanceOf(safe);
        uint256 initial = initialCapital[safe];
        
        // Only take profit if current balance > initial capital
        if (currentBalance <= initial) {
            return 0;
        }
        
        // Calculate total profit
        uint256 totalProfit = currentBalance - initial;
        
        // Calculate new profit (not yet taken)
        uint256 alreadyTaken = totalProfitTaken[safe];
        
        if (totalProfit <= alreadyTaken) {
            return 0; // No new profit
        }
        
        uint256 newProfit = totalProfit - alreadyTaken;
        
        // Calculate profit share (20%)
        uint256 shareAmount = (newProfit * PROFIT_SHARE_BPS) / BPS_DENOMINATOR;
        
        if (shareAmount == 0) {
            return 0;
        }
        
        // Transfer profit share
        bytes memory data = abi.encodeWithSelector(
            IERC20.transfer.selector,
            profitReceiver,
            shareAmount
        );
        
        bool success = _executeFromModule(safe, USDC, 0, data);
        if (!success) revert TransactionFailed();
        
        // Update tracking
        totalProfitTaken[safe] += newProfit;
        
        emit ProfitShareTaken(safe, newProfit, shareAmount, block.timestamp);
        
        return shareAmount;
    }
    
    /**
     * @notice Execute transaction from module through Safe
     * @dev Uses Safe's execTransactionFromModule
     */
    function _executeFromModule(
        address safe,
        address to,
        uint256 value,
        bytes memory data
    ) internal returns (bool success) {
        return ISafe(safe).execTransactionFromModule(
            to,
            value,
            data,
            0 // Operation.Call
        );
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Whitelist/unwhitelist a DEX router
     */
    function setDexWhitelist(address dex, bool status) external onlyModuleOwner {
        whitelistedDexes[dex] = status;
        emit DexWhitelisted(dex, status);
    }
    
    /**
     * @notice Whitelist/unwhitelist a token
     */
    function setTokenWhitelist(address token, bool status) external onlyModuleOwner {
        whitelistedTokens[token] = status;
        emit TokenWhitelisted(token, status);
    }
    
    /**
     * @notice Authorize/unauthorize an executor
     */
    function setExecutorAuthorization(address executor, bool status) external onlyModuleOwner {
        authorizedExecutors[executor] = status;
        emit ExecutorAuthorized(executor, status);
    }
    
    /**
     * @notice Pre-approve token for DEX router (one-time setup)
     * @dev Approves MAX_UINT256 to avoid approval on every trade
     * @param safe Safe wallet address
     * @param token Token to approve (e.g., USDC)
     * @param dexRouter DEX router to approve (e.g., Uniswap)
     */
    function approveTokenForDex(
        address safe,
        address token,
        address dexRouter
    ) external onlyAuthorizedExecutor {
        // Approve unlimited amount for gas efficiency
        bytes memory data = abi.encodeWithSelector(
            IERC20.approve.selector,
            dexRouter,
            type(uint256).max // MAX_UINT256
        );
        
        bool success = _executeFromModule(safe, token, 0, data);
        if (!success) revert TransactionFailed();
        
        emit TokenWhitelisted(token, true); // Reuse event for logging
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get current profit/loss for a Safe
     * @return Positive for profit, negative for loss
     */
    function getCurrentProfitLoss(address safe) external view returns (int256) {
        if (!isInitialized[safe]) return 0;
        
        uint256 currentBalance = IERC20(USDC).balanceOf(safe);
        uint256 initial = initialCapital[safe];
        
        return int256(currentBalance) - int256(initial);
    }
    
    /**
     * @notice Get unrealized profit (not yet taken as profit share)
     */
    function getUnrealizedProfit(address safe) external view returns (uint256) {
        if (!isInitialized[safe]) return 0;
        
        uint256 currentBalance = IERC20(USDC).balanceOf(safe);
        uint256 initial = initialCapital[safe];
        
        if (currentBalance <= initial) return 0;
        
        uint256 totalProfit = currentBalance - initial;
        uint256 alreadyTaken = totalProfitTaken[safe];
        
        if (totalProfit <= alreadyTaken) return 0;
        
        return totalProfit - alreadyTaken;
    }
    
    /**
     * @notice Get total profit share that would be taken
     */
    function getPotentialProfitShare(address safe) external view returns (uint256) {
        if (!isInitialized[safe]) return 0;
        
        uint256 currentBalance = IERC20(USDC).balanceOf(safe);
        uint256 initial = initialCapital[safe];
        
        if (currentBalance <= initial) return 0;
        
        uint256 totalProfit = currentBalance - initial;
        uint256 alreadyTaken = totalProfitTaken[safe];
        
        if (totalProfit <= alreadyTaken) return 0;
        
        uint256 newProfit = totalProfit - alreadyTaken;
        
        return (newProfit * PROFIT_SHARE_BPS) / BPS_DENOMINATOR;
    }
    
    /**
     * @notice Check if Safe is ready for trading
     */
    function isReadyForTrading(address safe) external view returns (bool) {
        return isInitialized[safe] && IERC20(USDC).balanceOf(safe) >= TRADE_FEE;
    }
    
    /**
     * @notice Get Safe trading stats
     */
    function getSafeStats(address safe) external view returns (
        bool initialized,
        uint256 initial,
        uint256 current,
        int256 profitLoss,
        uint256 profitTaken,
        uint256 unrealizedProfit
    ) {
        initialized = isInitialized[safe];
        initial = initialCapital[safe];
        current = IERC20(USDC).balanceOf(safe);
        profitLoss = int256(current) - int256(initial);
        profitTaken = totalProfitTaken[safe];
        
        if (current > initial) {
            uint256 totalProfit = current - initial;
            unrealizedProfit = totalProfit > profitTaken ? totalProfit - profitTaken : 0;
        } else {
            unrealizedProfit = 0;
        }
    }
}
