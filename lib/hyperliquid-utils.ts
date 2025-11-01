/**
 * Hyperliquid Utilities
 * Helper functions for interacting with Hyperliquid positions and prices
 */

import { getAgentPrivateKey } from '../pages/api/hyperliquid/register-agent';

const HYPERLIQUID_SERVICE_URL = process.env.HYPERLIQUID_SERVICE_URL || 'http://localhost:5001';

export interface HyperliquidPosition {
  coin: string;
  szi: string; // Size (signed: + for long, - for short)
  entryPx: string; // Entry price
  positionValue: string; // USD value
  unrealizedPnl: string; // Unrealized P&L in USD
  returnOnEquity: string; // ROE percentage
  leverage: string;
  liquidationPx: string | null;
  marginUsed: string;
}

export interface HyperliquidMarketInfo {
  coin: string;
  price: number;
  szDecimals: number;
}

/**
 * Get open positions for a Hyperliquid account
 */
export async function getHyperliquidOpenPositions(
  userAddress: string
): Promise<HyperliquidPosition[]> {
  try {
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: userAddress }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch positions: ${response.statusText}`);
    }

    const data = await response.json();
    return data.positions || [];
  } catch (error: any) {
    console.error('[HyperliquidUtils] Failed to get positions:', error.message);
    throw error;
  }
}

/**
 * Get current market price for a token on Hyperliquid
 */
export async function getHyperliquidMarketPrice(coin: string): Promise<number | null> {
  try {
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/market-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch market info: ${response.statusText}`);
    }

    const data = await response.json();
    return data.price || null;
  } catch (error: any) {
    console.error(`[HyperliquidUtils] Failed to get price for ${coin}:`, error.message);
    return null;
  }
}

/**
 * Get market info for all available tokens
 */
export async function getHyperliquidAllMarkets(): Promise<Record<string, HyperliquidMarketInfo>> {
  try {
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/market-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coin: 'ALL' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch market info: ${response.statusText}`);
    }

    const data = await response.json();
    return data.markets || {};
  } catch (error: any) {
    console.error('[HyperliquidUtils] Failed to get all markets:', error.message);
    return {};
  }
}

/**
 * Close a Hyperliquid position
 */
export async function closeHyperliquidPosition(params: {
  deploymentId: string;
  userAddress: string;
  coin: string;
  size?: number; // Optional - if not provided, closes full position
}): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    // Get agent private key for this deployment
    const agentPrivateKey = await getAgentPrivateKey(params.deploymentId);
    
    if (!agentPrivateKey) {
      throw new Error('Hyperliquid agent wallet not registered. Please run setup first.');
    }

    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/close-position`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentPrivateKey,
        coin: params.coin,
        size: params.size, // Optional - will close full position if not provided
        slippage: 0.01, // 1% slippage
        vaultAddress: params.userAddress, // User's Hyperliquid account
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to close position: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: data.success,
      result: data.result,
    };
  } catch (error: any) {
    console.error('[HyperliquidUtils] Failed to close position:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get account balance for a Hyperliquid account
 */
export async function getHyperliquidAccountBalance(
  userAddress: string
): Promise<number> {
  try {
    const response = await fetch(`${HYPERLIQUID_SERVICE_URL}/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: userAddress }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch balance: ${response.statusText}`);
    }

    const data = await response.json();
    return parseFloat(data.balance || '0');
  } catch (error: any) {
    console.error('[HyperliquidUtils] Failed to get balance:', error.message);
    return 0;
  }
}

