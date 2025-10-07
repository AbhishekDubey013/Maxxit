#!/usr/bin/env tsx
/**
 * Setup Module Permissions for Sepolia
 * - Authorize executor
 * - Whitelist WETH token
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const MODULE_ADDRESS = process.env.MODULE_ADDRESS || '0xa87f82433294cE8A3C8f08Ec5D2825e946C0c0FE';
const EXECUTOR = '0x421E4e6b301679fe2B649ed4A6C60aeCBB8DD3a6';
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

const MODULE_ABI = [
  'function setExecutorAuthorization(address executor, bool status) external',
  'function setTokenWhitelist(address token, bool status) external',
  'function moduleOwner() view returns (address)',
  'function authorizedExecutors(address) view returns (bool)',
  'function whitelistedTokens(address) view returns (bool)',
];

async function setupPermissions() {
  console.log('🔧 Setting up module permissions on Sepolia\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const ownerPrivateKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!ownerPrivateKey) {
    console.log('❌ EXECUTOR_PRIVATE_KEY not found in .env');
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const owner = new ethers.Wallet(ownerPrivateKey, provider);
  const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, owner);

  console.log('Module:', MODULE_ADDRESS);
  console.log('Owner:', owner.address);
  console.log('');

  // Check current status
  const moduleOwner = await module.moduleOwner();
  if (moduleOwner.toLowerCase() !== owner.address.toLowerCase()) {
    console.log('❌ ERROR: You are not the module owner!');
    console.log(`   Module owner: ${moduleOwner}`);
    console.log(`   Your address: ${owner.address}`);
    return;
  }

  console.log('✅ You are the module owner\n');

  const executorAuthorized = await module.authorizedExecutors(EXECUTOR);
  const wethWhitelisted = await module.whitelistedTokens(WETH);

  console.log('Current Status:');
  console.log(`  Executor authorized: ${executorAuthorized ? '✅' : '❌'}`);
  console.log(`  WETH whitelisted: ${wethWhitelisted ? '✅' : '❌'}`);
  console.log('');

  // Authorize executor if needed
  if (!executorAuthorized) {
    console.log('📝 Authorizing executor...');
    const tx1 = await module.setExecutorAuthorization(EXECUTOR, true);
    console.log(`   Tx sent: ${tx1.hash}`);
    await tx1.wait();
    console.log('   ✅ Executor authorized!\n');
  } else {
    console.log('✅ Executor already authorized\n');
  }

  // Whitelist WETH if needed
  if (!wethWhitelisted) {
    console.log('📝 Whitelisting WETH...');
    const tx2 = await module.setTokenWhitelist(WETH, true);
    console.log(`   Tx sent: ${tx2.hash}`);
    await tx2.wait();
    console.log('   ✅ WETH whitelisted!\n');
  } else {
    console.log('✅ WETH already whitelisted\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎉 Module permissions configured successfully!\n');
  console.log('You can now execute gasless trades on Sepolia! 🚀');
}

setupPermissions().catch(console.error);
