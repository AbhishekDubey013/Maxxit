import { Injectable } from "@nestjs/common";

export interface PlaceOrderParams {
  tokenSymbol: string;
  side: "LONG" | "SHORT";
  qty: string;
  limitPrice?: string;
}

export interface PlaceOrderResult {
  entryPrice: number;
  qty: string;
  txHash: string;
}

export interface ClosePositionParams {
  tokenSymbol: string;
  qty: string;
  positionId: string;
}

export interface ClosePositionResult {
  exitPrice: number;
  txHash: string;
}

@Injectable()
export class GmxAdapter {
  /**
   * Check if a trading pair exists on GMX
   * TODO: Implement actual GMX API integration
   */
  async pairExists(token: string): Promise<boolean> {
    // Stub implementation - always return true for common tokens
    const supportedTokens = ["BTC", "ETH", "SOL", "ARB", "AVAX"];
    return supportedTokens.includes(token.toUpperCase());
  }

  /**
   * Place a market or limit order on GMX
   * TODO: Implement actual GMX contract interaction
   */
  async placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    // Stub implementation
    console.log(`[GMX] Placing ${params.side} order for ${params.qty} ${params.tokenSymbol}`);
    
    // Simulate order execution
    return {
      entryPrice: this.getMockPrice(params.tokenSymbol),
      qty: params.qty,
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    };
  }

  /**
   * Close an existing position
   * TODO: Implement actual GMX contract interaction
   */
  async closePosition(params: ClosePositionParams): Promise<ClosePositionResult> {
    // Stub implementation
    console.log(`[GMX] Closing position for ${params.qty} ${params.tokenSymbol}`);
    
    return {
      exitPrice: this.getMockPrice(params.tokenSymbol),
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    };
  }

  /**
   * Get minimum order size for a token
   * TODO: Implement actual GMX API call
   */
  async minSize(token: string): Promise<string> {
    // Stub implementation
    return "0.001";
  }

  /**
   * Get tick size (price increment) for a token
   * TODO: Implement actual GMX API call
   */
  async tickSize(token: string): Promise<string> {
    // Stub implementation
    return "0.01";
  }

  /**
   * Get slippage limit in basis points
   * TODO: Implement actual GMX configuration
   */
  async slippageGuard(bps: number): Promise<number> {
    // Stub implementation - return the configured BPS
    return bps;
  }

  /**
   * Mock price fetcher for stub implementation
   * TODO: Replace with actual price oracle
   */
  private getMockPrice(token: string): number {
    const mockPrices: Record<string, number> = {
      BTC: 42000,
      ETH: 2800,
      SOL: 140,
      ARB: 1.5,
      AVAX: 35,
    };
    return mockPrices[token.toUpperCase()] || 100;
  }
}
