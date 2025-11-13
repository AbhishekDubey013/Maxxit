/**
 * V3 Trade Executor with Automatic Venue Routing
 */

import { PrismaClient } from '@prisma/client';
import { venueRouterV3 } from './venue-router';

const prisma = new PrismaClient();

interface ExecutionContext {
  signal: any;
  deployment: any;
}

interface ExecutionResult {
  success: boolean;
  position?: any;
  error?: string;
}

class TradeExecutorV3 {
  /**
   * Execute trade with automatic venue routing
   */
  async executeTrade(signalId: string): Promise<ExecutionResult> {
    console.log('\n[TradeExecutorV3] 🎯 Starting execution for signal:', signalId);

    try {
      // 1. Load signal
      const signals = await prisma.$queryRaw<any[]>`
        SELECT * FROM signals_v3 WHERE id = ${signalId}::uuid LIMIT 1;
      `;

      if (signals.length === 0) {
        throw new Error('Signal not found');
      }

      const signal = signals[0];
      console.log('[TradeExecutorV3] Signal loaded:', {
        token: signal.token_symbol,
        side: signal.side,
        venue: signal.requested_venue,
      });

      // 2. Get active deployments for this agent
      const deployments = await prisma.$queryRaw<any[]>`
        SELECT * FROM agent_deployments_v3 
        WHERE agent_id = ${signal.agent_id}::uuid 
        AND status = 'ACTIVE'
        AND sub_active = TRUE;
      `;

      if (deployments.length === 0) {
        throw new Error('No active deployments found for this agent');
      }

      console.log(`[TradeExecutorV3] Found ${deployments.length} active deployment(s)`);

      // 3. Execute for each deployment
      const results = await Promise.allSettled(
        deployments.map((deployment) =>
          this.executeForDeployment({ signal, deployment })
        )
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`[TradeExecutorV3] ✅ Executed ${successful}/${deployments.length} deployments`);

      // Update signal status
      await prisma.$queryRaw`
        UPDATE signals_v3 
        SET status = 'EXECUTED', executed_at = NOW()
        WHERE id = ${signalId}::uuid;
      `;

      return {
        success: true,
        position: results.length > 0 ? results[0] : null,
      };
    } catch (error: any) {
      console.error('[TradeExecutorV3] ❌ Execution failed:', error.message);
      
      // Update signal as failed
      await prisma.$queryRaw`
        UPDATE signals_v3 
        SET status = 'FAILED', skipped_reason = ${error.message}
        WHERE id = ${signalId}::uuid;
      `;

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute trade for a single deployment
   */
  private async executeForDeployment(ctx: ExecutionContext): Promise<ExecutionResult> {
    console.log(`[TradeExecutorV3] Executing for deployment: ${ctx.deployment.id}`);

    try {
      // 1. Route to best venue (if MULTI)
      let finalVenue = ctx.signal.final_venue;

      if (ctx.signal.requested_venue === 'MULTI' && !finalVenue) {
        console.log('[TradeExecutorV3] 🎯 MULTI venue detected - activating Agent Where routing');

        const routingResult = await venueRouterV3.routeToVenue({
          tokenSymbol: ctx.signal.token_symbol,
          agentId: ctx.signal.agent_id,
          requestedVenue: 'MULTI',
        });

        console.log('[TradeExecutorV3] ✅ Routed to:', routingResult.selectedVenue);

        // Log routing decision
        await venueRouterV3.logRoutingDecision({
          signalId: ctx.signal.id,
          tokenSymbol: ctx.signal.token_symbol,
          requestedVenue: 'MULTI',
          routingResult,
        });

        // Update signal with final venue
        await prisma.$queryRaw`
          UPDATE signals_v3 
          SET final_venue = ${routingResult.selectedVenue}, routed_at = NOW()
          WHERE id = ${ctx.signal.id}::uuid;
        `;

        finalVenue = routingResult.selectedVenue;
      }

      // 2. Execute on the selected venue
      console.log(`[TradeExecutorV3] Executing on ${finalVenue}...`);

      const position = await this.executeOnVenue(ctx, finalVenue);

      console.log('[TradeExecutorV3] ✅ Position created:', position.id);

      return {
        success: true,
        position,
      };
    } catch (error: any) {
      console.error('[TradeExecutorV3] ❌ Deployment execution failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute trade on specific venue
   */
  private async executeOnVenue(
    ctx: ExecutionContext,
    venue: 'HYPERLIQUID' | 'OSTIUM' | 'GMX' | 'SPOT'
  ): Promise<any> {
    // Get deployment wallet info
    const walletAddress =
      venue === 'HYPERLIQUID'
        ? ctx.deployment.hyperliquid_agent_address
        : venue === 'OSTIUM'
        ? ctx.deployment.ostium_agent_address
        : null;

    if (!walletAddress) {
      throw new Error(`No wallet configured for ${venue}`);
    }

    console.log(`[TradeExecutorV3] Using wallet: ${walletAddress} on ${venue}`);

    // Calculate position size based on size_model
    const sizeModel = ctx.signal.size_model;
    const positionSize = this.calculatePositionSize(sizeModel, venue);

    // Calculate risk parameters
    const riskModel = ctx.signal.risk_model;
    const { stopLoss, takeProfit, trailingParams } = this.calculateRiskParams(
      riskModel,
      ctx.signal.side
    );

    // Create position record (actual trade execution would happen here)
    const position = await prisma.$queryRaw<any[]>`
      INSERT INTO positions_v3 (
        deployment_id,
        signal_id,
        venue,
        token_symbol,
        side,
        qty,
        entry_price,
        stop_loss,
        take_profit,
        trailing_params,
        status
      ) VALUES (
        ${ctx.deployment.id}::uuid,
        ${ctx.signal.id}::uuid,
        ${venue},
        ${ctx.signal.token_symbol},
        ${ctx.signal.side},
        ${positionSize},
        0,
        ${stopLoss},
        ${takeProfit},
        ${trailingParams ? JSON.stringify(trailingParams) : null}::JSONB,
        'PENDING'
      )
      RETURNING *;
    `;

    return position[0];
  }

  /**
   * Calculate position size from size model
   */
  private calculatePositionSize(sizeModel: any, venue: string): number {
    if (sizeModel.type === 'percentage') {
      // In production, calculate based on account balance
      // For now, return placeholder
      return sizeModel.value;
    }

    return 0;
  }

  /**
   * Calculate risk parameters from risk model
   */
  private calculateRiskParams(riskModel: any, side: string) {
    if (riskModel.type === 'trailing-stop') {
      return {
        stopLoss: null,
        takeProfit: null,
        trailingParams: {
          type: 'trailing-stop',
          trailPercent: riskModel.stop,
        },
      };
    }

    return {
      stopLoss: null,
      takeProfit: null,
      trailingParams: null,
    };
  }
}

export const tradeExecutorV3 = new TradeExecutorV3();

