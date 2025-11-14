/**
 * Trade Executor - Calls external venue services via HTTP
 * Routes signals to appropriate venue services (Hyperliquid, Ostium)
 */

interface ExecutionResult {
  success: boolean;
  txHash?: string;
  positionId?: string;
  error?: string;
  reason?: string;
}

const HYPERLIQUID_SERVICE_URL = process.env.HYPERLIQUID_SERVICE_URL || 'https://hyperliquid-service.onrender.com';
const OSTIUM_SERVICE_URL = process.env.OSTIUM_SERVICE_URL || 'https://maxxit-1.onrender.com';

/**
 * Execute a trade signal by calling the appropriate venue service
 */
export async function executeTrade(
  signal: any,
  deployment: any
): Promise<ExecutionResult> {
  try {
    console.log(`[TradeExecutor] Executing ${signal.side} ${signal.token_symbol} on ${signal.venue}`);
    
    // Route to appropriate venue service
    if (signal.venue === 'HYPERLIQUID') {
      return await executeHyperliquidTrade(signal, deployment);
    } else if (signal.venue === 'OSTIUM') {
      return await executeOstiumTrade(signal, deployment);
      } else {
        return {
          success: false,
        error: `Venue ${signal.venue} not supported yet`,
      };
    }
    } catch (error: any) {
    console.error('[TradeExecutor] Execution error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
 * Execute trade on Hyperliquid via external service
 */
async function executeHyperliquidTrade(
  signal: any,
  deployment: any
  ): Promise<ExecutionResult> {
    try {
    const sizeModel = typeof signal.size_model === 'string' 
      ? JSON.parse(signal.size_model) 
      : signal.size_model;
    
    const riskModel = typeof signal.risk_model === 'string'
      ? JSON.parse(signal.risk_model)
      : signal.risk_model;

    // Call Hyperliquid service
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/execute-trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deploymentId: deployment.id,
        agentAddress: deployment.hyperliquid_agent_address,
        token: signal.token_symbol,
        side: signal.side,
        sizePercent: sizeModel.position_size_percent || 10,
        stopLoss: riskModel.stop_loss_percent,
        takeProfit: riskModel.take_profit_percent,
        leverage: riskModel.leverage || 1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hyperliquid service error: ${response.status} ${error}`);
    }

    const result = await response.json() as any;
    
            return {
              success: true,
      txHash: result.txHash || result.hash,
      positionId: result.positionId,
      };
    } catch (error: any) {
    console.error('[TradeExecutor] Hyperliquid execution failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
 * Execute trade on Ostium via external service
   */
async function executeOstiumTrade(
  signal: any,
  deployment: any
  ): Promise<ExecutionResult> {
    try {
    const sizeModel = typeof signal.size_model === 'string' 
      ? JSON.parse(signal.size_model) 
      : signal.size_model;
    
    const riskModel = typeof signal.risk_model === 'string'
      ? JSON.parse(signal.risk_model)
      : signal.risk_model;

    // Call Ostium service
    const response = await fetch(`${OSTIUM_SERVICE_URL}/execute-trade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deploymentId: deployment.id,
        userWallet: deployment.user_wallet,
        token: signal.token_symbol,
        side: signal.side,
        sizePercent: sizeModel.position_size_percent || 10,
        stopLoss: riskModel.stop_loss_percent,
        takeProfit: riskModel.take_profit_percent,
        leverage: riskModel.leverage || 1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ostium service error: ${response.status} ${error}`);
    }

    const result = await response.json() as any;

      return {
        success: true,
      txHash: result.txHash || result.hash,
      positionId: result.positionId,
      };
    } catch (error: any) {
    console.error('[TradeExecutor] Ostium execution failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
 * Check if venue service is available
 */
export async function checkVenueServiceHealth(venue: string): Promise<boolean> {
  try {
    let url = '';
    if (venue === 'HYPERLIQUID') {
      url = `${HYPERLIQUID_SERVICE_URL}/health`;
    } else if (venue === 'OSTIUM') {
      url = `${OSTIUM_SERVICE_URL}/health`;
      } else {
      return false;
    }

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}
