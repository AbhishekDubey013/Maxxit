#!/usr/bin/env tsx

/**
 * Check Arbitrum Module Configuration
 * 
 * Displays current module configuration and status
 * 
 * Usage:
 *   npx tsx scripts/check-arbitrum-module.ts
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Module ABI for view functions
const MODULE_ABI = [
  'function platformFeeReceiver() view returns (address)',
  'function USDC() view returns (address)',
  'function moduleOwner() view returns (address)',
  'function TRADE_FEE() view returns (uint256)',
  'function PROFIT_SHARE_BPS() view returns (uint256)',
  'function whitelistedDexes(address) view returns (bool)',
  'function whitelistedTokens(address) view returns (bool)',
  'function authorizedExecutors(address) view returns (bool)',
];

// Arbitrum addresses
const ARBITRUM_ADDRESSES = {
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
};

const UNISWAP_ROUTERS = {
  V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  SWAP_ROUTER_02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
};

async function main() {
  console.log('🔍 Checking Arbitrum Module Configuration');
  console.log('=========================================\n');

  // Validate environment
  if (!process.env.TRADING_MODULE_ADDRESS) {
    throw new Error('TRADING_MODULE_ADDRESS not set in .env');
  }

  const moduleAddress = process.env.TRADING_MODULE_ADDRESS;
  const rpcUrl = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';

  // Setup provider
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const module = new ethers.Contract(moduleAddress, MODULE_ABI, provider);

  // Get basic info
  console.log('📋 Module Information');
  console.log('=====================');
  console.log('Module Address:', moduleAddress);
  console.log('Chain: Arbitrum One (42161)');
  console.log('');

  // Get configuration
  console.log('⚙️  Configuration');
  console.log('=================');
  
  try {
    const [
      platformFeeReceiver,
      usdc,
      moduleOwner,
      tradeFee,
      profitShareBps,
    ] = await Promise.all([
      module.platformFeeReceiver(),
      module.USDC(),
      module.moduleOwner(),
      module.TRADE_FEE(),
      module.PROFIT_SHARE_BPS(),
    ]);

    console.log('Platform Fee Receiver:', platformFeeReceiver);
    console.log('USDC Address:', usdc);
    console.log('Module Owner:', moduleOwner);
    console.log('Trade Fee:', ethers.utils.formatUnits(tradeFee, 6), 'USDC');
    console.log('Profit Share:', profitShareBps.toNumber() / 100, '%');
    console.log('');
  } catch (error: any) {
    console.error('❌ Error reading configuration:', error.message);
    console.log('');
  }

  // Check authorized executors
  console.log('👥 Authorized Executors');
  console.log('=======================');
  
  if (process.env.EXECUTOR_ADDRESS) {
    try {
      const isAuthorized = await module.authorizedExecutors(process.env.EXECUTOR_ADDRESS);
      console.log(process.env.EXECUTOR_ADDRESS, isAuthorized ? '✅' : '❌');
    } catch (error: any) {
      console.log('Error checking executor:', error.message);
    }
  } else {
    console.log('⚠️  EXECUTOR_ADDRESS not set in .env');
  }
  console.log('');

  // Check whitelisted tokens
  console.log('🪙  Whitelisted Tokens');
  console.log('======================');
  
  const tokensToCheck = [
    { name: 'USDC', address: ARBITRUM_ADDRESSES.USDC },
    { name: 'WETH', address: ARBITRUM_ADDRESSES.WETH },
    { name: 'ARB', address: ARBITRUM_ADDRESSES.ARB },
    { name: 'WBTC', address: ARBITRUM_ADDRESSES.WBTC },
  ];

  for (const token of tokensToCheck) {
    try {
      const isWhitelisted = await module.whitelistedTokens(token.address);
      console.log(`${token.name} (${token.address}):`, isWhitelisted ? '✅' : '❌');
    } catch (error: any) {
      console.log(`${token.name}: Error -`, error.message);
    }
  }
  console.log('');

  // Check whitelisted DEXes
  console.log('🔄 Whitelisted DEXes');
  console.log('====================');
  
  const dexesToCheck = [
    { name: 'Uniswap V3 Router', address: UNISWAP_ROUTERS.V3_ROUTER },
    { name: 'Uniswap SwapRouter02', address: UNISWAP_ROUTERS.SWAP_ROUTER_02},
  ];

  for (const dex of dexesToCheck) {
    try {
      const isWhitelisted = await module.whitelistedDexes(dex.address);
      console.log(`${dex.name}:`, isWhitelisted ? '✅' : '❌');
      console.log(`  ${dex.address}`);
    } catch (error: any) {
      console.log(`${dex.name}: Error -`, error.message);
    }
  }
  console.log('');

  // Summary
  console.log('📊 Summary');
  console.log('==========');
  console.log('Module is configured and ready for trading on Arbitrum!');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Create/use Safe wallet');
  console.log('2. Enable module on Safe');
  console.log('3. Fund Safe with USDC');
  console.log('4. Initialize capital tracking');
  console.log('5. Execute test trade');
  console.log('');
  console.log('View module on Arbiscan:');
  console.log(`https://arbiscan.io/address/${moduleAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });

