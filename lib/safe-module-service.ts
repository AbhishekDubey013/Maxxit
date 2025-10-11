/**
 * Safe Module Service
 * Interacts with MaxxitTradingModule for non-custodial trading
 */

import { ethers } from 'ethers';

// Module ABI (key functions)
const MODULE_ABI = [
  // Updated to use TradeParams struct
  'function executeTrade(tuple(address safe, address fromToken, address toToken, uint256 amountIn, address dexRouter, bytes swapData, uint256 minAmountOut, address profitReceiver) params) external returns (uint256)',
  'function initializeCapital(address safe) external',
  'function resetCapitalTracking(address safe) external',
  'function getSafeStats(address safe) external view returns (bool initialized, uint256 initial, uint256 current, int256 profitLoss, uint256 profitTaken, uint256 unrealizedProfit)',
  'function isReadyForTrading(address safe) external view returns (bool)',
  'function getCurrentProfitLoss(address safe) external view returns (int256)',
  'function getUnrealizedProfit(address safe) external view returns (uint256)',
  'function getPotentialProfitShare(address safe) external view returns (uint256)',
  'function setExecutorAuthorization(address executor, bool status) external',
  'function setDexWhitelist(address dex, bool status) external',
  'function setTokenWhitelist(address token, bool status) external',
  'function approveTokenForDex(address safe, address token, address dexRouter) external',
  'event TradeExecuted(address indexed safe, address indexed fromToken, address indexed toToken, uint256 amountIn, uint256 amountOut, uint256 feeCharged, uint256 profitShare, uint256 timestamp)',
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
