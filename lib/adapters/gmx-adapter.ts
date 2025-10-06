/**
 * GMX V2 Perpetuals Adapter
 * Executes leveraged perpetual positions on GMX (Arbitrum)
 */

import { ethers } from 'ethers';
import { SafeWalletService, TransactionRequest } from '../safe-wallet';

export interface GMXPositionParams {
  market: string;           // Market token address (e.g., BTC market)
  collateralToken: string;  // USDC address
  isLong: boolean;          // true = LONG, false = SHORT
  sizeDelta: string;        // Position size in USD (with leverage)
  collateralDelta: string;  // Collateral amount in USDC
  acceptablePrice: string;  // Acceptable execution price
  executionFee: string;     // Gas fee for keeper
  referralCode: string;     // Referral code (optional)
}

export interface GMXPosition {
  key: string;
  market: string;
  collateral: string;
  size: string;
  isLong: boolean;
  entryPrice: string;
  liquidationPrice: string;
  pnl: string;
}

/**
 * GMX V2 Adapter for Perpetual Trading
 */
export class GMXAdapter {
  private safeWallet: SafeWalletService;

  // GMX V2 Contract addresses (Arbitrum)
  private static readonly EXCHANGE_ROUTER = '0x7C68C7866A64FA2160F78EEaE12217FFbf871fa8';
  private static readonly ROUTER = '0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6';
  private static readonly ORDER_VAULT = '0x31eF83a530Fde1B38EE9A18093A333D8Bbbc40D5';
  private static readonly READER = '0xf60becbba223EEA9495Da3f606753867eC10d139';

  // GMX Market tokens (BTC, ETH, etc.)
  private static readonly MARKETS: Record<string, string> = {
    'BTC': '0x47c031236e19d024b42f8AE6780E44A573170703', // BTC/USD market
    'ETH': '0x70d95587d40A2caf56bd97485aB3Eec10Bee6336', // ETH/USD market
    'SOL': '0x09400D9DB990D5ed3f35D7be61DfAEB900Af03C9', // SOL/USD market
    'ARB': '0xC25cEf6061Cf5dE5eb761b50E4743c1F5D7E5407', // ARB/USD market
    'LINK': '0x7f1fa204bb700853D36994DA19F830b6Ad18455C', // LINK/USD market
  };

  // USDC address on Arbitrum
  private static readonly USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

  constructor(safeWallet: SafeWalletService) {
    this.safeWallet = safeWallet;
  }

  /**
   * Get market address for token
   */
  static getMarket(tokenSymbol: string): string | null {
    return this.MARKETS[tokenSymbol] || null;
  }

  /**
   * Build transaction to approve USDC for GMX
   */
  async buildApprovalTx(amount: string): Promise<TransactionRequest> {
    return this.safeWallet.buildTokenApproval(
      GMXAdapter.USDC,
      GMXAdapter.ROUTER,
      amount
    );
  }

  /**
   * Build transaction to create increase position order
   */
  async buildIncreasePositionTx(params: {
    tokenSymbol: string;
    collateralAmount: string; // USDC amount in wei
    leverage: number;         // 2-50x
    isLong: boolean;
    acceptablePrice: string;  // In USD with 30 decimals
    slTriggerPrice?: string;  // Stop loss price
    tpTriggerPrice?: string;  // Take profit price
  }): Promise<TransactionRequest> {
    const market = GMXAdapter.getMarket(params.tokenSymbol);
    if (!market) {
      throw new Error(`Market not found for ${params.tokenSymbol}`);
    }

    // Calculate position size with leverage
    const collateral = ethers.BigNumber.from(params.collateralAmount);
    const sizeDeltaUsd = collateral.mul(params.leverage);

    // GMX uses 30 decimals for USD values
    const sizeDelta = sizeDeltaUsd.mul(ethers.BigNumber.from(10).pow(24)); // Convert USDC (6 decimals) to USD (30 decimals)

    // Build order parameters
    const orderParams = {
      addresses: {
        receiver: await this.safeWallet.getSafeInfo().then(i => i.address),
        callbackContract: ethers.constants.AddressZero,
        uiFeeReceiver: ethers.constants.AddressZero,
        market: market,
        initialCollateralToken: GMXAdapter.USDC,
        swapPath: [], // No swap needed
      },
      numbers: {
        sizeDeltaUsd: sizeDelta.toString(),
        initialCollateralDeltaAmount: params.collateralAmount,
        triggerPrice: params.tpTriggerPrice || '0',
        acceptablePrice: params.acceptablePrice,
        executionFee: ethers.utils.parseEther('0.001').toString(), // 0.001 ETH for keeper
        callbackGasLimit: '0',
        minOutputAmount: '0',
      },
      orderType: 2, // MarketIncrease
      decreasePositionSwapType: 0,
      isLong: params.isLong,
      shouldUnwrapNativeToken: false,
      referralCode: ethers.constants.HashZero,
    };

    const exchangeRouterInterface = new ethers.utils.Interface([
      'function createOrder((address receiver, address callbackContract, address uiFeeReceiver, address market, address initialCollateralToken, address[] swapPath) addresses, (uint256 sizeDeltaUsd, uint256 initialCollateralDeltaAmount, uint256 triggerPrice, uint256 acceptablePrice, uint256 executionFee, uint256 callbackGasLimit, uint256 minOutputAmount) numbers, uint256 orderType, uint256 decreasePositionSwapType, bool isLong, bool shouldUnwrapNativeToken, bytes32 referralCode) external payable returns (bytes32)',
    ]);

    const data = exchangeRouterInterface.encodeFunctionData('createOrder', [
      orderParams.addresses,
      orderParams.numbers,
      orderParams.orderType,
      orderParams.decreasePositionSwapType,
      orderParams.isLong,
      orderParams.shouldUnwrapNativeToken,
      orderParams.referralCode,
    ]);

    return {
      to: GMXAdapter.EXCHANGE_ROUTER,
      value: ethers.utils.parseEther('0.001').toString(), // Execution fee
      data,
      operation: 0,
    };
  }

  /**
   * Build transaction to close position
   */
  async buildClosePositionTx(params: {
    tokenSymbol: string;
    sizeDeltaUsd: string;     // Size to close in USD (30 decimals)
    isLong: boolean;
    acceptablePrice: string;  // Acceptable execution price
  }): Promise<TransactionRequest> {
    const market = GMXAdapter.getMarket(params.tokenSymbol);
    if (!market) {
      throw new Error(`Market not found for ${params.tokenSymbol}`);
    }

    const orderParams = {
      addresses: {
        receiver: await this.safeWallet.getSafeInfo().then(i => i.address),
        callbackContract: ethers.constants.AddressZero,
        uiFeeReceiver: ethers.constants.AddressZero,
        market: market,
        initialCollateralToken: GMXAdapter.USDC,
        swapPath: [],
      },
      numbers: {
        sizeDeltaUsd: params.sizeDeltaUsd,
        initialCollateralDeltaAmount: '0',
        triggerPrice: '0',
        acceptablePrice: params.acceptablePrice,
        executionFee: ethers.utils.parseEther('0.001').toString(),
        callbackGasLimit: '0',
        minOutputAmount: '0',
      },
      orderType: 3, // MarketDecrease
      decreasePositionSwapType: 0,
      isLong: params.isLong,
      shouldUnwrapNativeToken: false,
      referralCode: ethers.constants.HashZero,
    };

    const exchangeRouterInterface = new ethers.utils.Interface([
      'function createOrder((address receiver, address callbackContract, address uiFeeReceiver, address market, address initialCollateralToken, address[] swapPath) addresses, (uint256 sizeDeltaUsd, uint256 initialCollateralDeltaAmount, uint256 triggerPrice, uint256 acceptablePrice, uint256 executionFee, uint256 callbackGasLimit, uint256 minOutputAmount) numbers, uint256 orderType, uint256 decreasePositionSwapType, bool isLong, bool shouldUnwrapNativeToken, bytes32 referralCode) external payable returns (bytes32)',
    ]);

    const data = exchangeRouterInterface.encodeFunctionData('createOrder', [
      orderParams.addresses,
      orderParams.numbers,
      orderParams.orderType,
      orderParams.decreasePositionSwapType,
      orderParams.isLong,
      orderParams.shouldUnwrapNativeToken,
      orderParams.referralCode,
    ]);

    return {
      to: GMXAdapter.EXCHANGE_ROUTER,
      value: ethers.utils.parseEther('0.001').toString(),
      data,
      operation: 0,
    };
  }

  /**
   * Get current positions for account
   */
  async getPositions(account: string): Promise<GMXPosition[]> {
    // TODO: Query GMX reader contract for positions
    // This requires more complex interaction with GMX's reader contract
    console.log('[GMX] Fetching positions for', account);
    return [];
  }

  /**
   * Get execution summary
   */
  async getExecutionSummary(params: {
    signal: any;
    safeAddress: string;
  }): Promise<{
    canExecute: boolean;
    reason?: string;
    estimatedGas?: string;
    usdcBalance?: number;
    collateralRequired?: number;
    positionSize?: number;
  }> {
    try {
      // Check USDC balance
      const usdcBalance = await this.safeWallet.getUSDCBalance();

      // Check ETH balance for execution fees
      const ethBalance = await this.safeWallet.getETHBalance();

      if (ethBalance < 0.01) {
        return {
          canExecute: false,
          reason: 'Insufficient ETH for execution fees (need at least 0.01 ETH)',
          usdcBalance,
        };
      }

      // Calculate required collateral
      const collateralRequired = (usdcBalance * params.signal.sizeModel.value) / 100;
      const leverage = params.signal.sizeModel.leverage || 1;
      const positionSize = collateralRequired * leverage;

      if (collateralRequired === 0) {
        return {
          canExecute: false,
          reason: 'Insufficient USDC balance',
          usdcBalance,
        };
      }

      // Check if market exists
      const market = GMXAdapter.getMarket(params.signal.tokenSymbol);
      if (!market) {
        return {
          canExecute: false,
          reason: `Market not available for ${params.signal.tokenSymbol}`,
          usdcBalance,
        };
      }

      return {
        canExecute: true,
        usdcBalance,
        collateralRequired,
        positionSize,
        estimatedGas: '500000',
      };
    } catch (error: any) {
      return {
        canExecute: false,
        reason: error.message,
      };
    }
  }
}

/**
 * Create GMX adapter for a Safe wallet
 */
export function createGMXAdapter(safeWallet: SafeWalletService): GMXAdapter {
  return new GMXAdapter(safeWallet);
}
