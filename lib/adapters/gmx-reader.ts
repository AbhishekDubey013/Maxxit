/**
 * GMX Reader - On-Chain Price Oracle
 * 
 * Gets real-time prices directly from GMX V2 contracts
 * This is the EXACT price GMX uses for position settlement
 * 
 * Similar to how we use Uniswap V3 Quoter for SPOT prices,
 * we use GMX Reader for GMX perpetual prices.
 */

import { ethers } from 'ethers';

// GMX V2 Contract addresses (Arbitrum One)
const GMX_READER = '0xf60becbba223EEA9495Da3f606753867eC10d139';
const GMX_DATASTORE = '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8';

// Index tokens (the actual asset being traded)
const INDEX_TOKENS: Record<string, string> = {
  'BTC': '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',  // WBTC
  'ETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',  // WETH
  'WETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
  'SOL': '0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07',  // SOL (wrapped)
  'AVAX': '0x565609fAF65B92F7be02468acF86f8979423e514', // AVAX (wrapped)
  'ARB': '0x912CE59144191C1204E64559FE8253a0e49E6548',  // ARB
  'LINK': '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', // LINK
  'DOGE': '0xC4da4c24fd591125c3F47b340b6f4f76111883d8', // DOGE (wrapped)
  'LTC': '0x13Ad51ed4F1B7e9Dc168d8a00cB3f4dDD85EfA60',  // LTC (wrapped)
  'UNI': '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',  // UNI
  'MATIC': '0x561877b6b3DD7651313794e5F2894B2F18bE0766', // MATIC
};

// GMX Market tokens (the market contract for each pair)
const GMX_MARKETS: Record<string, string> = {
  'BTC': '0x47c031236e19d024b42f8AE6780E44A573170703',
  'ETH': '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
  'WETH': '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',
  'SOL': '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9',
  'AVAX': '0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c',
  'ARB': '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407',
  'LINK': '0x7f1fa204bb700853D36994DA19F830b6Ad18455C',
  'DOGE': '0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4',
  'LTC': '0xD9535bB5f58A1a75032416F2dFe7880C30575a41',
};

// USDC (collateral token)
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

/**
 * GMX Reader for on-chain price feeds
 * 
 * This queries GMX contracts directly (like Uniswap Quoter for SPOT)
 */
export class GMXReader {
  private provider: ethers.providers.Provider;
  private reader: ethers.Contract;
  private dataStore: ethers.Contract;

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;

    // GMX Reader ABI
    const readerAbi = [
      // Get market token price (for index tokens like BTC, ETH)
      'function getMarketTokenPrice(address dataStore, address market, address indexToken, address longToken, address shortToken, bytes32 pnlFactorType, bool maximize) external view returns (int256, (int256, int256))',
      
      // Get position info (for calculating PnL)
      'function getPositionInfo(address dataStore, bytes32 referralStorage, bytes32 positionKey, (uint256,uint256) prices, uint256 sizeDeltaUsd, address uiFeeReceiver, bool usePositionSizeAsSizeDeltaUsd) external view returns ((address, address, address, address, bool), (uint256, uint256, uint256, int256, uint256, uint256, uint256, uint256), (int256, uint256, uint256), (uint256, uint256, uint256), (address, uint256))',
      
      // Get market info
      'function getMarket(address dataStore, address marketAddress) external view returns ((address,address,address,address))',
    ];

    // GMX DataStore ABI (for price lookups)
    const dataStoreAbi = [
      'function getUint(bytes32 key) external view returns (uint256)',
      'function getInt(bytes32 key) external view returns (int256)',
    ];

    this.reader = new ethers.Contract(GMX_READER, readerAbi, provider);
    this.dataStore = new ethers.Contract(GMX_DATASTORE, dataStoreAbi, provider);
  }

  /**
   * Get market for token symbol
   */
  static getMarket(tokenSymbol: string): string | null {
    return GMX_MARKETS[tokenSymbol.toUpperCase()] || null;
  }

  /**
   * Get current GMX price from on-chain oracle
   * This is the ACTUAL price used by GMX for trades
   * 
   * Similar to: Uniswap V3 Quoter.quoteExactInputSingle()
   */
  async getMarketPrice(tokenSymbol: string): Promise<{
    price: number;
    priceWei: ethers.BigNumber;
    timestamp: number;
  } | null> {
    try {
      const market = GMX_MARKETS[tokenSymbol.toUpperCase()];
      const indexToken = INDEX_TOKENS[tokenSymbol.toUpperCase()];
      
      if (!market || !indexToken) {
        console.error(`[GMXReader] Market/Index token not found for ${tokenSymbol}`);
        return null;
      }

      console.log(`[GMXReader] Querying GMX for ${tokenSymbol} price...`);
      console.log(`├─ Market: ${market}`);
      console.log(`└─ Index Token: ${indexToken}`);

      // Query GMX Reader for market token price
      // Parameters:
      // - dataStore: GMX DataStore contract
      // - market: Market address (e.g., ETH/USD market)
      // - indexToken: The token being traded (e.g., WETH)
      // - longToken: Collateral for longs (USDC)
      // - shortToken: Collateral for shorts (USDC)
      // - pnlFactorType: PnL calculation method (keccak256("MAX_PNL_FACTOR_FOR_TRADERS"))
      // - maximize: true for mark price (conservative)
      
      const pnlFactorType = ethers.utils.id('MAX_PNL_FACTOR_FOR_TRADERS');
      
      const result = await this.reader.getMarketTokenPrice(
        GMX_DATASTORE,
        market,
        indexToken,
        USDC_ADDRESS, // longToken
        USDC_ADDRESS, // shortToken
        pnlFactorType,
        true // maximize (conservative price)
      );

      // Result format: (int256 price, (int256 poolValue, int256 longTokenAmount))
      // Price is in 30 decimals (GMX standard)
      const priceWei = result[0]; // int256
      const price = parseFloat(ethers.utils.formatUnits(priceWei.abs(), 30));
      
      const block = await this.provider.getBlock('latest');
      const timestamp = block.timestamp;

      console.log(`[GMXReader] ✅ ${tokenSymbol}/USD: $${price.toFixed(2)}`);

      return {
        price,
        priceWei,
        timestamp,
      };
    } catch (error: any) {
      console.error(`[GMXReader] Error getting price for ${tokenSymbol}:`, error.message);
      console.error(`[GMXReader] This might be due to GMX Reader contract interface changes`);
      return null;
    }
  }

  /**
   * Get position PnL from GMX (on-chain calculation)
   * This is what GMX will use to settle the position
   * 
   * NOTE: GMX calculates PnL automatically when closing
   * We just need current price to estimate, actual PnL comes from close transaction
   */
  async getPositionPnL(params: {
    tokenSymbol: string;
    entryPrice: number;
    qty: number;
    isLong: boolean;
  }): Promise<{
    pnl: number;
    currentPrice: number;
  } | null> {
    try {
      // Get current price from GMX
      const priceData = await this.getMarketPrice(params.tokenSymbol);
      if (!priceData) {
        return null;
      }

      const currentPrice = priceData.price;
      
      // Calculate estimated PnL
      // GMX uses: PnL = (currentPrice - entryPrice) * size (for longs)
      //           PnL = (entryPrice - currentPrice) * size (for shorts)
      let pnl: number;
      if (params.isLong) {
        pnl = (currentPrice - params.entryPrice) * params.qty;
      } else {
        pnl = (params.entryPrice - currentPrice) * params.qty;
      }

      console.log('[GMXReader] Position PnL:', {
        token: params.tokenSymbol,
        entryPrice: params.entryPrice.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
        pnl: pnl.toFixed(2),
        isLong: params.isLong,
      });

      return {
        pnl,
        currentPrice,
      };
    } catch (error: any) {
      console.error('[GMXReader] Error getting position PnL:', error.message);
      return null;
    }
  }

  /**
   * Get index token address for a symbol
   */
  static getIndexToken(tokenSymbol: string): string | null {
    return INDEX_TOKENS[tokenSymbol.toUpperCase()] || null;
  }
}

/**
 * Factory function
 */
export function createGMXReader(provider: ethers.providers.Provider): GMXReader {
  return new GMXReader(provider);
}

/**
 * Why GMX Reader instead of Chainlink?
 * 
 * GMX has its own oracle system that aggregates:
 * ✅ Chainlink price feeds
 * ✅ GMX's own price calculations based on market liquidity
 * ✅ Conservative pricing to protect the protocol
 * 
 * By querying GMX Reader, we get the EXACT price GMX uses for settlement.
 * This is:
 * - More accurate than Chainlink alone
 * - Consistent with what users see on GMX UI
 * - What GMX uses to calculate PnL on-chain
 * 
 * Similar to how we use Uniswap V3 Quoter for SPOT prices!
 */

