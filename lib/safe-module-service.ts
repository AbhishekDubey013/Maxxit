/**
 * Safe Module Service
 * Interacts with MaxxitTradingModule for non-custodial trading
 */

import { ethers } from 'ethers';

// Module ABI (V2 - supports SPOT + GMX)
const MODULE_ABI = [
  // SPOT Trading
  'function executeTrade(tuple(address safe, address fromToken, address toToken, uint256 amountIn, address dexRouter, bytes swapData, uint256 minAmountOut, address profitReceiver) params) external returns (uint256)',
  
  // GMX Trading
  'function setupGMXTrading(address safe) external',
  'function executeGMXOrder(tuple(address safe, address market, uint256 collateralAmount, uint256 sizeDeltaUsd, bool isLong, uint256 acceptablePrice, uint256 executionFee, address profitReceiver) params) external payable returns (bytes32)',
  'function closeGMXPosition(tuple(address safe, address market, uint256 sizeDeltaUsd, bool isLong, uint256 acceptablePrice, uint256 executionFee, address profitReceiver) params) external payable returns (int256)',
  
  // Capital Management
  'function initializeCapital(address safe) external',
  'function resetCapitalTracking(address safe) external',
  
  // View Functions
  'function getSafeStats(address safe) external view returns (bool initialized, uint256 initial, uint256 current, int256 profitLoss, uint256 profitTaken, uint256 unrealizedProfit)',
  'function isReadyForTrading(address safe) external view returns (bool)',
  'function isReadyForGMX(address safe) external view returns (bool)',
  'function getCurrentProfitLoss(address safe) external view returns (int256)',
  'function getUnrealizedProfit(address safe) external view returns (uint256)',
  'function getPotentialProfitShare(address safe) external view returns (uint256)',
  
  // Admin Functions
  'function setExecutorAuthorization(address executor, bool status) external',
  'function setDexWhitelist(address dex, bool status) external',
  'function setTokenWhitelist(address token, bool status) external',
  'function approveTokenForDex(address safe, address token, address dexRouter) external',
  
  // Events
  'event TradeExecuted(address indexed safe, string tradeType, address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut, uint256 feeCharged, uint256 profitShare, uint256 timestamp)',
  'event GMXOrderCreated(address indexed safe, bytes32 indexed orderKey, string tokenSymbol, bool isLong, uint256 collateral, uint256 sizeDeltaUsd, uint256 feeCharged, uint256 timestamp)',
  'event GMXPositionClosed(address indexed safe, string tokenSymbol, bool isLong, int256 realizedPnL, uint256 profitShare, uint256 timestamp)',
  'event GMXSetupCompleted(address indexed safe, uint256 timestamp)',
  'event CapitalInitialized(address indexed safe, uint256 initialCapital, uint256 timestamp)',
  'event ProfitShareTaken(address indexed safe, uint256 profitAmount, uint256 shareAmount, uint256 timestamp)',
];

export interface ModuleConfig {
  moduleAddress: string;
  chainId: number;
  executorPrivateKey: string;
  rpcUrl?: string;
}

export interface SafeStats {
  initialized: boolean;
  initialCapital: string;
  currentBalance: string;
  profitLoss: string;
  profitTaken: string;
  unrealizedProfit: string;
}

export interface TradeParams {
  safeAddress: string;
  fromToken: string;
  toToken: string;
  amountIn: string;
  dexRouter: string;
  swapData: string;
  minAmountOut: string;
  profitReceiver: string; // Address to receive 20% profit share (agent creator)
}

export interface TradeResult {
  success: boolean;
  txHash?: string;
  amountOut?: string;
  feeCharged?: string;
  profitShare?: string;
  error?: string;
}

export interface GMXOrderParams {
  safeAddress: string;
  market: string;              // GMX market token address
  collateralAmount: string;    // USDC collateral (in wei, 6 decimals)
  sizeDeltaUsd: string;        // Position size USD (in wei, 30 decimals)
  isLong: boolean;
  acceptablePrice: string;     // Max price for long, min for short (30 decimals)
  executionFee: string;        // ETH for keeper (in wei, 18 decimals)
  profitReceiver: string;      // Agent creator address
}

