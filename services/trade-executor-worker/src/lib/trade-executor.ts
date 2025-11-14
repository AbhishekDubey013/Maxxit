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

    // Get agent private key from wallet_pool database
    if (!deployment.hyperliquid_agent_address) {
      throw new Error('No Hyperliquid agent address configured for this deployment');
    }

    const { prisma } = await import('./prisma-client');
    const agentWallet = await prisma.wallet_pool.findFirst({
      where: {
        address: {
          equals: deployment.hyperliquid_agent_address,
          mode: 'insensitive',
        },
      },
    });

    if (!agentWallet) {
      throw new Error(`Agent address ${deployment.hyperliquid_agent_address} not found in wallet pool`);
    }

    // Calculate position size (for now use a fixed small amount for testing)
    // TODO: Calculate based on account balance and sizeModel.value percentage
    const positionSize = 10; // $10 USD for testing

    // Call Hyperliquid service /open-position endpoint
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/open-position`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentPrivateKey: agentWallet.private_key, // From wallet_pool
        coin: signal.token_symbol,
        isBuy: signal.side === 'LONG',
        size: positionSize,
        slippage: 0.01, // 1% slippage
        vaultAddress: deployment.safe_wallet, // User's wallet (agent trading on behalf)
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

    // Calculate collateral (for now use a fixed small amount for testing)
    // TODO: Calculate based on account balance and sizeModel.value percentage
    const collateral = 10; // $10 USDC for testing
    const leverage = 3; // 3x leverage default

    // Call Ostium service /open-position endpoint
    const response = await fetch(`${OSTIUM_SERVICE_URL}/open-position`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentAddress: deployment.ostium_agent_address, // Agent's address (private key looked up in service)
        userAddress: deployment.safe_wallet, // User's wallet
        market: signal.token_symbol,
        side: signal.side.toLowerCase(), // "long" or "short"
        collateral: collateral,
        leverage: leverage,
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
