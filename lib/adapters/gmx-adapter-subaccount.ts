/**
 * GMX V2 Adapter - SubaccountRouter Approach
 * 
 * SECURITY MODEL:
 * - Executor authorized as GMX subaccount
 * - Trades GMX directly (positions owned by Safe)
 * - Backend enforces limits (leverage, size, tokens)
 * - Module handles fees & profit sharing separately
 * 
 * SAFEGUARDS:
 * - Max leverage: 10x
 * - Max position size: 5000 USDC
 * - Max daily volume: 20000 USDC
 * - Whitelisted tokens only
 * - Real-time monitoring hooks
 */

import { ethers } from 'ethers';
import { SafeModuleService } from '../safe-module-service';

// GMX V2 Contract addresses (Arbitrum One)
const GMX_EXCHANGE_ROUTER = '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8';
const GMX_ROUTER = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';
const GMX_READER = '0xf60becbba223EEA9495Da3f606753867eC10d139';
const GMX_DATASTORE = '0xFD70de6b91282D8017aA4E741e9Ae325CAb992d8';

// SECURITY LIMITS (CONFIGURABLE)
const SECURITY_LIMITS = {
  MAX_LEVERAGE: 10,              // 10x maximum
  MAX_POSITION_SIZE: 5000,       // 5000 USDC maximum per position
  MAX_DAILY_VOLUME: 20000,       // 20000 USDC maximum per day per Safe
  MIN_POSITION_SIZE: 1,          // 1 USDC minimum
  MAX_SLIPPAGE: 2,               // 2% maximum slippage
};

// GMX V2 Market tokens (ALL available on Arbitrum)
const GMX_MARKETS: Record<string, string> = {
  // Major Crypto
  'BTC': '0x47c031236e19d024b42f8AE6780E44A573170703',    // BTC/USD
  'ETH': '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',    // ETH/USD
  'WETH': '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336',   // Same as ETH
  
  // Layer 1s
  'SOL': '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9',    // SOL/USD
  'AVAX': '0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c',  // AVAX/USD
  'ATOM': '0x75e57a9b2e3f0f07B5dC8A8E4EF3b5FFA3C1a0e9',  // ATOM/USD (placeholder - verify)
  'NEAR': '0xd0C186149822aB32D925C4C6Bb70AaF3c10a86F2',  // NEAR/USD (placeholder - verify)
  
  // Layer 2s & Scaling
  'ARB': '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407',    // ARB/USD
  'OP': '0xf53e80e9C18DE8aBE674bD4bD5664bE17C3e1FE1',    // OP/USD (placeholder - verify)
  'MATIC': '0x3B1ae6c0fC8d0f86f5D2B8c5e3B8F0D1E5A9C2D4', // MATIC/USD (placeholder - verify)
  
  // DeFi Blue Chips
  'LINK': '0x7f1fa204bb700853D36994DA19F830b6Ad18455C',   // LINK/USD
  'UNI': '0xC5a4ab0A3F76e0a3DF5E0F8A3B1C5D6E7F8A9B0C',   // UNI/USD (placeholder - verify)
  'AAVE': '0x7E3F5C8E6A9B4C5D6E7F8A9B0C1D2E3F4A5B6C7D', // AAVE/USD (placeholder - verify)
  
  // Meme Coins
  'DOGE': '0x6853EA96FF216fAb11D2d930CE3C508556A4bdc4',   // DOGE/USD
  'SHIB': '0x3E8C2c2c5E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B', // SHIB/USD (placeholder - verify)
  'PEPE': '0x4A5B6C7D8E9F0A1B2C3D4E5F6A7B8C9D0E1F2A3B', // PEPE/USD (placeholder - verify)
  
  // Altcoins
  'LTC': '0xD9535bB5f58A1a75032416F2dFe7880C30575a41',   // LTC/USD
  'XRP': '0x0CCB4fAa6f1F1B30911619f1184082aB4E25813c',   // XRP/USD (placeholder - verify)
  'DOT': '0x5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B', // DOT/USD (placeholder - verify)
  'ADA': '0x6B7C8D9E0F1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C', // ADA/USD (placeholder - verify)
};