export interface GMXCloseParams {
  safeAddress: string;
  market: string;
  sizeDeltaUsd: string;        // Size to close (30 decimals)
  isLong: boolean;
  acceptablePrice: string;     // Min price for long, max for short (30 decimals)
  executionFee: string;        // ETH for keeper
  profitReceiver: string;      // Agent creator address
}

export interface GMXResult {
  success: boolean;
  txHash?: string;
  orderKey?: string;
  realizedPnL?: string;
  profitShare?: string;
  error?: string;
}

export class SafeModuleService {
  private provider: ethers.providers.Provider;
  private executor: ethers.Wallet;
  private module: ethers.Contract;
  private chainId: number;
  private static noncePromises: Map<string, Promise<number>> = new Map();

  constructor(config: ModuleConfig) {
    this.chainId = config.chainId;

    // Setup provider
    const rpcUrls: { [chainId: number]: string } = {
      11155111: config.rpcUrl || process.env.SEPOLIA_RPC || 'https://ethereum-sepolia.publicnode.com',
      42161: config.rpcUrl || process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
      421614: config.rpcUrl || process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
    };

    this.provider = new ethers.providers.JsonRpcProvider(rpcUrls[config.chainId]);

    // Setup executor wallet
    this.executor = new ethers.Wallet(config.executorPrivateKey, this.provider);

    // Setup module contract
    this.module = new ethers.Contract(
      config.moduleAddress,
      MODULE_ABI,
      this.executor
    );
  }

  /**
   * Get next nonce for executor wallet (with mutex to prevent race conditions)
   */
  private async getNextNonce(): Promise<number> {
    const address = this.executor.address;
    
    // Wait for any pending nonce request for this address
    const pendingNonce = SafeModuleService.noncePromises.get(address);
    if (pendingNonce) {
      await pendingNonce;
    }
    
    // Create new promise for this nonce request
    const noncePromise = (async () => {
      const nonce = await this.provider.getTransactionCount(address, 'pending');
      console.log(`[SafeModule] Got nonce ${nonce} for ${address}`);
      return nonce;
    })();
    
    SafeModuleService.noncePromises.set(address, noncePromise);
    const nonce = await noncePromise;
    
    // Clean up after a short delay
    setTimeout(() => {
      if (SafeModuleService.noncePromises.get(address) === noncePromise) {
        SafeModuleService.noncePromises.delete(address);
      }
    }, 100);
    
    return nonce;
  }

  /**
   * Initialize capital tracking for a Safe (call before first trade)
   */
  async initializeCapital(safeAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const tx = await this.module.initializeCapital(safeAddress);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error: any) {
      console.error('[SafeModule] Initialize capital error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize capital',
      };
    }
  }

  /**
   * Execute a trade through the module
   */
  async executeTrade(params: TradeParams): Promise<TradeResult> {
    try {
      console.log('[SafeModule] Executing trade:', {
        safe: params.safeAddress,
        from: params.fromToken,
        to: params.toToken,
        amountIn: params.amountIn,
        profitReceiver: params.profitReceiver,
      });

      // Call module's executeTrade function with struct
      const tradeParams = {
        safe: params.safeAddress,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amountIn: params.amountIn,
        dexRouter: params.dexRouter,
        swapData: params.swapData,
        minAmountOut: params.minAmountOut,
        profitReceiver: params.profitReceiver,
      };

      // Get next nonce to prevent race conditions
      const nonce = await this.getNextNonce();
      
      const tx = await this.module.executeTrade(
        tradeParams,
        {
          gasLimit: 1000000, // Adjust as needed
          nonce, // Explicit nonce to prevent conflicts
        }
      );

      console.log('[SafeModule] Transaction sent:', tx.hash, 'with nonce:', nonce);

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log('[SafeModule] Transaction confirmed:', receipt.transactionHash);

      // Parse events
      const tradeEvent = receipt.events?.find(
        (e: any) => e.event === 'TradeExecuted'
      );

      let amountOut: string | undefined;
      let feeCharged: string | undefined;
      let profitShare: string | undefined;

      if (tradeEvent) {
        amountOut = tradeEvent.args.amountOut.toString();
        feeCharged = tradeEvent.args.feeCharged.toString();
        profitShare = tradeEvent.args.profitShare.toString();
      }

      return {
        success: true,
        txHash: receipt.transactionHash,
        amountOut,
        feeCharged,
        profitShare,
      };
    } catch (error: any) {
      console.error('[SafeModule] Execute trade error:', error);
      return {
        success: false,
        error: error.message || 'Trade execution failed',
      };
    }
  }

  /**
   * Get Safe trading statistics
   */
  async getSafeStats(safeAddress: string): Promise<SafeStats> {
    try {
      const stats = await this.module.getSafeStats(safeAddress);

      return {
        initialized: stats.initialized,
        initialCapital: ethers.utils.formatUnits(stats.initial, 6), // USDC has 6 decimals
        currentBalance: ethers.utils.formatUnits(stats.current, 6),
        profitLoss: ethers.utils.formatUnits(stats.profitLoss, 6),
        profitTaken: ethers.utils.formatUnits(stats.profitTaken, 6),
        unrealizedProfit: ethers.utils.formatUnits(stats.unrealizedProfit, 6),
      };
    } catch (error: any) {
      console.error('[SafeModule] Get stats error:', error);
      throw error;
    }
  }

  /**
   * Check if Safe is ready for trading
   */
  async isReadyForTrading(safeAddress: string): Promise<boolean> {
    try {
      return await this.module.isReadyForTrading(safeAddress);
    } catch (error: any) {
      console.error('[SafeModule] Is ready check error:', error);
      return false;
    }
  }

  /**
   * Get current profit/loss
   */
  async getCurrentProfitLoss(safeAddress: string): Promise<string> {
    try {
      const profitLoss = await this.module.getCurrentProfitLoss(safeAddress);
      return ethers.utils.formatUnits(profitLoss, 6);
    } catch (error: any) {
      console.error('[SafeModule] Get profit/loss error:', error);
      return '0';
    }
  }

  /**
   * Check if token is already approved for DEX
   */
  async checkTokenApproval(
    safeAddress: string,
    tokenAddress: string,
    spender: string
  ): Promise<boolean> {
    try {
      const erc20Abi = ['function allowance(address owner, address spender) view returns (uint256)'];
      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
      const allowance = await tokenContract.allowance(safeAddress, spender);
      
      // Check if allowance is greater than a reasonable threshold
      const isApproved = allowance.gt(ethers.utils.parseEther('100000')); // 100k tokens
      console.log('[SafeModule] Token approval check:', {
        token: tokenAddress,
        safe: safeAddress,
        spender,
        allowance: allowance.toString(),
        isApproved,
      });
      
      return isApproved;
    } catch (error: any) {
      console.error('[SafeModule] Check approval error:', error);
      return false;
    }
  }

  /**
   * Approve token for DEX router (one-time setup)
   */
  async approveTokenForDex(
    safeAddress: string,
    tokenAddress: string,
    dexRouter: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('[SafeModule] Approving token for DEX:', {
        safe: safeAddress,
        token: tokenAddress,
        dexRouter,
      });

      // Get next nonce to prevent race conditions
      const nonce = await this.getNextNonce();

      const tx = await this.module.approveTokenForDex(
        safeAddress,
        tokenAddress,
        dexRouter,
        {
          gasLimit: 300000,
          nonce, // Explicit nonce to prevent conflicts
        }
      );

      console.log('[SafeModule] Approval transaction sent:', tx.hash);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log('[SafeModule] Approval confirmed');
        return {
          success: true,
          txHash: receipt.transactionHash,
        };
      } else {
        return {
          success: false,
          error: 'Approval transaction reverted',
        };
      }
    } catch (error: any) {
      console.error('[SafeModule] Approval error:', error);
      return {
        success: false,
        error: error.message || 'Approval failed',
      };
    }
  }

  /**
   * Get unrealized profit (profit that would be taken on next close)
   */
  async getUnrealizedProfit(safeAddress: string): Promise<string> {
    try {
      const profit = await this.module.getUnrealizedProfit(safeAddress);
      return ethers.utils.formatUnits(profit, 6);
    } catch (error: any) {
      console.error('[SafeModule] Get unrealized profit error:', error);
      return '0';
    }
  }

  /**
   * Get potential profit share amount
   */
  async getPotentialProfitShare(safeAddress: string): Promise<string> {
    try {
      const share = await this.module.getPotentialProfitShare(safeAddress);
      return ethers.utils.formatUnits(share, 6);
    } catch (error: any) {
      console.error('[SafeModule] Get profit share error:', error);
      return '0';
    }
  }

  /**
   * Reset capital tracking (admin function, called by Safe itself)
   */
  async resetCapitalTracking(safeAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const tx = await this.module.resetCapitalTracking(safeAddress);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error: any) {
      console.error('[SafeModule] Reset tracking error:', error);
      return {
        success: false,
        error: error.message || 'Failed to reset tracking',
      };
    }
  }

  // Admin functions (only module owner can call)

  /**
   * Authorize/unauthorize an executor
   */
  async setExecutorAuthorization(executor: string, status: boolean): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const tx = await this.module.setExecutorAuthorization(executor, status);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error: any) {
      console.error('[SafeModule] Set executor authorization error:', error);
      return {
        success: false,
        error: error.message || 'Failed to set executor authorization',
      };
    }
  }

  /**
   * Whitelist/unwhitelist a DEX
   */
  async setDexWhitelist(dex: string, status: boolean): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const tx = await this.module.setDexWhitelist(dex, status);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error: any) {
      console.error('[SafeModule] Set DEX whitelist error:', error);
      return {
        success: false,
        error: error.message || 'Failed to set DEX whitelist',
      };
    }
  }

  /**
   * Whitelist/unwhitelist a token
   */
  async setTokenWhitelist(token: string, status: boolean): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const tx = await this.module.setTokenWhitelist(token, status);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error: any) {
      console.error('[SafeModule] Set token whitelist error:', error);
      return {
        success: false,
        error: error.message || 'Failed to set token whitelist',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GMX TRADING FUNCTIONS (V2)
  // ═══════════════════════════════════════════════════════════

  /**
   * Setup GMX trading for a Safe (one-time setup)
   */
  async setupGMXTrading(safeAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('[SafeModule] Setting up GMX trading for Safe:', safeAddress);

      const nonce = await this.getNextNonce();

      const tx = await this.module.setupGMXTrading(safeAddress, {
        gasLimit: 300000,
        nonce,
      });

      console.log('[SafeModule] GMX setup transaction sent:', tx.hash);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        console.log('[SafeModule] GMX setup confirmed');
        return {
          success: true,
          txHash: receipt.transactionHash,
        };
      } else {
        return {
          success: false,
          error: 'GMX setup transaction reverted',
        };
      }
    } catch (error: any) {
      console.error('[SafeModule] GMX setup error:', error);
      return {
        success: false,
        error: error.message || 'GMX setup failed',
      };
    }
  }

  /**
   * Execute GMX perpetual order (open position)
   */
  async executeGMXOrder(params: GMXOrderParams): Promise<GMXResult> {
    try {
      console.log('[SafeModule] Executing GMX order:', {
        safe: params.safeAddress,
        market: params.market,
        collateral: params.collateralAmount,
        size: params.sizeDeltaUsd,
        isLong: params.isLong,
        profitReceiver: params.profitReceiver,
      });

      // Build order params struct
      const orderParams = {
        safe: params.safeAddress,
        market: params.market,
        collateralAmount: params.collateralAmount,
        sizeDeltaUsd: params.sizeDeltaUsd,
        isLong: params.isLong,
        acceptablePrice: params.acceptablePrice,
        executionFee: params.executionFee,
        profitReceiver: params.profitReceiver,
      };

      // Get next nonce
      const nonce = await this.getNextNonce();

      // Call module (payable - sends ETH for execution fee)
      const tx = await this.module.executeGMXOrder(orderParams, {
        value: params.executionFee,
        gasLimit: 1500000, // GMX orders need more gas
        nonce,
      });

      console.log('[SafeModule] GMX order transaction sent:', tx.hash, 'with nonce:', nonce);

      const receipt = await tx.wait();

      console.log('[SafeModule] GMX order confirmed:', receipt.transactionHash);

      // Parse GMXOrderCreated event
      const orderEvent = receipt.events?.find(
        (e: any) => e.event === 'GMXOrderCreated'
      );

      let orderKey: string | undefined;
      let feeCharged: string | undefined;

      if (orderEvent) {
        orderKey = orderEvent.args.orderKey;
        feeCharged = orderEvent.args.feeCharged.toString();
      }

      return {
        success: true,
        txHash: receipt.transactionHash,
        orderKey,
      };
    } catch (error: any) {
      console.error('[SafeModule] GMX order error:', error);
      return {
        success: false,
        error: error.message || 'GMX order execution failed',
      };
    }
  }

  /**
   * Close GMX perpetual position
   */
  async closeGMXPosition(params: GMXCloseParams): Promise<GMXResult> {
    try {
      console.log('[SafeModule] Closing GMX position:', {
        safe: params.safeAddress,
        market: params.market,
        size: params.sizeDeltaUsd,
        isLong: params.isLong,
        profitReceiver: params.profitReceiver,
      });

      // Build close params struct
      const closeParams = {
        safe: params.safeAddress,
        market: params.market,
        sizeDeltaUsd: params.sizeDeltaUsd,
        isLong: params.isLong,
        acceptablePrice: params.acceptablePrice,
        executionFee: params.executionFee,
        profitReceiver: params.profitReceiver,
      };

      // Get next nonce
      const nonce = await this.getNextNonce();

      // Call module (payable - sends ETH for execution fee)
      const tx = await this.module.closeGMXPosition(closeParams, {
        value: params.executionFee,
        gasLimit: 1500000,
        nonce,
      });

      console.log('[SafeModule] GMX close transaction sent:', tx.hash, 'with nonce:', nonce);

      const receipt = await tx.wait();

      console.log('[SafeModule] GMX position closed:', receipt.transactionHash);

      // Parse GMXPositionClosed event
      const closeEvent = receipt.events?.find(
        (e: any) => e.event === 'GMXPositionClosed'
      );

      let realizedPnL: string | undefined;
      let profitShare: string | undefined;

      if (closeEvent) {
        realizedPnL = closeEvent.args.realizedPnL.toString();
        profitShare = closeEvent.args.profitShare.toString();
      }

      return {
        success: true,
        txHash: receipt.transactionHash,
        realizedPnL,
        profitShare,
      };
    } catch (error: any) {
      console.error('[SafeModule] GMX close error:', error);
      return {
        success: false,
        error: error.message || 'GMX position close failed',
      };
    }
  }

  /**
   * Check if Safe is ready for GMX trading
   */
  async isReadyForGMX(safeAddress: string): Promise<boolean> {
    try {
      return await this.module.isReadyForGMX(safeAddress);
    } catch (error: any) {
      console.error('[SafeModule] Is ready for GMX check error:', error);
      return false;
    }
  }
}

// Factory function
export function createSafeModuleService(
  moduleAddress: string,
  chainId: number,
  executorPrivateKey?: string
): SafeModuleService {
  const privateKey = executorPrivateKey || process.env.EXECUTOR_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error('EXECUTOR_PRIVATE_KEY is required');
  }

  return new SafeModuleService({
    moduleAddress,
    chainId,
    executorPrivateKey: privateKey,
  });
}
