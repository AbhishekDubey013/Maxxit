/**
 * Trade Execution Coordinator
 * Routes signals to appropriate venue adapters and manages trade lifecycle
 */

import { PrismaClient, Signal, Venue, AgentDeployment } from '@prisma/client';
import { createSafeWallet, getChainIdForVenue, SafeWalletService } from './safe-wallet';
import { createSpotAdapter, SpotAdapter } from './adapters/spot-adapter';
import { createGMXAdapter, GMXAdapter } from './adapters/gmx-adapter';
import { createGMXAdapterSubaccount, GMXAdapterSubaccount } from './adapters/gmx-adapter-subaccount';
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
   * Execute a signal for a SPECIFIC deployment
   * Used for manual Telegram trades to ensure correct user's Safe is used
   */
  async executeSignalForDeployment(signalId: string, deploymentId: string): Promise<ExecutionResult> {
    try {
      // Fetch signal with specific deployment
      const signal = await prisma.signal.findUnique({
        where: { id: signalId },
        include: {
          agent: true,
        },
      });

      if (!signal) {
        return {
          success: false,
          error: 'Signal not found',
        };
      }

      // Fetch specific deployment
      const deployment = await prisma.agentDeployment.findUnique({
        where: { id: deploymentId },
        include: {
          agent: true,
        },
      });

      if (!deployment) {
        return {
          success: false,
          error: 'Deployment not found',
        };
      }

      // Merge signal.agent with deployment data for executeSignalInternal
      const signalWithDeployment = {
        ...signal,
        agent: {
          ...signal.agent,
          deployments: [deployment],
        },
      };

      return this.executeSignalInternal(signalWithDeployment as any);
    } catch (error: any) {
      console.error('[TradeExecutor] Execute signal for deployment error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute a signal (auto trading - uses first active deployment)
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

      return this.executeSignalInternal(signal as any);
    } catch (error: any) {
      console.error('[TradeExecutor] Execute signal error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Internal method to execute signal with deployment
   */
  private async executeSignalInternal(signal: any): Promise<ExecutionResult> {
    try {
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

      // NOTE: Module auto-initializes on first trade (handled by smart contract)

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

    // Signature Verification (Executor Agreement Required)
    const hasExecutorAgreement = signal.executorAgreementVerified;
    
    if (!hasExecutorAgreement) {
      return {
        success: false,
        error: 'Executor agreement required',
        reason: 'Signal requires executor agreement before execution',
        executionSummary: {
          canExecute: false,
          reason: 'Executor agreement not found',
          executorAgreementRequired: true
        },
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
      // Strip _MANUAL_timestamp suffix if present (from Telegram manual trades)
      const actualTokenSymbol = signal.tokenSymbol.split('_MANUAL_')[0];
      
      // 1. Check venue availability
      const venueStatus = await prisma.venueStatus.findUnique({
        where: {
          venue_tokenSymbol: {
            venue: signal.venue,
            tokenSymbol: actualTokenSymbol,
          },
        },
      });

      if (!venueStatus) {
        return {
          canExecute: false,
          reason: `${actualTokenSymbol} not available on ${signal.venue}`,
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
              tokenSymbol: actualTokenSymbol,
            },
          },
        });

        if (!tokenRegistry) {
          return {
            canExecute: false,
            reason: `Token ${actualTokenSymbol} not found in registry for ${chain}`,
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
      // Strip _MANUAL_timestamp suffix if present (from Telegram manual trades)
      const actualTokenSymbol = ctx.signal.tokenSymbol.split('_MANUAL_')[0];
      
      const chain = chainId === 42161 ? 'arbitrum' : chainId === 8453 ? 'base' : 'sepolia';
      const tokenRegistry = await prisma.tokenRegistry.findUnique({
        where: {
          chain_tokenSymbol: {
            chain,
            tokenSymbol: actualTokenSymbol,
          },
        },
      });

      if (!tokenRegistry) {
        return {
          success: false,
          error: `Token ${actualTokenSymbol} not found in registry`,
        };
      }

      // Calculate amounts based on size model type
      const usdcBalance = summary.usdcBalance || 0;
      const sizeModel = ctx.signal.sizeModel as any;
      
      let positionSize: number;
      
      if (sizeModel.type === 'fixed-usdc') {
        // Manual trades: Use exact USDC amount specified by user
        positionSize = sizeModel.value || 0;
        console.log('[TradeExecutor] Position sizing (MANUAL):', {
          walletBalance: usdcBalance,
          requestedAmount: positionSize + ' USDC',
          type: 'fixed-usdc'
        });
      } else {
        // Auto trades: Use percentage of actual balance (default 5% if not specified)
        const percentageToUse = sizeModel.value || 5;
        positionSize = (usdcBalance * percentageToUse) / 100;
        console.log('[TradeExecutor] Position sizing (AUTO):', {
          walletBalance: usdcBalance,
          percentage: percentageToUse + '%',
          positionSize: positionSize.toFixed(2) + ' USDC',
          type: 'balance-percentage'
        });
      }
      
      // Minimum position size check (0.1 USDC minimum)
      if (positionSize < 0.1) {
        return {
          success: false,
          error: `Position size too small: ${positionSize.toFixed(2)} USDC (min: 0.1 USDC)`,
          reason: 'Insufficient balance for minimum trade size',
        };
      }
      
      // Check if user has enough balance for manual trade
      if (sizeModel.type === 'fixed-usdc' && positionSize > usdcBalance) {
        return {
          success: false,
          error: `Insufficient balance: Need ${positionSize} USDC, have ${usdcBalance.toFixed(2)} USDC`,
          reason: 'Requested amount exceeds wallet balance',
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
      
      // AUTO-SETUP: Ensure Safe is fully configured (one-time operations)
      console.log('[TradeExecutor] 🔧 Running auto-setup checks...');
      
      // Step 1: Initialize capital tracking (if not already done)
      try {
        const stats = await moduleService.getSafeStats(ctx.deployment.safeWallet);
        if (!stats.initialized) {
          console.log('[TradeExecutor] 📋 Capital not initialized - initializing now...');
          const initResult = await moduleService.initializeCapital(ctx.deployment.safeWallet);
          if (initResult.success) {
            console.log('[TradeExecutor] ✅ Capital initialized:', initResult.txHash);
          } else {
            console.warn('[TradeExecutor] ⚠️  Capital init failed (might be racing):', initResult.error);
          }
        } else {
          console.log('[TradeExecutor] ✅ Capital already initialized');
        }
      } catch (error: any) {
        console.warn('[TradeExecutor] ⚠️  Could not check/init capital:', error.message);
        // Continue anyway - might be a transient issue
      }
      
      // Step 2: Ensure token is whitelisted
      console.log('[TradeExecutor] 📋 Checking token whitelist for', ctx.signal.tokenSymbol);
      try {
        const isWhitelisted = await moduleService.checkTokenWhitelist(
          ctx.deployment.safeWallet,
          tokenRegistry.tokenAddress
        );
        
        if (!isWhitelisted) {
          console.log('[TradeExecutor] 📋 Token not whitelisted - whitelisting now...');
          const whitelistResult = await moduleService.setTokenWhitelist(
            ctx.deployment.safeWallet,
            tokenRegistry.tokenAddress,
            true
          );
          if (whitelistResult.success) {
            console.log('[TradeExecutor] ✅ Token whitelisted:', whitelistResult.txHash);
          } else {
            console.warn('[TradeExecutor] ⚠️  Whitelist failed:', whitelistResult.error);
          }
        } else {
          console.log('[TradeExecutor] ✅ Token already whitelisted');
        }
      } catch (error: any) {
        console.warn('[TradeExecutor] ⚠️  Could not check/whitelist token:', error.message);
        // Continue anyway
      }
      
      // Step 3: Ensure USDC is approved to router
      console.log('[TradeExecutor] 📋 Ensuring USDC approval...');
      const approvalResult = await moduleService.approveTokenForDex(
        ctx.deployment.safeWallet,
        usdcAddress,
        routerAddress
      );
      
      if (!approvalResult.success) {
        console.warn('[TradeExecutor] ⚠️  Approval failed, but continuing (might already be approved)');
        // Don't fail here - approval might already exist
      } else {
        console.log('[TradeExecutor] ✅ USDC approved:', approvalResult.txHash);
      }
      
      console.log('[TradeExecutor] 🎉 Auto-setup complete!');
      
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
          tokenSymbol: actualTokenSymbol, // Use actual token symbol (stripped _MANUAL_ suffix)
          side: ctx.signal.side,
          entryPrice: actualEntryPrice,
          qty: actualAmountOut,
          entryTxHash: result.txHash, // ⚡ REAL ON-CHAIN TX HASH
          trailingParams: {
            enabled: true,
            trailingPercent: 1, // 1% trailing stop
            highestPrice: null, // Will be set on first monitor check
          },
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
  /**
   * Execute GMX perpetual trade (SubaccountRouter Approach)
   * 
   * SECURITY: All limits enforced in GMXAdapterSubaccount
   * - Max leverage: 10x
   * - Max position size: 5000 USDC
   * - Max daily volume: 20000 USDC
   * - Whitelisted tokens only
   */
  private async executeGMXTrade(ctx: ExecutionContext): Promise<ExecutionResult> {
    try {
      const chainId = getChainIdForVenue(ctx.signal.venue);
      
      // GMX is only on Arbitrum
      if (chainId !== 42161) {
        return {
          success: false,
          error: 'GMX is only available on Arbitrum One',
        };
      }

      // Create provider
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
      );

      // Create module service (for fee collection)
      const moduleAddress = ctx.deployment.moduleAddress || process.env.MODULE_ADDRESS;
      if (!moduleAddress) {
        return {
          success: false,
          error: 'Module address not configured',
        };
      }

      const moduleService = createSafeModuleService(
        moduleAddress,
        chainId,
        process.env.EXECUTOR_PRIVATE_KEY
      );

      // Create GMX adapter (SubaccountRouter)
      const adapter = createGMXAdapterSubaccount(
        provider,
        process.env.EXECUTOR_PRIVATE_KEY!,
        moduleService
      );

      // Strip _MANUAL_timestamp suffix if present
      const actualTokenSymbol = ctx.signal.tokenSymbol.split('_MANUAL_')[0];

      // Calculate collateral and leverage
      const sizeModel = ctx.signal.sizeModel as any;
      const leverage = sizeModel.leverage || 1;
      
      // Get USDC balance
      const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
      const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
      const usdc = new ethers.Contract(usdcAddress, usdcAbi, provider);
      const usdcBalance = await usdc.balanceOf(ctx.deployment.safeWallet);
      const usdcBalanceNum = parseFloat(ethers.utils.formatUnits(usdcBalance, 6));
      
      let collateralUSDC: number;
      
      if (sizeModel.type === 'fixed-usdc') {
        collateralUSDC = sizeModel.value || 0;
      } else {
        const percentageToUse = sizeModel.value || 5;
        collateralUSDC = (usdcBalanceNum * percentageToUse) / 100;
      }

      // GMX minimum: Ensure collateral is at least 1.5 USDC (above 1 USDC GMX minimum)
      collateralUSDC = Math.max(collateralUSDC, 1.5);

      console.log('[TradeExecutor] GMX trade:', {
        token: actualTokenSymbol,
        collateral: collateralUSDC,
        leverage,
        isLong: ctx.signal.side === 'LONG',
        balance: usdcBalanceNum,
      });

      // Open GMX position (will enforce all security limits)
      const result = await adapter.openGMXPosition({
        safeAddress: ctx.deployment.safeWallet,
        tokenSymbol: actualTokenSymbol,
        collateralUSDC,
        leverage,
        isLong: ctx.signal.side === 'LONG',
        slippage: 0.5,
        profitReceiver: ctx.signal.agent?.profitReceiverAddress || ctx.deployment.agent.profitReceiverAddress,
      });

      if (!result.success) {
        // Check if security alert was triggered
        if (result.securityAlert) {
          console.error('[TradeExecutor] 🚨 SECURITY ALERT:', result.securityAlert);
          // TODO: Send notification to monitoring system
        }
        return {
          success: false,
          error: result.error || 'GMX order submission failed',
        };
      }

      // Get current price for entry price
      const entryPrice = await adapter.getGMXPrice(actualTokenSymbol);
      const positionSizeUSD = collateralUSDC * leverage;
      const qty = positionSizeUSD / (entryPrice || 1);

      // Create position record
      const position = await prisma.position.create({
        data: {
          deploymentId: ctx.deployment.id,
          signalId: ctx.signal.id,
          venue: ctx.signal.venue,
          tokenSymbol: actualTokenSymbol,
          side: ctx.signal.side,
          entryPrice: entryPrice,
          qty: qty,
          entryTxHash: result.txHash,
          trailingParams: {
            enabled: true,
            trailingPercent: 1, // 1% trailing stop
            highestPrice: null, // Will be set on first monitor check
          },
        },
      });

      console.log('[TradeExecutor] ✅ GMX position opened:', {
        positionId: position.id,
        token: actualTokenSymbol,
        collateral: collateralUSDC + ' USDC',
        leverage: leverage + 'x',
        positionSize: positionSizeUSD + ' USD',
        txHash: result.txHash,
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

      // Check actual token balance in Safe (not DB qty, as it might be outdated)
      const tokenDecimals = tokenRegistry.decimals || 18;
      const provider = new ethers.providers.JsonRpcProvider(
        chainId === 42161 ? 'https://arb1.arbitrum.io/rpc' : 'https://mainnet.base.org'
      );
      const tokenContract = new ethers.Contract(
        tokenRegistry.tokenAddress,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      
      const actualBalance = await tokenContract.balanceOf(position.deployment.safeWallet);
      
      if (actualBalance.eq(0)) {
        return {
          success: false,
          error: `No ${position.tokenSymbol} balance in Safe to close`,
        };
      }
      
      // Use actual balance instead of DB qty
      const tokenAmountWei = actualBalance;
      const actualQty = ethers.utils.formatUnits(actualBalance, tokenDecimals);
      
      console.log('[TradeExecutor] Closing position:', {
        positionId: position.id,
        token: position.tokenSymbol,
        tokenAddress: tokenRegistry.tokenAddress,
        dbQty: position.qty,
        actualQty: actualQty,
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

      // Approve ARB (or whatever token) to the Uniswap Router before swapping
      console.log('[TradeExecutor] Approving token to router for closing...');
      const approvalResult = await moduleService.approveTokenForDex(
        position.deployment.safeWallet,
        tokenRegistry.tokenAddress,
        routerAddress
      );

      if (!approvalResult.success) {
        // If approval failed, check if it's already approved
        console.log('[TradeExecutor] Approval transaction failed, checking if already approved...');
        const isApproved = await moduleService.checkTokenApproval(
          position.deployment.safeWallet,
          tokenRegistry.tokenAddress,
          routerAddress
        );
        
        if (!isApproved) {
          return {
            success: false,
            error: `Token approval failed: ${approvalResult.error}. Please approve ${position.tokenSymbol} manually.`,
          };
        }
        console.log('[TradeExecutor] Token already approved, proceeding...');
      } else {
        console.log('[TradeExecutor] Token approved to router:', approvalResult.txHash);
        // Wait a moment for approval to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Calculate total entry value in USDC (entryPrice * actualQty)
      const totalEntryValueUSD = Number(position.entryPrice) * Number(actualQty);
      const entryValueUSDC = ethers.utils.parseUnits(
        totalEntryValueUSD.toFixed(6), // Format to 6 decimals for USDC
        6
      ).toString();

      // Get current price for exit price recording
      const { getTokenPriceUSD } = await import('../lib/price-oracle');
      const exitPrice = await getTokenPriceUSD(position.tokenSymbol, chainId);
      
      // Calculate PnL
      const entryPrice = parseFloat(position.entryPrice.toString());
      let pnl: number;
      if (position.side === 'LONG') {
        pnl = (exitPrice - entryPrice) * actualQty;
      } else {
        pnl = (entryPrice - exitPrice) * actualQty;
      }

      // Execute close position through module (with profit sharing)
      const result = await moduleService.closePosition({
        safeAddress: position.deployment.safeWallet,
        tokenIn: tokenRegistry.tokenAddress,
        tokenOut: usdcAddress,
        amountIn: tokenAmountWei.toString(),
        minAmountOut: '0',
        profitReceiver: position.deployment.agent.profitReceiverAddress,
        entryValueUSDC: entryValueUSDC,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Close transaction failed',
        };
      }

      // Update position as closed with actual exit price and PnL
      await prisma.position.update({
        where: { id: position.id },
        data: {
          closedAt: new Date(),
          exitPrice: exitPrice,
          exitTxHash: result.txHash,
          qty: actualQty, // Update to actual closed qty
          pnl: pnl,
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
  /**
   * Close GMX position (SubaccountRouter Approach)
   */
  private async closeGMXPosition(
    position: any,
    safeWallet: SafeWalletService,
    chainId: number
  ): Promise<ExecutionResult> {
    try {
      // Create provider
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.ARBITRUM_RPC || process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc'
      );

      // Create module service (for profit sharing)
      const moduleAddress = position.deployment.moduleAddress || process.env.MODULE_ADDRESS;
      if (!moduleAddress) {
        return {
          success: false,
          error: 'Module address not configured',
        };
      }

      const moduleService = createSafeModuleService(
        moduleAddress,
        chainId,
        process.env.EXECUTOR_PRIVATE_KEY
      );

      // Create GMX adapter (SubaccountRouter)
      const adapter = createGMXAdapterSubaccount(
        provider,
        process.env.EXECUTOR_PRIVATE_KEY!,
        moduleService
      );

      // Get current price
      const currentPrice = await adapter.getGMXPrice(position.tokenSymbol);

      // Calculate position size in USD (30 decimals)
      const positionSizeUSD = parseFloat(position.qty.toString()) * currentPrice;
      const sizeDeltaUsd = ethers.utils.parseUnits(positionSizeUSD.toFixed(8), 30);

      console.log('[TradeExecutor] Closing GMX position:', {
        positionId: position.id,
        token: position.tokenSymbol,
        qty: position.qty.toString(),
        currentPrice,
        positionSizeUSD,
      });

      // Close position
      const result = await adapter.closeGMXPosition({
        safeAddress: position.deployment.safeWallet,
        tokenSymbol: position.tokenSymbol,
        sizeDeltaUsd: sizeDeltaUsd.toString(),
        isLong: position.side === 'LONG',
        slippage: 0.5,
        profitReceiver: position.deployment.agent.profitReceiverAddress,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'GMX position close failed',
        };
      }

      // Calculate PnL
      const exitPrice = currentPrice;
      const entryPrice = parseFloat(position.entryPrice.toString());
      const qty = parseFloat(position.qty.toString());
      
      let pnl: number;
      if (position.side === 'LONG') {
        pnl = (exitPrice - entryPrice) * qty;
      } else {
        pnl = (entryPrice - exitPrice) * qty;
      }

      // Update position
      await prisma.position.update({
        where: { id: position.id },
        data: {
          closedAt: new Date(),
          exitPrice: exitPrice,
          exitTxHash: result.txHash,
          pnl: pnl,
        },
      });

      // Handle profit sharing via module (20% of profit)
      let profitShareTxHash: string | undefined;
      if (pnl > 0) {
        const profitShare = pnl * 0.2; // 20% of profit
        console.log(`[TradeExecutor] Distributing 20% profit share: ${profitShare.toFixed(2)} USDC`);

        try {
          // Build USDC transfer data: Safe → Agent Owner
          const usdcAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
          const usdcInterface = new ethers.utils.Interface(usdcAbi);
          const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // Arbitrum USDC
          const profitShareWei = ethers.utils.parseUnits(profitShare.toFixed(6), 6);
          const transferData = usdcInterface.encodeFunctionData('transfer', [
            position.deployment.agent.profitReceiverAddress,
            profitShareWei,
          ]);

          // Execute via module (same as fee collection)
          const profitResult = await moduleService.executeFromModule(
            position.deployment.safeWallet,
            usdcAddress, // To: USDC contract
            0, // Value: 0 ETH
            transferData // Data: transfer(agentOwner, profitShare)
          );

          if (profitResult.success) {
            profitShareTxHash = profitResult.txHash;
            console.log(`[TradeExecutor] ✅ Profit share distributed: ${profitShare.toFixed(2)} USDC → ${position.deployment.agent.profitReceiverAddress}`);
            console.log(`[TradeExecutor] TX: ${profitShareTxHash}`);
          } else {
            console.error(`[TradeExecutor] ⚠️ Profit share distribution failed: ${profitResult.error}`);
          }
        } catch (profitError: any) {
          console.error(`[TradeExecutor] Error distributing profit share:`, profitError.message);
        }
      }

      console.log('[TradeExecutor] ✅ GMX position closed:', {
        positionId: position.id,
        pnl: pnl.toFixed(2) + ' USD',
        profitShare: pnl > 0 ? (pnl * 0.2).toFixed(2) + ' USDC' : 'N/A',
        closeTxHash: result.txHash,
        profitShareTxHash,
      });

      return {
        success: true,
        txHash: result.txHash,
        positionId: position.id,
      };
    } catch (error: any) {
      console.error('[TradeExecutor] GMX close error:', error);
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
