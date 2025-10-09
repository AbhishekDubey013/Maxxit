#!/usr/bin/env tsx

/**
 * Initialize Capital Tracking for a Safe
 * 
 * Must be called before first trade to set initial capital baseline
 * 
 * Usage:
 *   npx tsx scripts/initialize-capital.ts --safe 0xYOUR_SAFE_ADDRESS
 */

import { createSafeModuleService } from '../lib/safe-module-service';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const safeIndex = args.indexOf('--safe');

  if (safeIndex === -1) {
    console.error('Usage: npx tsx scripts/initialize-capital.ts --safe 0xSAFE_ADDRESS');
    process.exit(1);
  }

  const safeAddress = args[safeIndex + 1];

  if (!ethers.utils.isAddress(safeAddress)) {
    console.error('❌ Invalid Safe address');
    process.exit(1);
  }

  console.log('💰 Initialize Capital Tracking');
  console.log('==============================');
  console.log('Safe:', safeAddress);
  console.log('');

  // Validate environment
  if (!process.env.TRADING_MODULE_ADDRESS) {
    throw new Error('TRADING_MODULE_ADDRESS not set in .env');
  }

  if (!process.env.EXECUTOR_PRIVATE_KEY) {
    throw new Error('EXECUTOR_PRIVATE_KEY not set in .env');
  }

  const chainId = 42161; // Arbitrum mainnet

  // Create module service
  const moduleService = createSafeModuleService(
    process.env.TRADING_MODULE_ADDRESS,
    chainId,
    process.env.EXECUTOR_PRIVATE_KEY
  );

  // Check if already initialized
  console.log('1️⃣ Checking current status...');
  try {
    const stats = await moduleService.getSafeStats(safeAddress);
    
    if (stats.initialized) {
      console.log('⚠️  Capital already initialized!');
      console.log('');
      console.log('Current Stats:');
      console.log('  Initial Capital:', stats.initialCapital, 'USDC');
      console.log('  Current Balance:', stats.currentBalance, 'USDC');
      console.log('  Profit/Loss:', stats.profitLoss, 'USDC');
      console.log('');
      console.log('To reset tracking (not recommended):');
      console.log('  - Call resetCapitalTracking() from Safe itself');
      process.exit(0);
    }

    console.log('✅ Safe not yet initialized');
    console.log('   Current Balance:', stats.currentBalance, 'USDC');
    console.log('');
  } catch (error: any) {
    console.error('❌ Error checking status:', error.message);
    console.log('   This might mean the module is not enabled on the Safe');
    process.exit(1);
  }

  // Initialize
  console.log('2️⃣ Initializing capital tracking...');
  
  const result = await moduleService.initializeCapital(safeAddress);

  if (!result.success) {
    console.error('❌ Initialization failed:', result.error);
    process.exit(1);
  }

  console.log('✅ Capital initialized successfully!');
  console.log('   TX Hash:', result.txHash);
  console.log('   Explorer:', `https://arbiscan.io/tx/${result.txHash}`);
  console.log('');

  // Get updated stats
  console.log('3️⃣ Verifying initialization...');
  
  // Wait for blockchain to update
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const statsAfter = await moduleService.getSafeStats(safeAddress);
  
  console.log('✅ Initialization verified!');
  console.log('');
  console.log('Capital Tracking:');
  console.log('=================');
  console.log('Initialized:', statsAfter.initialized ? 'Yes' : 'No');
  console.log('Initial Capital:', statsAfter.initialCapital, 'USDC');
  console.log('Current Balance:', statsAfter.currentBalance, 'USDC');
  console.log('');

  console.log('🎉 Safe is ready for trading!');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Execute test trade: npx tsx scripts/test-arbitrum-trade.ts --safe', safeAddress, '--amount 5');
  console.log('2. Monitor Safe: https://app.safe.global/home?safe=arb1:' + safeAddress);
  console.log('3. Check balance: https://arbiscan.io/address/' + safeAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  });
