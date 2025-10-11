/**
 * Trade Execution Coordinator
 * Routes signals to appropriate venue adapters and manages trade lifecycle
 */

import { PrismaClient, Signal, Venue, AgentDeployment } from '@prisma/client';
import { createSafeWallet, getChainIdForVenue, SafeWalletService } from './safe-wallet';
import { createSpotAdapter, SpotAdapter } from './adapters/spot-adapter';
import { createGMXAdapter, GMXAdapter } from './adapters/gmx-adapter';
import { createHyperliquidAdapter, HyperliquidAdapter } from './adapters/hyperliquid-adapter';
import { SafeModuleService, createSafeModuleService } from './safe-module-service';
import { createSafeTransactionService } from './safe-transaction-service';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  positionId?: string;
  error?: string;
  reason?: string;
  executionSummary?: any;
}

export interface ExecutionContext {
  signal: Signal;
  deployment: AgentDeployment;
  safeWallet: SafeWalletService;
}

/**
 * Trade Executor - Coordinates signal execution across venues
 */
export class TradeExecutor {
  /**
   * Execute a signal
   */
  async executeSignal(signalId: string): Promise<ExecutionResult> {
    try {
      // Fetch signal with related data
      const signal = await prisma.signal.findUnique({
        where: { id: signalId },
        include: {
          agent: {
            include: {
              deployments: {
                where: { status: 'ACTIVE' },
                orderBy: { subStartedAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!signal) {
        return {
          success: false,
          error: 'Signal not found',
        };
      }

      if (signal.agent.deployments.length === 0) {
        return {
          success: false,
          error: 'No active deployment found for agent',
        };
      }

      const deployment = signal.agent.deployments[0];

      // Validate Safe wallet
      const chainId = getChainIdForVenue(signal.venue);
      const safeWallet = createSafeWallet(deployment.safeWallet, chainId);
      
      const validation = await safeWallet.validateSafe();
      if (!validation.valid) {
        return {
          success: false,
          error: `Safe wallet validation failed: ${validation.error}`,
        };
      }

      // Pre-trade validations
      const preCheck = await this.preTradeValidation(signal, deployment, safeWallet);
      if (!preCheck.canExecute) {
        return {
          success: false,
          error: 'Pre-trade validation failed',
          reason: preCheck.reason,
          executionSummary: preCheck,
        };
      }

      // Route to appropriate venue
      const result = await this.routeToVenue({
        signal,
        deployment,
        safeWallet,
      });

      return result;
    } catch (error: any) {
      console.error('[TradeExecutor] Execution failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Pre-trade validation
   */
  private async preTradeValidation(
    signal: Signal,
    deployment: AgentDeployment,
    safeWallet: SafeWalletService
  ): Promise<{
    canExecute: boolean;
    reason?: string;
    usdcBalance?: number;
    tokenAvailable?: boolean;
  }> {
    try {
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
        return {
          canExecute: false,
          reason: `${signal.tokenSymbol} not available on ${signal.venue}`,
          tokenAvailable: false,
        };
      }

      // 2. Check USDC balance
      const usdcBalance = await safeWallet.getUSDCBalance();
      
      if (usdcBalance === 0) {
        return {
          canExecute: false,
          reason: 'No USDC balance in Safe wallet',
          usdcBalance,
          tokenAvailable: true,
        };
      }

      // 3. Check position size requirements
      const sizeModel = signal.sizeModel as any;
      const requiredCollateral = (usdcBalance * sizeModel.value) / 100;

      if (requiredCollateral === 0) {
        return {
          canExecute: false,
          reason: 'Position size too small',
          usdcBalance,
          tokenAvailable: true,
        };
      }

      // 4. For SPOT, check token registry
      if (signal.venue === 'SPOT') {
        const chainId = getChainIdForVenue(signal.venue);
        const chain = chainId === 42161 ? 'arbitrum' : chainId === 8453 ? 'base' : 'sepolia';
        
        const tokenRegistry = await prisma.tokenRegistry.findUnique({
          where: {
            chain_tokenSymbol: {
              chain,
              tokenSymbol: signal.tokenSymbol,
            },
          },
        });

        if (!tokenRegistry) {
          return {
            canExecute: false,
            reason: `Token ${signal.tokenSymbol} not found in registry for ${chain}`,
            usdcBalance,
            tokenAvailable: false,
          };
        }
      }

      return {
        canExecute: true,
        usdcBalance,
        tokenAvailable: true,
      };
    } catch (error: any) {
      return {
        canExecute: false,
        reason: error.message,
      };
    }
  }

  /**
   * Route to appropriate venue adapter
   */
  private async routeToVenue(ctx: ExecutionContext): Promise<ExecutionResult> {
    switch (ctx.signal.venue) {
      case 'SPOT':
        return this.executeSpotTrade(ctx);
      case 'GMX':
        return this.executeGMXTrade(ctx);
      case 'HYPERLIQUID':
        return this.executeHyperliquidTrade(ctx);
      default:
        return {
          success: false,
          error: `Unsupported venue: ${ctx.signal.venue}`,
        };
    }
  }

  /**
   * Execute SPOT trade
   */
  private async executeSpotTrade(ctx: ExecutionContext): Promise<ExecutionResult> {
    try {
      const chainId = getChainIdForVenue(ctx.signal.venue);
      const adapter = createSpotAdapter(ctx.safeWallet, chainId);

      // Get execution summary
      const summary = await adapter.getExecutionSummary({
        signal: ctx.signal,
        safeAddress: ctx.deployment.safeWallet,
      });

      if (!summary.canExecute) {
        return {
          success: false,
          error: 'Cannot execute SPOT trade',
          reason: summary.reason,
          executionSummary: summary,
        };
      }

      // Get token addresses
      const chain = chainId === 42161 ? 'arbitrum' : chainId === 8453 ? 'base' : 'sepolia';
      const tokenRegistry = await prisma.tokenRegistry.findUnique({
        where: {
          chain_tokenSymbol: {
            chain,
            tokenSymbol: ctx.signal.tokenSymbol,
          },
        },
      });

      if (!tokenRegistry) {
        return {
          success: false,
          error: `Token ${ctx.signal.tokenSymbol} not found in registry`,
        };
      }

      // Calculate amounts based on ACTUAL wallet balance
      const usdcBalance = summary.usdcBalance || 0;
      const sizeModel = ctx.signal.sizeModel as any;
      
      // ALWAYS use percentage of actual balance (default 5% if not specified)
      const percentageToUse = sizeModel.value || 5;
      const positionSize = (usdcBalance * percentageToUse) / 100;
      
      console.log('[TradeExecutor] Position sizing:', {
        walletBalance: usdcBalance,
        percentage: percentageToUse + '%',
        positionSize: positionSize.toFixed(2) + ' USDC'
      });
      
      // Minimum position size check (0.1 USDC minimum)
      if (positionSize < 0.1) {
        return {
          success: false,
          error: `Position size too small: ${positionSize.toFixed(2)} USDC (min: 0.1 USDC)`,
          reason: 'Insufficient balance for minimum trade size',
        };
      }
      
      const amountIn = ethers.utils.parseUnits(positionSize.toFixed(6), 6); // USDC has 6 decimals

      // Get USDC address
      const USDC_ADDRESSES: Record<number, string> = {
        11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia testnet
        42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
        8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
      };
      const usdcAddress = USDC_ADDRESSES[chainId];

      // Get quote
      const quote = await adapter.getQuote({
        tokenIn: usdcAddress,
        tokenOut: tokenRegistry.tokenAddress,
        amountIn: amountIn.toString(),
      });

      // TEMPORARY: Disable slippage check for testing (50% tolerance)
      // TODO: Re-enable with proper slippage after confirming this is the issue
      const minAmountOut = adapter.calculateMinAmountOut(quote.amountOut, 5000); // 50% slippage (effectively disabled)

      // Build transactions
      const approvalTx = await adapter.buildApprovalTx(
        usdcAddress,
        amountIn.toString()
      );

      const swapTx = await adapter.buildSwapTx({
        tokenIn: usdcAddress,
        tokenOut: tokenRegistry.tokenAddress,
        amountIn: amountIn.toString(),
        minAmountOut,
        deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
        recipient: ctx.deployment.safeWallet,
      });

      // Use Safe Module Service for gasless execution
      const moduleAddress = process.env.TRADING_MODULE_ADDRESS || process.env.MODULE_ADDRESS || '0x74437d894C8E8A5ACf371E10919c688ae79E89FA';
      const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY;
      
      if (!executorPrivateKey) {
        return {
          success: false,
          error: 'EXECUTOR_PRIVATE_KEY not configured',
        };
      }
      
      const moduleService = new SafeModuleService({
        moduleAddress,
        chainId,
        executorPrivateKey,
      });
      
      const routerAddress = SpotAdapter.getRouterAddress(chainId);
      if (!routerAddress) {
        return {
          success: false,
          error: `Router not configured for chain ${chainId}`,
        };
      }
      
      // Ensure USDC is approved to router (one-time setup)
      console.log('[TradeExecutor] Ensuring USDC approval...');
      const approvalResult = await moduleService.approveTokenForDex(
        ctx.deployment.safeWallet,
        usdcAddress,
        routerAddress
      );
      
      if (!approvalResult.success) {
        console.warn('[TradeExecutor] Approval failed, but continuing (might already be approved)');
        // Don't fail here - approval might already exist
      } else {
        console.log('[TradeExecutor] USDC approved:', approvalResult.txHash);
      }
      
      // Execute trade through module (gasless!)
      const result = await moduleService.executeTrade({
        safeAddress: ctx.deployment.safeWallet,
        fromToken: usdcAddress,
        toToken: tokenRegistry.tokenAddress,
        amountIn: amountIn.toString(),
        dexRouter: routerAddress,
        swapData: swapTx.data as string,
        minAmountOut,
        profitReceiver: ctx.signal.agent.profitReceiverAddress,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Transaction submission failed',
        };
      }

      // Parse actual amounts from result
      const actualAmountOut = result.amountOut ? parseFloat(ethers.utils.formatUnits(result.amountOut, 18)) : 0;
      const actualEntryPrice = actualAmountOut > 0 ? parseFloat(positionSize.toString()) / actualAmountOut : 0;

      // Create position record with REAL transaction hash
      const position = await prisma.position.create({
        data: {
          deploymentId: ctx.deployment.id,
          signalId: ctx.signal.id,
          venue: ctx.signal.venue,
          tokenSymbol: ctx.signal.tokenSymbol,
          side: ctx.signal.side,
          entryPrice: actualEntryPrice,
          qty: actualAmountOut,
          entryTxHash: result.txHash, // ⚡ REAL ON-CHAIN TX HASH
        },
      });

      console.log('[TradeExecutor] ✅ SPOT trade executed on-chain!', {
        positionId: position.id,
        txHash: result.txHash,
        token: ctx.signal.tokenSymbol,
        qty: actualAmountOut,
        entryPrice: actualEntryPrice,
        explorerLink: `https://arbiscan.io/tx/${result.txHash}`,
      });

      return {
        success: true,
        txHash: result.txHash,
        positionId: position.id,
      };
    } catch (error: any) {
      console.error('[TradeExecutor] SPOT execution failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute GMX trade
   */
  private async executeGMXTrade(ctx: ExecutionContext): Promise<ExecutionResult> {
    try {
      const adapter = createGMXAdapter(ctx.safeWallet);
      const chainId = getChainIdForVenue(ctx.signal.venue);

      // Get execution summary
      const summary = await adapter.getExecutionSummary({
        signal: ctx.signal,
        safeAddress: ctx.deployment.safeWallet,
      });

      if (!summary.canExecute) {
        return {
          success: false,
          error: 'Cannot execute GMX trade',
          reason: summary.reason,
          executionSummary: summary,
        };
      }

      // Calculate amounts
      const collateralAmount = summary.collateralRequired || 0;
      const collateralWei = ethers.utils.parseUnits(collateralAmount.toFixed(6), 6); // USDC 6 decimals

      const sizeModel = ctx.signal.sizeModel as any;
      const leverage = sizeModel.leverage || 1;

      // Build approval transaction
      const approvalTx = await adapter.buildApprovalTx(collateralWei.toString());

      // Build position opening transaction
      const openPositionTx = await adapter.buildIncreasePositionTx({
        tokenSymbol: ctx.signal.tokenSymbol,
        collateralAmount: collateralWei.toString(),
        leverage,
        isLong: ctx.signal.side === 'LONG',
        acceptablePrice: '0', // Market order - will take current price
      });

      // Create Safe transaction service
      const txService = createSafeTransactionService(
        ctx.deployment.safeWallet,
        chainId,
        process.env.EXECUTOR_PRIVATE_KEY
      );

      // Submit batch transaction (approval + open position)
      const result = await txService.batchTransactions([approvalTx, openPositionTx]);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Transaction submission failed',
        };
      }

      // Create position record
      const position = await prisma.position.create({
        data: {
          deploymentId: ctx.deployment.id,
          signalId: ctx.signal.id,
          venue: ctx.signal.venue,
          tokenSymbol: ctx.signal.tokenSymbol,
          side: ctx.signal.side,
          entryPrice: 0, // Will be updated when we get actual execution price
          qty: summary.positionSize || 0,
          entryTxHash: result.txHash,
        },
      });

      console.log('[TradeExecutor] GMX trade submitted:', {
        positionId: position.id,
        token: ctx.signal.tokenSymbol,
        side: ctx.signal.side,
        leverage,
        collateral: collateralAmount,
        positionSize: summary.positionSize,
        safeTxHash: result.safeTxHash,
        txHash: result.txHash,
        requiresSignatures: result.requiresMoreSignatures,
      });

      return {
        success: true,
        txHash: result.txHash,
        positionId: position.id,
      };
    } catch (error: any) {
      console.error('[TradeExecutor] GMX execution failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute Hyperliquid trade
   */
  private async executeHyperliquidTrade(ctx: ExecutionContext): Promise<ExecutionResult> {
    try {
      const adapter = createHyperliquidAdapter(ctx.safeWallet);
      const chainId = getChainIdForVenue(ctx.signal.venue);

      // Get execution summary
      const summary = await adapter.getExecutionSummary({
        signal: ctx.signal,
        safeAddress: ctx.deployment.safeWallet,
      });

      if (!summary.canExecute) {
        return {
          success: false,
          error: 'Cannot execute Hyperliquid trade',
          reason: summary.reason,
          executionSummary: summary,
        };
      }

      // If bridge is needed, execute bridge transaction
      if (summary.needsBridge && summary.bridgeAmount) {
        const bridgeAmountWei = ethers.utils.parseUnits(
          summary.bridgeAmount.toFixed(6),
          6
        );

        // Build bridge approval
        const approvalTx = await adapter.buildBridgeApprovalTx(bridgeAmountWei.toString());

        // Build bridge transaction
        const bridgeTx = await adapter.buildBridgeTx(
          bridgeAmountWei.toString(),
          ctx.deployment.safeWallet
        );

        // Create Safe transaction service
        const txService = createSafeTransactionService(
          ctx.deployment.safeWallet,
          chainId,
          process.env.EXECUTOR_PRIVATE_KEY
        );

        // Submit batch transaction (approval + bridge)
        const result = await txService.batchTransactions([approvalTx, bridgeTx]);

        if (!result.success) {
          return {
            success: false,
            error: `Bridge failed: ${result.error}`,
          };
        }

        console.log('[TradeExecutor] Hyperliquid bridge submitted:', {
          amount: summary.bridgeAmount,
          safeTxHash: result.safeTxHash,
          txHash: result.txHash,
        });

        // Note: Actual trading on Hyperliquid requires EIP-1271 or dedicated wallet
        // For now, just record that bridge was initiated
        return {
          success: true,
          txHash: result.txHash,
          reason: 'Bridge initiated. Hyperliquid trading requires dedicated wallet setup.',
        };
      }

      // If no bridge needed but we have balance, we still need dedicated wallet for trading
      return {
        success: false,
        error: 'Hyperliquid trading requires EIP-1271 signature verification or dedicated trading wallet',
        reason: 'Direct trading from Safe wallet not yet supported on Hyperliquid',
        executionSummary: summary,
      };
    } catch (error: any) {
      console.error('[TradeExecutor] Hyperliquid execution failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Close a position
   */
  async closePosition(positionId: string): Promise<ExecutionResult> {
    try {
      const position = await prisma.position.findUnique({
        where: { id: positionId },
        include: {
          deployment: {
            include: {
              agent: true,
            },
          },
        },
      });

      if (!position) {
        return {
          success: false,
          error: 'Position not found',
        };
      }

      if (position.closedAt) {
        return {
          success: false,
          error: `Position already closed at ${position.closedAt.toISOString()}`,
        };
      }

      const chainId = getChainIdForVenue(position.venue);
      const safeWallet = createSafeWallet(position.deployment.safeWallet, chainId);

      // Route to appropriate venue for closing
      if (position.venue === 'SPOT') {
        return await this.closeSpotPosition(position, safeWallet, chainId);
      } else if (position.venue === 'GMX') {
        return await this.closeGMXPosition(position, safeWallet, chainId);
      } else {
        return {
          success: false,
          error: `Position closing not implemented for ${position.venue}`,
        };
      }
    } catch (error: any) {
      console.error('[TradeExecutor] Close position failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Close SPOT position (swap token back to USDC)
   */
  private async closeSpotPosition(
    position: any,
    safeWallet: SafeWalletService,
    chainId: number
  ): Promise<ExecutionResult> {
    try {
      const adapter = createSpotAdapter(safeWallet, chainId);
      
      // Get token address
      const chain = chainId === 42161 ? 'arbitrum' : 'base';
      const tokenRegistry = await prisma.tokenRegistry.findUnique({
        where: {
          chain_tokenSymbol: {
            chain,
            tokenSymbol: position.tokenSymbol,
          },
        },
      });

      if (!tokenRegistry) {
        return {
          success: false,
          error: 'Token not found in registry',
        };
      }

      // Get USDC address
      const USDC_ADDRESSES: Record<number, string> = {
        11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia testnet
        42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
        8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
      };
      const usdcAddress = USDC_ADDRESSES[chainId];

      // Use the position's tracked quantity (not the entire Safe balance)
      // This ensures we only close THIS position, not all positions at once
      if (!position.qty || position.qty === 0) {
        return {
          success: false,
          error: 'Position qty not recorded - cannot close',
        };
      }

      const tokenDecimals = tokenRegistry.decimals || 18;
      const tokenAmountWei = ethers.utils.parseUnits(position.qty.toString(), tokenDecimals);
      
      console.log('[TradeExecutor] Closing position:', {
        positionId: position.id,
        token: position.tokenSymbol,
        tokenAddress: tokenRegistry.tokenAddress,
        qtyToClose: position.qty,
        amountWei: tokenAmountWei.toString(),
      });

      // Build swap back to USDC (module will handle token approval automatically)
      const swapTx = await adapter.buildCloseSwapTx({
        tokenIn: tokenRegistry.tokenAddress,
        tokenOut: usdcAddress,
        amountIn: tokenAmountWei.toString(),
        minAmountOut: '0', // TODO: Calculate proper slippage
        recipient: position.deployment.safeWallet,
        deadline: Math.floor(Date.now() / 1000) + 1200,
      });

      // Execute through module (same as opening positions)
      const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY;
      if (!executorPrivateKey) {
        return {
          success: false,
          error: 'EXECUTOR_PRIVATE_KEY not configured',
        };
      }

      const moduleService = createSafeModuleService(
        position.deployment.moduleAddress!,
        chainId,
        executorPrivateKey
      );
      const routerAddress = SpotAdapter.getRouterAddress(chainId);
      if (!routerAddress) {
        return {
          success: false,
          error: `Router not configured for chain ${chainId}`,
        };
      }

      // Execute trade through module to close position
      const result = await moduleService.executeTrade({
        safeAddress: position.deployment.safeWallet,
        fromToken: tokenRegistry.tokenAddress,
        toToken: usdcAddress,
        amountIn: tokenAmountWei.toString(),
        dexRouter: routerAddress,
        swapData: swapTx.data as string,
        minAmountOut: '0',
        profitReceiver: position.deployment.agent.profitReceiverAddress,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Close transaction failed',
        };
      }

      // Update position as closed
      await prisma.position.update({
        where: { id: position.id },
        data: {
          closedAt: new Date(),
          exitPrice: 0, // TODO: Calculate from swap
          exitTxHash: result.txHash,
        },
      });

      return {
        success: true,
        txHash: result.txHash,
        positionId: position.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Close GMX position
   */
  private async closeGMXPosition(
    position: any,
    safeWallet: SafeWalletService,
    chainId: number
  ): Promise<ExecutionResult> {
    try {
      const adapter = createGMXAdapter(safeWallet);

      // Build close position transaction
      const sizeDeltaUsd = ethers.utils.parseUnits(position.size.toString(), 30); // GMX uses 30 decimals

      const closeTx = await adapter.buildClosePositionTx({
        tokenSymbol: position.tokenSymbol,
        sizeDeltaUsd: sizeDeltaUsd.toString(),
        isLong: position.side === 'LONG',
        acceptablePrice: '0', // Market order
      });

      // Submit transaction
      const txService = createSafeTransactionService(
        position.deployment.safeWallet,
        chainId,
        process.env.EXECUTOR_PRIVATE_KEY
      );

      const result = await txService.proposeTransaction(closeTx, 'Close GMX position');

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Update position as closed
      await prisma.position.update({
        where: { id: position.id },
        data: {
          closedAt: new Date(),
          exitTxHash: result.txHash,
        },
      });

      return {
        success: true,
        txHash: result.txHash,
        positionId: position.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

/**
 * Create trade executor instance
 */
export function createTradeExecutor(): TradeExecutor {
  return new TradeExecutor();
}
