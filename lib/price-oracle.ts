/**
 * Price Oracle - Get real-time token prices
 * Uses Uniswap V3 pools on Arbitrum for accurate on-chain prices
 */

import { ethers } from 'ethers';

const ARBITRUM_RPC = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';

// Uniswap V3 Quoter on Arbitrum
const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

const QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
];

// Token addresses on Arbitrum
const TOKENS: Record<string, string> = {
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
};

let provider: ethers.providers.JsonRpcProvider | null = null;
let quoter: ethers.Contract | null = null;

function getProvider() {
  if (!provider) {
    provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
  }
  return provider;
}

function getQuoter() {
  if (!quoter) {
    quoter = new ethers.Contract(QUOTER_ADDRESS, QUOTER_ABI, getProvider());
  }
  return quoter;
}

/**
 * Get token price in USDC using Uniswap V3
 */
export async function getTokenPriceUSD(tokenSymbol: string): Promise<number | null> {
  try {
    // Handle USDC specially
    if (tokenSymbol === 'USDC') {
      return 1.0;
    }

    const tokenAddress = TOKENS[tokenSymbol];
    if (!tokenAddress) {
      console.error(`[PriceOracle] Token ${tokenSymbol} not found`);
      return null;
    }

    const quoter = getQuoter();
    const usdcAddress = TOKENS.USDC;

    // Quote 1 token worth (using appropriate decimals)
    // Most tokens use 18 decimals, WBTC uses 8, USDC uses 6
    const decimals = tokenSymbol === 'WBTC' ? 8 : 18;
    const amountIn = ethers.utils.parseUnits('1', decimals);

    // Try 0.3% fee tier first (most common)
    try {
      const amountOut = await quoter.callStatic.quoteExactInputSingle(
        tokenAddress,
        usdcAddress,
        3000, // 0.3% fee
        amountIn,
        0
      );

      const price = parseFloat(ethers.utils.formatUnits(amountOut, 6)); // USDC has 6 decimals
      console.log(`[PriceOracle] ${tokenSymbol} price: $${price.toFixed(2)}`);
      return price;
    } catch (e) {
      // Try 0.05% fee tier
      try {
        const amountOut = await quoter.callStatic.quoteExactInputSingle(
          tokenAddress,
          usdcAddress,
          500, // 0.05% fee
          amountIn,
          0
        );

        const price = parseFloat(ethers.utils.formatUnits(amountOut, 6));
        console.log(`[PriceOracle] ${tokenSymbol} price: $${price.toFixed(2)}`);
        return price;
      } catch (e2) {
        // Try 1% fee tier
        const amountOut = await quoter.callStatic.quoteExactInputSingle(
          tokenAddress,
          usdcAddress,
          10000, // 1% fee
          amountIn,
          0
        );

        const price = parseFloat(ethers.utils.formatUnits(amountOut, 6));
        console.log(`[PriceOracle] ${tokenSymbol} price: $${price.toFixed(2)}`);
        return price;
      }
    }
  } catch (error: any) {
    console.error(`[PriceOracle] Failed to get price for ${tokenSymbol}:`, error.message);
    return null;
  }
}

/**
 * Get multiple token prices at once
 */
export async function getTokenPrices(tokenSymbols: string[]): Promise<Record<string, number | null>> {
  const prices: Record<string, number | null> = {};

  for (const symbol of tokenSymbols) {
    prices[symbol] = await getTokenPriceUSD(symbol);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return prices;
}

/**
 * Calculate position P&L
 */
export function calculatePnL(
  side: string,
  entryPrice: number,
  currentPrice: number,
  sizeUSD: number
): { pnlUSD: number; pnlPercent: number } {
  let pnlPercent: number;

  if (side === 'BUY' || side === 'LONG') {
    pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
  } else {
    pnlPercent = ((entryPrice - currentPrice) / entryPrice) * 100;
  }

  const pnlUSD = (pnlPercent / 100) * sizeUSD;

  return { pnlUSD, pnlPercent };
}