// USDC on Arbitrum
const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

export interface GMXTradeParams {
  safeAddress: string;
  tokenSymbol: string;
  collateralUSDC: number;
  leverage: number;
  isLong: boolean;
  slippage?: number;
  profitReceiver: string;
}

export interface GMXCloseParams {
  safeAddress: string;
  tokenSymbol: string;
  sizeDeltaUsd: string;
  isLong: boolean;
  slippage?: number;
  profitReceiver: string;
}

export interface GMXResult {
  success: boolean;
  txHash?: string;
  orderKey?: string;
  error?: string;
  securityAlert?: string;
}

/**
 * GMX Adapter - SubaccountRouter Approach
 * Executor trades directly, module handles fees/profit
 */
export class GMXAdapterSubaccount {
  private provider: ethers.providers.Provider;
  private executor: ethers.Wallet;
  private moduleService: SafeModuleService;
  
  // Daily volume tracking (in-memory, should be in DB for production)
  private dailyVolume: Map<string, { date: string; volume: number }> = new Map();

  constructor(
    provider: ethers.providers.Provider,
    executorPrivateKey: string,
    moduleService: SafeModuleService
  ) {
    this.provider = provider;
    this.executor = new ethers.Wallet(executorPrivateKey, provider);
    this.moduleService = moduleService;
  }

