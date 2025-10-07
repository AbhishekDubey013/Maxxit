#!/usr/bin/env tsx
/**
 * Setup the new module: authorize executor, whitelist tokens/DEX
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const MODULE_ADDRESS = '0xf934Cbb5667EF2F5d50f9098F9B2A8d018354c19';
const USDC = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const WETH = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
const UNISWAP_ROUTER = '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E';

const MODULE_ABI = [
  'function setExecutorAuthorization(address executor, bool status) external',
  'function setTokenWhitelist(address token, bool status) external',
  'function setDexWhitelist(address dex, bool status) external',
  'function authorizedExecutors(address) view returns (bool)',
  'function whitelistedTokens(address) view returns (bool)',
  'function whitelistedDexes(address) view returns (bool)',
  'function moduleOwner() view returns (address)',
];

async function setupModule() {
  console.log('⚙️  Setting up MaxxitTradingModule\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const privateKey = process.env.EXECUTOR_PRIVATE_KEY;
  if (!privateKey) {
    console.log('❌ EXECUTOR_PRIVATE_KEY not found');
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const owner = new ethers.Wallet(privateKey, provider);
  const module = new ethers.Contract(MODULE_ADDRESS, MODULE_ABI, owner);

  console.log('Module:', MODULE_ADDRESS);
  console.log('Owner:', owner.address);
  console.log('');

  try {
    // Verify ownership
    const moduleOwner = await module.moduleOwner();
    console.log('📋 Module owner:', moduleOwner);
    if (moduleOwner.toLowerCase() !== owner.address.toLowerCase()) {
      console.log('❌ You are not the module owner!');
      return;
    }
    console.log('✅ Ownership verified\n');

    // 1. Authorize executor
    console.log('1️⃣  Authorizing executor...');
    const isAuthorized = await module.authorizedExecutors(owner.address);
    if (isAuthorized) {
      console.log('   ✅ Already authorized\n');
    } else {
      const tx1 = await module.setExecutorAuthorization(owner.address, true, {
        gasLimit: 100000,
      });
      console.log('   Transaction:', tx1.hash);
      await tx1.wait();
      console.log('   ✅ Executor authorized\n');
    }

    // 2. Whitelist USDC
    console.log('2️⃣  Whitelisting USDC...');
    const isUsdcWhitelisted = await module.whitelistedTokens(USDC);
    if (isUsdcWhitelisted) {
      console.log('   ✅ Already whitelisted\n');
    } else {
      const tx2 = await module.setTokenWhitelist(USDC, true, {
        gasLimit: 100000,
      });
      console.log('   Transaction:', tx2.hash);
      await tx2.wait();
      console.log('   ✅ USDC whitelisted\n');
    }

    // 3. Whitelist WETH
    console.log('3️⃣  Whitelisting WETH...');
    const isWethWhitelisted = await module.whitelistedTokens(WETH);
    if (isWethWhitelisted) {
      console.log('   ✅ Already whitelisted\n');
    } else {
      const tx3 = await module.setTokenWhitelist(WETH, true, {
        gasLimit: 100000,
      });
      console.log('   Transaction:', tx3.hash);
      await tx3.wait();
      console.log('   ✅ WETH whitelisted\n');
    }

    // 4. Whitelist Uniswap Router
    console.log('4️⃣  Whitelisting Uniswap Router...');
    const isRouterWhitelisted = await module.whitelistedDexes(UNISWAP_ROUTER);
    if (isRouterWhitelisted) {
      console.log('   ✅ Already whitelisted\n');
    } else {
      const tx4 = await module.setDexWhitelist(UNISWAP_ROUTER, true, {
        gasLimit: 100000,
      });
      console.log('   Transaction:', tx4.hash);
      await tx4.wait();
      console.log('   ✅ Uniswap Router whitelisted\n');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Module setup complete!\n');
    console.log('📋 Next Steps:\n');
    console.log('1. Enable module on Safe (via Safe UI or script)');
    console.log('2. Call approveTokenForDex(safeAddress, USDC, router)');
    console.log('3. Initialize capital');
    console.log('4. Execute first trade! 🚀\n');

  } catch (error: any) {
    console.log('❌ Setup failed:', error.message);
    if (error.transaction) {
      console.log('   Transaction:', error.transaction.hash);
    }
  }
}

setupModule().catch(console.error);
