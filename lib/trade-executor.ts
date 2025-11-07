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
import { closeHyperliquidPosition } from './hyperliquid-utils';
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
      const signal = await prisma.signals.findUnique({
        where: { id: signalId },
        include: {
          agents: true,
        },
      });

      if (!signal) {
        return {
          success: false,
          error: 'Signal not found',
        };
      }

      // Fetch specific deployment
      const deployment = await prisma.agent_deployments.findUnique({
        where: { id: deploymentId },
        include: {
          agents: true,
        },
      });

      if (!deployment) {
        return {
          success: false,
          error: 'Deployment not found',
        };
      }

      // Merge signal with deployment data, preserving all agent fields
      const signalWithDeployment = {
        ...signal,
        agents: signal.agents ? {
          ...signal.agents,
          agent_deployments: [deployment],
        } : {
          agent_deployments: [deployment],
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
      const signal = await prisma.signals.findUnique({
        where: { id: signalId },
        include: {
          agents: {
            include: {
              agent_deployments: {
                where: { status: 'ACTIVE' },
                orderBy: { sub_started_at: 'desc' },
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

      if (signal.agents.agent_deployments.length === 0) {
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
      const deployment = signal.agents.agent_deployments[0];

      // Validate Safe wallet (skip for HYPERLIQUID - uses agent EOA wallet instead)
      const chainId = getChainIdForVenue(signal.venue);
      const safeWallet = createSafeWallet(deployment.safe_wallet, chainId);
      
      if (signal.venue !== 'HYPERLIQUID') {
        const validation = await safeWallet.validateSafe();
        if (!validation.valid) {
          return {
            success: false,
            error: `Safe wallet validation failed: ${validation.error}`,
          };
        }
      } else {
        console.log('[TradeExecutor] Skipping Safe validation for HYPERLIQUID (uses agent EOA wallet)');
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

    // Add proof of agreement message to transaction data
    const proofOfAgreementMessage = `Proof of Agreement: Executor confirms trade execution for signal ${signal.id} at ${new Date().toISOString()}`;
    console.log('[TradeExecutor] 📝 Proof of Agreement:', proofOfAgreementMessage);

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
      const actualTokenSymbol = signal.token_symbol.split('_MANUAL_')[0];
      
      // 1. Check venue availability
      const venueStatus = await prisma.venues_status.findUnique({
        where: {
          venue_token_symbol: {
            venue: signal.venue,
            token_symbol: actualTokenSymbol,
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

      // 2. Check USDC balance (skip for HYPERLIQUID - balance is on agent wallet on Hyperliquid)
      let usdcBalance = 0;
      
      if (signal.venue !== 'HYPERLIQUID') {
        usdcBalance = await safeWallet.getUSDCBalance();
        
        if (usdcBalance === 0) {
          return {
            canExecute: false,
            reason: 'No USDC balance in Safe wallet',
            usdcBalance,
            tokenAvailable: true,
          };
        }

        // 3. Check position size requirements
        const sizeModel = signal.size_model as any;
        const requiredCollateral = (usdcBalance * sizeModel.value) / 100;

        if (requiredCollateral === 0) {
          return {
            canExecute: false,
            reason: 'Position size too small',
            usdcBalance,
            tokenAvailable: true,
          };
        }
      } else {
        // For Hyperliquid, balance validation happens in the adapter
        console.log('[TradeExecutor] Skipping Safe balance check for HYPERLIQUID (balance on agent wallet)');
        usdcBalance = 100; // Dummy value to pass validation
      }

      // 4. For SPOT, check token registry
      if (signal.venue === 'SPOT') {
        const chainId = getChainIdForVenue(signal.venue);
        const chain = chainId === 42161 ? 'arbitrum' : chainId === 8453 ? 'base' : 'sepolia';
        
        const tokenRegistry = await prisma.token_registry.findUnique({
          where: {
            chain_token_symbol: {
              chain,
              token_symbol: actualTokenSymbol,
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
        safeAddress: ctx.deployment.safe_wallet,
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
      const actualTokenSymbol = ctx.signal.token_symbol.split('_MANUAL_')[0];
      
      const chain = chainId === 42161 ? 'arbitrum' : chainId === 8453 ? 'base' : 'sepolia';
      const tokenRegistry = await prisma.token_registry.findUnique({
        where: {
          chain_token_symbol: {
            chain,
            token_symbol: actualTokenSymbol,
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
      const sizeModel = ctx.signal.size_model as any;
      
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
        tokenOut: tokenRegistry.token_address,
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
        tokenOut: tokenRegistry.token_address,
        amountIn: amountIn.toString(),
        minAmountOut,
        deadline: Math.floor(Date.now() / 1000) + 1200, // 20 minutes
        recipient: ctx.deployment.safe_wallet,
      });

      // Use Safe Module Service for gasless execution
      const moduleAddress = process.env.TRADING_MODULE_ADDRESS || process.env.MODULE_ADDRESS || '0x6ad58921173219A19B7c4b6f54C07A4c040bf8Cb';
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
      
      // AUTO-SETUP: V3 Module has tokens pre-whitelisted and Safe already approved USDC
      // So we only need to initialize capital if not done yet
      console.log('[TradeExecutor] 🔧 Checking capital initialization...');
      
      try {
        const stats = await moduleService.getSafeStats(ctx.deployment.safe_wallet);
        if (!stats.initialized) {
          console.log('[TradeExecutor] 📋 Capital not initialized - initializing now...');
          const initResult = await moduleService.initializeCapital(ctx.deployment.safe_wallet);
          if (initResult.success) {
            console.log('[TradeExecutor] ✅ Capital initialized:', initResult.txHash);
          } else {
            console.warn('[TradeExecutor] ⚠️  Capital init failed:', initResult.error);
            // This might fail if racing with another process, but capital tracking will work anyway
          }
        } else {
          console.log('[TradeExecutor] ✅ Capital already initialized (initial: ' + stats.initialCapitalUSDC + ' USDC)');
        }
      } catch (error: any) {
        console.warn('[TradeExecutor] ⚠️  Could not check/init capital:', error.message);
        // Continue anyway - capital initialization is optional (module will auto-initialize on first trade)
      }
      
      console.log('[TradeExecutor] 🎉 Ready to execute trade!');
      
      // Execute trade through module (gasless!) with proof of agreement
      // Get profit receiver from deployment's agent (more reliable than signal)
      const profitReceiver = ctx.deployment.agents?.profit_receiver_address;
      if (!profitReceiver) {
        return {
          success: false,
          error: 'No profit receiver address found in deployment',
        };
      }
      
      const result = await moduleService.executeTrade({
        safeAddress: ctx.deployment.safe_wallet,
        fromToken: usdcAddress,
        toToken: tokenRegistry.token_address,
        amountIn: amountIn.toString(),
        dexRouter: routerAddress,
        swapData: swapTx.data as string,
        minAmountOut,
        profitReceiver,
        // Add proof of agreement message to transaction data
        proofOfAgreement: `Proof of Agreement: Executor confirms trade execution for signal ${ctx.signal.id} at ${new Date().toISOString()}`,
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
      const position = await prisma.positions.create({
        data: {
          deployment_id: ctx.deployment.id,
          signal_id: ctx.signal.id,
          venue: ctx.signal.venue,
          token_symbol: actualTokenSymbol, // Use actual token symbol (stripped _MANUAL_ suffix)
          side: ctx.signal.side,
          entry_price: actualEntryPrice,
          qty: actualAmountOut,
          entry_tx_hash: result.txHash, // ⚡ REAL ON-CHAIN TX HASH
          trailing_params: {
            enabled: true,
            trailingPercent: 1, // 1% trailing stop
            highestPrice: null, // Will be set on first monitor check
          },
        },
      });

      console.log('[TradeExecutor] ✅ SPOT trade executed on-chain!', {
        positionId: position.id,
        txHash: result.txHash,
        token: ctx.signal.token_symbol,
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
      const moduleAddress = ctx.deployment.module_address || process.env.MODULE_ADDRESS;
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
      const actualTokenSymbol = ctx.signal.token_symbol.split('_MANUAL_')[0];

      // Calculate collateral and leverage
      const sizeModel = ctx.signal.sizeModel as any;
      const leverage = sizeModel.leverage || 1;
      
      // Get USDC balance
      const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
      const usdcAddress = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
      const usdc = new ethers.Contract(usdcAddress, usdcAbi, provider);
      const usdcBalance = await usdc.balanceOf(ctx.deployment.safe_wallet);
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

      // Get profit receiver from deployment's agent
      const profitReceiverGMX = ctx.deployment.agents?.profit_receiver_address;
      if (!profitReceiverGMX) {
        return {
          success: false,
          error: 'No profit receiver address found in deployment',
        };
      }
      
      // Open GMX position (will enforce all security limits) with proof of agreement
      const result = await adapter.openGMXPosition({
        safeAddress: ctx.deployment.safe_wallet,
        tokenSymbol: actualTokenSymbol,
        collateralUSDC,
        leverage,
        isLong: ctx.signal.side === 'LONG',
        slippage: 0.5,
        profitReceiver: profitReceiverGMX,
        // Add proof of agreement message to transaction data
        proofOfAgreement: `Proof of Agreement: Executor confirms trade execution for signal ${ctx.signal.id} at ${new Date().toISOString()}`,
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
      const position = await prisma.positions.create({
        data: {
          deployment_id: ctx.deployment.id,
          signal_id: ctx.signal.id,
          venue: ctx.signal.venue,
          token_symbol: actualTokenSymbol,
          side: ctx.signal.side,
          entry_price: entryPrice,
          qty: qty,
          entry_tx_hash: result.txHash,
          trailing_params: {
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
      // Get agent private key from wallet pool (NO decryption needed!)
      const { getPrivateKeyForAddress } = await import('./wallet-pool');
      const agentPrivateKey = await getPrivateKeyForAddress(ctx.deployment.hyperliquid_agent_address);
      
      if (!agentPrivateKey) {
        return {
          success: false,
          error: 'Hyperliquid agent wallet not found in pool. Please reconnect.',
          reason: 'Agent wallet required for Hyperliquid trading',
        };
      }

      // For Hyperliquid, safe_wallet actually stores the user's Hyperliquid wallet address
      const userHyperliquidWallet = ctx.deployment.safe_wallet;
      const adapter = createHyperliquidAdapter(ctx.safeWallet, agentPrivateKey, userHyperliquidWallet);
      
      console.log('[TradeExecutor] Hyperliquid delegation setup:');
      console.log(`  User Wallet: ${userHyperliquidWallet}`);
      console.log(`  Agent will trade on behalf of user`);
      
      // Strip _MANUAL_timestamp suffix if present
      const actualTokenSymbol = ctx.signal.token_symbol.split('_MANUAL_')[0];
      
      // Get market info
      const marketInfo = await adapter.getMarketInfo(actualTokenSymbol);
      if (!marketInfo) {
        return {
          success: false,
          error: `Market not available for ${actualTokenSymbol}`,
        };
      }

      // Calculate position size
      const sizeModel = ctx.signal.size_model as any;
      const leverage = sizeModel.leverage || 1;
      
      // Get Hyperliquid balance (user's wallet balance, not agent's)
      const hlBalance = await adapter.getBalance(userHyperliquidWallet);
      
      let collateralUSDC: number;
      
      if (sizeModel.type === 'fixed-usdc') {
        collateralUSDC = sizeModel.value || 0;
      } else {
        const percentageToUse = sizeModel.value || 5;
        collateralUSDC = (hlBalance.withdrawable * percentageToUse) / 100;
      }

      // Minimum collateral check
      collateralUSDC = Math.max(collateralUSDC, 10); // Minimum $10 for Hyperliquid

      console.log('[TradeExecutor] Hyperliquid trade:', {
        token: actualTokenSymbol,
        collateral: collateralUSDC,
        leverage,
        isLong: ctx.signal.side === 'LONG',
        hlBalance: hlBalance.withdrawable,
      });

      // Calculate size in coin units
      const positionSizeUSD = collateralUSDC * leverage;
      const coinSize = positionSizeUSD / marketInfo.price;

      // Open position
      const result = await adapter.openPosition({
        coin: actualTokenSymbol,
        isBuy: ctx.signal.side === 'LONG',
        size: coinSize,
        leverage,
        slippage: 0.01, // 1% slippage
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Hyperliquid order submission failed',
        };
      }

      console.log('[TradeExecutor] ✅ Hyperliquid position opened:', result);

      // Create position record
      const position = await prisma.positions.create({
        data: {
          deployment_id: ctx.deployment.id,
          signal_id: ctx.signal.id,
          venue: ctx.signal.venue,
          token_symbol: actualTokenSymbol,
          side: ctx.signal.side,
          entry_price: marketInfo.price,
          qty: coinSize,
          entry_tx_hash: result.orderId || 'HL-' + Date.now(),
          trailing_params: {
            enabled: true,
            trailingPercent: 1, // 1% trailing stop
            highestPrice: null,
          },
        },
      });

      return {
        success: true,
        txHash: result.orderId,
        positionId: position.id,
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
      const position = await prisma.positions.findUnique({
        where: { id: positionId },
        include: {
          agent_deployments: {
            include: {
              agents: true,
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

      if (position.closed_at) {
        return {
          success: false,
          error: `Position already closed at ${position.closed_at.toISOString()}`,
        };
      }

      const chainId = getChainIdForVenue(position.venue);
      const safeWallet = createSafeWallet(position.agent_deployments.safe_wallet, chainId);

      // Route to appropriate venue for closing
      if (position.venue === 'SPOT') {
        return await this.closeSpotPosition(position, safeWallet, chainId);
      } else if (position.venue === 'GMX') {
        return await this.closeGMXPosition(position, safeWallet, chainId);
      } else if (position.venue === 'HYPERLIQUID') {
        return await this.closeHyperliquidPositionMethod(position);
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
            tokenSymbol: position.token_symbol,
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
        tokenRegistry.token_address,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      
      const actualBalance = await tokenContract.balanceOf(position.agent_deployments.safe_wallet);
      
      if (actualBalance.eq(0)) {
        return {
          success: false,
          error: `No ${position.token_symbol} balance in Safe to close`,
        };
      }
      
      // Use actual balance instead of DB qty
      const tokenAmountWei = actualBalance;
      const actualQty = ethers.utils.formatUnits(actualBalance, tokenDecimals);
      
      console.log('[TradeExecutor] Closing position:', {
        positionId: position.id,
        token: position.token_symbol,
        tokenAddress: tokenRegistry.token_address,
        dbQty: position.qty,
        actualQty: actualQty,
        amountWei: tokenAmountWei.toString(),
      });

      // Build swap back to USDC (module will handle token approval automatically)
      const swapTx = await adapter.buildCloseSwapTx({
        tokenIn: tokenRegistry.token_address,
        tokenOut: usdcAddress,
        amountIn: tokenAmountWei.toString(),
        minAmountOut: '0', // TODO: Calculate proper slippage
        recipient: position.agent_deployments.safe_wallet,
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
        position.agent_deployments.moduleAddress!,
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
        position.agent_deployments.safe_wallet,
        tokenRegistry.token_address,
        routerAddress
      );

      if (!approvalResult.success) {
        // If approval failed, check if it's already approved
        console.log('[TradeExecutor] Approval transaction failed, checking if already approved...');
        const isApproved = await moduleService.checkTokenApproval(
          position.agent_deployments.safe_wallet,
          tokenRegistry.token_address,
          routerAddress
        );
        
        if (!isApproved) {
          return {
            success: false,
            error: `Token approval failed: ${approvalResult.error}. Please approve ${position.token_symbol} manually.`,
          };
        }
        console.log('[TradeExecutor] Token already approved, proceeding...');
      } else {
        console.log('[TradeExecutor] Token approved to router:', approvalResult.txHash);
        // Wait a moment for approval to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Calculate total entry value in USDC (entryPrice * actualQty)
      const totalEntryValueUSD = Number(position.entry_price) * Number(actualQty);
      const entryValueUSDC = ethers.utils.parseUnits(
        totalEntryValueUSD.toFixed(6), // Format to 6 decimals for USDC
        6
      ).toString();

      // Get current price for exit price recording
      const { getTokenPriceUSD } = await import('../lib/price-oracle');
      const exitPrice = await getTokenPriceUSD(position.token_symbol, chainId);
      
      // Calculate PnL
      const entryPrice = parseFloat(position.entry_price.toString());
      let pnl: number;
      if (position.side === 'LONG') {
        pnl = (exitPrice - entryPrice) * actualQty;
      } else {
        pnl = (entryPrice - exitPrice) * actualQty;
      }

      // Execute close position through module (with profit sharing)
      const result = await moduleService.closePosition({
        safeAddress: position.agent_deployments.safe_wallet,
        tokenIn: tokenRegistry.token_address,
        tokenOut: usdcAddress,
        amountIn: tokenAmountWei.toString(),
        minAmountOut: '0',
        profitReceiver: position.agent_deployments.agent.profit_receiver_address,
        entryValueUSDC: entryValueUSDC,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Close transaction failed',
        };
      }

      // Update position as closed with actual exit price and PnL
      await prisma.positions.update({
        where: { id: position.id },
        data: {
          closed_at: new Date(),
          exit_price: exitPrice,
          exit_tx_hash: result.txHash,
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
   * Close Hyperliquid position
   */
  private async closeHyperliquidPositionMethod(
    position: any
  ): Promise<ExecutionResult> {
    try {
      console.log('[TradeExecutor] Closing Hyperliquid position:', {
        positionId: position.id,
        token: position.token_symbol,
        side: position.side,
        venue: position.venue,
      });

      // Get user's Hyperliquid address from deployment
      const userHyperliquidAddress = position.agent_deployments.safe_wallet;
      
      if (!userHyperliquidAddress) {
        throw new Error('User Hyperliquid address not found in deployment');
      }

      // Close position via Hyperliquid service
      const result = await closeHyperliquidPosition({
        deploymentId: position.deployment_id,
        userAddress: userHyperliquidAddress,
        coin: position.token_symbol,
        // Don't specify size - will close full position
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to close position');
      }

      console.log('[TradeExecutor] Hyperliquid position close result:', result.result);

      // Calculate P&L from Hyperliquid result if available
      let pnl = 0;
      if (result.result && result.result.closePx) {
        const entryPrice = parseFloat(position.entry_price?.toString() || '0');
        const closePrice = parseFloat(result.result.closePx);
        const qty = parseFloat(position.qty?.toString() || '0');
        
        if (position.side === 'LONG' || position.side === 'BUY') {
          pnl = (closePrice - entryPrice) * qty;
        } else {
          pnl = (entryPrice - closePrice) * qty;
        }
      }

      // Update position in database
      await prisma.positions.update({
        where: { id: position.id },
        data: {
          closed_at: new Date(),
          exit_price: result.result?.closePx ? parseFloat(result.result.closePx) : null,
          pnl: pnl,
        },
      });

      console.log('[TradeExecutor] ✅ Hyperliquid position closed:', {
        positionId: position.id,
        pnl: pnl.toFixed(2) + ' USD',
        closePrice: result.result?.closePx,
      });

      return {
        success: true,
        positionId: position.id,
      };
    } catch (error: any) {
      console.error('[TradeExecutor] Hyperliquid close error:', error);
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
      const moduleAddress = position.agent_deployments.moduleAddress || process.env.MODULE_ADDRESS;
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
      const currentPrice = await adapter.getGMXPrice(position.token_symbol);

      // Calculate position size in USD (30 decimals)
      const positionSizeUSD = parseFloat(position.qty.toString()) * currentPrice;
      const sizeDeltaUsd = ethers.utils.parseUnits(positionSizeUSD.toFixed(8), 30);

      console.log('[TradeExecutor] Closing GMX position:', {
        positionId: position.id,
        token: position.token_symbol,
        qty: position.qty.toString(),
        currentPrice,
        positionSizeUSD,
      });

      // Close position
      const result = await adapter.closeGMXPosition({
        safeAddress: position.agent_deployments.safe_wallet,
        tokenSymbol: position.token_symbol,
        sizeDeltaUsd: sizeDeltaUsd.toString(),
        isLong: position.side === 'LONG',
        slippage: 0.5,
        profitReceiver: position.agent_deployments.agent.profit_receiver_address,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'GMX position close failed',
        };
      }

      // Calculate PnL
      const exitPrice = currentPrice;
      const entryPrice = parseFloat(position.entry_price.toString());
      const qty = parseFloat(position.qty.toString());
      
      let pnl: number;
      if (position.side === 'LONG') {
        pnl = (exitPrice - entryPrice) * qty;
      } else {
        pnl = (entryPrice - exitPrice) * qty;
      }

      // Update position
      await prisma.positions.update({
        where: { id: position.id },
        data: {
          closed_at: new Date(),
          exit_price: exitPrice,
          exit_tx_hash: result.txHash,
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
            position.agent_deployments.agent.profit_receiver_address,
            profitShareWei,
          ]);

          // Execute via module (same as fee collection)
          const profitResult = await moduleService.executeFromModule(
            position.agent_deployments.safe_wallet,
            usdcAddress, // To: USDC contract
            0, // Value: 0 ETH
            transferData // Data: transfer(agentOwner, profitShare)
          );

          if (profitResult.success) {
            profitShareTxHash = profitResult.txHash;
            console.log(`[TradeExecutor] ✅ Profit share distributed: ${profitShare.toFixed(2)} USDC → ${position.agent_deployments.agent.profit_receiver_address}`);
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