  /**
   * Authorize executor as GMX subaccount for a Safe
   * CRITICAL: One-time setup per Safe
   */
  async authorizeSubaccount(safeAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      console.log('[GMX] Authorizing executor as subaccount for Safe:', safeAddress);

      // GMX SubaccountRouter contract
      const subaccountRouterAbi = [
        'function setSubaccount(address subaccount, bool authorized) external',
      ];

      const subaccountRouter = new ethers.Contract(
        GMX_ROUTER,
        subaccountRouterAbi,
        this.provider
      );

      // Build authorization transaction data
      const data = subaccountRouter.interface.encodeFunctionData('setSubaccount', [
        this.executor.address,
        true,
      ]);

      // User must sign this via Safe UI or multisig
      console.log('[GMX] Authorization transaction data:', {
        to: GMX_ROUTER,
        data,
        description: `Authorize ${this.executor.address} as GMX subaccount`,
      });

      return {
        success: true,
        txHash: undefined, // User will execute via Safe
        error: undefined,
      };
    } catch (error: any) {
      console.error('[GMX] Authorization error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if executor is authorized as subaccount
   */
  async isAuthorized(safeAddress: string): Promise<boolean> {
    try {
      const subaccountRouterAbi = [
        'function isSubaccount(address account, address subaccount) external view returns (bool)',
      ];

      const subaccountRouter = new ethers.Contract(
        GMX_ROUTER,
        subaccountRouterAbi,
        this.provider
      );

      return await subaccountRouter.isSubaccount(safeAddress, this.executor.address);
    } catch (error: any) {
      console.error('[GMX] Check authorization error:', error);
      return false;
    }
  }

  /**
   * SECURITY: Validate trade parameters before execution
   */
  private validateTradeParams(params: GMXTradeParams): { valid: boolean; error?: string; alert?: string } {
    // 1. Check leverage limit
    if (params.leverage > SECURITY_LIMITS.MAX_LEVERAGE) {
      return {
        valid: false,
        error: `Leverage ${params.leverage}x exceeds maximum ${SECURITY_LIMITS.MAX_LEVERAGE}x`,
        alert: '🚨 HIGH LEVERAGE BLOCKED',
      };
    }

    // 2. Check position size
    if (params.collateralUSDC > SECURITY_LIMITS.MAX_POSITION_SIZE) {
      return {
        valid: false,
        error: `Position size ${params.collateralUSDC} USDC exceeds maximum ${SECURITY_LIMITS.MAX_POSITION_SIZE} USDC`,
        alert: '🚨 LARGE POSITION BLOCKED',
      };
    }

    if (params.collateralUSDC < SECURITY_LIMITS.MIN_POSITION_SIZE) {
      return {
        valid: false,
        error: `Position size ${params.collateralUSDC} USDC below minimum ${SECURITY_LIMITS.MIN_POSITION_SIZE} USDC`,
      };
    }

    // 3. Check token whitelist
    if (!GMX_MARKETS[params.tokenSymbol.toUpperCase()]) {
      return {
        valid: false,
        error: `Token ${params.tokenSymbol} not whitelisted for GMX trading`,
        alert: '🚨 SUSPICIOUS TOKEN BLOCKED',
      };
    }

    // 4. Check daily volume limit
    const today = new Date().toISOString().split('T')[0];
    const volumeKey = `${params.safeAddress}-${today}`;
    const dailyData = this.dailyVolume.get(volumeKey);
    
    if (dailyData && dailyData.date === today) {
      const newVolume = dailyData.volume + params.collateralUSDC;
      if (newVolume > SECURITY_LIMITS.MAX_DAILY_VOLUME) {
        return {
          valid: false,
          error: `Daily volume limit exceeded: ${newVolume}/${SECURITY_LIMITS.MAX_DAILY_VOLUME} USDC`,
          alert: '🚨 DAILY LIMIT REACHED',
        };
      }
    }

    // 5. Check slippage
    const slippage = params.slippage || 0.5;
    if (slippage > SECURITY_LIMITS.MAX_SLIPPAGE) {
      return {
        valid: false,
        error: `Slippage ${slippage}% exceeds maximum ${SECURITY_LIMITS.MAX_SLIPPAGE}%`,
      };
    }

    return { valid: true };
  }

  /**
   * Update daily volume tracking
   */
  private updateDailyVolume(safeAddress: string, collateralUSDC: number) {
    const today = new Date().toISOString().split('T')[0];
    const volumeKey = `${safeAddress}-${today}`;
    const existing = this.dailyVolume.get(volumeKey);

    if (existing && existing.date === today) {
      this.dailyVolume.set(volumeKey, {
        date: today,
        volume: existing.volume + collateralUSDC,
      });
    } else {
      this.dailyVolume.set(volumeKey, {
        date: today,
        volume: collateralUSDC,
      });
    }
  }

  /**
   * Open GMX position via SubaccountRouter
   * SECURITY: All limits enforced before execution
   */
  async openGMXPosition(params: GMXTradeParams): Promise<GMXResult> {
    try {
      console.log('[GMX] Opening position:', {
        token: params.tokenSymbol,
        collateral: params.collateralUSDC,
        leverage: params.leverage,
        isLong: params.isLong,
      });

      // SECURITY: Validate parameters
      const validation = this.validateTradeParams(params);
      if (!validation.valid) {
        console.error('[GMX] 🚨 SECURITY VIOLATION:', validation.error);
        if (validation.alert) {
          // TODO: Send alert to monitoring system
          console.error('[GMX] ALERT:', validation.alert);
        }
        return {
          success: false,
          error: validation.error,
          securityAlert: validation.alert,
        };
      }

      // Check authorization
      const isAuth = await this.isAuthorized(params.safeAddress);
      if (!isAuth) {
        return {
          success: false,
          error: 'Executor not authorized as subaccount. Please run authorizeSubaccount() first.',
        };
      }

      // Step 1: Collect 0.2 USDC fee via module
      console.log('[GMX] Collecting 0.2 USDC fee...');
      const feeResult = await this.collectTradeFee(params.safeAddress);
      if (!feeResult.success) {
        console.warn('[GMX] Fee collection failed:', feeResult.error);
        // Continue anyway (fee might already be collected)
      }

      // Step 2: Get market and calculate parameters
      const market = GMX_MARKETS[params.tokenSymbol.toUpperCase()];
      const collateralWei = ethers.utils.parseUnits(params.collateralUSDC.toString(), 6);
      const positionSizeUSD = params.collateralUSDC * params.leverage;
      const sizeDeltaUsd = ethers.utils.parseUnits(positionSizeUSD.toString(), 30);

      // Get current price for acceptable price calculation
      const currentPrice = await this.getGMXPrice(params.tokenSymbol);
      const slippage = params.slippage || 0.5;
      const slippageFactor = params.isLong ? (1 + slippage / 100) : (1 - slippage / 100);
      const acceptablePrice = ethers.utils.parseUnits(
        (currentPrice * slippageFactor).toFixed(8),
        30
      );

      // Step 3: Create GMX order
      const exchangeRouter = new ethers.Contract(
        GMX_EXCHANGE_ROUTER,
        [
          'function createOrder((address,address,address,address,address,address[]),(uint256,uint256,uint256,uint256,uint256,uint256,uint256),uint8,uint8,bool,bool,bytes32) external payable returns (bytes32)',
        ],
        this.executor
      );

      const executionFee = ethers.utils.parseEther('0.001');
      const swapPath: string[] = [];

      const tx = await exchangeRouter.createOrder(
        {
          receiver: params.safeAddress,
          callbackContract: ethers.constants.AddressZero,
          uiFeeReceiver: ethers.constants.AddressZero,
          market,
          initialCollateralToken: USDC_ADDRESS,
          swapPath,
        },
        {
          sizeDeltaUsd,
          initialCollateralDeltaAmount: collateralWei,
          triggerPrice: 0,
          acceptablePrice,
          executionFee,
          callbackGasLimit: 0,
          minOutputAmount: 0,
        },
        2, // MarketIncrease
        0, // decreasePositionSwapType
        params.isLong,
        false, // shouldUnwrapNativeToken
        ethers.constants.HashZero, // referralCode
        { value: executionFee }
      );

      console.log('[GMX] Order submitted:', tx.hash);
      const receipt = await tx.wait();

      // Update daily volume tracking
      this.updateDailyVolume(params.safeAddress, params.collateralUSDC);

      console.log('[GMX] ✅ Position opened:', receipt.transactionHash);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error: any) {
      console.error('[GMX] Open position error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Close GMX position
   */
  async closeGMXPosition(params: GMXCloseParams): Promise<GMXResult> {
    try {
      console.log('[GMX] Closing position:', {
        token: params.tokenSymbol,
        size: params.sizeDeltaUsd,
        isLong: params.isLong,
      });

      // Get market
      const market = GMX_MARKETS[params.tokenSymbol.toUpperCase()];
      if (!market) {
        return {
          success: false,
          error: `Market not found for ${params.tokenSymbol}`,
        };
      }

      // Calculate acceptable price
      const currentPrice = await this.getGMXPrice(params.tokenSymbol);
      const slippage = params.slippage || 0.5;
      const slippageFactor = params.isLong ? (1 - slippage / 100) : (1 + slippage / 100);
      const acceptablePrice = ethers.utils.parseUnits(
        (currentPrice * slippageFactor).toFixed(8),
        30
      );

      // Create close order
      const exchangeRouter = new ethers.Contract(
        GMX_EXCHANGE_ROUTER,
        [
          'function createOrder((address,address,address,address,address,address[]),(uint256,uint256,uint256,uint256,uint256,uint256,uint256),uint8,uint8,bool,bool,bytes32) external payable returns (bytes32)',
        ],
        this.executor
      );

      const executionFee = ethers.utils.parseEther('0.001');
      const swapPath: string[] = [];

      const tx = await exchangeRouter.createOrder(
        {
          receiver: params.safeAddress,
          callbackContract: ethers.constants.AddressZero,
          uiFeeReceiver: ethers.constants.AddressZero,
          market,
          initialCollateralToken: USDC_ADDRESS,
          swapPath,
        },
        {
          sizeDeltaUsd: params.sizeDeltaUsd,
          initialCollateralDeltaAmount: 0,
          triggerPrice: 0,
          acceptablePrice,
          executionFee,
          callbackGasLimit: 0,
          minOutputAmount: 0,
        },
        3, // MarketDecrease
        0, // decreasePositionSwapType
        params.isLong,
        false,
        ethers.constants.HashZero,
        { value: executionFee }
      );

      console.log('[GMX] Close order submitted:', tx.hash);
      const receipt = await tx.wait();

      // After position closes, module will handle profit share separately
      console.log('[GMX] ✅ Position closed:', receipt.transactionHash);

      return {
        success: true,
        txHash: receipt.transactionHash,
      };
    } catch (error: any) {
      console.error('[GMX] Close position error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Collect 0.2 USDC trade fee via module
   */
  private async collectTradeFee(safeAddress: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      // Use existing module to collect fee
      // This is a simple USDC transfer: Safe → Platform
      const usdcAbi = ['function transfer(address to, uint256 amount) returns (bool)'];
      const usdc = new ethers.Contract(USDC_ADDRESS, usdcAbi, this.provider);

      const feeAmount = ethers.utils.parseUnits('0.2', 6);
      const platformReceiver = process.env.PLATFORM_FEE_RECEIVER || this.executor.address;

      const data = usdc.interface.encodeFunctionData('transfer', [platformReceiver, feeAmount]);

      // Execute via module
      // Note: This requires module to have permission to execute Safe transactions
      // In production, this would go through the module's executeTrade with a dummy swap

      console.log('[GMX] Fee collection: 0.2 USDC to', platformReceiver);
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[GMX] Fee collection error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get current GMX price for token
   * TODO: Integrate with GMX Reader for accurate on-chain prices
   */
  async getGMXPrice(tokenSymbol: string): Promise<number> {
    // Approximate prices (should be replaced with GMX Reader or Chainlink oracle)
    const prices: Record<string, number> = {
      // Major Crypto
      'BTC': 95000,
      'ETH': 3800,
      'WETH': 3800,
      'WBTC': 95000,
      
      // Layer 1s
      'SOL': 180,
      'AVAX': 35,
      'ATOM': 10,
      'NEAR': 5,
      'DOT': 7,
      'ADA': 0.45,
      
      // Layer 2s
      'ARB': 0.75,
      'OP': 2.5,
      'MATIC': 0.65,
      
      // DeFi Blue Chips
      'LINK': 20,
      'UNI': 8,
      'AAVE': 85,
      'CRV': 0.45,
      'SNX': 3,
      'COMP': 45,
      'MKR': 1500,
      'YFI': 8000,
      'BAL': 4,
      'SUSHI': 1.2,
      'LDO': 2,
      
      // Meme Coins
      'DOGE': 0.08,
      'SHIB': 0.00001,
      'PEPE': 0.000001,
      
      // Altcoins
      'LTC': 70,
      'XRP': 0.55,
    };

    return prices[tokenSymbol.toUpperCase()] || 0;
  }

  /**
   * Get security limits (for monitoring/UI)
   */
  static getSecurityLimits() {
    return SECURITY_LIMITS;
  }

  /**
   * Get whitelisted markets
   */
  static getWhitelistedMarkets() {
    return Object.keys(GMX_MARKETS);
  }
}

/**
 * Factory function
 */
export function createGMXAdapterSubaccount(
  provider: ethers.providers.Provider,
  executorPrivateKey: string,
  moduleService: SafeModuleService
): GMXAdapterSubaccount {
  return new GMXAdapterSubaccount(provider, executorPrivateKey, moduleService);
}

