#!/usr/bin/env tsx

/**
 * Configure Arbitrum Module - Simple Setup
 * 
 * This script configures the deployed module for gasless trading:
 * 1. Authorizes the executor wallet
 * 2. Whitelists tokens (WETH, ARB, etc.)
 * 3. Whitelists DEX routers (already done in constructor, but we can add more)
 * 
 * Usage:
 *   npx tsx scripts/configure-arbitrum-module.ts
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Arbitrum mainnet addresses
const ARBITRUM_ADDRESSES = {
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  UNI: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
  UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  UNISWAP_SWAP_ROUTER_02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
};

const MODULE_ABI = [
  'function setExecutorAuthorization(address executor, bool status) external',
  'function setTokenWhitelist(address token, bool status) external',
  'function setDexWhitelist(address dex, bool status) external',
  'function authorizedExecutors(address) view returns (bool)',
  'function whitelistedTokens(address) view returns (bool)',
  'function whitelistedDexes(address) view returns (bool)',
  'function moduleOwner() view returns (address)',
];

async function main() {
  console.log('⚙️  Configuring Arbitrum Module\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get configuration from env
  const moduleAddress = process.env.TRADING_MODULE_ADDRESS;
  const executorPrivateKey = process.env.DEPLOYER_PRIVATE_KEY; // This is the module owner
  const executorAddress = process.env.EXECUTOR_ADDRESS || process.env.PLATFORM_FEE_RECEIVER;
  const rpcUrl = process.env.ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc';

  if (!moduleAddress) {
    console.error('❌ TRADING_MODULE_ADDRESS not found in .env');
    process.exit(1);
  }

  if (!executorPrivateKey) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  if (!executorAddress) {
    console.error('❌ EXECUTOR_ADDRESS not found in .env');
    process.exit(1);
  }

  console.log('Module:', moduleAddress);
  console.log('Executor to authorize:', executorAddress);
  console.log('');

  // Setup provider and signer
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const owner = new ethers.Wallet(executorPrivateKey, provider);
  const module = new ethers.Contract(moduleAddress, MODULE_ABI, owner);

  try {
    // Verify ownership
    const moduleOwner = await module.moduleOwner();
    console.log('📋 Module owner:', moduleOwner);
    console.log('📋 Your address:', owner.address);
    
    if (moduleOwner.toLowerCase() !== owner.address.toLowerCase()) {
      console.error('❌ You are not the module owner!');
      console.error('   Module owner:', moduleOwner);
      console.error('   Your address:', owner.address);
      process.exit(1);
    }
    console.log('✅ Ownership verified\n');

    // 1. Authorize executor
    console.log('1️⃣  Authorizing executor:', executorAddress);
    const isAuthorized = await module.authorizedExecutors(executorAddress);
    
    if (isAuthorized) {
      console.log('   ✅ Already authorized\n');
    } else {
      console.log('   Sending transaction...');
      const tx1 = await module.setExecutorAuthorization(executorAddress, true, {
        gasLimit: 100000,
      });
      console.log('   Transaction:', tx1.hash);
      console.log('   Waiting for confirmation...');
      await tx1.wait();
      console.log('   ✅ Executor authorized\n');
    }

    // 2. Whitelist WETH
    console.log('2️⃣  Whitelisting WETH...');
    const isWethWhitelisted = await module.whitelistedTokens(ARBITRUM_ADDRESSES.WETH);
    
    if (isWethWhitelisted) {
      console.log('   ✅ Already whitelisted\n');
    } else {
      console.log('   Sending transaction...');
      const tx2 = await module.setTokenWhitelist(ARBITRUM_ADDRESSES.WETH, true, {
        gasLimit: 100000,
      });
      console.log('   Transaction:', tx2.hash);
      console.log('   Waiting for confirmation...');
      await tx2.wait();
      console.log('   ✅ WETH whitelisted\n');
    }

    // 3. Whitelist ARB
    console.log('3️⃣  Whitelisting ARB...');
    const isArbWhitelisted = await module.whitelistedTokens(ARBITRUM_ADDRESSES.ARB);
    
    if (isArbWhitelisted) {
      console.log('   ✅ Already whitelisted\n');
    } else {
      console.log('   Sending transaction...');
      const tx3 = await module.setTokenWhitelist(ARBITRUM_ADDRESSES.ARB, true, {
        gasLimit: 100000,
      });
      console.log('   Transaction:', tx3.hash);
      console.log('   Waiting for confirmation...');
      await tx3.wait();
      console.log('   ✅ ARB whitelisted\n');
    }

    // 4. Whitelist WBTC
    console.log('4️⃣  Whitelisting WBTC...');
    const isWbtcWhitelisted = await module.whitelistedTokens(ARBITRUM_ADDRESSES.WBTC);
    
    if (isWbtcWhitelisted) {
      console.log('   ✅ Already whitelisted\n');
    } else {
      console.log('   Sending transaction...');
      const tx4 = await module.setTokenWhitelist(ARBITRUM_ADDRESSES.WBTC, true, {
        gasLimit: 100000,
      });
      console.log('   Transaction:', tx4.hash);
      console.log('   Waiting for confirmation...');
      await tx4.wait();
      console.log('   ✅ WBTC whitelisted\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Configuration Complete!\n');
    console.log('Your module is now ready for gasless trading on Arbitrum!\n');
    console.log('📋 Summary:');
    console.log('  ✅ Executor authorized:', executorAddress);
    console.log('  ✅ Tokens whitelisted: USDC, WETH, ARB, WBTC');
    console.log('  ✅ DEXes whitelisted: Uniswap V3');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('  1. Users create Safe wallets on Arbitrum');
    console.log('  2. Users enable module in their Safe');
    console.log('  3. Users deposit USDC (no ETH needed!)');
    console.log('  4. System executes gasless trades via executor');
    console.log('');
    console.log('🔗 Module Address:', moduleAddress);
    console.log('🔗 View on Arbiscan:', `https://arbiscan.io/address/${moduleAddress}`);

  } catch (error: any) {
    console.error('\n❌ Configuration failed:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

