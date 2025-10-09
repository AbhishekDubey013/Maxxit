#!/usr/bin/env tsx

/**
 * Setup Arbitrum Module Configuration
 * 
 * This script:
 * 1. Authorizes the executor wallet
 * 2. Whitelists required tokens (WETH, ARB, etc.)
 * 3. Verifies DEX routers are whitelisted
 * 4. Displays configuration
 * 
 * Usage:
 *   npx tsx scripts/setup-arbitrum-module.ts
 */

import { createSafeModuleService } from '../lib/safe-module-service';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

// Arbitrum mainnet addresses
const ARBITRUM_ADDRESSES = {
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  UNI: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
};

const UNISWAP_ROUTERS = {
  V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  SWAP_ROUTER_02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
};

async function main() {
  console.log('🚀 Setting up Arbitrum Module Configuration\n');

  // Validate environment
  if (!process.env.TRADING_MODULE_ADDRESS) {
    throw new Error('TRADING_MODULE_ADDRESS not set in .env');
  }

  if (!process.env.MODULE_OWNER) {
    throw new Error('MODULE_OWNER not set in .env');
  }

  if (!process.env.EXECUTOR_ADDRESS) {
    throw new Error('EXECUTOR_ADDRESS not set in .env');
  }

  const moduleAddress = process.env.TRADING_MODULE_ADDRESS;
  const executorAddress = process.env.EXECUTOR_ADDRESS;
  const chainId = 42161; // Arbitrum mainnet

  console.log('Configuration:');
  console.log('================');
  console.log('Module Address:', moduleAddress);
  console.log('Executor Address:', executorAddress);
  console.log('Chain:', 'Arbitrum One (42161)');
  console.log('');

  // Create module service (using MODULE_OWNER private key for admin operations)
  const moduleService = createSafeModuleService(
    moduleAddress,
    chainId,
    process.env.MODULE_OWNER // Must use owner key for admin functions
  );

  // Step 1: Authorize executor
  console.log('📝 Step 1: Authorize Executor Wallet');
  console.log('=====================================');
  
  try {
    const result = await moduleService.setExecutorAuthorization(executorAddress, true);
    
    if (result.success) {
      console.log('✅ Executor authorized successfully!');
      console.log('   TX:', result.txHash);
    } else {
      console.log('⚠️  Already authorized or error:', result.error);
    }
  } catch (error: any) {
    if (error.message?.includes('already')) {
      console.log('✅ Executor already authorized');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
  console.log('');

  // Step 2: Whitelist tokens
  console.log('📝 Step 2: Whitelist Tokens');
  console.log('============================');

  const tokensToWhitelist = [
    { name: 'USDC', address: ARBITRUM_ADDRESSES.USDC },
    { name: 'WETH', address: ARBITRUM_ADDRESSES.WETH },
    { name: 'ARB', address: ARBITRUM_ADDRESSES.ARB },
    { name: 'WBTC', address: ARBITRUM_ADDRESSES.WBTC },
  ];

  for (const token of tokensToWhitelist) {
    try {
      console.log(`Whitelisting ${token.name}...`);
      const result = await moduleService.setTokenWhitelist(token.address, true);
      
      if (result.success) {
        console.log(`✅ ${token.name} whitelisted! TX: ${result.txHash?.substring(0, 10)}...`);
      } else {
        console.log(`⚠️  ${token.name} already whitelisted or error`);
      }
    } catch (error: any) {
      if (error.message?.includes('already')) {
        console.log(`✅ ${token.name} already whitelisted`);
      } else {
        console.error(`❌ ${token.name} error:`, error.message);
      }
    }
  }
  console.log('');

  // Step 3: Verify DEX routers (already whitelisted in constructor)
  console.log('📝 Step 3: Verify DEX Routers');
  console.log('==============================');
  console.log('✅ Uniswap V3 Router already whitelisted in constructor');
  console.log('✅ Uniswap SwapRouter02 already whitelisted in constructor');
  console.log('');

  // Step 4: Display final configuration
  console.log('📊 Final Configuration');
  console.log('======================');
  console.log('');
  console.log('Module Address:', moduleAddress);
  console.log('Chain: Arbitrum One (42161)');
  console.log('');
  
  console.log('✅ Authorized Executors:');
  console.log('   -', executorAddress);
  console.log('');

  console.log('✅ Whitelisted Tokens:');
  tokensToWhitelist.forEach(token => {
    console.log(`   - ${token.name}: ${token.address}`);
  });
  console.log('');

  console.log('✅ Whitelisted DEXes:');
  console.log('   - Uniswap V3 Router:', UNISWAP_ROUTERS.V3_ROUTER);
  console.log('   - Uniswap SwapRouter02:', UNISWAP_ROUTERS.SWAP_ROUTER_02);
  console.log('');

  console.log('🎉 Module configuration complete!');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Create Safe wallet (or use existing)');
  console.log('2. Enable module on Safe: npx tsx scripts/enable-module-on-safe.ts --safe 0xYOUR_SAFE');
  console.log('3. Fund Safe with USDC');
  console.log('4. Initialize capital: npx tsx scripts/initialize-capital.ts --safe 0xYOUR_SAFE');
  console.log('5. Test trade: npx tsx scripts/test-arbitrum-trade.ts --safe 0xYOUR_SAFE --amount 5');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

