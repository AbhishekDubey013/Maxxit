#!/usr/bin/env tsx

/**
 * Test Arbitrum Trade Execution
 * 
 * Tests a small trade on Arbitrum to verify everything works
 * 
 * Usage:
 *   npx tsx scripts/test-arbitrum-trade.ts --safe 0xYOUR_SAFE --amount 5
 */

import { createSafeModuleService } from '../lib/safe-module-service';
import { buildUniswapV3SwapData } from '../lib/adapters/spot-adapter';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

// Arbitrum addresses
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const CHAIN_ID = 42161;

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const safeIndex = args.indexOf('--safe');
  const amountIndex = args.indexOf('--amount');

  if (safeIndex === -1 || amountIndex === -1) {
    console.error('Usage: npx tsx scripts/test-arbitrum-trade.ts --safe 0xSAFE_ADDRESS --amount 5');
    process.exit(1);
  }

  const safeAddress = args[safeIndex + 1];
  const amountUSDC = parseFloat(args[amountIndex + 1]);

  if (!ethers.utils.isAddress(safeAddress)) {
    console.error('❌ Invalid Safe address');
    process.exit(1);
  }

  if (isNaN(amountUSDC) || amountUSDC <= 0) {
    console.error('❌ Invalid amount');
    process.exit(1);
  }

  console.log('🧪 Testing Arbitrum Trade Execution');
  console.log('===================================');
  console.log('Safe:', safeAddress);
  console.log('Amount:', amountUSDC, 'USDC');
  console.log('Trade: USDC → WETH');
  console.log('');

  // Validate environment
  if (!process.env.TRADING_MODULE_ADDRESS) {
    throw new Error('TRADING_MODULE_ADDRESS not set in .env');
  }

  if (!process.env.EXECUTOR_PRIVATE_KEY) {
    throw new Error('EXECUTOR_PRIVATE_KEY not set in .env');
  }

  if (!process.env.PLATFORM_PROFIT_RECEIVER) {
    throw new Error('PLATFORM_PROFIT_RECEIVER not set in .env');
  }

  // Create module service
  const moduleService = createSafeModuleService(
    process.env.TRADING_MODULE_ADDRESS,
    CHAIN_ID,
    process.env.EXECUTOR_PRIVATE_KEY
  );

  // Check if Safe is ready
  console.log('1️⃣ Checking Safe status...');
  const isReady = await moduleService.isReadyForTrading(safeAddress);
  
  if (!isReady) {
    console.log('⚠️  Safe not ready for trading!');
    console.log('   Make sure:');
    console.log('   - Module is enabled on Safe');
    console.log('   - Safe has USDC balance');
    console.log('   - Capital is initialized');
    console.log('');
    
    // Try to get stats
    try {
      const stats = await moduleService.getSafeStats(safeAddress);
      console.log('Safe Stats:');
      console.log('  Initialized:', stats.initialized);
      console.log('  Current Balance:', stats.currentBalance, 'USDC');
      console.log('');
    } catch (error) {
      console.log('  Could not get stats - module may not be enabled');
    }
    
    process.exit(1);
  }

  console.log('✅ Safe is ready for trading');
  console.log('');

  // Get initial stats
  console.log('2️⃣ Getting initial stats...');
  const statsBefore = await moduleService.getSafeStats(safeAddress);
  console.log('Initial Balance:', statsBefore.currentBalance, 'USDC');
  console.log('Initial Capital:', statsBefore.initialCapital, 'USDC');
  console.log('Current P&L:', statsBefore.profitLoss, 'USDC');
  console.log('');

  // Build swap data
  console.log('3️⃣ Building swap data...');
  const amountIn = ethers.utils.parseUnits(amountUSDC.toString(), 6); // USDC has 6 decimals
  
  const swapData = await buildUniswapV3SwapData({
    tokenIn: USDC,
    tokenOut: WETH,
    amountIn: amountIn.toString(),
    slippage: 1.0, // 1% slippage for test
    chainId: CHAIN_ID,
  });

  console.log('✅ Swap data built');
  console.log('   Expected output:', ethers.utils.formatEther(swapData.minAmountOut), 'WETH');
  console.log('');

  // Execute trade
  console.log('4️⃣ Executing trade...');
  console.log('   This may take 10-30 seconds...');
  
  const result = await moduleService.executeTrade({
    safeAddress: safeAddress,
    fromToken: USDC,
    toToken: WETH,
    amountIn: amountIn.toString(),
    dexRouter: UNISWAP_ROUTER,
    swapData: swapData.swapData,
    minAmountOut: swapData.minAmountOut,
    profitReceiver: process.env.PLATFORM_PROFIT_RECEIVER!,
  });

  console.log('');

  if (!result.success) {
    console.error('❌ Trade failed:', result.error);
    process.exit(1);
  }

  console.log('✅ Trade successful!');
  console.log('');
  console.log('Transaction Details:');
  console.log('===================');
  console.log('TX Hash:', result.txHash);
  console.log('Explorer:', `https://arbiscan.io/tx/${result.txHash}`);
  console.log('');
  console.log('Trade Results:');
  console.log('==============');
  console.log('Amount In:', amountUSDC, 'USDC');
  console.log('Amount Out:', result.amountOut ? ethers.utils.formatEther(result.amountOut) : 'N/A', 'WETH');
  console.log('Fee Charged:', result.feeCharged ? ethers.utils.formatUnits(result.feeCharged, 6) : '0', 'USDC');
  console.log('Profit Share:', result.profitShare ? ethers.utils.formatUnits(result.profitShare, 6) : '0', 'USDC');
  console.log('');

  // Get final stats
  console.log('5️⃣ Getting final stats...');
  
  // Wait a bit for blockchain to update
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const statsAfter = await moduleService.getSafeStats(safeAddress);
  console.log('Final Balance:', statsAfter.currentBalance, 'USDC');
  console.log('P&L:', statsAfter.profitLoss, 'USDC');
  console.log('');

  console.log('🎉 Test complete!');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Close position: npx tsx scripts/test-arbitrum-trade.ts --safe', safeAddress, '--amount', ethers.utils.formatEther(result.amountOut || '0'), '--from WETH --to USDC');
  console.log('2. Monitor Safe: https://app.safe.global/home?safe=arb1:' + safeAddress);
  console.log('3. Check transactions: https://arbiscan.io/address/' + safeAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });

